import { PitchDetectionResult, InstrumentType, VocalSampleVowel } from '../types/vocal';
import { frequencyToNote } from '../utils/noteUtils';
import { PitchDetector } from './pitchDetection';

export type PitchCallback = (result: PitchDetectionResult) => void;

export interface RecordedNote {
  midi: number;
  frequency: number;
  startTime: number; // offset ms from recording start
  duration: number;  // ms
}

export type RecordingStateCallback = (isRecording: boolean, isPlaying: boolean, notesCount: number) => void;

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private pitchDetector: PitchDetector | null = null;
  private isListening = false;
  private animationFrameId: number | null = null;
  private pitchListeners: Set<PitchCallback> = new Set();
  private recordingListeners: Set<RecordingStateCallback> = new Set();

  private timeBuffer: Float32Array<ArrayBuffer> | null = null;
  private freqBuffer: Uint8Array<ArrayBuffer> | null = null;

  // Master output gain for synthesizer
  private synthGain: GainNode | null = null;
  private currentInstrument: InstrumentType = 'piano';
  private currentVocalVowel: VocalSampleVowel = 'aah';
  private referencePitchA4 = 440;
  private tuningToleranceCents = 12;

  // Key Recording & Playback
  private isRecordingActive = false;
  private isPlaybackActive = false;
  private recordingStartTime = 0;
  private recordedNotesList: RecordedNote[] = [];
  private playbackTimeouts: number[] = [];

  public setInstrument(inst: InstrumentType) {
    this.currentInstrument = inst;
  }

  public getInstrument(): InstrumentType {
    return this.currentInstrument;
  }

  public setVocalVowel(vowel: VocalSampleVowel) {
    this.currentVocalVowel = vowel;
  }

  public getVocalVowel(): VocalSampleVowel {
    return this.currentVocalVowel;
  }

  public setReferencePitch(a4: number) {
    this.referencePitchA4 = a4;
  }

  public getReferencePitch(): number {
    return this.referencePitchA4;
  }

  private noteDurationSeconds: 1 | 2 | 4 = 2;

  public setNoteDuration(sec: 1 | 2 | 4) {
    this.noteDurationSeconds = sec;
  }

  public getNoteDuration(): 1 | 2 | 4 {
    return this.noteDurationSeconds;
  }

  public setNoteDurationBeats(beats: 1 | 2 | 4) {
    this.noteDurationSeconds = beats;
  }

  public getNoteDurationBeats(): 1 | 2 | 4 {
    return this.noteDurationSeconds;
  }

  public setTuningTolerance(cents: number) {
    this.tuningToleranceCents = cents;
  }

  public getTuningTolerance(): number {
    return this.tuningToleranceCents;
  }

  /**
   * Initialize or resume the Web Audio Context
   */
  public async getAudioContext(): Promise<AudioContext> {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ latencyHint: 'interactive' });

      // Master gain
      this.synthGain = this.audioCtx.createGain();
      this.synthGain.gain.setValueAtTime(0.75, this.audioCtx.currentTime);

      // Master soft limiter / compressor to prevent clipping on chords
      const compressor = this.audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-4, this.audioCtx.currentTime);
      compressor.knee.setValueAtTime(12, this.audioCtx.currentTime);
      compressor.ratio.setValueAtTime(4, this.audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
      compressor.release.setValueAtTime(0.15, this.audioCtx.currentTime);

      this.synthGain.connect(compressor);
      compressor.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  /**
   * Request microphone stream and attach pitch analyzer
   */
  public async startListening(): Promise<boolean> {
    try {
      const ctx = await this.getAudioContext();

      if (this.isListening) {
        return true;
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      };

      try {
        this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn('Strict mic constraints failed, falling back to standard audio:', err);
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.05;

      this.micSource = ctx.createMediaStreamSource(this.micStream);
      this.micSource.connect(this.analyser);

      this.timeBuffer = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));
      this.freqBuffer = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      this.pitchDetector = new PitchDetector(ctx.sampleRate, this.analyser.fftSize, 0.15);

      this.isListening = true;
      this.runDetectionLoop();

      return true;
    } catch (error) {
      console.error('Failed to initialize microphone audio engine:', error);
      this.stopListening();
      throw error;
    }
  }

  /**
   * Stop microphone input and processing loop to save Android battery
   */
  public stopListening() {
    this.isListening = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    this.notifyListeners({
      frequency: null,
      note: null,
      cents: 0,
      clarity: 0,
      rms: 0,
      spectralCentroid: 0,
      isInTune: false,
      stability: 0,
    });
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public subscribe(cb: PitchCallback): () => void {
    this.pitchListeners.add(cb);
    return () => {
      this.pitchListeners.delete(cb);
    };
  }

  private notifyListeners(result: PitchDetectionResult) {
    this.pitchListeners.forEach((cb) => cb(result));
  }

  private runDetectionLoop = () => {
    if (!this.isListening || !this.analyser || !this.pitchDetector || !this.timeBuffer || !this.freqBuffer) {
      return;
    }

    this.analyser.getFloatTimeDomainData(this.timeBuffer);
    this.analyser.getByteFrequencyData(this.freqBuffer);

    const analysis = this.pitchDetector.detectPitch(this.timeBuffer, this.freqBuffer);

    let noteResult = null;
    let cents = 0;
    let isInTune = false;

    if (analysis.frequency) {
      const conv = frequencyToNote(analysis.frequency, this.referencePitchA4);
      noteResult = conv.note;
      cents = conv.cents;
      isInTune = Math.abs(cents) <= this.tuningToleranceCents;
    }

    const result: PitchDetectionResult = {
      frequency: analysis.frequency,
      note: noteResult,
      cents,
      clarity: analysis.clarity,
      rms: analysis.rms,
      spectralCentroid: analysis.spectralCentroid,
      isInTune,
      stability: analysis.clarity > 0.85 ? 1 : analysis.clarity,
    };

    this.notifyListeners(result);

    this.animationFrameId = requestAnimationFrame(this.runDetectionLoop);
  };

  /**
   * High-Fidelity Acoustic Tone Synthesis
   * Models real concert grand piano with hammer-strike noise, inharmonic partial decay, and soundboard resonance;
   * and authentic Arabic Oud with twin paired strings, risha transient, and Kas'ah bowl resonance.
   */
  public async playTone(
    frequency: number,
    durationSeconds: number = 1.2,
    instrument?: InstrumentType,
    midiNote?: number,
    vowel?: VocalSampleVowel
  ): Promise<number> {
    const type = instrument || this.currentInstrument || 'piano';
    const ctx = await this.getAudioContext();
    const now = ctx.currentTime;

    // Track in recording if active
    if (this.isRecordingActive && midiNote) {
      const offsetMs = Date.now() - this.recordingStartTime;
      this.recordedNotesList.push({
        midi: midiNote,
        frequency,
        startTime: offsetMs,
        duration: durationSeconds * 1000,
      });
      this.notifyRecordingListeners();
    }

    if (type === 'oud') {
      return this.synthesizeRealOud(ctx, now, frequency, durationSeconds);
    } else if (type === 'guitar') {
      return this.synthesizeRealGuitar(ctx, now, frequency, durationSeconds);
    } else if (type === 'vocal') {
      return this.synthesizeRealVocal(ctx, now, frequency, durationSeconds, vowel || this.currentVocalVowel);
    } else if (type === 'strings') {
      return this.synthesizeRealStrings(ctx, now, frequency, durationSeconds);
    } else {
      return this.synthesizeRealGrandPiano(ctx, now, frequency, durationSeconds);
    }
  }

  /**
   * Helper to play note by MIDI number directly
   */
  public async playNote(
    midiNote: number,
    durationSeconds?: number,
    instrument?: InstrumentType,
    vowel?: VocalSampleVowel
  ): Promise<number> {
    const dur = durationSeconds !== undefined ? durationSeconds : this.noteDurationSeconds;
    const frequency = this.referencePitchA4 * Math.pow(2, (midiNote - 69) / 12);
    return this.playTone(frequency, dur, instrument, midiNote, vowel);
  }

  /**
   * Play multiple notes as an acoustic chord (simultaneous or rolled arpeggio)
   */
  public async playChord(
    midiNotes: number[],
    durationSeconds: number = 2.2,
    arpeggiated: boolean = false,
    instrument?: InstrumentType
  ): Promise<void> {
    midiNotes.forEach((midi, idx) => {
      const delay = arpeggiated ? idx * 0.12 : 0;
      setTimeout(() => {
        this.playNote(midi, durationSeconds, instrument);
      }, delay * 1000);
    });
  }

  /**
   * Play an interval or scale sequence step-by-step
   */
  public async playSequence(
    midiNotes: number[],
    stepDurationMs: number = 380,
    instrument?: InstrumentType
  ): Promise<void> {
    midiNotes.forEach((midi, i) => {
      setTimeout(() => {
        this.playNote(midi, 1.2, instrument);
      }, i * stepDurationMs);
    });
  }

  /**
   * Realistic Concert Grand Piano Model:
   * - Percussive hammer-strike transient (filtered noise burst at 320Hz)
   * - Unison 2-string beating (+0.35 cents)
   * - 5 Inharmonic physical partials with multi-tier decay
   * - Soundboard spruce cabinet resonance (140Hz & 780Hz)
   */
  private synthesizeRealGrandPiano(ctx: AudioContext, now: number, freq: number, duration: number): number {
    const noteGain = ctx.createGain();

    // Calculate realistic acoustic grand piano ring duration:
    // Natural acoustic grand strings resonate freely for 4 to 9.5 seconds depending on register!
    const naturalRingTime = Math.max(
      duration,
      Math.min(9.5, 7.8 * Math.pow(110 / Math.max(27.5, freq), 0.36))
    );

    // Master envelope for whole note: realistic acoustic decay
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(0.95, now + 0.004); // Instant hammer strike
    noteGain.gain.exponentialRampToValueAtTime(0.68, now + 0.15); // Initial strike settles into long singing bloom
    noteGain.gain.exponentialRampToValueAtTime(0.32, now + naturalRingTime * 0.42); // Warm sustained acoustic ring
    noteGain.gain.exponentialRampToValueAtTime(0.00005, now + naturalRingTime); // Natural fade out

    // Soundboard cabinet acoustic resonance filter (spruce body resonance)
    const soundboard = ctx.createBiquadFilter();
    soundboard.type = 'peaking';
    soundboard.frequency.setValueAtTime(140, now);
    soundboard.Q.setValueAtTime(1.8, now);
    soundboard.gain.setValueAtTime(3.8, now);

    const soundboardHigh = ctx.createBiquadFilter();
    soundboardHigh.type = 'peaking';
    soundboardHigh.frequency.setValueAtTime(780, now);
    soundboardHigh.Q.setValueAtTime(1.5, now);
    soundboardHigh.gain.setValueAtTime(2.2, now);

    // String Inharmonicity Constant B
    const B = 0.00028;
    const partials = [
      { n: 1, amp: 1.0, decayMult: 1.0 },
      { n: 2, amp: 0.65, decayMult: 0.88 },
      { n: 3, amp: 0.42, decayMult: 0.70 },
      { n: 4, amp: 0.24, decayMult: 0.52 },
      { n: 5, amp: 0.14, decayMult: 0.38 },
      { n: 6, amp: 0.07, decayMult: 0.26 },
    ];

    // Hammer Strike Noise Transient (14ms felt thump)
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.02), ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
    }
    const hammerSource = ctx.createBufferSource();
    hammerSource.buffer = noiseBuffer;
    const hammerFilter = ctx.createBiquadFilter();
    hammerFilter.type = 'bandpass';
    hammerFilter.frequency.setValueAtTime(320, now);
    hammerFilter.Q.setValueAtTime(2.5, now);
    const hammerGain = ctx.createGain();
    hammerGain.gain.setValueAtTime(0.28, now);
    hammerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    hammerSource.connect(hammerFilter);
    hammerFilter.connect(hammerGain);
    hammerGain.connect(noteGain);
    hammerSource.start(now);

    // String Oscillators
    partials.forEach((p) => {
      const partialFreq = p.n * freq * Math.sqrt(1 + B * p.n * p.n);
      if (partialFreq > 14000) return;

      // Primary string oscillator
      const osc = ctx.createOscillator();
      osc.type = p.n === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(partialFreq, now);

      const pGain = ctx.createGain();
      const peakAmp = p.amp * 0.44;
      pGain.gain.setValueAtTime(0.0001, now);
      pGain.gain.linearRampToValueAtTime(peakAmp, now + 0.004); // Instant hammer strike attack

      // Exponential decay: upper harmonics die out faster while fundamental rings long
      const pDecayTime = naturalRingTime * p.decayMult;
      pGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakAmp * 0.35), now + 0.15);
      pGain.gain.exponentialRampToValueAtTime(0.00005, now + pDecayTime);

      osc.connect(pGain);
      pGain.connect(soundboard);
      osc.start(now);
      osc.stop(now + pDecayTime + 0.1);

      // Unison double-string chorus on fundamental (piano 3-string acoustic beating)
      if (p.n === 1) {
        const unisonOsc = ctx.createOscillator();
        unisonOsc.type = 'sine';
        unisonOsc.frequency.setValueAtTime(freq * 1.00035, now); // +0.35 cents detune

        const uGain = ctx.createGain();
        uGain.gain.setValueAtTime(0.0001, now);
        uGain.gain.linearRampToValueAtTime(peakAmp * 0.65, now + 0.005);
        uGain.gain.exponentialRampToValueAtTime(0.00005, now + naturalRingTime);

        unisonOsc.connect(uGain);
        uGain.connect(soundboard);
        unisonOsc.start(now);
        unisonOsc.stop(now + naturalRingTime + 0.1);
      }
    });

    soundboard.connect(soundboardHigh);
    soundboardHigh.connect(noteGain);

    noteGain.connect(this.synthGain || ctx.destination);
    return naturalRingTime;
  }

  /**
   * Realistic Arabic Oud (العود العربي الأصيل):
   * - Authentic double-course paired strings with microscopic acoustic detuning (±1.2 cents)
   * - Sharp plectrum (Risha / ريشة) pluck noise click
   * - Deep Kas'ah wooden bowl body formant filters (210Hz air cavity, 580Hz belly, 1150Hz nasal projection)
   */
  private synthesizeRealOud(ctx: AudioContext, now: number, freq: number, duration: number): number {
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.0001, now);

    // Risha (plectrum) pluck transient
    const rishaBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.012), ctx.sampleRate);
    const rishaData = rishaBuffer.getChannelData(0);
    for (let i = 0; i < rishaData.length; i++) {
      rishaData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.002));
    }
    const rishaSource = ctx.createBufferSource();
    rishaSource.buffer = rishaBuffer;
    const rishaFilter = ctx.createBiquadFilter();
    rishaFilter.type = 'bandpass';
    rishaFilter.frequency.setValueAtTime(2400, now);
    rishaFilter.Q.setValueAtTime(3.0, now);
    const rishaGain = ctx.createGain();
    rishaGain.gain.setValueAtTime(0.4, now);
    rishaGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    rishaSource.connect(rishaFilter);
    rishaFilter.connect(rishaGain);
    rishaGain.connect(noteGain);
    rishaSource.start(now);

    // Kas'ah 3-Band Wooden Bowl Body Resonator
    const bowlLow = ctx.createBiquadFilter();
    bowlLow.type = 'peaking';
    bowlLow.frequency.setValueAtTime(210, now); // air cavity
    bowlLow.Q.setValueAtTime(2.2, now);
    bowlLow.gain.setValueAtTime(6.0, now);

    const bowlMid = ctx.createBiquadFilter();
    bowlMid.type = 'peaking';
    bowlMid.frequency.setValueAtTime(580, now); // soundboard wood
    bowlMid.Q.setValueAtTime(2.5, now);
    bowlMid.gain.setValueAtTime(5.5, now);

    const bowlHigh = ctx.createBiquadFilter();
    bowlHigh.type = 'peaking';
    bowlHigh.frequency.setValueAtTime(1150, now); // nasal projection
    bowlHigh.Q.setValueAtTime(2.0, now);
    bowlHigh.gain.setValueAtTime(4.0, now);

    // Double-Course Strings (Pair of strings struck by Risha)
    // String 1: fundamental + harmonics
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator(); // Paired course string
    const oscOct = ctx.createOscillator(); // 2nd harmonic
    const oscThird = ctx.createOscillator(); // 3rd harmonic

    oscA.type = 'triangle';
    oscB.type = 'sawtooth';
    oscOct.type = 'sine';
    oscThird.type = 'sine';

    // Microtonal course chorus detuning (1.2 cents)
    oscA.frequency.setValueAtTime(freq * 0.9993, now);
    oscB.frequency.setValueAtTime(freq * 1.0007, now);
    oscOct.frequency.setValueAtTime(freq * 2.001, now);
    oscThird.frequency.setValueAtTime(freq * 3.002, now);

    const gainA = ctx.createGain();
    const gainB = ctx.createGain();
    const gainOct = ctx.createGain();
    const gainThird = ctx.createGain();

    // Fast acoustic pluck attack and warm woody decay
    gainA.gain.setValueAtTime(0.0001, now);
    gainA.gain.linearRampToValueAtTime(0.65, now + 0.004);
    gainA.gain.exponentialRampToValueAtTime(0.18, now + 0.2);
    gainA.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    gainB.gain.setValueAtTime(0.0001, now);
    gainB.gain.linearRampToValueAtTime(0.45, now + 0.006);
    gainB.gain.exponentialRampToValueAtTime(0.12, now + 0.18);
    gainB.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    gainOct.gain.setValueAtTime(0.0001, now);
    gainOct.gain.linearRampToValueAtTime(0.25, now + 0.003);
    gainOct.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(duration, 0.45));

    gainThird.gain.setValueAtTime(0.0001, now);
    gainThird.gain.linearRampToValueAtTime(0.12, now + 0.002);
    gainThird.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(duration, 0.25));

    oscA.connect(gainA);
    oscB.connect(gainB);
    oscOct.connect(gainOct);
    oscThird.connect(gainThird);

    gainA.connect(bowlLow);
    gainB.connect(bowlLow);
    gainOct.connect(bowlLow);
    gainThird.connect(bowlLow);

    bowlLow.connect(bowlMid);
    bowlMid.connect(bowlHigh);
    bowlHigh.connect(noteGain);

    noteGain.gain.setValueAtTime(0.9, now);
    noteGain.gain.setValueAtTime(0.9, now + duration - 0.06);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noteGain.connect(this.synthGain || ctx.destination);

    oscA.start(now);
    oscB.start(now);
    oscOct.start(now);
    oscThird.start(now);

    const stopTime = now + duration + 0.05;
    oscA.stop(stopTime);
    oscB.stop(stopTime);
    oscOct.stop(stopTime);
    oscThird.stop(stopTime);

    return duration;
  }

  /**
   * Realistic Acoustic Guitar
   */
  private synthesizeRealGuitar(ctx: AudioContext, now: number, freq: number, duration: number): number {
    const noteGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3800, now);
    filter.frequency.exponentialRampToValueAtTime(950, now + duration);
    filter.Q.setValueAtTime(1.8, now);

    const bodyRes = ctx.createBiquadFilter();
    bodyRes.type = 'peaking';
    bodyRes.frequency.setValueAtTime(110, now);
    bodyRes.Q.setValueAtTime(2.0, now);
    bodyRes.gain.setValueAtTime(5.0, now);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);

    const g1 = ctx.createGain();
    const g2 = ctx.createGain();
    g1.gain.setValueAtTime(0.65, now);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    g2.gain.setValueAtTime(0.3, now);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.6);

    osc1.connect(g1);
    osc2.connect(g2);
    g1.connect(bodyRes);
    g2.connect(bodyRes);
    bodyRes.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.synthGain || ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.05);
    osc2.stop(now + duration + 0.05);
    return duration;
  }

  /**
   * Ultra-Realistic Human Singing Voice Synthesis
   * Models acoustic human vocal tract formants (F1, F2, F3, F4 Singer's Formant),
   * natural vocal cord glottal pulse train, breathiness, micro-portamento attack,
   * and progressive 5.3 Hz delayed musical vibrato.
   */
  private synthesizeRealVocal(
    ctx: AudioContext,
    now: number,
    freq: number,
    duration: number,
    vowel?: VocalSampleVowel
  ): number {
    const activeVowel = vowel || this.currentVocalVowel || 'aah';
    const noteGain = ctx.createGain();

    // 4 Acoustic Vocal Tract Formants based on chosen human vowel (Aah, Ooh, Mmm)
    let f1Freq = 720;
    let f1Q = 4.2;
    let f2Freq = 1240;
    let f2Q = 5.5;
    let f3Freq = 2550;
    let f3Q = 6.0;
    let f4Freq = 3050;
    let f4Q = 4.0;
    let f4Gain = 6.0;
    let glottalLevel = 0.75;
    let subLevel = 0.25;
    let breathLevel = 0.035;

    if (activeVowel === 'ooh') {
      // "Ooh" Vowel: rounded lips, deep pharynx, warm low formants
      f1Freq = 340;
      f1Q = 4.8;
      f2Freq = 840;
      f2Q = 5.8;
      f3Freq = 2200;
      f3Q = 5.0;
      f4Freq = 2850;
      f4Q = 3.5;
      f4Gain = 3.0;
      glottalLevel = 0.60;
      subLevel = 0.40;
      breathLevel = 0.025;
    } else if (activeVowel === 'mmm') {
      // "Mmm" Vowel: nasalized closed-mouth humming, warm chest resonance
      f1Freq = 260;
      f1Q = 6.5;
      f2Freq = 1050;
      f2Q = 7.0;
      f3Freq = 1950;
      f3Q = 6.0;
      f4Freq = 2600;
      f4Q = 4.0;
      f4Gain = 0.0;
      glottalLevel = 0.45;
      subLevel = 0.55;
      breathLevel = 0.012;
    }

    // Formant 1: Throat/Pharyngeal resonance
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(f1Freq, now);
    f1.Q.setValueAtTime(f1Q, now);

    // Formant 2: Oral/Tongue cavity resonance
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(f2Freq, now);
    f2.Q.setValueAtTime(f2Q, now);

    // Formant 3: Upper oral/nasal cavity
    const f3 = ctx.createBiquadFilter();
    f3.type = 'bandpass';
    f3.frequency.setValueAtTime(f3Freq, now);
    f3.Q.setValueAtTime(f3Q, now);

    // Formant 4: Singer's Formant / Vocal projection
    const f4 = ctx.createBiquadFilter();
    f4.type = 'peaking';
    f4.frequency.setValueAtTime(f4Freq, now);
    f4.Q.setValueAtTime(f4Q, now);
    f4.gain.setValueAtTime(f4Gain, now);

    // Primary Glottal Pulse Generator (warm sawtooth vocal fold vibration)
    const glottal = ctx.createOscillator();
    glottal.type = 'sawtooth';

    // Sub-harmonic warmth oscillator for chest resonance in human voice
    const subOsc = ctx.createOscillator();
    subOsc.type = 'triangle';

    // Natural 25ms human pitch glide at vocal onset (singers adjust pitch subtly upon phonation)
    const attackPortamentoMs = 0.028;
    const initialFreq = freq * 0.985;
    glottal.frequency.setValueAtTime(initialFreq, now);
    glottal.frequency.exponentialRampToValueAtTime(freq, now + attackPortamentoMs);
    subOsc.frequency.setValueAtTime(initialFreq, now);
    subOsc.frequency.exponentialRampToValueAtTime(freq, now + attackPortamentoMs);

    // Progressive Musical Vibrato (5.3 Hz, delayed onset after 0.22s, expanding to ~1.3% width)
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.setValueAtTime(5.3, now);
    vibratoGain.gain.setValueAtTime(0.0001, now);
    vibratoGain.gain.setValueAtTime(0.0001, now + 0.22);
    vibratoGain.gain.linearRampToValueAtTime(freq * 0.013, now + 0.65);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(glottal.frequency);
    vibratoGain.connect(subOsc.frequency);
    vibrato.start(now);
    vibrato.stop(now + duration + 0.05);

    // Organic vocal breathiness (subtle white noise through formant filter)
    const bufferSize = ctx.sampleRate * 0.1;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * breathLevel;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(breathLevel, now + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    noiseSource.connect(noiseGain);
    noiseGain.connect(f1);

    // Glottal source gains
    const glottalGain = ctx.createGain();
    const subGain = ctx.createGain();

    glottalGain.gain.setValueAtTime(0.0001, now);
    glottalGain.gain.linearRampToValueAtTime(glottalLevel, now + 0.06);
    glottalGain.gain.setValueAtTime(glottalLevel, now + duration - 0.12);
    glottalGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(subLevel, now + 0.08);
    subGain.gain.setValueAtTime(subLevel, now + duration - 0.15);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    glottal.connect(glottalGain);
    subOsc.connect(subGain);

    // Formant routing
    glottalGain.connect(f1);
    glottalGain.connect(f2);
    glottalGain.connect(f3);
    subGain.connect(f1);

    f1.connect(f4);
    f2.connect(f4);
    f3.connect(f4);

    f4.connect(noteGain);
    noteGain.gain.setValueAtTime(1.0, now);
    noteGain.connect(this.synthGain || ctx.destination);

    glottal.start(now);
    subOsc.start(now);
    noiseSource.start(now);

    const stopTime = now + duration + 0.06;
    glottal.stop(stopTime);
    subOsc.stop(stopTime);
    noiseSource.stop(stopTime);

    return duration;
  }

  /**
   * Realistic Bowed Strings / Cello
   */
  private synthesizeRealStrings(ctx: AudioContext, now: number, freq: number, duration: number): number {
    const noteGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.Q.setValueAtTime(1.2, now);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc3.type = 'triangle';

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 1.002, now); // detune ensemble
    osc3.frequency.setValueAtTime(freq * 0.998, now);

    const g1 = ctx.createGain();
    const g2 = ctx.createGain();
    const g3 = ctx.createGain();

    g1.gain.setValueAtTime(0.35, now);
    g2.gain.setValueAtTime(0.3, now);
    g3.gain.setValueAtTime(0.35, now);

    osc1.connect(g1);
    osc2.connect(g2);
    osc3.connect(g3);

    g1.connect(filter);
    g2.connect(filter);
    g3.connect(filter);

    filter.connect(noteGain);
    noteGain.connect(this.synthGain || ctx.destination);

    // Bowed attack
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(0.7, now + 0.12);
    noteGain.gain.setValueAtTime(0.7, now + duration - 0.15);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    osc1.stop(now + duration + 0.05);
    osc2.stop(now + duration + 0.05);
    osc3.stop(now + duration + 0.05);
    return duration;
  }

  /**
   * Key Recording & Playback Methods
   */
  public startRecording() {
    this.isRecordingActive = true;
    this.recordedNotesList = [];
    this.recordingStartTime = Date.now();
    this.notifyRecordingListeners();
  }

  public stopRecording(): RecordedNote[] {
    this.isRecordingActive = false;
    this.notifyRecordingListeners();
    return [...this.recordedNotesList];
  }

  public isRecording(): boolean {
    return this.isRecordingActive;
  }

  public isPlaying(): boolean {
    return this.isPlaybackActive;
  }

  public getRecordedNotes(): RecordedNote[] {
    return [...this.recordedNotesList];
  }

  public clearRecording() {
    this.stopPlayback();
    this.recordedNotesList = [];
    this.notifyRecordingListeners();
  }

  public playRecording(onNotePlay?: (midi: number) => void, onComplete?: () => void) {
    if (this.recordedNotesList.length === 0) return;
    this.stopPlayback();
    this.isPlaybackActive = true;
    this.notifyRecordingListeners();

    let maxTime = 0;
    this.recordedNotesList.forEach((n) => {
      const timeout = window.setTimeout(() => {
        this.playTone(n.frequency, Math.max(0.4, n.duration / 1000));
        if (onNotePlay) onNotePlay(n.midi);
      }, n.startTime);
      this.playbackTimeouts.push(timeout);

      const endTime = n.startTime + n.duration;
      if (endTime > maxTime) maxTime = endTime;
    });

    const finishTimeout = window.setTimeout(() => {
      this.isPlaybackActive = false;
      this.notifyRecordingListeners();
      if (onComplete) onComplete();
    }, maxTime + 300);

    this.playbackTimeouts.push(finishTimeout);
  }

  public playBackRecording(onNotePlay?: (midi: number) => void, onComplete?: () => void) {
    return this.playRecording(onNotePlay, onComplete);
  }

  public stopPlayback() {
    this.playbackTimeouts.forEach((t) => clearTimeout(t));
    this.playbackTimeouts = [];
    this.isPlaybackActive = false;
    this.notifyRecordingListeners();
  }

  public subscribeRecording(cb: RecordingStateCallback): () => void {
    this.recordingListeners.add(cb);
    return () => {
      this.recordingListeners.delete(cb);
    };
  }

  private notifyRecordingListeners() {
    this.recordingListeners.forEach((cb) =>
      cb(this.isRecordingActive, this.isPlaybackActive, this.recordedNotesList.length)
    );
  }

  /**
   * Play celebratory in-tune chime sound (arpeggiated crystal triad)
   */
  public async playSuccessChime() {
    const ctx = await this.getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.06 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(this.synthGain || ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.45);
    });
  }

  /**
   * Play a clean rhythmic tick for metronome / countdown
   */
  public async playTick(isAccented: boolean = false) {
    const ctx = await this.getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isAccented ? 1200 : 800, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.synthGain || ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const audioEngine = new AudioEngine();

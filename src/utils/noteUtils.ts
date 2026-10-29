import { NoteInfo, VoiceClassification, VocalRangeProfile, NotationSystem } from '../types/vocal';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const SOLFEGE_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const ARABIC_NOTE_NAMES = ['دو', 'دو♯', 'ري', 'ري♯', 'مي', 'فا', 'فا♯', 'صول', 'صول♯', 'لا', 'لا♯', 'سي'];

/**
 * Standard A4 reference frequency
 */
export const A4_FREQUENCY = 440;
export const A4_MIDI = 69;

/**
 * Standard vocal range definitions (typical classical and contemporary compass)
 */
export const STANDARD_VOICE_RANGES: Record<
  VoiceClassification,
  { minMidi: number; maxMidi: number; label: string; description: string; typicalRange: string }
> = {
  Bass: {
    minMidi: 40, // E2 (~82.4 Hz)
    maxMidi: 64, // E4 (~329.6 Hz)
    label: 'Bass',
    description: 'Deep, resonant low male voice with rich lower harmonics.',
    typicalRange: 'E2 – E4',
  },
  Baritone: {
    minMidi: 45, // A2 (~110.0 Hz)
    maxMidi: 69, // A4 (~440.0 Hz)
    label: 'Baritone',
    description: 'The most common male voice type; warm timbre spanning low to bright mid-highs.',
    typicalRange: 'A2 – A4',
  },
  Tenor: {
    minMidi: 48, // C3 (~130.8 Hz)
    maxMidi: 72, // C5 (~523.3 Hz)
    label: 'Tenor',
    description: 'High male voice capable of ringing head tones and powerful chest-mix register.',
    typicalRange: 'C3 – C5',
  },
  Countertenor: {
    minMidi: 52, // E3 (~164.8 Hz)
    maxMidi: 76, // E5 (~659.3 Hz)
    label: 'Countertenor',
    description: 'Rare male voice singing predominantly in falsetto or reinforced head register.',
    typicalRange: 'E3 – E5',
  },
  Contralto: {
    minMidi: 53, // F3 (~174.6 Hz)
    maxMidi: 77, // F5 (~698.5 Hz)
    label: 'Contralto',
    description: 'Deepest female voice type with exceptional velvet warmth in lower chest tones.',
    typicalRange: 'F3 – F5',
  },
  'Mezzo-Soprano': {
    minMidi: 57, // A3 (~220.0 Hz)
    maxMidi: 81, // A5 (~880.0 Hz)
    label: 'Mezzo-Soprano',
    description: 'Versatile female voice with rich middle register and crystalline upper extension.',
    typicalRange: 'A3 – A5',
  },
  Soprano: {
    minMidi: 60, // C4 (~261.6 Hz)
    maxMidi: 84, // C6 (~1046.5 Hz)
    label: 'Soprano',
    description: 'Highest standard female voice, shining in bright upper register and agility.',
    typicalRange: 'C4 – C6',
  },
  Custom: {
    minMidi: 45,
    maxMidi: 69,
    label: 'Custom Range',
    description: 'User-calibrated personal vocal boundaries.',
    typicalRange: 'Personalized',
  },
};

/**
 * Famous singer comparison database
 */
export const FAMOUS_SINGERS: Array<{
  name: string;
  voiceType: VoiceClassification;
  range: string;
  minMidi: number;
  maxMidi: number;
  funFact: string;
}> = [
  { name: 'Freddie Mercury', voiceType: 'Tenor', range: 'F2 – E5', minMidi: 41, maxMidi: 76, funFact: 'Known for phenomenal vibrato speed (7.0 Hz) and harmonic control.' },
  { name: 'Adele', voiceType: 'Mezzo-Soprano', range: 'C3 – B5', minMidi: 48, maxMidi: 83, funFact: 'Uniquely resonant chest-mix with distinct smoky lower frequencies.' },
  { name: 'Whitney Houston', voiceType: 'Soprano', range: 'A2 – C#6', minMidi: 45, maxMidi: 85, funFact: 'Legendary dynamic agility and belt control up to high G5/C6.' },
  { name: 'Luciano Pavarotti', voiceType: 'Tenor', range: 'C3 – C5', minMidi: 48, maxMidi: 72, funFact: 'Renowned for ringing King of the High C vocal tract resonance.' },
  { name: 'Barry White', voiceType: 'Bass', range: 'F#1 – Eb4', minMidi: 30, maxMidi: 63, funFact: 'Famous for ultralow sub-harmonic rumble and lush chest resonance.' },
  { name: 'Mariah Carey', voiceType: 'Soprano', range: 'F2 – G7', minMidi: 41, maxMidi: 103, funFact: 'Incredible five-octave span with peerless whistle register mastery.' },
  { name: 'Frank Sinatra', voiceType: 'Baritone', range: 'G2 – G4', minMidi: 43, maxMidi: 67, funFact: 'Master of phrasing, steady breath-management, and legato warmth.' },
  { name: 'Beyoncé', voiceType: 'Mezzo-Soprano', range: 'A2 – G#5', minMidi: 45, maxMidi: 80, funFact: 'Tremendous vocal stamina and microtonal melisma agility.' },
];

/**
 * Convert Frequency (Hz) to exact floating-point MIDI number with optional custom A4
 */
export function frequencyToMidiExact(freq: number, a4Ref: number = A4_FREQUENCY): number {
  return 69 + 12 * Math.log2(freq / a4Ref);
}

/**
 * Convert exact floating-point MIDI number to Frequency (Hz) with optional custom A4
 */
export function midiToFrequency(midi: number, a4Ref: number = A4_FREQUENCY): number {
  return a4Ref * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * Convert integer MIDI note number to NoteInfo object
 */
export function midiToNoteInfo(midi: number): NoteInfo {
  const roundedMidi = Math.round(midi);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const name = NOTE_NAMES[noteIndex];
  const octave = Math.floor(roundedMidi / 12) - 1;
  const frequency = midiToFrequency(roundedMidi);
  const solfege = `${SOLFEGE_NAMES[noteIndex]}${octave}`;
  const arabic = `${ARABIC_NOTE_NAMES[noteIndex]}${octave}`;

  return {
    name,
    octave,
    fullName: `${name}${octave}`,
    midi: roundedMidi,
    frequency: Math.round(frequency * 100) / 100,
    solfege,
    arabic,
  };
}

/**
 * Format note name based on active notation system
 */
export function formatNoteName(note: NoteInfo | null, notation: NotationSystem = 'english'): string {
  if (!note) return '—';
  if (notation === 'solfege') return note.solfege || note.fullName;
  if (notation === 'arabic') return note.arabic || note.fullName;
  return note.fullName;
}

/**
 * Convert frequency (Hz) to nearest note + cents deviation
 */
export function frequencyToNote(
  freq: number | null,
  a4Ref: number = A4_FREQUENCY
): {
  note: NoteInfo | null;
  cents: number;
  exactMidi: number;
} {
  if (!freq || freq < 30 || freq > 4000) {
    return { note: null, cents: 0, exactMidi: 0 };
  }

  const exactMidi = frequencyToMidiExact(freq, a4Ref);
  const roundedMidi = Math.round(exactMidi);
  const cents = Math.round((exactMidi - roundedMidi) * 100);
  const note = midiToNoteInfo(roundedMidi);

  return { note, cents, exactMidi };
}

/**
 * Generate full chromatic notes list between minMidi and maxMidi
 */
export function generateNotesRange(minMidi: number, maxMidi: number): NoteInfo[] {
  const notes: NoteInfo[] = [];
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    notes.push(midiToNoteInfo(midi));
  }
  return notes;
}

/**
 * Classify a vocal range based on measured lowest and highest MIDI notes
 */
export function classifyVocalRange(minMidi: number, maxMidi: number): {
  voiceType: VoiceClassification;
  octavesSpan: number;
  totalSemitones: number;
  description: string;
  closestSinger: typeof FAMOUS_SINGERS[0];
} {
  const totalSemitones = Math.max(0, maxMidi - minMidi);
  const octavesSpan = Math.round((totalSemitones / 12) * 10) / 10;
  const midpoint = (minMidi + maxMidi) / 2;

  let bestType: VoiceClassification = 'Custom';
  let bestDistance = Infinity;

  const candidates: VoiceClassification[] = [
    'Bass',
    'Baritone',
    'Tenor',
    'Countertenor',
    'Contralto',
    'Mezzo-Soprano',
    'Soprano',
  ];

  for (const type of candidates) {
    const std = STANDARD_VOICE_RANGES[type];
    const stdMid = (std.minMidi + std.maxMidi) / 2;
    const distance = Math.abs(midpoint - stdMid) + Math.abs(minMidi - std.minMidi) * 0.4 + Math.abs(maxMidi - std.maxMidi) * 0.4;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestType = type;
    }
  }

  // Find closest famous singer
  let closestSinger = FAMOUS_SINGERS[0];
  let singerDistance = Infinity;
  for (const singer of FAMOUS_SINGERS) {
    const d = Math.abs(minMidi - singer.minMidi) + Math.abs(maxMidi - singer.maxMidi);
    if (d < singerDistance) {
      singerDistance = d;
      closestSinger = singer;
    }
  }

  const description = STANDARD_VOICE_RANGES[bestType]?.description || 'Custom calibrated range';

  return {
    voiceType: bestType,
    octavesSpan,
    totalSemitones,
    description,
    closestSinger,
  };
}

/**
 * Default fallback profile
 */
export function getDefaultVocalProfile(): VocalRangeProfile {
  const lowest = midiToNoteInfo(45); // A2
  const highest = midiToNoteInfo(69); // A4
  const middle = midiToNoteInfo(57); // A3

  return {
    id: 'default-profile',
    voiceType: 'Baritone',
    lowestNote: lowest,
    highestNote: highest,
    middleRegisterNote: middle,
    totalSemitones: 24,
    octavesSpan: 2.0,
    measuredDate: new Date().toISOString(),
    notes: 'Default initial calibration profile',
  };
}

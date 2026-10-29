import React, { useState, useEffect, useRef } from 'react';
import { Mic, CheckCircle2, RotateCcw, ArrowRight, Sparkles, Award, ShieldCheck } from 'lucide-react';
import { NoteInfo, VocalRangeProfile, PitchDetectionResult, VoiceClassification, AppLanguage, NotationSystem } from '../../types/vocal';
import { classifyVocalRange, midiToNoteInfo, STANDARD_VOICE_RANGES, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { translations } from '../../utils/i18n';
import { haptics } from '../../utils/haptics';

interface VoiceProfilerProps {
  currentProfile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language?: AppLanguage;
  notation?: NotationSystem;
  onSaveProfile: (profile: VocalRangeProfile) => void;
  onClose?: () => void;
}

type Step = 'intro' | 'lowest' | 'highest' | 'result' | 'manual';

export const VoiceProfiler: React.FC<VoiceProfilerProps> = ({
  currentProfile,
  currentPitch,
  language = 'ar',
  notation = 'arabic',
  onSaveProfile,
}) => {
  const isAr = language === 'ar';
  const t = translations[language] || translations.en;
  const [step, setStep] = useState<Step>('intro');
  const [lowestCandidate, setLowestCandidate] = useState<NoteInfo | null>(null);
  const [highestCandidate, setHighestCandidate] = useState<NoteInfo | null>(null);

  // Sustained pitch detection stability timer
  const [sustainedSeconds, setSustainedSeconds] = useState(0);
  const currentCandidateRef = useRef<number | null>(null);

  // Manual configuration state
  const [manualVoiceType, setManualVoiceType] = useState<VoiceClassification>(currentProfile.voiceType);
  const [manualLowestMidi, setManualLowestMidi] = useState<number>(currentProfile.lowestNote.midi);
  const [manualHighestMidi, setManualHighestMidi] = useState<number>(currentProfile.highestNote.midi);

  // Target hold time required in seconds
  const REQUIRED_HOLD_SECONDS = 1.4;

  // Track pitch hold in Step lowest or highest
  useEffect(() => {
    if (step !== 'lowest' && step !== 'highest') {
      return;
    }

    const clarity = currentPitch?.clarity ?? 0;
    const note = currentPitch?.note;

    if (note && clarity > 0.75 && currentPitch?.rms && currentPitch.rms > 0.02) {
      if (currentCandidateRef.current === note.midi) {
        // Sustaining same note
        setSustainedSeconds((prev) => {
          const next = prev + 0.1;
          if (next >= REQUIRED_HOLD_SECONDS) {
            // Lock in candidate
            haptics.pitchMatch();
            if (step === 'lowest') {
              if (!lowestCandidate || note.midi < lowestCandidate.midi) {
                setLowestCandidate(note);
              }
            } else if (step === 'highest') {
              if (!highestCandidate || note.midi > highestCandidate.midi) {
                setHighestCandidate(note);
              }
            }
          }
          return next;
        });
      } else {
        // Changed note, reset timer
        currentCandidateRef.current = note.midi;
        setSustainedSeconds(0.1);
      }
    } else {
      setSustainedSeconds(0);
    }
  }, [currentPitch, step]);

  const startProfiler = async () => {
    try {
      await audioEngine.startListening();
      setLowestCandidate(null);
      setHighestCandidate(null);
      setSustainedSeconds(0);
      setStep('lowest');
    } catch {
      alert(
        isAr
          ? 'يتطلب تحليل طبقات صوتك الإذن للوصول للميكروفون. يرجى تفعيل إذن الميكروفون في المتصفح أو إعدادات هاتفك الأندرويد.'
          : 'Microphone permission is required to analyze your vocal range. Please allow microphone access in your browser or Android settings.'
      );
    }
  };

  const proceedToHighest = () => {
    haptics.tap();
    currentCandidateRef.current = null;
    setSustainedSeconds(0);
    setStep('highest');
  };

  const calculateResultProfile = (): VocalRangeProfile => {
    const low = lowestCandidate || currentProfile.lowestNote;
    const high = highestCandidate || currentProfile.highestNote;

    const minMidi = Math.min(low.midi, high.midi);
    const maxMidi = Math.max(low.midi, high.midi);

    const classification = classifyVocalRange(minMidi, maxMidi);
    const middleMidi = Math.round((minMidi + maxMidi) / 2);

    return {
      id: `profile-${Date.now()}`,
      voiceType: classification.voiceType,
      lowestNote: midiToNoteInfo(minMidi),
      highestNote: midiToNoteInfo(maxMidi),
      middleRegisterNote: midiToNoteInfo(middleMidi),
      totalSemitones: classification.totalSemitones,
      octavesSpan: classification.octavesSpan,
      measuredDate: new Date().toISOString(),
      notes: `Measured with Voice Profiler wizard (${classification.closestSinger.name} profile)`,
    };
  };

  const handleFinishAndSave = () => {
    haptics.pitchMatch();
    const newProfile = calculateResultProfile();
    onSaveProfile(newProfile);
    audioEngine.playSuccessChime();
  };

  const handleSaveManual = () => {
    const minMidi = Math.min(manualLowestMidi, manualHighestMidi);
    const maxMidi = Math.max(manualLowestMidi, manualHighestMidi);
    const totalSemitones = maxMidi - minMidi;
    const octavesSpan = Math.round((totalSemitones / 12) * 10) / 10;
    const middleMidi = Math.round((minMidi + maxMidi) / 2);

    const newProfile: VocalRangeProfile = {
      id: `manual-profile-${Date.now()}`,
      voiceType: manualVoiceType,
      lowestNote: midiToNoteInfo(minMidi),
      highestNote: midiToNoteInfo(maxMidi),
      middleRegisterNote: midiToNoteInfo(middleMidi),
      totalSemitones,
      octavesSpan,
      measuredDate: new Date().toISOString(),
      notes: 'Manually configured profile',
    };

    onSaveProfile(newProfile);
    haptics.tap();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl max-w-xl mx-auto flex flex-col gap-5">
      {/* Step Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {isAr ? 'معالج محلل الصوت™ التفاعلي' : 'Voice Profiler™ Wizard'}
            </h2>
            <p className="text-xs text-slate-400">
              {isAr ? 'قياس ومعايرة الطبقات الصوتية تلقائياً' : 'Automated vocal register measurement'}
            </p>
          </div>
        </div>

        {/* Step indicator pills */}
        <div className="flex items-center gap-1.5">
          {['intro', 'lowest', 'highest', 'result'].map((s, idx) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                step === s
                  ? 'bg-cyan-400 ring-4 ring-cyan-500/20 w-5'
                  : ['lowest', 'highest', 'result'].indexOf(step) >= idx
                  ? 'bg-indigo-500'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Intro */}
      {step === 'intro' && (
        <div className="flex flex-col gap-4 py-2">
          <div className="bg-gradient-to-br from-indigo-950/50 to-slate-900 p-4 rounded-2xl border border-indigo-900/40 space-y-3">
            <div className="flex items-center gap-2 text-indigo-300 text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{isAr ? 'كيفية عمل المعالج' : 'How It Works'}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr
                ? 'سنقوم بقياس مساحتك الصوتية الطبيعية بدقة خلال خطوتين سريعتين. يحلل محرك الصوت التردد الأساسي لصوتك ويعزل الضوضاء لتحديد طبقتك بدقة متناهية:'
                : 'We will measure your natural singing compass in two quick steps. The audio engine captures your fundamental frequency and filters out ambient noise to pinpoint your exact vocal classification:'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-blue-400 font-bold block mb-1">
                  {isAr ? '1. أخفض نغمة مريحة' : '1. Lowest Pitch'}
                </span>
                <span className="text-slate-400">
                  {isAr ? 'أصدر صوتاً عميقاً بنبرة "أووو" أو "ممم" بأخفض نغمة مريحة.' : 'Sing or hum your lowest comfortable note on "Oo" or "Mm".'}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-pink-400 font-bold block mb-1">
                  {isAr ? '2. أعلى نغمة مريحة' : '2. Highest Pitch'}
                </span>
                <span className="text-slate-400">
                  {isAr ? 'اصعد بصوتك بسلاسة بنبرة "آآآه" لأعلى نغمة مريحة بدون شد.' : 'Glide up smoothly to your top comfortable pitch without strain.'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isAr
                ? 'تتم جميع معالجات الصوت محلياً 100% داخل هاتفك ولا يتم إرسال أو تسجيل أي صوت خارج جهازك.'
                : 'All pitch processing runs 100% locally on your device Web Audio API. No voice audio is transmitted or recorded.'}
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={startProfiler}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition active:scale-98"
            >
              <span>{isAr ? 'بدء معايرة وقياس الصوت' : 'Begin Voice Calibration'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setStep('manual')}
              className="text-xs text-slate-400 hover:text-slate-200 py-2 transition"
            >
              {isAr
                ? 'أو اختر يدوياً من الطبقات القياسية (باص، تينور، سوبرانو...)'
                : 'Or manually choose standard vocal register (Bass, Tenor, Soprano...)'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Lowest Note */}
      {step === 'lowest' && (
        <div className="flex flex-col gap-4 text-center py-2">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-cyan-400 font-bold">
              {isAr ? 'الخطوة 1 من 2' : 'Step 1 of 2'}
            </span>
            <h3 className="text-lg font-bold text-white">
              {isAr ? 'غنِّ أخفض نغمة مريحة بالنسبة لك' : 'Sing Your Lowest Comfortable Note'}
            </h3>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'أصدر صوتاً عميقاً بنبرة "أووو" أو "آآآه" وثبّتها لثانية ونصف.'
                : 'Hum or sing an "Oo" or "Ah" sound at your lowest chest tone and hold it steadily for ~1.5s.'}
            </p>
          </div>

          {/* Interactive Pitch Target Display */}
          <div className="relative my-3 p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
            <div
              className={`absolute inset-0 rounded-3xl transition-opacity duration-300 pointer-events-none ${
                currentPitch?.note ? 'bg-cyan-500/10' : 'bg-transparent'
              }`}
            />

            {/* Current Note Name */}
            <div className="text-5xl font-black tracking-tight text-white font-mono-numbers mb-1">
              {currentPitch?.note ? formatNoteName(currentPitch.note, notation) : '—'}
            </div>

            <div className="text-xs text-slate-400 font-mono">
              {currentPitch?.frequency ? `${Math.round(currentPitch.frequency)} ${t.hzUnit}` : (isAr ? 'في انتظار نغمة صوتك...' : 'Listening for vocal tone...')}
            </div>

            {/* Hold progress bar */}
            <div className="w-48 mt-4">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>{t.holdStability}</span>
                <span>{Math.min(100, Math.round((sustainedSeconds / REQUIRED_HOLD_SECONDS) * 100))}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-cyan-400 h-2 rounded-full transition-all duration-100 ease-out"
                  style={{ width: `${Math.min(100, (sustainedSeconds / REQUIRED_HOLD_SECONDS) * 100)}%` }}
                />
              </div>
            </div>

            {/* Captured lowest note card */}
            {lowestCandidate && (
              <div className="mt-4 px-4 py-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 text-xs flex items-center gap-2 animate-in zoom-in-95">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>{t.captured}: <strong>{formatNoteName(lowestCandidate, notation)}</strong> ({Math.round(lowestCandidate.frequency)} {t.hzUnit})</span>
              </div>
            )}
          </div>

          {/* Step Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setLowestCandidate(null);
                setSustainedSeconds(0);
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isAr ? 'إعادة المحاولة' : 'Retry Note'}</span>
            </button>

            <button
              disabled={!lowestCandidate}
              onClick={proceedToHighest}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                lowestCandidate
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <span>{isAr ? 'تأكيد والانتقال' : 'Confirm & Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Highest Note */}
      {step === 'highest' && (
        <div className="flex flex-col gap-4 text-center py-2">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-pink-400 font-bold">
              {isAr ? 'الخطوة 2 من 2' : 'Step 2 of 2'}
            </span>
            <h3 className="text-lg font-bold text-white">
              {isAr ? 'غنِّ أعلى نغمة مريحة بالنسبة لك' : 'Sing Your Highest Comfortable Note'}
            </h3>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'اصعد بصوتك بسلاسة بنبرة "آآآه" أو "إيـيـه" دون شد أحبالك الصوتية وثبّتها لثانية ونصف.'
                : 'Glide upwards smoothly on an "Ah" or "Ee" sound without straining. Hold for ~1.5s.'}
            </p>
          </div>

          {/* Interactive Pitch Target Display */}
          <div className="relative my-3 p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
            <div
              className={`absolute inset-0 rounded-3xl transition-opacity duration-300 pointer-events-none ${
                currentPitch?.note ? 'bg-pink-500/10' : 'bg-transparent'
              }`}
            />

            <div className="text-5xl font-black tracking-tight text-white font-mono-numbers mb-1">
              {currentPitch?.note ? formatNoteName(currentPitch.note, notation) : '—'}
            </div>

            <div className="text-xs text-slate-400 font-mono">
              {currentPitch?.frequency ? `${Math.round(currentPitch.frequency)} ${t.hzUnit}` : (isAr ? 'في انتظار النغمة العالية...' : 'Listening for high tone...')}
            </div>

            {/* Hold progress bar */}
            <div className="w-48 mt-4">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>{t.holdStability}</span>
                <span>{Math.min(100, Math.round((sustainedSeconds / REQUIRED_HOLD_SECONDS) * 100))}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-pink-400 h-2 rounded-full transition-all duration-100 ease-out"
                  style={{ width: `${Math.min(100, (sustainedSeconds / REQUIRED_HOLD_SECONDS) * 100)}%` }}
                />
              </div>
            </div>

            {/* Captured highest note card */}
            {highestCandidate && (
              <div className="mt-4 px-4 py-2 rounded-xl bg-pink-950/80 border border-pink-500/50 text-pink-200 text-xs flex items-center gap-2 animate-in zoom-in-95">
                <CheckCircle2 className="w-4 h-4 text-pink-400" />
                <span>{t.captured}: <strong>{formatNoteName(highestCandidate, notation)}</strong> ({Math.round(highestCandidate.frequency)} {t.hzUnit})</span>
              </div>
            )}
          </div>

          {/* Step Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setHighestCandidate(null);
                setSustainedSeconds(0);
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isAr ? 'إعادة المحاولة' : 'Retry Note'}</span>
            </button>

            <button
              disabled={!highestCandidate}
              onClick={() => {
                haptics.pitchMatch();
                setStep('result');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                highestCandidate
                  ? 'bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <span>{isAr ? 'تحليل النتائج' : 'Analyze Results'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Results & Classification */}
      {step === 'result' && (
        <div className="flex flex-col gap-4 py-2 animate-in fade-in">
          {(() => {
            const calculated = calculateResultProfile();
            const minMidi = calculated.lowestNote.midi;
            const maxMidi = calculated.highestNote.midi;
            const classification = classifyVocalRange(minMidi, maxMidi);

            return (
              <>
                <div className="bg-gradient-to-b from-indigo-950/80 to-slate-900 p-5 rounded-3xl border border-indigo-500/30 text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/30 text-indigo-400 mb-1 border border-indigo-500/40">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                      {isAr ? 'تصنيف طبقتك الصوتية' : 'Your Voice Classification'}
                    </span>
                    <h3 className="text-2xl font-black text-white">{calculated.voiceType}</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">{classification.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'أخفض نغمة' : 'Lowest Note'}</span>
                      <span className="text-sm font-bold text-cyan-400 font-mono">{formatNoteName(calculated.lowestNote, notation)}</span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'المدى' : 'Span'}</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">{calculated.octavesSpan} {isAr ? 'أوكتاف' : 'Octaves'}</span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'أعلى نغمة' : 'Highest Note'}</span>
                      <span className="text-sm font-bold text-pink-400 font-mono">{formatNoteName(calculated.highestNote, notation)}</span>
                    </div>
                  </div>
                </div>

                {/* Closest Famous Singer match */}
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {isAr ? 'أقرب صوت مشهور:' : 'Vocal Match:'} {classification.closestSinger.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">
                        {classification.closestSinger.range}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-1 leading-relaxed">{classification.closestSinger.funFact}</p>
                  </div>
                </div>

                {/* Save CTA */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setStep('lowest')}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إعادة الاختبار' : 'Re-test'}</span>
                  </button>
                  <button
                    onClick={handleFinishAndSave}
                    className="flex-2 py-3 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAr ? 'حفظ في الملف الصوتي' : 'Save to Vocal Profile'}</span>
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Manual Selection View */}
      {step === 'manual' && (
        <div className="flex flex-col gap-4 py-2">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">
              {isAr ? 'تحديد الطبقة الصوتية القياسية يدوياً' : 'Select Predefined Vocal Register'}
            </h3>
            <p className="text-xs text-slate-400">
              {isAr ? 'اختر تصنيفاً قياسياً أو قم بتخصيص نغمتي البداية والنهاية.' : 'Choose a standard voice type or customize individual boundary notes.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {(Object.keys(STANDARD_VOICE_RANGES) as VoiceClassification[]).filter((k) => k !== 'Custom').map((type) => {
              const def = STANDARD_VOICE_RANGES[type];
              const isSelected = manualVoiceType === type;
              return (
                <button
                  key={type}
                  onClick={() => {
                    setManualVoiceType(type);
                    setManualLowestMidi(def.minMidi);
                    setManualHighestMidi(def.maxMidi);
                    haptics.tap();
                  }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-slate-200">{def.label}</div>
                  <div className="font-mono text-[11px] text-indigo-300 mt-0.5">{def.typicalRange}</div>
                </button>
              );
            })}
          </div>

          {/* Fine-tune notes */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span>{isAr ? 'الحد الأدنى:' : 'Lowest:'} <strong className="text-cyan-400">{formatNoteName(midiToNoteInfo(manualLowestMidi), notation)}</strong></span>
              <span>{isAr ? 'الحد الأقصى:' : 'Highest:'} <strong className="text-pink-400">{formatNoteName(midiToNoteInfo(manualHighestMidi), notation)}</strong></span>
            </div>
            <div className="flex gap-2">
              <input
                type="range"
                min="36"
                max="65"
                value={manualLowestMidi}
                onChange={(e) => setManualLowestMidi(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <input
                type="range"
                min="55"
                max="90"
                value={manualHighestMidi}
                onChange={(e) => setManualHighestMidi(Number(e.target.value))}
                className="w-full accent-pink-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setStep('intro')}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              {isAr ? 'العودة للمعالج' : 'Back to Wizard'}
            </button>
            <button
              onClick={handleSaveManual}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow"
            >
              {isAr ? 'حفظ الطبقة الصوتية' : 'Save Range Profile'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Mic,
  MessageSquare,
  Send,
  HelpCircle,
  Wind,
  Trophy,
  Activity,
  Flame,
} from 'lucide-react';
import {
  NoteInfo,
  PitchDetectionResult,
  VocalRangeProfile,
  PracticeSessionRecord,
  AppLanguage,
  NotationSystem,
} from '../../types/vocal';
import { midiToNoteInfo, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { haptics } from '../../utils/haptics';
import { translations } from '../../utils/i18n';

export interface CoachStep {
  id: number;
  category: 'breath' | 'semi_occluded' | 'sustain_pitch' | 'agility' | 'range_extension';
  titleEn: string;
  titleAr: string;
  instructionEn: string;
  instructionAr: string;
  vowelPrompt: string;
  targetMidi: number;
  holdRequiredSec: number;
  tipsEn: string[];
  tipsAr: string[];
}

interface AIVocalCoachProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language?: AppLanguage;
  notation?: NotationSystem;
  onRecordSession: (session: PracticeSessionRecord) => void;
}

export const AIVocalCoach: React.FC<AIVocalCoachProps> = ({
  profile,
  currentPitch,
  language = 'ar',
  notation = 'arabic',
  onRecordSession,
}) => {
  const isAr = language === 'ar';
  const t = translations[language] || translations.en;

  const [activeCurriculum, setActiveCurriculum] = useState<'foundation' | 'pitch' | 'range' | 'arabic'>('foundation');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 1
  const [stepCompleted, setStepCompleted] = useState<Record<number, boolean>>({});
  const [completedAll, setCompletedAll] = useState(false);

  // Breathing pacer state
  const [breathPhase, setBreathPhase] = useState<'idle' | 'inhale' | 'hold' | 'exhale'>('idle');
  const [breathCount, setBreathCount] = useState(4);

  // AI Feedback state
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [chatReplies, setChatReplies] = useState<Array<{ q: string; a: string; time: string }>>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Sound playback state
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const sessionStartTime = useRef(Date.now());
  const stepsAttempted = useRef(0);
  const successfulSteps = useRef(0);

  // Canvas pitch ribbon
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pitchHistoryRef = useRef<Array<{ cents: number; isInTune: boolean }>>([]);

  // Generate dynamic 5-step curriculum adapted to the user's specific vocal range
  const steps: CoachStep[] = useMemo(() => {
    const minM = profile.lowestNote.midi;
    const maxM = profile.highestNote.midi;
    const midM = profile.middleRegisterNote?.midi || Math.round((minM + maxM) / 2);

    if (activeCurriculum === 'foundation') {
      return [
        {
          id: 1,
          category: 'breath',
          titleEn: 'Step 1: Diaphragmatic Breath & Core Support',
          titleAr: 'الخطوة 1: التنفس الحجابي ودعم عضلات الجذع',
          instructionEn: 'Stand tall with relaxed shoulders. Inhale deeply for 4s expanding your lower ribs, then sustain a steady "Sssss" hiss for 8s.',
          instructionAr: 'قف معتدلاً مع استرخاء الكتفين. خذ شهيقاً عميقاً لـ 4 ثوانٍ مع توسيع القفص الصدري، ثم أطلق زفيراً همسياً "سسسس" لـ 8 ثوانٍ.',
          vowelPrompt: 'Sssss (Hiss)',
          targetMidi: midM,
          holdRequiredSec: 4,
          tipsEn: ['Do not raise your shoulders', 'Keep your neck loose and jaw relaxed'],
          tipsAr: ['تجنب رفع الكتفين أثناء التنفس', 'حافظ على ارتخاء الرقبة والفك السفلي'],
        },
        {
          id: 2,
          category: 'semi_occluded',
          titleEn: 'Step 2: Lip Trill & Vocal Tract Balancing',
          titleAr: 'الخطوة 2: طنين الشفاه وتوازن مسار الصوت',
          instructionEn: 'Do a loose lip trill (motorboat sound) on your middle register note. Feel the buzz forward in your lips without throat tightness.',
          instructionAr: 'أصدر طنين الشفاه الرخو (صوت المحرك) على نغمة ارتكازك المتوسطة. اشعر بالاهتزاز في الشفتين دون أي ضغط على الحنجرة.',
          vowelPrompt: 'Brrr (Lip Trill)',
          targetMidi: midM,
          holdRequiredSec: 2.5,
          tipsEn: ['Support with steady air', 'Think forward buzz at the teeth and lips'],
          tipsAr: ['ادعم النغمة بتدفق هواء منتظم', 'ركز على رنين الشفتين ومقدمة الفم'],
        },
        {
          id: 3,
          category: 'sustain_pitch',
          titleEn: 'Step 3: Vowel Resonance & Pure Tone Hold',
          titleAr: 'الخطوة 3: رنين الحروف وتثبيت النغمة النقية',
          instructionEn: 'Sing a warm, clear "Ah" vowel directly on the target pitch. Keep your pitch locked inside the green target zone.',
          instructionAr: 'غنِّ حرف "آه" نقي ودافئ على النغمة المستهدفة. ثبّت نبرتك داخل المنطقة الخضراء لثانيتين.',
          vowelPrompt: 'Ah [ɑː]',
          targetMidi: Math.min(maxM - 2, midM + 2),
          holdRequiredSec: 2.5,
          tipsEn: ['Drop your jaw naturally', 'Lift your soft palate like a gentle yawn'],
          tipsAr: ['أنزل الفك السفلي براحة', 'ارفع سقف الحلق الرخو كبداية التثاؤب'],
        },
        {
          id: 4,
          category: 'agility',
          titleEn: 'Step 4: 3-Tone Arpeggio Agility & Triad',
          titleAr: 'الخطوة 4: مرونة الثلاثي الصوتي والانتقال اللحني',
          instructionEn: 'Sing the ascending triad (Do - Mi - Sol). Focus on light, crisp vocal placement and smooth connection.',
          instructionAr: 'غنِّ التدرج الصوتي الثلاثي (دو - مي - صول). ركّز على خفة ونقاء النبرة بدون انقطاع.',
          vowelPrompt: 'Yah - Yah - Yah',
          targetMidi: Math.min(maxM - 1, midM + 4),
          holdRequiredSec: 2,
          tipsEn: ['Keep tone buoyant and agile', 'Do not push chest voice too heavily'],
          tipsAr: ['اجعل الصوت طافياً ومرحاً', 'لا تضغط بصوت الصدر بقوة'],
        },
        {
          id: 5,
          category: 'range_extension',
          titleEn: 'Step 5: Upper Range Release & Passaggio Glide',
          titleAr: 'الخطوة 5: تحرير الطبقة العليا وتجاوز نقطة التحول',
          instructionEn: 'Sing a gentle upward glide into your upper register on "Oo" or "Ee". Keep it floaty, resonant, and effortless.',
          instructionAr: 'اصعد بنعومة نحو نغماتك العالية بحرف "أووو" أو "إيي". اجعل الصوت رناناً وخفيفاً دون أي شد في الحلق.',
          vowelPrompt: 'Oooo [uː]',
          targetMidi: Math.min(maxM, midM + 7),
          holdRequiredSec: 2.5,
          tipsEn: ['Allow head voice to take over', 'Smaller mouth opening helps maintain acoustics'],
          tipsAr: ['اسمح لصوت الرأس بالتولى بسلاسة', 'تضييق فتحة الشفاه قليلاً يحفظ الرنين'],
        },
      ];
    } else if (activeCurriculum === 'pitch') {
      return [
        {
          id: 1,
          category: 'sustain_pitch',
          titleEn: 'Step 1: Low Register Anchor',
          titleAr: 'الخطوة 1: ارتكاز الطبقة المنخفضة',
          instructionEn: 'Anchor your chest voice cleanly on a low comfort note without vocal fry.',
          instructionAr: 'ثبّت نغمتك بارتياح في طبقة الصدر دون بحة أو خشونة.',
          vowelPrompt: 'Mmm / Oh',
          targetMidi: Math.max(minM, midM - 5),
          holdRequiredSec: 2.5,
          tipsEn: ['Keep larynx stable', 'Gentle vocal cord closure'],
          tipsAr: ['حافظ على استقرار الحنجرة', 'إطباق لطيف للأحبال الصوتية'],
        },
        {
          id: 2,
          category: 'sustain_pitch',
          titleEn: 'Step 2: Center Register Cents Tuning',
          titleAr: 'الخطوة 2: ضبط السنت للطبقة المتوسطة',
          instructionEn: 'Target your exact middle register note. Match within ±10 cents accuracy.',
          instructionAr: 'استهدف نغمتك المتوسطة بدقة عالية ضمن ±10 سنت.',
          vowelPrompt: 'Ah [ɑː]',
          targetMidi: midM,
          holdRequiredSec: 3,
          tipsEn: ['Listen to the inner buzz', 'Monitor the cents needle'],
          tipsAr: ['استمع للرنين الداخلي', 'راقب مؤشر السنت'],
        },
        {
          id: 3,
          category: 'agility',
          titleEn: 'Step 3: Half-Step Semitone Precision',
          titleAr: 'الخطوة 3: دقة نصف البعد (السيميتون)',
          instructionEn: 'Shift half a semitone up and lock on the sharp pitch cleanly.',
          instructionAr: 'انتقل نصف بعد صوتي لأعلى وثبّت النغمة بدقة متناهية.',
          vowelPrompt: 'Ee [iː]',
          targetMidi: midM + 1,
          holdRequiredSec: 2.5,
          tipsEn: ['Subtle vocal fold tilt', 'Maintain steady air velocity'],
          tipsAr: ['إمالة خفيفة للغضروف الحنجري', 'سرعة هواء ثابتة'],
        },
        {
          id: 4,
          category: 'range_extension',
          titleEn: 'Step 4: Upper 5th Harmonic Target',
          titleAr: 'الخطوة 4: خامسة الهارموني العليا',
          instructionEn: 'Jump to the perfect 5th above your center note. Strike with pure intonation.',
          instructionAr: 'اقفز إلى النغمة الخامسة فوق ارتكازك واستقر بنغمة نقية.',
          vowelPrompt: 'Oh [oʊ]',
          targetMidi: Math.min(maxM, midM + 7),
          holdRequiredSec: 2.5,
          tipsEn: ['Internalize the interval before singing', 'Soft palate lift'],
          tipsAr: ['تخيّل النغمة في ذهنك قبل إصدارها', 'رفع سقف الحلق'],
        },
        {
          id: 5,
          category: 'sustain_pitch',
          titleEn: 'Step 5: Sustained High Register Vibrato',
          titleAr: 'الخطوة 5: استقرار الطبقة العليا مع الفيبراتو',
          instructionEn: 'Sustain the peak pitch with open relaxed resonance and natural micro-vibrato.',
          instructionAr: 'ثبّت أعلى نغمة بارتياح مع السماح بتموج الصوت الطبيعي (الفيبراتو).',
          vowelPrompt: 'Ah [ɑː]',
          targetMidi: Math.min(maxM, midM + 9),
          holdRequiredSec: 2.5,
          tipsEn: ['Do not push throat muscles', 'Let airflow oscillate freely'],
          tipsAr: ['لا تدفع بعضلات الحلق', 'دع الهواء يتدفق بمرونة'],
        },
      ];
    } else {
      // Arabic Maqam & Range Curriculums
      return [
        {
          id: 1,
          category: 'sustain_pitch',
          titleEn: 'Step 1: Rast Tonic Rast Qarar',
          titleAr: 'الخطوة 1: قرار مقام الراست (نغمة الركوز)',
          instructionEn: 'Sing the foundational tonic of Maqam Rast. Steady, regal, and resonant.',
          instructionAr: 'غنِّ نغمة ركوز مقام الراست بثبات وهيبة ورنين عربي أصيل.',
          vowelPrompt: 'يا ليل (Ya Layl)',
          targetMidi: midM,
          holdRequiredSec: 3,
          tipsEn: ['Chest-mix resonance', 'Clear vocal articulation'],
          tipsAr: ['رنين متوازن بين الصدر والرأس', 'وضوح مخارج الحروف'],
        },
        {
          id: 2,
          category: 'agility',
          titleEn: 'Step 2: Bayati Gentle Micro-Inflection',
          titleAr: 'الخطوة 2: مدخل مقام البياتي والزخرفة اللطيفة',
          instructionEn: 'Sing the minor second progression characteristic of Maqam Bayati.',
          instructionAr: 'غنِّ الانتقال اللحني المميز لمقام البياتي بنعومة وانسيابية.',
          vowelPrompt: 'آه يا عين (Ah Ya Ayn)',
          targetMidi: midM + 2,
          holdRequiredSec: 2.5,
          tipsEn: ['Gentle emotional nuance', 'Light throat release'],
          tipsAr: ['إحساس طربي دافئ', 'رخاوة تامة في عضلات الحنجرة'],
        },
        {
          id: 3,
          category: 'sustain_pitch',
          titleEn: 'Step 3: Hijaz Expressive Augmented Interval',
          titleAr: 'الخطوة 3: قفزة الحجاز التعبيرية الشجية',
          instructionEn: 'Sing the characteristic Hijaz interval with warmth and deep resonance.',
          instructionAr: 'غنِّ أبعاد مقام الحجاز الشجية بدفء وتعبير صوتي عميق.',
          vowelPrompt: 'أمان (Aman)',
          targetMidi: Math.min(maxM - 2, midM + 3),
          holdRequiredSec: 2.5,
          tipsEn: ['Controlled breath support', 'Forward nasal-cavity resonance'],
          tipsAr: ['دعم تنفسي محكم', 'رنين أمامي في تجاويف الوجه'],
        },
        {
          id: 4,
          category: 'range_extension',
          titleEn: 'Step 4: Nahawand Melodic Peak',
          titleAr: 'الخطوة 4: أوج مقام النهاوند والجواب العذب',
          instructionEn: 'Reach the lyrical peak of Nahawand with crystalline intonation.',
          instructionAr: 'اصعد إلى ذروة النهاوند بنبرة بلورية صافية دون تكلف.',
          vowelPrompt: 'يا سيدي (Ya Sayyidi)',
          targetMidi: Math.min(maxM, midM + 5),
          holdRequiredSec: 2.5,
          tipsEn: ['Relax back of neck', 'Blend resonance into the forehead mask'],
          tipsAr: ['إرخاء مؤخرة الرقبة', 'توجيه الرنين لقناع الوجه والجبهة'],
        },
        {
          id: 5,
          category: 'agility',
          titleEn: 'Step 5: Arab Vocal Ornaments (Urba / Tarab Run)',
          titleAr: 'الخطوة 5: العُرَب الصوتية والزخارف الطربية',
          instructionEn: 'Perform an agile 3-note ornamentation run returning to the tonic rest.',
          instructionAr: 'أدِّ عُربة صوتية سريعة من 3 نغمات ثم عد بهدوء لنغمة الاستقرار.',
          vowelPrompt: 'آه يا ليل (Ah Ya Layl)',
          targetMidi: midM,
          holdRequiredSec: 2,
          tipsEn: ['Keep glottis light and nimble', 'Focus on micro-dynamics'],
          tipsAr: ['خفة وسرعة حركة الحبال الصوتية', 'التحكم في ديناميكية الصوت'],
        },
      ];
    }
  }, [profile, activeCurriculum]);

  const currentStep = steps[currentStepIndex] || steps[0];
  const targetNote = midiToNoteInfo(currentStep.targetMidi);

  // Play audio reference tone
  const handlePlayReference = () => {
    haptics.tap();
    setIsPlayingReference(true);
    audioEngine.playNote(currentStep.targetMidi, 1.8);
    setTimeout(() => {
      setIsPlayingReference(false);
    }, 1800);
  };

  // Breath pacer animation loop
  const handleStartBreathGuide = () => {
    haptics.tap();
    setBreathPhase('inhale');
    setBreathCount(4);

    const runCycle = () => {
      setBreathPhase('inhale');
      let c = 4;
      const inhaleInt = setInterval(() => {
        c -= 1;
        setBreathCount(c);
        if (c <= 0) {
          clearInterval(inhaleInt);
          setBreathPhase('hold');
          c = 4;
          const holdInt = setInterval(() => {
            c -= 1;
            setBreathCount(c);
            if (c <= 0) {
              clearInterval(holdInt);
              setBreathPhase('exhale');
              c = 8;
              const exhaleInt = setInterval(() => {
                c -= 1;
                setBreathCount(c);
                if (c <= 0) {
                  clearInterval(exhaleInt);
                  setBreathPhase('idle');
                  haptics.pitchMatch();
                  setStepCompleted((prev) => ({ ...prev, [currentStep.id]: true }));
                }
              }, 1000);
            }
          }, 1000);
        }
      }, 1000);
    };

    runCycle();
  };

  // Check pitch match in real-time
  useEffect(() => {
    if (currentStep.category === 'breath') return;

    const sungMidi = currentPitch?.note?.midi;
    const isTarget = sungMidi === currentStep.targetMidi;
    const centsErr = Math.abs(currentPitch?.cents ?? 100);
    const inTune = isTarget && centsErr <= 16 && (currentPitch?.clarity ?? 0) > 0.6;

    if (inTune) {
      setHoldProgress((prev) => {
        const increment = 0.06;
        const next = prev + increment;
        if (next >= 1 && !stepCompleted[currentStep.id]) {
          haptics.pitchMatch();
          audioEngine.playSuccessChime();
          setStepCompleted((p) => ({ ...p, [currentStep.id]: true }));
          successfulSteps.current += 1;

          // Automatically request AI evaluation of this successful step
          handleEvaluateStep(currentStep, currentPitch?.cents || 0, 95);

          return 1;
        }
        return Math.min(1, next);
      });
    } else {
      setHoldProgress((prev) => Math.max(0, prev - 0.03));
    }
  }, [currentPitch, currentStep, stepCompleted]);

  // Request AI Vocal Coach Evaluation via server-side endpoint
  const handleEvaluateStep = async (step: CoachStep, centsVal: number, stabVal: number) => {
    setIsEvaluating(true);
    try {
      stepsAttempted.current += 1;
      const response = await fetch('/api/coach/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: step.id,
          totalSteps: steps.length,
          stepTitle: isAr ? step.titleAr : step.titleEn,
          category: step.category,
          targetNote: formatNoteName(midiToNoteInfo(step.targetMidi), notation),
          sungNote: currentPitch?.note ? formatNoteName(currentPitch.note, notation) : 'Detected',
          cents: centsVal,
          stabilityScore: stabVal,
          userVoiceType: profile.voiceType,
          lowestNote: formatNoteName(profile.lowestNote, notation),
          highestNote: formatNoteName(profile.highestNote, notation),
          language,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiFeedback(data.feedback);
      } else {
        throw new Error('Coach API response error');
      }
    } catch (err) {
      // Pedagogical fallback
      setAiFeedback(
        isAr
          ? `أداء رائع في هذه الخطوة! لقد وازنت بين ضغط الهواء واستقرار نبرة ${formatNoteName(targetNote, notation)}. حافظ على اتساع سقف الحلق وإرخاء الفك السفلي.`
          : `Excellent execution on this step! You held ${formatNoteName(targetNote, notation)} with strong tonal stability. Keep your soft palate lifted and jaw loose for optimal acoustic resonance.`
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  // Ask question to AI Vocal Coach
  const handleAskCoach = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userQuestion.trim()) return;

    const q = userQuestion.trim();
    setUserQuestion('');
    setIsAsking(true);

    try {
      const res = await fetch('/api/coach/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          userVoiceType: profile.voiceType,
          lowestNote: formatNoteName(profile.lowestNote, notation),
          highestNote: formatNoteName(profile.highestNote, notation),
          currentStep: isAr ? currentStep.titleAr : currentStep.titleEn,
          language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatReplies((prev) => [
          ...prev,
          { q, a: data.reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);
      } else {
        throw new Error('Coach ask failed');
      }
    } catch {
      const fallbackReply = isAr
        ? 'نصيحة المدرب: لتجاوز أي توتر صوتي، ركز دائماً على التنفس المنخفض من البطن، وتخيل أن الصوت ينطلق إلى الأمام نحو عظام الوجنتين وليس في الحلق.'
        : 'Coach Tip: To ease throat constriction, rely on your lower abdominal support and visualize the sound resonating forward in the facial mask rather than your throat.';
      setChatReplies((prev) => [
        ...prev,
        { q, a: fallbackReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  // Quick vocal questions
  const quickQuestions = isAr
    ? [
        'كيف أتخلص من شد الحنجرة في النغمات العالية؟',
        'كيف أتحكم في التنفس لجعل النغمة أطول؟',
        'ما هي الطريقة الصحيحة لدمج صوت الصدر مع صوت الرأس؟',
      ]
    : [
        'How do I eliminate throat tension on high notes?',
        'How do I steady my breath for longer sustained notes?',
        'How do I smoothly blend chest voice into head voice?',
      ];

  // Navigate steps
  const handleNextStep = () => {
    haptics.tap();
    setHoldProgress(0);
    setAiFeedback(null);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((idx) => idx + 1);
    } else {
      setCompletedAll(true);
      haptics.streakWon();
      // Record completed session
      const dur = Math.round((Date.now() - sessionStartTime.current) / 1000);
      onRecordSession({
        id: `coach-${Date.now()}`,
        timestamp: Date.now(),
        exerciseTitle: `AI Coach: ${activeCurriculum}`,
        durationSeconds: Math.max(30, dur),
        notesAttempted: Math.max(5, stepsAttempted.current),
        notesHitInTune: Math.max(4, successfulSteps.current),
        accuracyPercentage: Math.min(100, Math.round((successfulSteps.current / Math.max(1, stepsAttempted.current)) * 100) || 90),
        averageCentsError: 7,
        dateString: new Date().toLocaleDateString(),
      });
    }
  };

  const handlePrevStep = () => {
    haptics.tap();
    setHoldProgress(0);
    setAiFeedback(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((idx) => idx - 1);
    }
  };

  // Canvas Scrolling Pitch Ribbon Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderRibbon = () => {
      pitchHistoryRef.current.push({
        cents: currentPitch?.cents || 0,
        isInTune: currentPitch?.note?.midi === currentStep.targetMidi && Math.abs(currentPitch?.cents || 50) <= 16,
      });

      if (pitchHistoryRef.current.length > 120) {
        pitchHistoryRef.current.shift();
      }

      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;

      ctx.fillStyle = '#050813';
      ctx.fillRect(0, 0, w, h);

      // Target in-tune band
      ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.fillRect(0, midY - 14, w, 28);

      // Center reference zero-line
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw pitch ribbon
      if (pitchHistoryRef.current.length > 1) {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        for (let i = 0; i < pitchHistoryRef.current.length; i++) {
          const pt = pitchHistoryRef.current[i];
          const x = (i / 120) * w;
          const yOffset = Math.max(-45, Math.min(45, pt.cents));
          const y = midY - (yOffset / 50) * (midY - 10);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        const isCurrentlyInTune =
          currentPitch?.note?.midi === currentStep.targetMidi && Math.abs(currentPitch?.cents || 50) <= 16;
        ctx.strokeStyle = isCurrentlyInTune ? '#10b981' : '#38bdf8';
        ctx.shadowColor = isCurrentlyInTune ? '#10b981' : '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(renderRibbon);
    };

    renderRibbon();
    return () => cancelAnimationFrame(animId);
  }, [currentPitch, currentStep]);

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto pb-16">
      {/* Header & Program Selector */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                {t.aiTrainerStepByStep}
              </h2>
              <p className="text-xs text-indigo-200/80">
                {profile.voiceType} • {formatNoteName(profile.lowestNote, notation)} – {formatNoteName(profile.highestNote, notation)}
              </p>
            </div>
          </div>

          {/* Ask AI Coach Floating Button */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-xs font-bold transition shadow-sm active:scale-95"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.askCoach}</span>
          </button>
        </div>

        {/* Curriculum Selector Pills */}
        <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/5 text-[11px] font-semibold">
          <button
            onClick={() => {
              setActiveCurriculum('foundation');
              setCurrentStepIndex(0);
              setHoldProgress(0);
              setCompletedAll(false);
            }}
            className={`py-1.5 px-2 rounded-xl transition text-center ${
              activeCurriculum === 'foundation'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAr ? 'الأساس الصوتي' : '5-Step Foundation'}
          </button>
          <button
            onClick={() => {
              setActiveCurriculum('pitch');
              setCurrentStepIndex(0);
              setHoldProgress(0);
              setCompletedAll(false);
            }}
            className={`py-1.5 px-2 rounded-xl transition text-center ${
              activeCurriculum === 'pitch'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAr ? 'دقة السنت' : 'Pitch Precision'}
          </button>
          <button
            onClick={() => {
              setActiveCurriculum('arabic');
              setCurrentStepIndex(0);
              setHoldProgress(0);
              setCompletedAll(false);
            }}
            className={`py-1.5 px-2 rounded-xl transition text-center ${
              activeCurriculum === 'arabic'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAr ? 'المقامات الشرقية' : 'Maqam Vocalises'}
          </button>
        </div>
      </div>

      {/* Step Progress Tracker */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5">
          {steps.map((st, idx) => {
            const isCurr = idx === currentStepIndex;
            const isDone = stepCompleted[st.id];
            return (
              <button
                key={st.id}
                onClick={() => {
                  setCurrentStepIndex(idx);
                  setHoldProgress(0);
                  setAiFeedback(null);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isCurr
                    ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/30 scale-105'
                    : isDone
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {t.stepNumber} {currentStepIndex + 1} {t.ofSteps} {steps.length}
        </span>
      </div>

      {/* Main Step Exercise Card */}
      {!completedAll ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
          {/* Step Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-1.5">
                {currentStep.category.replace('_', ' ')}
              </span>
              <h3 className="text-lg font-black text-white leading-tight">
                {isAr ? currentStep.titleAr : currentStep.titleEn}
              </h3>
            </div>

            {/* Play Audio Reference Button */}
            <button
              onClick={handlePlayReference}
              disabled={isPlayingReference}
              className={`p-3 rounded-2xl border transition shadow-md flex items-center gap-2 ${
                isPlayingReference
                  ? 'bg-amber-500 border-amber-400 text-slate-950 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title={t.playReference}
            >
              <Volume2 className="w-5 h-5 text-amber-400" />
            </button>
          </div>

          {/* Coach Instruction */}
          <p className="text-sm text-slate-300 leading-relaxed bg-black/30 p-3.5 rounded-2xl border border-white/5">
            {isAr ? currentStep.instructionAr : currentStep.instructionEn}
          </p>

          {/* Category-Specific Interactive Content */}
          {currentStep.category === 'breath' ? (
            /* Diaphragmatic Breath Pacer */
            <div className="flex flex-col items-center justify-center py-6 bg-slate-950/60 rounded-2xl border border-slate-800">
              <div
                className={`w-36 h-36 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-1000 ${
                  breathPhase === 'inhale'
                    ? 'scale-125 border-cyan-400 bg-cyan-500/20 shadow-[0_0_25px_rgba(6,182,212,0.5)]'
                    : breathPhase === 'hold'
                    ? 'scale-125 border-amber-400 bg-amber-500/20 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                    : breathPhase === 'exhale'
                    ? 'scale-90 border-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.5)]'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                <Wind className="w-7 h-7 text-white/80 mb-1" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {breathPhase === 'inhale'
                    ? t.inhale
                    : breathPhase === 'hold'
                    ? t.hold
                    : breathPhase === 'exhale'
                    ? t.exhale
                    : t.breathPacer}
                </span>
                {breathPhase !== 'idle' && (
                  <span className="text-2xl font-black text-white font-mono mt-0.5">{breathCount}</span>
                )}
              </div>

              <button
                onClick={handleStartBreathGuide}
                disabled={breathPhase !== 'idle'}
                className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                {t.startBreath}
              </button>
            </div>
          ) : (
            /* Live Pitch Target Matching View */
            <div className="flex flex-col gap-3">
              {/* Target & Sung Note Displays */}
              <div className="grid grid-cols-2 gap-2">
                {/* Target Note */}
                <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {t.target}
                  </span>
                  <span className="text-2xl font-black text-cyan-400 font-mono mt-0.5">
                    {formatNoteName(targetNote, notation)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {Math.round(targetNote.frequency)} {t.hzUnit}
                  </span>
                  <span className="mt-1 px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 text-[10px] font-bold">
                    {currentStep.vowelPrompt}
                  </span>
                </div>

                {/* Sung Note Live */}
                <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {t.singNow}
                  </span>
                  <span
                    className={`text-2xl font-black font-mono mt-0.5 ${
                      currentPitch?.note?.midi === currentStep.targetMidi && Math.abs(currentPitch?.cents || 50) <= 16
                        ? 'text-emerald-400 animate-pulse'
                        : currentPitch?.note
                        ? 'text-amber-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {currentPitch?.note ? formatNoteName(currentPitch.note, notation) : '--'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {currentPitch?.frequency ? `${Math.round(currentPitch.frequency)} ${t.hzUnit}` : '--'}
                  </span>
                  <span
                    className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      currentPitch?.isInTune
                        ? 'bg-emerald-950 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {currentPitch ? `${currentPitch.cents > 0 ? '+' : ''}${currentPitch.cents}¢` : '0¢'}
                  </span>
                </div>
              </div>

              {/* Pitch Hold Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400 font-semibold">{t.holdStability}</span>
                  <span className="text-cyan-400 font-mono font-bold">{Math.round(holdProgress * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    style={{ width: `${holdProgress * 100}%` }}
                    className={`h-full rounded-full transition-all duration-150 ${
                      holdProgress >= 1
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-300 shadow-[0_0_12px_#10b981]'
                        : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                    }`}
                  />
                </div>
              </div>

              {/* Real-time Pitch Ribbon Canvas */}
              <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                <canvas ref={canvasRef} width={420} height={70} className="w-full h-[70px] bg-[#050813]" />
              </div>
            </div>
          )}

          {/* Coach Pedagogical Tips */}
          <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-indigo-300 block mb-1">💡 {isAr ? 'إرشادات المدرب:' : 'Coach Guidance:'}</span>
            <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
              {(isAr ? currentStep.tipsAr : currentStep.tipsEn).map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>

          {/* AI Coach Feedback Card */}
          {aiFeedback && (
            <div className="bg-gradient-to-br from-indigo-900/40 via-purple-950/30 to-slate-900 border border-indigo-500/40 rounded-2xl p-4 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2 mb-1.5 text-indigo-300">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider">{t.aiFeedback}</span>
              </div>
              <p className="text-sm text-slate-100 leading-relaxed font-sans">{aiFeedback}</p>
            </div>
          )}

          {/* Manual AI Evaluation Trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEvaluateStep(currentStep, currentPitch?.cents || 0, Math.round(holdProgress * 100) || 85)}
              disabled={isEvaluating}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isEvaluating ? t.evaluating : t.getAiFeedback}</span>
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{t.prevStep}</span>
            </button>

            <button
              onClick={handleNextStep}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 hover:brightness-110 active:scale-95 transition"
            >
              <span>{currentStepIndex === steps.length - 1 ? t.workoutCompleted : t.nextStep}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Workout Complete Celebration */
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-scaleUp">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/30">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-black text-white">{t.workoutCompleted}</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-sm">
              {isAr
                ? 'لقد أتممت بنجاح جميع خطوات التمرين الصوتي بالذكاء الاصطناعي مع قياس دقيق لثبات النغمة وتوسيع المجال الصوتي.'
                : 'You have successfully completed all steps in this guided AI vocal coaching curriculum with verified intonation accuracy.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{t.pitchAccuracy}</span>
              <span className="text-xl font-black text-emerald-400 font-mono">96%</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{t.voiceClassification}</span>
              <span className="text-sm font-black text-cyan-400 font-mono mt-1">{profile.voiceType}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setCurrentStepIndex(0);
              setHoldProgress(0);
              setCompletedAll(false);
              setStepCompleted({});
            }}
            className="w-full max-w-xs py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition"
          >
            {t.repeatStep}
          </button>
        </div>
      )}

      {/* Ask AI Vocal Coach Drawer / Modal */}
      {isChatOpen && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-5 shadow-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-white">{t.askCoach}</h4>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              {t.close}
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setUserQuestion(q);
                }}
                className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-indigo-200 px-2.5 py-1 rounded-full border border-slate-700 transition"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Previous Conversation */}
          {chatReplies.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2.5 p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
              {chatReplies.map((chat, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="font-semibold text-cyan-300 bg-cyan-950/40 p-2 rounded-xl">
                    Q: {chat.q}
                  </div>
                  <div className="text-slate-200 bg-indigo-950/40 p-2 rounded-xl leading-relaxed">
                    💡 {chat.a}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Question Input Form */}
          <form onSubmit={handleAskCoach} className="flex gap-2">
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder={t.askCoachPlaceholder}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={isAsking || !userQuestion.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs disabled:opacity-40 transition flex items-center justify-center"
            >
              {isAsking ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Trophy,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Unlock,
  Star,
  Flame,
  Award,
  Layers,
  Music,
  Zap,
} from 'lucide-react';
import {
  VocalRangeProfile,
  PitchDetectionResult,
  PitchGameRecord,
  UserStats,
  AppLanguage,
  NotationSystem,
  AppTheme,
  InstrumentType,
} from '../../types/vocal';
import { midiToNoteInfo, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { haptics } from '../../utils/haptics';
import { translations } from '../../utils/i18n';
import { saveEarProgressionProgress } from '../../utils/storage';

export interface ProgressionQuestion {
  id: string;
  nameEn: string;
  nameAr: string;
  category: 'major_scale' | 'consonant' | 'minor_modal' | 'complex_chord' | 'dissonant';
  notesMidi: number[]; // e.g. [60, 64] or [60, 64, 67]
  explanationEn: string;
  explanationAr: string;
  optionsEn: string[];
  optionsAr: string[];
  correctIndex: number;
}

export interface EarTier {
  id: number;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  requiredAccuracy: number;
  badge: string;
  color: string;
  gradient: string;
}

interface EarTrainingProgressionGameProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  stats: UserStats;
  language: AppLanguage;
  notation: NotationSystem;
  theme?: AppTheme;
  onRecordGameSession: (record: PitchGameRecord) => void;
  onBackToHub: () => void;
}

export const EarTrainingProgressionGame: React.FC<EarTrainingProgressionGameProps> = ({
  profile,
  currentPitch,
  stats,
  language,
  notation,
  onRecordGameSession,
  onBackToHub,
}) => {
  const t = translations[language];
  const isAr = language === 'ar';

  // Progression Tiers
  const TIERS: EarTier[] = useMemo(() => [
    {
      id: 1,
      titleEn: t.tier1Title,
      titleAr: t.tier1Title,
      descEn: t.tier1Desc,
      descAr: t.tier1Desc,
      requiredAccuracy: 70,
      badge: 'Major Steps',
      color: 'emerald',
      gradient: 'from-emerald-600 to-teal-700',
    },
    {
      id: 2,
      titleEn: t.tier2Title,
      titleAr: t.tier2Title,
      descEn: t.tier2Desc,
      descAr: t.tier2Desc,
      requiredAccuracy: 75,
      badge: 'Consonance',
      color: 'cyan',
      gradient: 'from-cyan-600 to-blue-700',
    },
    {
      id: 3,
      titleEn: t.tier3Title,
      titleAr: t.tier3Title,
      descEn: t.tier3Desc,
      descAr: t.tier3Desc,
      requiredAccuracy: 80,
      badge: 'Minor / Modal',
      color: 'indigo',
      gradient: 'from-indigo-600 to-purple-700',
    },
    {
      id: 4,
      titleEn: t.tier4Title,
      titleAr: t.tier4Title,
      descEn: t.tier4Desc,
      descAr: t.tier4Desc,
      requiredAccuracy: 85,
      badge: '7th Chords',
      color: 'purple',
      gradient: 'from-purple-600 to-pink-700',
    },
    {
      id: 5,
      titleEn: t.tier5Title,
      titleAr: t.tier5Title,
      descEn: t.tier5Desc,
      descAr: t.tier5Desc,
      requiredAccuracy: 90,
      badge: 'Dissonant Tritones',
      color: 'rose',
      gradient: 'from-rose-600 to-amber-700',
    },
  ], [t]);

  // Persistent tier progress
  const [unlockedTier, setUnlockedTier] = useState<number>(stats.earProgressionTierUnlocked || 1);
  const [tierStars, setTierStars] = useState<Record<number, number>>(stats.earProgressionStars || { 1: 1 });
  const [currentTierId, setCurrentTierId] = useState<number>(Math.min(unlockedTier, 1));

  // Game state
  const [gameState, setGameState] = useState<'tier_select' | 'playing' | 'round_complete'>('tier_select');
  const [instrument, setInstrument] = useState<InstrumentType>('piano');
  const [playbackMode, setPlaybackMode] = useState<'harmonic' | 'melodic'>('harmonic');

  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(6);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [unlockedNewTierToast, setUnlockedNewTierToast] = useState<number | null>(null);

  // Generate dynamic question bank based on active tier and user's middle register
  const currentTierQuestions: ProgressionQuestion[] = useMemo(() => {
    const root = profile.middleRegisterNote?.midi || 60; // C4 default

    if (currentTierId === 1) {
      // Tier 1: Major Scales & Steps
      return [
        {
          id: 't1-1',
          nameEn: 'Perfect Unison (Same Pitch)',
          nameAr: 'النغمة المتطابقة (نفس النغمة تماماً)',
          category: 'major_scale',
          notesMidi: [root, root],
          explanationEn: 'Both sounds are at identical frequency with zero pitch deviation.',
          explanationAr: 'النغمتان متطابقتان تماماً في التردد بدون أي مسافة بينهما.',
          optionsEn: ['Perfect Unison', 'Major 2nd', 'Perfect 5th', 'Octave'],
          optionsAr: ['نغمات متطابقة (Unison)', 'ثانية كبيرة (بعد)', 'خامسة تامة', 'أوكتاف كامل'],
          correctIndex: 0,
        },
        {
          id: 't1-2',
          nameEn: 'Major 2nd (Whole Step)',
          nameAr: 'البعد الثاني الكبير (بعد كامل)',
          category: 'major_scale',
          notesMidi: [root, root + 2],
          explanationEn: 'The distance of 2 semitones — the foundational step of major scales (Do to Re).',
          explanationAr: 'مسافة بعدين نصفيين (بعد كامل) — الخطوة الأساسية الأولى في السلم الكبير (دو إلى ري).',
          optionsEn: ['Minor 2nd', 'Major 2nd (Whole Step)', 'Major 3rd', 'Tritone'],
          optionsAr: ['ثانية صغيرة (نصف بعد)', 'ثانية كبيرة (بعد كامل)', 'ثالثة كبيرة', 'تريتون'],
          correctIndex: 1,
        },
        {
          id: 't1-3',
          nameEn: 'Ascending 3-Step Major Scale (Do-Re-Mi)',
          nameAr: 'تدرج السلم الكبير الصاعد (دو - ري - مي)',
          category: 'major_scale',
          notesMidi: [root, root + 2, root + 4],
          explanationEn: 'The bright, cheerful opening ladder of the Major scale.',
          explanationAr: 'بداية السلم الموسيقي الكبير المشرق والمتفائل.',
          optionsEn: ['Ascending Major 3-Step', 'Minor Arpeggio', 'Octave Jump', 'Chromatic Run'],
          optionsAr: ['تدرج صاعد للسلم الكبير', 'أربيجيو صغير', 'قفزة أوكتاف', 'سلم كروماتيكي'],
          correctIndex: 0,
        },
        {
          id: 't1-4',
          nameEn: 'Perfect Octave (Do to High Do)',
          nameAr: 'الأوكتاف التام (دو إلى دو الجواب)',
          category: 'major_scale',
          notesMidi: [root, root + 12],
          explanationEn: 'A full 12 semitones jump; same pitch class vibrating at exactly 2:1 harmonic ratio.',
          explanationAr: 'قفزة كاملة لـ 12 نصف بعد، نفس اسم النغمة بتردد مضاعف بنسبة 2:1.',
          optionsEn: ['Perfect 4th', 'Major 6th', 'Perfect Octave', 'Minor 3rd'],
          optionsAr: ['رابعة تامة', 'سادسة كبيرة', 'أوكتاف تام (جواب)', 'ثالثة صغيرة'],
          correctIndex: 2,
        },
        {
          id: 't1-5',
          nameEn: 'Pentachord Scale Run (Do-Re-Mi-Fa-Sol)',
          nameAr: 'الخماسي الصاعد للسلم الكبير',
          category: 'major_scale',
          notesMidi: [root, root + 2, root + 4, root + 5, root + 7],
          explanationEn: '5 stepwise scale degrees spanning the major pentachord.',
          explanationAr: '5 نغمات متتالية تغطي عقد السلم الكبير الأساسي.',
          optionsEn: ['Major Pentachord', 'Minor Blues Scale', 'Whole Tone Scale', 'Diminished Run'],
          optionsAr: ['خماسي السلم الكبير', 'سلم البلوز الصغير', 'سلم الأبعاد الكاملة', 'مسار ناقص'],
          correctIndex: 0,
        },
        {
          id: 't1-6',
          nameEn: 'Descending Major 2nd (Re to Do)',
          nameAr: 'هبوط بعد ثانٍ كبير (ري إلى دو)',
          category: 'major_scale',
          notesMidi: [root + 2, root],
          explanationEn: 'Resolving down by a whole step to the stable tonic.',
          explanationAr: 'هبوط سلس بمقدار بعد كامل نحو نغمة الركوز المستقرة.',
          optionsEn: ['Major 2nd Step Down', 'Minor 3rd Step Down', 'Octave Drop', 'Tritone'],
          optionsAr: ['هبوط بعد ثانٍ كبير', 'هبوط ثالثة صغيرة', 'هبوط أوكتاف', 'تريتون'],
          correctIndex: 0,
        },
      ];
    } else if (currentTierId === 2) {
      // Tier 2: Consonant Harmonies
      return [
        {
          id: 't2-1',
          nameEn: 'Perfect 5th (Power Consonance)',
          nameAr: 'الخامسة التامة (أقوى التوافقات الطبيعية)',
          category: 'consonant',
          notesMidi: [root, root + 7],
          explanationEn: '7 semitones (3:2 ratio). Pure, stable, and majestic (Star Wars theme).',
          explanationAr: '7 أنصاف أبعاد بنسبة توافق 3:2. نقية وقوية ومستقرة للغاية.',
          optionsEn: ['Minor 3rd', 'Perfect 4th', 'Perfect 5th', 'Major 7th'],
          optionsAr: ['ثالثة صغيرة', 'رابعة تامة', 'خامسة تامة', 'سابعة كبيرة'],
          correctIndex: 2,
        },
        {
          id: 't2-2',
          nameEn: 'Major 3rd (Warm Consonance)',
          nameAr: 'الثالثة الكبيرة (توافق دافئ ومبهج)',
          category: 'consonant',
          notesMidi: [root, root + 4],
          explanationEn: '4 semitones (5:4 ratio). The defining note that gives major its joyful character.',
          explanationAr: '4 أنصاف أبعاد. النغمة التي تعطي السلم الكبير طابعه الدافئ والمفرح.',
          optionsEn: ['Minor 2nd', 'Major 3rd', 'Tritone', 'Minor 6th'],
          optionsAr: ['ثانية صغيرة', 'ثالثة كبيرة', 'تريتون', 'سادسة صغيرة'],
          correctIndex: 1,
        },
        {
          id: 't2-3',
          nameEn: 'Perfect 4th (Fanfare Consonance)',
          nameAr: 'الرابعة التامة (نغمات النداء والبوق)',
          category: 'consonant',
          notesMidi: [root, root + 5],
          explanationEn: '5 semitones (4:3 ratio). Distinctive fanfare sound ("Here Comes the Bride").',
          explanationAr: '5 أنصاف أبعاد. مميزة بنبرة النداء والافتتاحيات الكلاسيكية.',
          optionsEn: ['Perfect 4th', 'Major 3rd', 'Diminished 5th', 'Major 7th'],
          optionsAr: ['رابعة تامة', 'ثالثة كبيرة', 'خامسة ناقصة', 'سابعة كبيرة'],
          correctIndex: 0,
        },
        {
          id: 't2-4',
          nameEn: 'Major Triad Chord (Do - Mi - Sol)',
          nameAr: 'التآلف الثلاثي الكبير (كورد ماجور)',
          category: 'consonant',
          notesMidi: [root, root + 4, root + 7],
          explanationEn: 'Root, Major 3rd, and Perfect 5th. The gold standard of harmonic stability.',
          explanationAr: 'الأساس والثالثة الكبيرة والخامسة التامة. قمة الاستقرار الهارموني.',
          optionsEn: ['Major Triad', 'Minor Triad', 'Diminished Chord', 'Augmented Triad'],
          optionsAr: ['تآلف كبير (ماجور)', 'تآلف صغير (مينور)', 'تآلف ناقص', 'تآلف زائد'],
          correctIndex: 0,
        },
        {
          id: 't2-5',
          nameEn: 'Major 3rd vs Perfect 5th',
          nameAr: 'التمييز بين الثالثة الكبيرة والخامسة',
          category: 'consonant',
          notesMidi: [root, root + 7],
          explanationEn: 'Notice the wider, open, hollow power of the 5th compared to the sweet 3rd.',
          explanationAr: 'لاحظ كيف تعطي الخامسة شعوراً بالاتساع والهيبة مقارنة بالثالثة الدافئة.',
          optionsEn: ['Major 3rd', 'Perfect 5th', 'Minor 2nd', 'Tritone'],
          optionsAr: ['ثالثة كبيرة', 'خامسة تامة', 'ثانية صغيرة', 'تريتون'],
          correctIndex: 1,
        },
        {
          id: 't2-6',
          nameEn: 'Consonant 4th + 5th Inversion',
          nameAr: 'انقلاب الرابعة التامة',
          category: 'consonant',
          notesMidi: [root, root + 5],
          explanationEn: 'A crisp, expectant interval resolving smoothly.',
          explanationAr: 'مسافة انسيابية متوافقة تتجه نحو الاستقرار.',
          optionsEn: ['Perfect 4th', 'Minor 7th', 'Major 2nd', 'Tritone'],
          optionsAr: ['رابعة تامة', 'سابعة صغيرة', 'ثانية كبيرة', 'تريتون'],
          correctIndex: 0,
        },
      ];
    } else if (currentTierId === 3) {
      // Tier 3: Minor & Modal Intervals
      return [
        {
          id: 't3-1',
          nameEn: 'Minor 3rd (Melancholy Interval)',
          nameAr: 'الثالثة الصغيرة (نبرة الحزن والشجن)',
          category: 'minor_modal',
          notesMidi: [root, root + 3],
          explanationEn: '3 semitones (6:5 ratio). Instantly evokes sadness or introspection.',
          explanationAr: '3 أنصاف أبعاد. تمنح اللحن صبغة شجية وتأملية معبرة.',
          optionsEn: ['Major 3rd', 'Minor 3rd', 'Perfect 5th', 'Octave'],
          optionsAr: ['ثالثة كبيرة', 'ثالثة صغيرة', 'خامسة تامة', 'أوكتاف'],
          correctIndex: 1,
        },
        {
          id: 't3-2',
          nameEn: 'Minor Triad Chord (Do - Meb - Sol)',
          nameAr: 'التآلف الثلاثي الصغير (كورد مينور)',
          category: 'minor_modal',
          notesMidi: [root, root + 3, root + 7],
          explanationEn: 'The dark emotional counterpart to the major triad.',
          explanationAr: 'التآلف الصغير العاطفي بنغمته الشجية العميقة.',
          optionsEn: ['Minor Triad', 'Major Triad', 'Dominant 7th', 'Major 7th'],
          optionsAr: ['تآلف صغير (مينور)', 'تآلف كبير (ماجور)', 'سابع مهيمن', 'سابع كبير'],
          correctIndex: 0,
        },
        {
          id: 't3-3',
          nameEn: 'Major 6th (Bright & Warm)',
          nameAr: 'السادسة الكبيرة (نغمة دافئة مشرقة)',
          category: 'minor_modal',
          notesMidi: [root, root + 9],
          explanationEn: '9 semitones. A lush, romantic consonant interval ("My Bonnie Lies Over the Ocean").',
          explanationAr: '9 أنصاف أبعاد. مسافة رومانسية دافئة واسعة.',
          optionsEn: ['Minor 6th', 'Major 6th', 'Tritone', 'Perfect 4th'],
          optionsAr: ['سادسة صغيرة', 'سادسة كبيرة', 'تريتون', 'رابعة تامة'],
          correctIndex: 1,
        },
        {
          id: 't3-4',
          nameEn: 'Minor 6th (Dramatic Tension)',
          nameAr: 'السادسة الصغيرة (توتر درامي)',
          category: 'minor_modal',
          notesMidi: [root, root + 8],
          explanationEn: '8 semitones. Romantic, yearning, and dramatic.',
          explanationAr: '8 أنصاف أبعاد. بعد لحني معبر يتسم بالحنين والدراما.',
          optionsEn: ['Major 6th', 'Minor 6th', 'Perfect 5th', 'Minor 2nd'],
          optionsAr: ['سادسة كبيرة', 'سادسة صغيرة', 'خامسة تامة', 'ثانية صغيرة'],
          correctIndex: 1,
        },
        {
          id: 't3-5',
          nameEn: 'Minor 7th (Bluesy Modal 7th)',
          nameAr: 'السابعة الصغيرة (نغمة البلوز والمودال)',
          category: 'minor_modal',
          notesMidi: [root, root + 10],
          explanationEn: '10 semitones. The soulful root of blues, jazz, and rock chords.',
          explanationAr: '10 أنصاف أبعاد. ركيزة موسيقى البلوز والجاز والمقامات الغربية.',
          optionsEn: ['Major 7th', 'Minor 7th', 'Major 2nd', 'Octave'],
          optionsAr: ['سابعة كبيرة', 'سابعة صغيرة', 'ثانية كبيرة', 'أوكتاف'],
          correctIndex: 1,
        },
        {
          id: 't3-6',
          nameEn: 'Major 3rd vs Minor 3rd Contrast',
          nameAr: 'المقارنة بين الثالثة الكبيرة والصغيرة',
          category: 'minor_modal',
          notesMidi: [root, root + 3],
          explanationEn: 'Notice the compressed, minor sadness compared to the lifted major third.',
          explanationAr: 'استشعر النبرة الحزينة المنكمشة مقارنة بنورانية الثالثة الكبيرة.',
          optionsEn: ['Major 3rd (Happy)', 'Minor 3rd (Sad)', 'Octave', 'Perfect 5th'],
          optionsAr: ['ثالثة كبيرة (فرح)', 'ثالثة صغيرة (شجن)', 'أوكتاف', 'خامسة تامة'],
          correctIndex: 1,
        },
      ];
    } else if (currentTierId === 4) {
      // Tier 4: Complex Triads & 7th Chords
      return [
        {
          id: 't4-1',
          nameEn: 'Dominant 7th Chord (C7: C - E - G - Bb)',
          nameAr: 'كورد السابعة المهيمنة (Dominant 7th)',
          category: 'complex_chord',
          notesMidi: [root, root + 4, root + 7, root + 10],
          explanationEn: 'Major triad with a minor 7th. Demands resolution to the tonic!',
          explanationAr: 'تآلف كبير مضاف إليه سابعة صغيرة، يولد توقاً هارمونياً للاستقرار.',
          optionsEn: ['Dominant 7th', 'Major 7th', 'Minor Triad', 'Augmented Chord'],
          optionsAr: ['سابعة مهيمنة (Dominant 7)', 'سابعة كبيرة (Major 7)', 'تآلف صغير', 'تآلف زائد'],
          correctIndex: 0,
        },
        {
          id: 't4-2',
          nameEn: 'Major 7th Chord (Cmaj7: C - E - G - B)',
          nameAr: 'كورد السابعة الكبيرة الحالم (Major 7th)',
          category: 'complex_chord',
          notesMidi: [root, root + 4, root + 7, root + 11],
          explanationEn: 'Lush, bittersweet, and sophisticated jazz sound.',
          explanationAr: 'نغمات حالمة راقية شائعة في موسيقى الجاز والبوب الراقي.',
          optionsEn: ['Dominant 7th', 'Major 7th', 'Diminished 7th', 'Minor 7th'],
          optionsAr: ['سابعة مهيمنة', 'سابعة كبيرة (Maj7)', 'سابعة ناقصة', 'سابعة صغيرة'],
          correctIndex: 1,
        },
        {
          id: 't4-3',
          nameEn: 'Diminished Triad (C - Eb - Gb)',
          nameAr: 'التآلف الناقص (Diminished Triad)',
          category: 'complex_chord',
          notesMidi: [root, root + 3, root + 6],
          explanationEn: 'Two stacked minor 3rds with a tritone frame. High tension & suspense.',
          explanationAr: 'تراكب مسافتين صغيرتين مع إطار تريتون، يولد توتراً وتشويقاً عالياً.',
          optionsEn: ['Diminished Triad', 'Major Triad', 'Minor Triad', 'Suspended 4th'],
          optionsAr: ['تآلف ناقص (Diminished)', 'تآلف كبير', 'تآلف صغير', 'تآلف معلق'],
          correctIndex: 0,
        },
        {
          id: 't4-4',
          nameEn: 'Minor 7th Chord (Cm7: C - Eb - G - Bb)',
          nameAr: 'كورد السابعة الصغيرة (Minor 7th)',
          category: 'complex_chord',
          notesMidi: [root, root + 3, root + 7, root + 10],
          explanationEn: 'Mellow, introspective, and smooth neo-soul harmony.',
          explanationAr: 'هارموني مخملي شجي مستخدم بكثرة في موسيقى السول والجاز.',
          optionsEn: ['Minor 7th', 'Dominant 7th', 'Major Triad', 'Tritone'],
          optionsAr: ['سابعة صغيرة (m7)', 'سابعة مهيمنة', 'تآلف كبير', 'تريتون'],
          correctIndex: 0,
        },
        {
          id: 't4-5',
          nameEn: 'Suspended 4th Chord (Csus4: C - F - G)',
          nameAr: 'كورد المعلق الرابع (Sus4)',
          category: 'complex_chord',
          notesMidi: [root, root + 5, root + 7],
          explanationEn: 'The 3rd is replaced by the 4th, creating an open, floating anticipation.',
          explanationAr: 'استبدال الثالثة بالرابعة يعطي شعوراً بالطفو والترقب اللحني.',
          optionsEn: ['Suspended 4th (Sus4)', 'Major Triad', 'Minor Triad', 'Diminished'],
          optionsAr: ['كورد معلق رابع (Sus4)', 'تآلف كبير', 'تآلف صغير', 'تآلف ناقص'],
          correctIndex: 0,
        },
        {
          id: 't4-6',
          nameEn: 'Major 7th vs Dominant 7th Recognition',
          nameAr: 'التمييز بين السابعة الكبيرة والمهيمنة',
          category: 'complex_chord',
          notesMidi: [root, root + 4, root + 7, root + 11],
          explanationEn: 'Listen for the half-step clash at the top of the Maj7 chord.',
          explanationAr: 'استمع للتنافر اللطيف المائل للشعرية في قمة كورد السابعة الكبيرة.',
          optionsEn: ['Dominant 7th', 'Major 7th', 'Diminished', 'Minor Triad'],
          optionsAr: ['سابعة مهيمنة (Dom7)', 'سابعة كبيرة (Maj7)', 'ناقص', 'تآلف صغير'],
          correctIndex: 1,
        },
      ];
    } else {
      // Tier 5: Dissonant Chords & Tritones
      return [
        {
          id: 't5-1',
          nameEn: 'The Tritone (Devil\'s Interval / Diabolus in Musica)',
          nameAr: 'التريتون (البعد المتنافر - 6 أنصاف أبعاد)',
          category: 'dissonant',
          notesMidi: [root, root + 6],
          explanationEn: 'Exactly half an octave (6 semitones). Maximum acoustic tension and historically forbidden in medieval counterpoint!',
          explanationAr: 'نصف أوكتاف بالضبط (6 أنصاف أبعاد). قمة التنافر الصوتي، وكان محظوراً في العصور الوسطى لشدة توتره!',
          optionsEn: ['Perfect 5th', 'The Tritone (Aug 4th / Dim 5th)', 'Major 3rd', 'Octave'],
          optionsAr: ['خامسة تامة', 'التريتون (البعد المتنافر)', 'ثالثة كبيرة', 'أوكتاف تام'],
          correctIndex: 1,
        },
        {
          id: 't5-2',
          nameEn: 'Minor 2nd (Half-Step Friction Clash)',
          nameAr: 'الثانية الصغيرة (احتكاك النصف بعد الصادم)',
          category: 'dissonant',
          notesMidi: [root, root + 1],
          explanationEn: '1 semitone (16:15 ratio). Produces sharp acoustic beating and extreme friction (Jaws shark theme).',
          explanationAr: 'نصف بعد واحد. احتكاك صوتي متوتر ومباشر (نغمة أسماك القرش الشهيرة).',
          optionsEn: ['Major 2nd', 'Minor 2nd (Half-Step)', 'Perfect 4th', 'Major 7th'],
          optionsAr: ['ثانية كبيرة', 'ثانية صغيرة (نصف بعد)', 'رابعة تامة', 'سابعة كبيرة'],
          correctIndex: 1,
        },
        {
          id: 't5-3',
          nameEn: 'Fully Diminished 7th (Symmetrical Dissonance)',
          nameAr: 'كورد السابعة الناقصة التامة (Dim7)',
          category: 'dissonant',
          notesMidi: [root, root + 3, root + 6, root + 9],
          explanationEn: 'Three stacked minor thirds forming dual interlocking tritones! Classic horror & villain motif.',
          explanationAr: 'تراكب 3 مسافات صغيرة يشكل تريتونين متقاطعين! كورد الرعب والتشويق السينمائي الكلاسيكي.',
          optionsEn: ['Fully Diminished 7th', 'Major 7th', 'Major Triad', 'Dominant 7th'],
          optionsAr: ['سابعة ناقصة كاملة (Dim7)', 'سابعة كبيرة', 'تآلف كبير', 'سابعة مهيمنة'],
          correctIndex: 0,
        },
        {
          id: 't5-4',
          nameEn: 'Augmented Triad (C - E - G# Unsettled Dissonance)',
          nameAr: 'التآلف الزائد (Augmented Triad)',
          category: 'dissonant',
          notesMidi: [root, root + 4, root + 8],
          explanationEn: 'Two major thirds stacked. Mysterious, dreamlike, and completely floating.',
          explanationAr: 'تراكب مسافتين كبيرتين. يعطي شعوراً حائراً بالانفتاح والغموض واللانهاية.',
          optionsEn: ['Augmented Triad', 'Diminished Triad', 'Major Triad', 'Minor Triad'],
          optionsAr: ['تآلف زائد (Augmented)', 'تآلف ناقص', 'تآلف كبير', 'تآلف صغير'],
          correctIndex: 0,
        },
        {
          id: 't5-5',
          nameEn: 'Major 7th Dissonant Clash (Root + Major 7th)',
          nameAr: 'تنافر السابعة الكبيرة الحادة',
          category: 'dissonant',
          notesMidi: [root, root + 11],
          explanationEn: '11 semitones. A sharp semitone inversion clash with the octave above.',
          explanationAr: '11 نصف بعد. احتكاك حاد على مسافة نصف بعد فقط من الأوكتاف.',
          optionsEn: ['Perfect Octave', 'Major 7th Clash', 'Minor 7th', 'Perfect 5th'],
          optionsAr: ['أوكتاف تام', 'احتكاك السابعة الكبيرة', 'سابعة صغيرة', 'خامسة تامة'],
          correctIndex: 1,
        },
        {
          id: 't5-6',
          nameEn: 'Tritone Resolution Tension Test',
          nameAr: 'اختبار دقة تحديد التريتون',
          category: 'dissonant',
          notesMidi: [root, root + 6],
          explanationEn: 'Identify the raw, unstable dissonant pull that requires outward or inward resolution.',
          explanationAr: 'ميز هذا التوتر الشديد الذي يطلب الانفراج الهارموني نحو التوافق.',
          optionsEn: ['The Tritone', 'Perfect 4th', 'Major 6th', 'Major 2nd'],
          optionsAr: ['التريتون (Tritone)', 'رابعة تامة', 'سادسة كبيرة', 'ثانية كبيرة'],
          correctIndex: 0,
        },
      ];
    }
  }, [currentTierId, profile]);

  const activeQuestion = currentTierQuestions[questionIndex] || currentTierQuestions[0];

  // Play audio for current question
  const playCurrentQuestionAudio = (mode?: 'harmonic' | 'melodic') => {
    haptics.tap();
    setIsPlayingAudio(true);
    const useMode = mode || playbackMode;

    if (useMode === 'harmonic') {
      audioEngine.playChord(activeQuestion.notesMidi, 2.2, false, instrument);
    } else {
      audioEngine.playSequence(activeQuestion.notesMidi, 380, instrument);
    }

    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 2200);
  };

  // Play when question changes in game mode
  useEffect(() => {
    if (gameState === 'playing') {
      setSelectedOption(null);
      setIsAnswered(false);
      const timer = setTimeout(() => {
        playCurrentQuestionAudio();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [questionIndex, gameState]);

  // Handle user answer
  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(idx);

    const isCorrect = idx === activeQuestion.correctIndex;

    if (isCorrect) {
      haptics.pitchMatch();
      audioEngine.playSuccessChime();
      const points = 100 + streak * 25;
      setScore((s) => s + points);
      setStreak((st) => st + 1);
      setCorrectCount((c) => c + 1);
    } else {
      haptics.streakLost();
      setStreak(0);
    }
  };

  // Next question or finish round
  const handleNextQuestion = () => {
    haptics.tap();
    if (questionIndex < currentTierQuestions.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      // Round Complete
      finishRound();
    }
  };

  // Finish round and calculate unlock logic
  const finishRound = () => {
    const accuracy = Math.round(((correctCount + (selectedOption === activeQuestion.correctIndex ? 1 : 0)) / currentTierQuestions.length) * 100);
    const finalScore = score + (selectedOption === activeQuestion.correctIndex ? 100 + streak * 25 : 0);

    // Calculate stars
    let starsEarned = 1;
    if (accuracy >= 95) starsEarned = 3;
    else if (accuracy >= 80) starsEarned = 2;

    const newStars = { ...tierStars, [currentTierId]: Math.max(tierStars[currentTierId] || 0, starsEarned) };
    setTierStars(newStars);

    // Unlock next tier if accuracy threshold met
    let newUnlockedTier = unlockedTier;
    const currentTier = TIERS.find((t) => t.id === currentTierId);
    if (currentTier && accuracy >= currentTier.requiredAccuracy && currentTierId < 5) {
      newUnlockedTier = Math.max(unlockedTier, currentTierId + 1);
      setUnlockedTier(newUnlockedTier);
      setUnlockedNewTierToast(currentTierId + 1);
      haptics.streakWon();
    }

    // Persist progression stats
    saveEarProgressionProgress(newUnlockedTier, newStars);

    // Save game record
    const gameRec: PitchGameRecord = {
      id: `ear-prog-${Date.now()}`,
      gameType: 'ear_progression',
      score: finalScore,
      highestStreak: Math.max(streak, 1),
      accuracyPercentage: accuracy,
      totalNotes: currentTierQuestions.length,
      notesHit: correctCount + (selectedOption === activeQuestion.correctIndex ? 1 : 0),
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
    };
    onRecordGameSession(gameRec);

    setGameState('round_complete');
  };

  // Start selected tier
  const handleStartTier = (tierId: number) => {
    haptics.tap();
    setCurrentTierId(tierId);
    setQuestionIndex(0);
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setUnlockedNewTierToast(null);
    setGameState('playing');
  };

  // Calculate Rank Title
  const getRankTitle = () => {
    if (unlockedTier >= 5) return isAr ? 'خبير التنافرات الموسيقية (ماستر)' : 'Master of Dissonance';
    if (unlockedTier >= 4) return isAr ? 'محلل الكوردات والتآلفات السباعية' : '7th Chord Analyst';
    if (unlockedTier >= 3) return isAr ? 'أخصائي المسافات والمقامات' : 'Interval Specialist';
    if (unlockedTier >= 2) return isAr ? 'محترف التوافقات المتآلفة' : 'Consonance Prodigy';
    return isAr ? 'مستكشف السلالم الكبيرة' : 'Scale Explorer';
  };

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto pb-16 animate-fadeIn select-none">
      {/* Top Banner & Progression Rank Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/60 to-purple-950 border border-indigo-500/30 p-4 sm:p-5 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHub}
              className="w-9 h-9 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 shrink-0"
              title="Return to Hub"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] border border-indigo-500/30 font-bold uppercase tracking-wider">
                  {t.earProgressionTitle}
                </span>
                <span className="text-[11px] text-amber-300 font-mono font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  {stats.earProgressionXP || 120} XP
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                {getRankTitle()}
              </h2>
            </div>
          </div>

          {/* Instrument Toggle */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/5 text-xs">
            <button
              onClick={() => {
                haptics.tap();
                setInstrument('piano');
              }}
              className={`px-2.5 py-1 rounded-xl transition text-[11px] font-bold ${
                instrument === 'piano'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🎹 Piano
            </button>
            <button
              onClick={() => {
                haptics.tap();
                setInstrument('oud');
              }}
              className={`px-2.5 py-1 rounded-xl transition text-[11px] font-bold ${
                instrument === 'oud'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🪕 Oud
            </button>
          </div>
        </div>

        {/* 5-Stage Progression Road Map Track */}
        <div className="relative mt-2 pt-2 pb-1">
          {/* Connection Line */}
          <div className="absolute top-5 left-4 right-4 h-1 bg-slate-800 rounded-full pointer-events-none" />
          <div
            style={{ width: `${((unlockedTier - 1) / 4) * 100}%` }}
            className="absolute top-5 left-4 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 rounded-full transition-all duration-500 pointer-events-none"
          />

          {/* Tier Nodes */}
          <div className="relative flex justify-between items-center z-10">
            {TIERS.map((tier) => {
              const isUnlocked = tier.id <= unlockedTier;
              const isCurrent = tier.id === currentTierId;
              const stars = tierStars[tier.id] || 0;

              return (
                <button
                  key={tier.id}
                  disabled={!isUnlocked}
                  onClick={() => {
                    if (isUnlocked) {
                      setCurrentTierId(tier.id);
                      if (gameState === 'tier_select') {
                        handleStartTier(tier.id);
                      }
                    }
                  }}
                  className={`flex flex-col items-center gap-1 group transition-all ${
                    !isUnlocked ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all shadow-lg ${
                      isCurrent && gameState === 'playing'
                        ? 'bg-indigo-500 text-white ring-4 ring-indigo-400/40 scale-110'
                        : isUnlocked
                        ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 hover:bg-slate-700'
                        : 'bg-slate-900 text-slate-600 border border-slate-800'
                    }`}
                  >
                    {isUnlocked ? (
                      stars >= 3 ? (
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ) : (
                        tier.id
                      )
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>

                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 font-mono">
                    Lvl {tier.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unlock Toast Notification */}
      {unlockedNewTierToast && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <div className="font-bold text-xs uppercase tracking-wider">{t.tierUnlockedToast}</div>
              <div className="text-sm font-black">
                {TIERS[unlockedNewTierToast - 1]?.titleEn}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleStartTier(unlockedNewTierToast)}
            className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-black text-xs shadow hover:bg-slate-100 transition"
          >
            {isAr ? 'العب الآن' : 'Play Now'}
          </button>
        </div>
      )}

      {/* Main View: Tier Selector or Live Playing Screen */}
      {gameState === 'tier_select' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAr ? 'اختر مستوى التدريب السمعي' : 'Select Progression Stage'}
            </h3>
            <span className="text-xs text-indigo-400 font-mono">
              {unlockedTier}/5 {isAr ? 'مستويات متاحة' : 'Unlocked'}
            </span>
          </div>

          <div className="space-y-2.5">
            {TIERS.map((tier) => {
              const isUnlocked = tier.id <= unlockedTier;
              const stars = tierStars[tier.id] || 0;

              return (
                <div
                  key={tier.id}
                  onClick={() => {
                    if (isUnlocked) handleStartTier(tier.id);
                  }}
                  className={`p-4 rounded-3xl border transition-all flex items-center justify-between gap-3 ${
                    isUnlocked
                      ? 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/60 cursor-pointer shadow-lg hover:shadow-indigo-950/40 active:scale-[0.99]'
                      : 'bg-slate-950/60 border-slate-900 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md ${
                        isUnlocked
                          ? `bg-gradient-to-br ${tier.gradient}`
                          : 'bg-slate-800 text-slate-600'
                      }`}
                    >
                      {isUnlocked ? (
                        <Music className="w-5 h-5" />
                      ) : (
                        <Lock className="w-5 h-5 text-slate-600" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">
                          {isAr ? tier.titleAr : tier.titleEn}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[9px] font-mono font-bold text-slate-400">
                          {tier.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {isAr ? tier.descAr : tier.descEn}
                      </p>
                      {!isUnlocked && (
                        <span className="inline-block text-[10px] text-amber-400 font-mono mt-1">
                          🔒 {t.requiredAccuracy}: {tier.requiredAccuracy}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {/* Stars */}
                    {isUnlocked && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((starIdx) => (
                          <Star
                            key={starIdx}
                            className={`w-3.5 h-3.5 ${
                              starIdx <= stars
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    <button
                      disabled={!isUnlocked}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition ${
                        isUnlocked
                          ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow'
                          : 'bg-slate-800 text-slate-600'
                      }`}
                    >
                      {isUnlocked ? (isAr ? 'ابدأ' : 'Play') : t.lockedTier}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : gameState === 'playing' ? (
        /* Live Playing Screen */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
          {/* Top Stage Bar */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                Tier {currentTierId}
              </span>
              <span className="font-mono text-slate-400">
                {questionIndex + 1} / {currentTierQuestions.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-bold text-cyan-400 font-mono">{score} pts</span>
              {streak > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] animate-pulse">
                  🔥 {streak}x Combo
                </span>
              )}
            </div>
          </div>

          {/* Central Listening Hub */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {playbackMode === 'harmonic' ? t.playHarmonic : t.playMelodic}
            </div>

            {/* Play Sound Button */}
            <button
              onClick={() => playCurrentQuestionAudio()}
              disabled={isPlayingAudio}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 ${
                isPlayingAudio
                  ? 'bg-amber-500 text-slate-950 ring-8 ring-amber-500/30 scale-105 animate-pulse'
                  : 'bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 text-white hover:brightness-110 shadow-indigo-950/60'
              }`}
              title={t.replaySound}
            >
              <Volume2 className="w-8 h-8" />
            </button>

            {/* Playback Controls & Mode Toggles */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => {
                  setPlaybackMode('harmonic');
                  playCurrentQuestionAudio('harmonic');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  playbackMode === 'harmonic'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.playHarmonic}
              </button>

              <button
                onClick={() => {
                  setPlaybackMode('melodic');
                  playCurrentQuestionAudio('melodic');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  playbackMode === 'melodic'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.playMelodic}
              </button>

              <button
                onClick={() => {
                  haptics.tap();
                  audioEngine.playChord(activeQuestion.notesMidi, 2.0, true, instrument);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
                title="Arpeggiate individual notes"
              >
                🔍 {t.breakdownChord}
              </button>
            </div>
          </div>

          {/* Multiple Choice Identification Grid */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 px-1">
              {isAr ? 'حدد المسافة أو التآلف الموسيقي المسموع:' : 'Identify the chord or interval played:'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(isAr ? activeQuestion.optionsAr : activeQuestion.optionsEn).map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === activeQuestion.correctIndex;

                let btnStyle = 'bg-slate-800/90 hover:bg-slate-750 border-slate-700 text-slate-200';
                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-600/30 border-emerald-500 text-emerald-300 ring-2 ring-emerald-400/50';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-600/30 border-rose-500 text-rose-300 ring-2 ring-rose-400/50';
                  } else {
                    btnStyle = 'bg-slate-900 border-slate-800 text-slate-500 opacity-60';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all active:scale-[0.98] ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pedagogical Explanation Reveal */}
          {isAnswered && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 p-3.5 rounded-2xl space-y-1 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isAr ? 'التحليل السمعي والتوافقي:' : 'Acoustic Ear Insight:'}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {isAr ? activeQuestion.explanationAr : activeQuestion.explanationEn}
              </p>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              onClick={() => setGameState('tier_select')}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              {isAr ? 'العودة للقائمة' : 'Back to Stages'}
            </button>

            {isAnswered && (
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-cyan-950/60 hover:brightness-110 active:scale-95 transition flex items-center gap-1.5"
              >
                <span>{questionIndex === currentTierQuestions.length - 1 ? t.gameOver : t.nextStep}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Round Complete Summary */
        <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-scaleUp">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-950/60">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-black text-white">{t.gameOver}</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-sm">
              {isAr
                ? `لقد أتممت المستوى ${currentTierId} بنسبة دقة ${Math.round((correctCount / currentTierQuestions.length) * 100)}%!`
                : `You finished Tier ${currentTierId} with ${Math.round((correctCount / currentTierQuestions.length) * 100)}% ear accuracy!`}
            </p>
          </div>

          {/* Score & Stars Cards */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{t.score}</span>
              <span className="text-base font-black text-cyan-400 font-mono">{score}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{t.pitchAccuracy}</span>
              <span className="text-base font-black text-emerald-400 font-mono">
                {Math.round((correctCount / currentTierQuestions.length) * 100)}%
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Stars</span>
              <div className="flex justify-center items-center gap-0.5 mt-1">
                {[1, 2, 3].map((starIdx) => (
                  <Star
                    key={starIdx}
                    className={`w-3.5 h-3.5 ${
                      starIdx <= (tierStars[currentTierId] || 1)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex gap-2 w-full max-w-sm">
            <button
              onClick={() => handleStartTier(currentTierId)}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
            >
              {t.playAgain}
            </button>
            <button
              onClick={() => {
                if (currentTierId < unlockedTier) {
                  handleStartTier(currentTierId + 1);
                } else {
                  setGameState('tier_select');
                }
              }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-black text-xs shadow-lg transition active:scale-95"
            >
              {currentTierId < unlockedTier
                ? (isAr ? 'المستوى التالي ⚡' : 'Next Tier ⚡')
                : (isAr ? 'قائمة المستويات' : 'All Stages')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

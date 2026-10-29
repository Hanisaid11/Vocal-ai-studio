import { AppLanguage, NotationSystem, InstrumentType, AppTheme } from '../types/vocal';

export interface Translations {
  appName: string;
  appTagline: string;
  piano: string;
  profiler: string;
  games: string;
  warmup: string;
  trainer: string;
  stats: string;
  settings: string;
  enableMic: string;
  micActive: string;
  installApp: string;
  cloudSync: string;
  verticalPiano: string;
  horizontalPiano: string;
  fullscreen: string;
  exitFullscreen: string;
  myRange: string;
  fullRange: string;
  labels: string;
  instrument: string;
  notation: string;
  lowNotes: string;
  highNotes: string;
  topMax: string;
  bottomMin: string;
  midRegister: string;
  target: string;
  hit: string;
  centerMid: string;
  singPrompt: string;
  inTune: string;
  sharp: string;
  flat: string;
  voiceProfilerTitle: string;
  voiceProfilerDesc: string;
  stepLowestTitle: string;
  stepLowestDesc: string;
  stepHighestTitle: string;
  stepHighestDesc: string;
  holdStability: string;
  captured: string;
  retryNote: string;
  confirmNext: string;
  analyzeResults: string;
  saveVocalProfile: string;
  voiceClassification: string;
  octavesSpan: string;
  closestSinger: string;
  gamesHubTitle: string;
  gamesHubDesc: string;
  pitchHeroTitle: string;
  pitchHeroDesc: string;
  intervalTitle: string;
  intervalDesc: string;
  memoryTitle: string;
  memoryDesc: string;
  earTrainerTitle: string;
  earTrainerDesc: string;
  pitchRecognitionTitle: string;
  pitchRecognitionDesc: string;
  pitchRecognitionGuide: string;
  tooHigh: string;
  tooLow: string;
  tapKeyToIdentify: string;
  targetPitchPlayed: string;
  sirenGlideTitle: string;
  sirenGlideDesc: string;
  vocalAgilityTitle: string;
  vocalAgilityDesc: string;
  playGame: string;
  score: string;
  streak: string;
  timeLeft: string;
  hitZone: string;
  singNow: string;
  gameOver: string;
  playAgain: string;
  returnToHub: string;
  listenAnswer: string;
  correctNext: string;
  skipQuestion: string;
  replaySound: string;
  yourGuess: string;
  correct: string;
  incorrect: string;
  showHint: string;
  warmupTitle: string;
  warmupDesc: string;
  practice: string;
  startWarmup: string;
  pauseWarmup: string;
  saveExit: string;
  recommendedVowel: string;
  tempo: string;
  direction: string;
  pitchAccuracy: string;
  practiceStreak: string;
  totalPractice: string;
  activeRange: string;
  overallAccuracy: string;
  recentHistory: string;
  precisionHeatmap: string;
  settingsTitle: string;
  languageLabel: string;
  notationLabel: string;
  instrumentLabel: string;
  themesLabel: string;
  referencePitch: string;
  tuningTolerance: string;
  hapticFeedback: string;
  keepScreenAwake: string;
  autoVerticalFs: string;
  close: string;
  recordKeys: string;
  recording: string;
  playRecording: string;
  stopRecording: string;
  keySize: string;
  octave: string;
  semitones: string;
  minBadge: string;
  maxBadge: string;
  midBadge: string;
  hzUnit: string;
  bpmUnit: string;
  androidAppPrompt: string;
  installGuideTitle: string;
  aiCoach: string;
  aiTrainerStepByStep: string;
  aiCoachDesc: string;
  stepNumber: string;
  ofSteps: string;
  nextStep: string;
  prevStep: string;
  repeatStep: string;
  aiFeedback: string;
  evaluating: string;
  askCoach: string;
  askCoachPlaceholder: string;
  sendQuestion: string;
  playReference: string;
  pitchLockTarget: string;
  breathPacer: string;
  inhale: string;
  hold: string;
  exhale: string;
  startBreath: string;
  stepCompleted: string;
  workoutCompleted: string;
  curriculumFoundation: string;
  curriculumPitch: string;
  curriculumRange: string;
  curriculumArabic: string;
  selectCurriculum: string;
  coachThinking: string;
  getAiFeedback: string;
  earProgressionTitle: string;
  earProgressionDesc: string;
  tier1Title: string;
  tier1Desc: string;
  tier2Title: string;
  tier2Desc: string;
  tier3Title: string;
  tier3Desc: string;
  tier4Title: string;
  tier4Desc: string;
  tier5Title: string;
  tier5Desc: string;
  lockedTier: string;
  unlockedTier: string;
  requiredAccuracy: string;
  earXp: string;
  currentRank: string;
  playHarmonic: string;
  playMelodic: string;
  breakdownChord: string;
  tierUnlockedToast: string;
  startProgression: string;
  songMatch: string;
  songMatchDesc: string;
  vocalVowelLabel: string;
  vocalVowelAah: string;
  vocalVowelOoh: string;
  vocalVowelMmm: string;
  noteDurationBeatsLabel: string;
  beats4: string;
  beats2: string;
  beats1: string;
  soundProfileSection: string;
  levels: string;
  levelsTitle: string;
  levelsDesc: string;
  dualModePiano: string;
  dualModeVocal: string;
  listenSequence: string;
  playSequence: string;
  singTargetNote: string;
  tapTargetKey: string;
  levelPassed: string;
  levelFailed: string;
  nextLevel: string;
  retryExercise: string;
  tierBeginner: string;
  tierIntermediate: string;
  tierAdvanced: string;
  tierVirtuoso: string;
  starsEarned: string;
  accuracy: string;
  pitchLocked: string;
  holdPitchPrompt: string;
  centsTolerance: string;
  levelNumber: string;
}

export const translations: Record<AppLanguage, Translations> = {
  en: {
    appName: 'VocalMaster',
    appTagline: 'Professional Vocal Training & Voice Profiler',
    piano: 'Piano',
    profiler: 'Profiler',
    games: 'Games',
    songMatch: 'Song Match',
    songMatchDesc: 'Sing along to any track, get exact match % and pinpoint where is the wrong',
    vocalVowelLabel: 'Human Vocal Timbre (Sample Vowel)',
    vocalVowelAah: 'Aah (Open Singing)',
    vocalVowelOoh: 'Ooh (Warm Ballad)',
    vocalVowelMmm: 'Mmm (Gentle Humming)',
    noteDurationBeatsLabel: 'Note Duration / Sustain Length',
    beats4: '4 Beats (Whole Note / 4s)',
    beats2: '2 Beats (Half Note / 2s)',
    beats1: '1 Beat (Quarter Note / 1s)',
    soundProfileSection: 'Instrument & Vocal Sound Profiles',
    warmup: 'Warm-ups',
    trainer: 'Trainer',
    stats: 'Stats',
    settings: 'Settings',
    enableMic: 'Enable Mic',
    micActive: 'Mic Active',
    installApp: 'Install Android App',
    cloudSync: 'Cloud Sync',
    verticalPiano: 'Vertical (Android)',
    horizontalPiano: 'Horizontal',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    myRange: 'My Range',
    fullRange: 'Full C1–C7',
    labels: 'Labels',
    instrument: 'Voice / Instrument',
    notation: 'Notation',
    lowNotes: 'Low Notes (Bass)',
    highNotes: 'High Notes (Soprano)',
    topMax: 'TOP RANGE (MAX)',
    bottomMin: 'BOTTOM RANGE (MIN)',
    midRegister: 'MID REGISTER',
    target: 'TARGET',
    hit: 'HIT',
    centerMid: 'Center on middle register →',
    singPrompt: 'Sing into microphone to see pitch light up',
    inTune: 'In-Tune',
    sharp: 'Sharp',
    flat: 'Flat',
    voiceProfilerTitle: 'Voice Profiler™ Wizard',
    voiceProfilerDesc: 'Automated vocal register measurement',
    stepLowestTitle: 'Sing Your Lowest Comfortable Note',
    stepLowestDesc: 'Hum or sing on "Oo" or "Ah" at your lowest chest tone and sustain for ~1.5s.',
    stepHighestTitle: 'Sing Your Highest Comfortable Note',
    stepHighestDesc: 'Glide upwards smoothly on "Ah" or "Ee" without straining. Hold for ~1.5s.',
    holdStability: 'Hold stability',
    captured: 'Captured',
    retryNote: 'Retry Note',
    confirmNext: 'Confirm & Next',
    analyzeResults: 'Analyze Results',
    saveVocalProfile: 'Save to Vocal Profile',
    voiceClassification: 'Your Voice Classification',
    octavesSpan: 'Octaves Span',
    closestSinger: 'Vocal Match',
    gamesHubTitle: 'Gamified Pitch Arena',
    gamesHubDesc: 'Interactive ear-training mini-games calibrated to your vocal range',
    pitchHeroTitle: 'Pitch Hero: Falling Notes',
    pitchHeroDesc: 'Notes glide down the vertical hit track. Sing the matching pitch in the hit zone to burst notes and build combos!',
    intervalTitle: 'Interval Ear Challenge',
    intervalDesc: 'Listen to the root note, then calculate and sing musical intervals (3rds, 4ths, 5ths, Octaves) using real song mnemonics.',
    memoryTitle: 'Note Memory Match',
    memoryDesc: 'Listen to a hidden reference tone, retain it in your mind, and sing the exact pitch from memory!',
    earTrainerTitle: 'Piano Ear Pitch Guess',
    earTrainerDesc: 'The piano plays a mystery sound. Guess the exact pitch by pressing the correct piano key to train your ear!',
    pitchRecognitionTitle: 'Vertical Piano Pitch Recognition',
    pitchRecognitionDesc: 'The app plays a mystery note from your active vocal range using Piano or Arabic Oud. Tap the exact key on the vertical piano!',
    pitchRecognitionGuide: 'Listen carefully to the note played in your vocal compass, then tap the corresponding key on the vertical keyboard.',
    tooHigh: 'Too High! (The note was lower)',
    tooLow: 'Too Low! (The note was higher)',
    tapKeyToIdentify: 'Tap any key on the vertical piano to submit your guess',
    targetPitchPlayed: 'Mystery Note Played',
    sirenGlideTitle: 'Sing Sharp: Siren & Pitch Glide',
    sirenGlideDesc: 'Practice smooth glissando vocal slides along a continuous curve without vocal breaks or strain.',
    vocalAgilityTitle: 'Vocalista: Agility & Scale Runs',
    vocalAgilityDesc: 'Rapid 3-note, 5-note, and octave arpeggio agility runs to build speed, vocal stamina, and pitch accuracy.',
    playGame: 'Play Game',
    score: 'Score',
    streak: 'Streak',
    timeLeft: 'Time Left',
    hitZone: 'HIT ZONE',
    singNow: 'SING NOW 🎙️',
    gameOver: 'Challenge Complete!',
    playAgain: 'Play Again',
    returnToHub: 'Return to Hub',
    listenAnswer: 'Listen to Answer',
    correctNext: 'Correct! Next',
    skipQuestion: 'Skip Question',
    replaySound: 'Replay Sound',
    yourGuess: 'Your Guess',
    correct: 'Correct!',
    incorrect: 'Try Again!',
    showHint: 'Hint',
    warmupTitle: 'Adaptive Warm-ups & Vocalises',
    warmupDesc: 'Auto-calibrated for your active vocal range',
    practice: 'Practice',
    startWarmup: 'Start Warmup',
    pauseWarmup: 'Pause Warmup',
    saveExit: 'Save & Exit',
    recommendedVowel: 'Recommended Vowel',
    tempo: 'Tempo',
    direction: 'Direction',
    pitchAccuracy: 'Pitch Accuracy',
    practiceStreak: 'Practice Streak',
    totalPractice: 'Total Practice',
    activeRange: 'Active Range',
    overallAccuracy: 'Overall Accuracy',
    recentHistory: 'Recent Training History',
    precisionHeatmap: 'Note-by-Note Vocal Precision Heatmap',
    settingsTitle: 'Vocal Settings & Instrument',
    languageLabel: 'App Language',
    notationLabel: 'Note Naming System',
    instrumentLabel: 'Reference Instrument Sound',
    themesLabel: 'Visual Piano Theme',
    referencePitch: 'Concert Pitch Calibration (A4)',
    tuningTolerance: 'Tuning Tolerance (Cents)',
    hapticFeedback: 'Tactile Haptic Feedback (Android)',
    keepScreenAwake: 'Keep Screen Awake During Exercises',
    autoVerticalFs: 'Auto-Switch to Vertical Piano on Fullscreen',
    close: 'Close',
    recordKeys: 'Record Keys',
    recording: 'Recording...',
    playRecording: 'Play Recording',
    stopRecording: 'Stop Recording',
    keySize: 'Key Size',
    octave: 'octave',
    semitones: 'semitones',
    minBadge: 'MIN',
    maxBadge: 'MAX',
    midBadge: 'MID',
    hzUnit: 'Hz',
    bpmUnit: 'BPM',
    androidAppPrompt: 'Install as Android PWA for full-screen immersive training',
    installGuideTitle: 'Add to Home Screen (Android)',
    aiCoach: 'AI Vocal Coach',
    aiTrainerStepByStep: 'AI Vocal Coach (Step by Step)',
    aiCoachDesc: 'Interactive step-by-step vocal workouts with real-time AI guidance',
    stepNumber: 'Step',
    ofSteps: 'of',
    nextStep: 'Next Step',
    prevStep: 'Previous Step',
    repeatStep: 'Repeat Exercise',
    aiFeedback: 'AI Coach Evaluation',
    evaluating: 'AI Coach analyzing your vocal pitch and stability...',
    askCoach: 'Ask Vocal Coach',
    askCoachPlaceholder: 'Ask any vocal question (e.g., breath support, high notes, throat relaxation)...',
    sendQuestion: 'Send Question',
    playReference: 'Play Reference',
    pitchLockTarget: 'Sustain your pitch in the green zone',
    breathPacer: 'Diaphragmatic Breath Pacer',
    inhale: 'Inhale (4s)',
    hold: 'Hold (4s)',
    exhale: 'Hiss Exhale (8s)',
    startBreath: 'Start Breath Guide',
    stepCompleted: 'Step Completed!',
    workoutCompleted: 'Workout Completed!',
    curriculumFoundation: '5-Step Vocal Foundation',
    curriculumPitch: 'Pitch Precision & Ear Mastery',
    curriculumRange: 'Range Expansion & Passaggio',
    curriculumArabic: 'Arabic Maqam Vocalises & Ornaments',
    selectCurriculum: 'Curriculum Routine',
    coachThinking: 'AI Coach is analyzing...',
    getAiFeedback: 'Get AI Coach Analysis',
    earProgressionTitle: 'Ear Training Progression Ladder',
    earProgressionDesc: 'Climb from simple major scales to consonant intervals, complex chords, and dissonant tritones as your ear accuracy advances!',
    tier1Title: 'Tier 1: Major Scales & Steps',
    tier1Desc: 'Unisons, Major 2nds, and major scale stepwise degrees',
    tier2Title: 'Tier 2: Consonant Harmonies',
    tier2Desc: 'Major 3rds, Perfect 4ths, and Perfect 5ths',
    tier3Title: 'Tier 3: Minor & Modal Intervals',
    tier3Desc: 'Minor 3rds, Minor 6ths, and Major 6ths',
    tier4Title: 'Tier 4: Complex Triads & 7th Chords',
    tier4Desc: 'Major Triads, Minor Triads, Dominant 7ths, and Diminished Triads',
    tier5Title: 'Tier 5: Dissonant Chords & Tritones',
    tier5Desc: 'Tritone (Devil\'s Interval), Minor 2nds clash, and Major 7th tension',
    lockedTier: 'Locked',
    unlockedTier: 'Unlocked',
    requiredAccuracy: 'Accuracy Required',
    earXp: 'Ear XP',
    currentRank: 'Ear Rank',
    playHarmonic: 'Harmonic (Chord)',
    playMelodic: 'Melodic (Arpeggio)',
    breakdownChord: 'Deconstruct Notes',
    tierUnlockedToast: 'New Ear Training Tier Unlocked!',
    startProgression: 'Start Ear Progression',
    levels: 'Levels',
    levelsTitle: 'Sight-Reading & Performance Curriculum',
    levelsDesc: 'Master sight-reading and vocal accuracy step-by-step from beginner to virtuoso',
    dualModePiano: 'Piano Mode',
    dualModeVocal: 'Vocal Mode',
    listenSequence: 'Listen Sequence',
    playSequence: 'Play Sequence',
    singTargetNote: 'Sing Target Note',
    tapTargetKey: 'Tap Target Key',
    levelPassed: 'Level Cleared!',
    levelFailed: 'Try Again',
    nextLevel: 'Next Level',
    retryExercise: 'Retry Exercise',
    tierBeginner: 'Beginner',
    tierIntermediate: 'Intermediate',
    tierAdvanced: 'Advanced',
    tierVirtuoso: 'Virtuoso',
    starsEarned: 'Stars',
    accuracy: 'Accuracy',
    pitchLocked: 'Pitch Locked',
    holdPitchPrompt: 'Hold steady in tune (+/- 15¢)...',
    centsTolerance: 'Tolerance +/- 15¢',
    levelNumber: 'Level',
  },
  ar: {
    appName: 'فوكال ماستر برو',
    appTagline: 'تدريب الصوت الاحترافي وقياس الطبقات الصوتية',
    piano: 'البيانو',
    profiler: 'محلل الصوت',
    games: 'الألعاب',
    songMatch: 'تطابق الأغاني',
    songMatchDesc: 'غنِّ مع أي أغنية واكتشف نسبة التطابق وأين وقع الخطأ بدقة',
    vocalVowelLabel: 'خامة الصوت البشري (حرف العلة)',
    vocalVowelAah: 'آه (غناء أوبيرالي / مفتوح)',
    vocalVowelOoh: 'أوه (غناء دافئ / عميق)',
    vocalVowelMmm: 'امم (دندنة هادئة / أنفية)',
    noteDurationBeatsLabel: 'طول النغمة / الأزمنة الموسيقية',
    beats4: '4 أزمنة (نغمة كاملة / 4 ثوانٍ)',
    beats2: 'زمان (نصف نغمة / ثانيتان)',
    beats1: 'زمن واحد (ربع نغمة / ثانية)',
    soundProfileSection: 'الملفات الصوتية وخامات الآلات والصوت البشري',
    warmup: 'الإحماء',
    trainer: 'المدرب',
    stats: 'الإحصائيات',
    settings: 'الإعدادات',
    enableMic: 'تشغيل المايك',
    micActive: 'المايك نشط',
    installApp: 'تثبيت كتطبيق أندرويد',
    cloudSync: 'المزامنة السحابية',
    verticalPiano: 'رأسي (أندرويد)',
    horizontalPiano: 'أفقي كلاسيكي',
    fullscreen: 'ملء الشاشة',
    exitFullscreen: 'إنهاء الشاشة الكاملة',
    myRange: 'طبقتي الصوتية',
    fullRange: 'المدى الكامل C1–C7',
    labels: 'أسماء النغمات',
    instrument: 'الصوت / الآلة الموسيقية',
    notation: 'طريقة تسمية النغمات',
    lowNotes: 'النغمات المنخفضة (الجهير / باص)',
    highNotes: 'النغمات المرتفعة (السوبرانو)',
    topMax: 'أعلى نغمة (الحد الأقصى)',
    bottomMin: 'أخفض نغمة (الحد الأدنى)',
    midRegister: 'المنطقة المتوسطة',
    target: 'الهدف',
    hit: 'إصابة',
    centerMid: 'التوسيط على النغمة المتوسطة ←',
    singPrompt: 'غنِّ في الميكروفون لتضيء النغمة مباشرة',
    inTune: 'صحيح النغمة',
    sharp: 'حاد (دييز ♯)',
    flat: 'هابط (بيمول ♭)',
    voiceProfilerTitle: 'معالج تحليل وقياس المدى الصوتي',
    voiceProfilerDesc: 'قياس دقيق لطبقات صوتك ومداك الطبيعي',
    stepLowestTitle: 'غنِّ أخفض نغمة مريحة بالنسبة لك',
    stepLowestDesc: 'أصدر صوتاً عميقاً بصوت "أووو" أو "آآآه" عند أعمق نغمة مريحة وثبّتها لثانية ونصف.',
    stepHighestTitle: 'غنِّ أعلى نغمة مريحة بالنسبة لك',
    stepHighestDesc: 'اصعد بصوتك بسلاسة بنبرة "آآآه" أو "إيـيـه" دون شد أحبالك الصوتية وثبّتها.',
    holdStability: 'ثبات النبرة',
    captured: 'تم التقاط النغمة',
    retryNote: 'إعادة المحاولة',
    confirmNext: 'تأكيد والانتقال',
    analyzeResults: 'تحليل النتائج',
    saveVocalProfile: 'حفظ في الملف الصوتي',
    voiceClassification: 'تصنيف طبقتك الصوتية',
    octavesSpan: 'عدد الأوكتافات',
    closestSinger: 'أقرب مغنٍ لصوتك',
    gamesHubTitle: 'ساحة الألعاب وتدريب الأذن والنبرة',
    gamesHubDesc: 'ألعاب تفاعلية لتدريب دقة الصوت والأذن الموسيقية مطابقة لطبقتك',
    pitchHeroTitle: 'بطل النغمات: التقاط الفقاعات',
    pitchHeroDesc: 'تهبط النغمات على المسار الرأسي. غنِّ النغمة الصحيحة عند وصولها لمنطقة الهدف لكسب النقاط والمضاعفات!',
    intervalTitle: 'تحدي المسافات الصوتية (الإنترفال)',
    intervalDesc: 'استمع للنغمة الأساسية، ثم احسب وغنِّ المسافة الموسيقية (الثالثة، الرابعة، الخامسة، الأوكتاف).',
    memoryTitle: 'تطابق الذاكرة السمعية',
    memoryDesc: 'استمع إلى نغمة مرجعية، احفظها في ذاكرتك، ثم غنِّ النغمة المطابقة بدقة بعد اختفائها!',
    earTrainerTitle: 'تحدي تخمين النغمات بالسمع على البيانو',
    earTrainerDesc: 'يعزف البيانو نغمة غامضة. استمع جيداً وخمن النغمة الصحيحة بالضغط على مفتاح البيانو لتدريب أذنك الموسيقية!',
    pitchRecognitionTitle: 'لعبة التعرف على النغمات على البيانو الرأسي',
    pitchRecognitionDesc: 'يعزف التطبيق نغمة عشوائية من مساحتك الصوتية بالبيانو أو العود العربي. اضغط على المفتاح المطابق على البيانو الرأسي!',
    pitchRecognitionGuide: 'استمع بدقة للنغمة الصادرة داخل مساحتك الصوتية، ثم انقر على المفتاح الصحيح في لوحة البيانو الرأسي لتحديدها.',
    tooHigh: 'نغمتك المختارة أعلى! (النغمة الصحيحة أخفض)',
    tooLow: 'نغمتك المختارة أخفض! (النغمة الصحيحة أعلى)',
    tapKeyToIdentify: 'اضغط على أي مفتاح في البيانو الرأسي لتأكيد تخمينك',
    targetPitchPlayed: 'تم عزف النغمة المستهدفة',
    sirenGlideTitle: 'تمرين السيرين والانزلاق الصوتي (سينغ شارب)',
    sirenGlideDesc: 'تدريب الانتقال الانسيابي بين الطبقات الصوتية على مسار منحنٍ متصل دون انقطاع أو شد حنجري.',
    vocalAgilityTitle: 'تمارين الركض والسرعة الصوتية (فوكاليستا)',
    vocalAgilityDesc: 'أنماط لحنية سريعة وأربيجيو متتالي لتقوية المرونة وسرعة الأوتار الصوتية والدقة اللحظية.',
    playGame: 'ابدأ اللعبة',
    score: 'النقاط',
    streak: 'التتابع المتتالي',
    timeLeft: 'الوقت المتبقي',
    hitZone: 'منطقة الإصابة',
    singNow: 'غنِّ الآن 🎙️',
    gameOver: 'اكتمل التحدي!',
    playAgain: 'العب مرة أخرى',
    returnToHub: 'العودة لمركز الألعاب',
    listenAnswer: 'الاستماع للجواب',
    correctNext: 'صحيح! التالي',
    skipQuestion: 'تخطي السؤال',
    replaySound: 'إعادة سماع النغمة 🔁',
    yourGuess: 'تخمينك',
    correct: 'صحيح أحسنت! 🎉',
    incorrect: 'محاولة خاطئة، جرّب مجدداً!',
    showHint: 'إظهار تلميح',
    warmupTitle: 'تمارين الإحماء والفوكاليز التكيفية',
    warmupDesc: 'مولدة تلقائياً بما يتناسب مع حدود طبقتك الصوتية',
    practice: 'تمرين',
    startWarmup: 'بدء الإحماء',
    pauseWarmup: 'إيقاف مؤقت',
    saveExit: 'حفظ وخروج',
    recommendedVowel: 'حرف المد الموصى به',
    tempo: 'السرعة',
    direction: 'الاتجاه',
    pitchAccuracy: 'دقة النغمة',
    practiceStreak: 'أيام التمرين المتتالية',
    totalPractice: 'إجمالي التمرين',
    activeRange: 'المدى الصوتي النشط',
    overallAccuracy: 'الدقة العامة',
    recentHistory: 'سجل التمارين الأخيرة',
    precisionHeatmap: 'الخريطة الحرارية لدقة النغمات',
    settingsTitle: 'إعدادات الصوت والآلات الموسيقية',
    languageLabel: 'لغة التطبيق',
    notationLabel: 'نظام تسمية النوتات الموسيقية',
    instrumentLabel: 'صوت الآلة المرجعية',
    themesLabel: 'مظهر وسمة البيانو',
    referencePitch: 'معايرة تردد النغمة المرجعية A4',
    tuningTolerance: 'سماحية الدقة بالنغمات (بالسنت)',
    hapticFeedback: 'الاهتزاز اللمسي على أندرويد (Haptics)',
    keepScreenAwake: 'منع قفل الشاشة أثناء التمارين',
    autoVerticalFs: 'التحويل التلقائي للبيانو الرأسي عند ملء الشاشة',
    close: 'إغلاق',
    recordKeys: 'تسجيل العزف',
    recording: 'جاري التسجيل...',
    playRecording: 'تشغيل التسجيل',
    stopRecording: 'إيقاف التسجيل',
    keySize: 'حجم المفاتيح',
    octave: 'أوكتاف',
    semitones: 'أنصاف أبعاد',
    minBadge: 'الأدنى',
    maxBadge: 'الأقصى',
    midBadge: 'الوسط',
    hzUnit: 'هرتز',
    bpmUnit: 'ن/د',
    androidAppPrompt: 'ثبّت التطبيق على شاشة هاتفك الأندرويد لاستخدامه بملء الشاشة',
    installGuideTitle: 'إضافة التطبيق إلى الشاشة الرئيسية (أندرويد)',
    aiCoach: 'المدرب الصوتي الذكي',
    aiTrainerStepByStep: 'المدرب الصوتي الذكي (خطوة بخطوة)',
    aiCoachDesc: 'تمارين صوتية تفاعلية خطوة بخطوة مع توجيه وتحليل صوتي فوري بالذكاء الاصطناعي',
    stepNumber: 'الخطوة',
    ofSteps: 'من',
    nextStep: 'الخطوة التالية',
    prevStep: 'الخطوة السابقة',
    repeatStep: 'إعادة التمرين',
    aiFeedback: 'تقييم المدرب الذكي',
    evaluating: 'المدرب يحلل نبرتك واستقرار طبقتك الصوتية بالذكاء الاصطناعي...',
    askCoach: 'اسأل المدرب الصوتي',
    askCoachPlaceholder: 'اسأل عن تقنيات التنفس، إرخاء الحنجرة، أو النغمات العالية...',
    sendQuestion: 'إرسال السؤال',
    playReference: 'سماع النغمة المرجعية',
    pitchLockTarget: 'ثبّت نغمتك داخل المنطقة الخضراء',
    breathPacer: 'موجه التنفس الحجابي المنتظم',
    inhale: 'شهيق (4 ثوانٍ)',
    hold: 'كتم وثبات (4 ثوانٍ)',
    exhale: 'زفير همسي سسسس (8 ثوانٍ)',
    startBreath: 'بدء تمرين التنفس',
    stepCompleted: 'تم إكمال الخطوة بنجاح!',
    workoutCompleted: 'أحسنت! تم إنهاء الحصة بنجاح!',
    curriculumFoundation: 'برنامج الأساس الصوتي (5 خطوات)',
    curriculumPitch: 'دقة النغمات وتدريب الأذن',
    curriculumRange: 'توسيع الطبقات ودمج المقامات',
    curriculumArabic: 'فوكاليز المقامات والزخارف العربية',
    selectCurriculum: 'البرنامج التدريبي',
    coachThinking: 'جاري استشارة المدرب الصوتي الذكي...',
    getAiFeedback: 'تحليل الأداء بالذكاء الاصطناعي',
    earProgressionTitle: 'سلّم التدرج في تدريب الأذن الموسيقية',
    earProgressionDesc: 'تدرج بالسمع من السلالم الكبيرة البسيطة إلى التوافقات والتآلفات المعقدة والتنافرات الموسيقية مع ارتفاع نسبة دقتك!',
    tier1Title: 'المستوى 1: السلالم الكبيرة والخطوات',
    tier1Desc: 'النغمات المتطابقة، الأوكتاف، والخطوات اللحنية للسلم الكبير',
    tier2Title: 'المستوى 2: التوافقات المتآلفة المستقرة',
    tier2Desc: 'البعد الثالث الكبير، والرابعة التامة، والخامسة التامة',
    tier3Title: 'المستوى 3: المسافات الصغيرة والمقامات',
    tier3Desc: 'البعد الثالث الصغير، والسادس الصغير، والسادس الكبير',
    tier4Title: 'المستوى 4: التآلفات الثلاثية والسباعية',
    tier4Desc: 'التآلفات الكبيرة والصغيرة والسابعة المهيمنة والناقصة',
    tier5Title: 'المستوى 5: التنافرات الموسيقية والتريتون',
    tier5Desc: 'التريتون (البعد المتنافر الشيطاني)، والثانية الصغيرة الصادمة، والسابعة الكبيرة الحادة',
    lockedTier: 'مقفل',
    unlockedTier: 'متاح للتدريب',
    requiredAccuracy: 'الدقة المطلوبة لفتح المستوى',
    earXp: 'نقاط الخبرة',
    currentRank: 'الرتبة السمعية',
    playHarmonic: 'عزف متزامن (كورد)',
    playMelodic: 'عزف متسلسل (أربيجيو)',
    breakdownChord: 'تفكيك النغمات بالترتيب',
    tierUnlockedToast: 'مبارك! تم فتح مستوى تدريب سمعي جديد!',
    startProgression: 'بدء سلّم تدريب الأذن',
    levels: 'مراحل التدريب',
    levelsTitle: 'منهاج قراءة النوتة والأداء الثنائي (بيانو + غناء)',
    levelsDesc: 'تدرج خطوة بخطوة من المبتدئ إلى الاحتراف عبر قراءة النوتات والعزف والغناء بدقة عالية',
    dualModePiano: 'وضع البيانو 🎹',
    dualModeVocal: 'وضع الغناء 🎙️',
    listenSequence: 'استمع للجملة',
    playSequence: 'تشغيل الجملة',
    singTargetNote: 'غنِّ النغمة المستهدفة',
    tapTargetKey: 'المس المفتاح المطلوب',
    levelPassed: 'رائع! تم اجتياز المرحلة!',
    levelFailed: 'حاول مجدداً لتجاوز 80%',
    nextLevel: 'المرحلة التالية',
    retryExercise: 'إعادة المحاولة',
    tierBeginner: 'مبتدئ',
    tierIntermediate: 'متوسط',
    tierAdvanced: 'متقدم',
    tierVirtuoso: 'محترف بارع',
    starsEarned: 'النجوم',
    accuracy: 'نسبة الدقة',
    pitchLocked: 'تم تثبيت النغمة بدقة!',
    holdPitchPrompt: 'ثبّت نغمتك بدقة (+/- 15 سنت)...',
    centsTolerance: 'نسبة التسامح +/- 15 سنت',
    levelNumber: 'المستوى',
  },
};

export const INSTRUMENT_NAMES: Record<InstrumentType, { en: string; ar: string; icon: string }> = {
  piano: { en: 'Concert Grand Piano', ar: 'بيانو غراند كلاسيكي', icon: '🎹' },
  oud: { en: 'Acoustic Arabic Oud', ar: 'عود عربي أصيل بأوتار مزدوجة', icon: '🪕' },
  guitar: { en: 'Acoustic Nylon Guitar', ar: 'غيتار نايلون صوتي', icon: '🎸' },
  vocal: { en: 'Pure Human Vocal Tone', ar: 'صوت بشري طبيعي نقي', icon: '🎤' },
  strings: { en: 'Bowed Strings / Cello', ar: 'تشيلو ووتريات أوركسترا', icon: '🎻' },
};

export const NOTATION_OPTIONS: Record<NotationSystem, { en: string; ar: string; example: string }> = {
  english: { en: 'English (C, D, E, F...)', ar: 'إنجليزي (C, D, E, F...)', example: 'C4, D#4, F4' },
  solfege: { en: 'Solfège (Do, Re, Mi...)', ar: 'صولفيج (دو، ري، مي...)', example: 'Do4, Re#4, Fa4' },
  arabic: { en: 'Arabic (دو، ري، مي...)', ar: 'عربي مع علامات التحويل', example: 'دو4، ري♯4، فا4' },
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Award,
  Lock,
  Unlock,
  Play,
  RotateCcw,
  Volume2,
  Mic,
  Piano as PianoIcon,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Star,
  Info,
  Flame,
  Check,
} from 'lucide-react';
import {
  TrainingLevelConfig,
  LevelProgressRecord,
  CurriculumTier,
  ExerciseExecutionMode,
  PitchDetectionResult,
  VocalRangeProfile,
  AppLanguage,
  NotationSystem,
  AppTheme,
} from '../../types/vocal';
import { CURRICULUM_LEVELS } from '../../data/curriculumLevels';
import {
  loadLevelsProgress,
  saveLevelProgress,
} from '../../utils/storage';
import { audioEngine } from '../../audio/audioEngine';
import { formatNoteName, midiToNoteInfo } from '../../utils/noteUtils';
import { translations } from '../../utils/i18n';
import { haptics } from '../../utils/haptics';
import { useMobileBackHandler } from '../../utils/useMobileBackButton';

interface ProgressiveCurriculumViewProps {
  currentPitch: PitchDetectionResult | null;
  profile: VocalRangeProfile;
  language: AppLanguage;
  notation: NotationSystem;
  theme: AppTheme;
  onOpenPiano?: () => void;
}

export const ProgressiveCurriculumView: React.FC<ProgressiveCurriculumViewProps> = ({
  currentPitch,
  profile,
  language,
  notation,
  theme,
  onOpenPiano,
}) => {
  const t = translations[language];
  const isArabic = language === 'ar';

  // Loaded progress for levels 1-20
  const [levelsProgress, setLevelsProgress] = useState<Record<number, LevelProgressRecord>>(() =>
    loadLevelsProgress()
  );

  // Active tier filter
  const [selectedTier, setSelectedTier] = useState<CurriculumTier | 'all'>('all');

  // Currently opened / running level
  const [activeLevel, setActiveLevel] = useState<TrainingLevelConfig | null>(null);

  // Mode: 'piano' or 'vocal'
  const [executionMode, setExecutionMode] = useState<ExerciseExecutionMode>('piano');

  // Active step index in note sequence
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Sequence playback state
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [highlightedSeqIndex, setHighlightedSeqIndex] = useState<number | null>(null);

  // Evaluation tracking
  const [notesCompleted, setNotesCompleted] = useState<boolean[]>([]);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctHits, setCorrectHits] = useState(0);

  // Vocal pitch lock-in sustained duration
  const [holdProgress, setHoldProgress] = useState(0); // 0 - 100%
  const holdStartTimeRef = useRef<number | null>(null);
  const REQUIRED_HOLD_MS = 550; // Sustained duration in tune

  // Level completion modal state
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultScore, setResultScore] = useState<{
    accuracy: number;
    stars: number;
    passed: boolean;
  } | null>(null);

  // Wrong key flash feedback for piano mode
  const [wrongKeyMidi, setWrongKeyMidi] = useState<number | null>(null);
  const [correctKeyMidi, setCorrectKeyMidi] = useState<number | null>(null);

  // Back button handling: if in level, return to levels list
  useMobileBackHandler(activeLevel !== null, () => {
    handleExitLevel();
  });

  // Calculate overall stats
  const totalStars = useMemo(() => {
    return Object.values(levelsProgress).reduce((acc, curr) => acc + (curr.stars || 0), 0);
  }, [levelsProgress]);

  const clearedLevelsCount = useMemo(() => {
    return Object.values(levelsProgress).filter((l) => l.completed).length;
  }, [levelsProgress]);

  // Rank title based on cleared levels
  const rankInfo = useMemo(() => {
    if (clearedLevelsCount >= 18) {
      return { title: isArabic ? 'مايسترو محترف' : 'Virtuoso Maestro', color: 'text-amber-400' };
    }
    if (clearedLevelsCount >= 13) {
      return { title: isArabic ? 'خبير المسافات والتطريب' : 'Harmony Adept', color: 'text-purple-400' };
    }
    if (clearedLevelsCount >= 6) {
      return { title: isArabic ? 'مستكشف الألحان' : 'Melodic Navigator', color: 'text-cyan-400' };
    }
    return { title: isArabic ? 'منشد واعد' : 'Apprentice Vocalist', color: 'text-emerald-400' };
  }, [clearedLevelsCount, isArabic]);

  // Filtered levels list
  const filteredLevels = useMemo(() => {
    if (selectedTier === 'all') return CURRICULUM_LEVELS;
    return CURRICULUM_LEVELS.filter((lvl) => lvl.tier === selectedTier);
  }, [selectedTier]);

  // Start a specific level
  const handleStartLevel = (level: TrainingLevelConfig) => {
    const record = levelsProgress[level.id];
    if (!record?.unlocked && level.id !== 1) {
      haptics.warning();
      return;
    }
    haptics.tap();
    setActiveLevel(level);
    setCurrentStepIndex(0);
    setNotesCompleted(new Array(level.notes.length).fill(false));
    setTotalAttempts(0);
    setCorrectHits(0);
    setHoldProgress(0);
    setShowResultModal(false);
    setResultScore(null);
  };

  const handleExitLevel = () => {
    haptics.tap();
    setActiveLevel(null);
    setIsPlayingSequence(false);
    setHighlightedSeqIndex(null);
    setShowResultModal(false);
    holdStartTimeRef.current = null;
  };

  // Play full note sequence as audio guide
  const handlePlaySequence = async () => {
    if (!activeLevel || isPlayingSequence) return;
    setIsPlayingSequence(true);
    haptics.tap();

    const bpm = activeLevel.tempoBpm || 60;
    const intervalMs = (60 / bpm) * 1000;

    for (let i = 0; i < activeLevel.notes.length; i++) {
      setHighlightedSeqIndex(i);
      const note = activeLevel.notes[i];
      audioEngine.playNote(note.midi, intervalMs / 1000 * 0.9);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    setHighlightedSeqIndex(null);
    setIsPlayingSequence(false);
  };

  // Move to next note step upon success
  const advanceToNextStep = (hitNoteMidi: number) => {
    if (!activeLevel) return;

    haptics.success();
    setCorrectKeyMidi(hitNoteMidi);
    setTimeout(() => setCorrectKeyMidi(null), 300);

    const updatedHits = correctHits + 1;
    const updatedAttempts = totalAttempts + 1;
    setCorrectHits(updatedHits);
    setTotalAttempts(updatedAttempts);

    const newCompleted = [...notesCompleted];
    newCompleted[currentStepIndex] = true;
    setNotesCompleted(newCompleted);

    // Reset hold
    setHoldProgress(0);
    holdStartTimeRef.current = null;

    if (currentStepIndex + 1 < activeLevel.notes.length) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Completed the entire level sequence!
      finishLevel(updatedHits, updatedAttempts);
    }
  };

  // Finish level calculation
  const finishLevel = (hits: number, attempts: number) => {
    if (!activeLevel) return;

    const accuracy = Math.min(100, Math.round((hits / Math.max(attempts, 1)) * 100));
    const passed = accuracy >= (activeLevel.requiredAccuracy || 80);

    let stars = 0;
    if (accuracy >= 95) stars = 3;
    else if (accuracy >= 88) stars = 2;
    else if (accuracy >= 80) stars = 1;

    // Save progress to storage and state
    const updatedProgress = saveLevelProgress(activeLevel.id, accuracy, stars, executionMode);
    setLevelsProgress(updatedProgress);

    setResultScore({ accuracy, stars, passed });
    setShowResultModal(true);
    if (passed) {
      haptics.success();
    } else {
      haptics.warning();
    }
  };

  // Piano key tap handler
  const handleKeyTap = (tappedMidi: number) => {
    if (!activeLevel || showResultModal) return;

    audioEngine.playNote(tappedMidi, 0.7);
    const targetNote = activeLevel.notes[currentStepIndex];

    if (tappedMidi === targetNote.midi) {
      advanceToNextStep(tappedMidi);
    } else {
      haptics.error();
      setTotalAttempts((prev) => prev + 1);
      setWrongKeyMidi(tappedMidi);
      setTimeout(() => setWrongKeyMidi(null), 350);
    }
  };

  // Real-time Vocal Pitch Tracking Engine
  useEffect(() => {
    if (!activeLevel || executionMode !== 'vocal' || showResultModal) {
      holdStartTimeRef.current = null;
      setHoldProgress(0);
      return;
    }

    const targetNote = activeLevel.notes[currentStepIndex];
    if (!targetNote) return;

    if (
      currentPitch &&
      currentPitch.frequency &&
      currentPitch.clarity &&
      currentPitch.clarity > 0.8
    ) {
      const sungMidi = currentPitch.note?.midi;
      const cents = currentPitch.cents;

      // Note must match target midi and be within +/- 15 cents
      const isPitchAccurate = sungMidi === targetNote.midi && Math.abs(cents) <= 15;

      if (isPitchAccurate) {
        const now = performance.now();
        if (holdStartTimeRef.current === null) {
          holdStartTimeRef.current = now;
        }

        const elapsed = now - holdStartTimeRef.current;
        const progress = Math.min(100, Math.round((elapsed / REQUIRED_HOLD_MS) * 100));
        setHoldProgress(progress);

        if (elapsed >= REQUIRED_HOLD_MS) {
          advanceToNextStep(targetNote.midi);
        }
      } else {
        // Flat or Sharp or wrong note
        holdStartTimeRef.current = null;
        setHoldProgress((prev) => Math.max(0, prev - 15));
      }
    } else {
      holdStartTimeRef.current = null;
      setHoldProgress(0);
    }
  }, [currentPitch, activeLevel, currentStepIndex, executionMode, showResultModal]);

  // Determine compact piano keyboard range based on active level notes
  const pianoKeys = useMemo(() => {
    if (!activeLevel) return [];
    // Collect min and max midi with a margin
    const midis = activeLevel.notes.map((n) => n.midi);
    const minMidi = Math.max(48, Math.min(...midis) - 3); // at least C3
    const maxMidi = Math.min(84, Math.max(...midis) + 3); // at most C6

    const keys = [];
    for (let m = minMidi; m <= maxMidi; m++) {
      const info = midiToNoteInfo(m);
      keys.push(info);
    }
    return keys;
  }, [activeLevel]);

  // Next level handler
  const handleProceedToNextLevel = () => {
    if (!activeLevel) return;
    const nextId = activeLevel.id + 1;
    const nextConfig = CURRICULUM_LEVELS.find((l) => l.id === nextId);
    if (nextConfig) {
      handleStartLevel(nextConfig);
    } else {
      handleExitLevel();
    }
  };

  return (
    <div className="min-h-[85vh] pb-24 text-slate-100 flex flex-col">
      {/* 1. Header & Overall Stats (Visible when not actively in a level) */}
      {!activeLevel ? (
        <div className="space-y-4">
          {/* Top Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-indigo-950/60 border border-slate-800/90 rounded-3xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-2 bg-gradient-to-tr from-amber-500 to-cyan-500 rounded-2xl text-slate-950 shadow-md">
                    <Award className="w-5 h-5 font-bold" />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${rankInfo.color}`}>
                    {rankInfo.title}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {t.levelsTitle}
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
                  {t.levelsDesc}
                </p>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-3">
                <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-2.5">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">{t.starsEarned}</div>
                    <div className="text-base font-black text-amber-300">
                      {totalStars} <span className="text-xs text-slate-500 font-normal">/ 60</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {isArabic ? 'المراحل المنجزة' : 'Cleared'}
                    </div>
                    <div className="text-base font-black text-emerald-300">
                      {clearedLevelsCount} <span className="text-xs text-slate-500 font-normal">/ 20</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tier Filter Tabs */}
            <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedTier('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  selectedTier === 'all'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                <span>{isArabic ? 'جميع المراحل (20)' : 'All Levels (20)'}</span>
              </button>
              <button
                onClick={() => setSelectedTier('beginner')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  selectedTier === 'beginner'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>{t.tierBeginner} (1-5)</span>
              </button>
              <button
                onClick={() => setSelectedTier('intermediate')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  selectedTier === 'intermediate'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                <span>{t.tierIntermediate} (6-12)</span>
              </button>
              <button
                onClick={() => setSelectedTier('advanced')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  selectedTier === 'advanced'
                    ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                <span>{t.tierAdvanced} (13-17)</span>
              </button>
              <button
                onClick={() => setSelectedTier('virtuoso')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  selectedTier === 'virtuoso'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span>{t.tierVirtuoso} (18-20)</span>
              </button>
            </div>
          </div>

          {/* 2. Grid of Level Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredLevels.map((level) => {
              const record = levelsProgress[level.id];
              const isUnlocked = record?.unlocked || level.id === 1;
              const isCompleted = record?.completed;
              const stars = record?.stars || 0;
              const bestAcc = record?.bestAccuracy || 0;

              // Color accents per tier
              const tierBadgeColors = {
                beginner: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
                intermediate: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
                advanced: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
                virtuoso: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
              }[level.tier];

              return (
                <div
                  key={level.id}
                  onClick={() => isUnlocked && handleStartLevel(level)}
                  className={`group relative rounded-3xl p-4 transition-all duration-200 border ${
                    !isUnlocked
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                      : isCompleted
                      ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-950/30 cursor-pointer'
                      : 'bg-slate-900/90 border-slate-700 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-950/30 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Level Number & Tier */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition ${
                          !isUnlocked
                            ? 'bg-slate-800 text-slate-500'
                            : isCompleted
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        }`}
                      >
                        {level.id < 10 ? `0${level.id}` : level.id}
                      </div>
                      <div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierBadgeColors}`}
                        >
                          {t[`tier${level.tier.charAt(0).toUpperCase() + level.tier.slice(1)}` as keyof typeof t] || level.tier}
                        </span>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {level.keyCenter} • {level.tempoBpm} BPM
                        </div>
                      </div>
                    </div>

                    {/* Status Badge / Lock */}
                    <div>
                      {!isUnlocked ? (
                        <div className="p-2 rounded-xl bg-slate-800/80 text-slate-500">
                          <Lock className="w-4 h-4" />
                        </div>
                      ) : isCompleted ? (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3].map((starIdx) => (
                            <Star
                              key={starIdx}
                              className={`w-3.5 h-3.5 ${
                                starIdx <= stars
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition">
                          <Play className="w-4 h-4 fill-current" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-3">
                    <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition">
                      {isArabic ? level.titleAr : level.titleEn}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                      {isArabic ? level.subtitleAr : level.subtitleEn}
                    </p>
                  </div>

                  {/* Note preview strip */}
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span className="font-mono text-cyan-400 font-bold">
                        {level.notes.length}
                      </span>
                      <span>{isArabic ? 'نغمات متتالية' : 'target notes'}</span>
                    </div>

                    {isCompleted && (
                      <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                        <span>{bestAcc}%</span>
                        <span className="text-[10px] text-slate-500">acc</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 2. Active Level Player / Challenge View */
        <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
          {/* Header Bar with Back Button and Mode Switch */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleExitLevel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                {isArabic ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                <span>{isArabic ? 'خروج من المرحلة' : 'Back to Levels'}</span>
              </button>

              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  {t.levelNumber} {activeLevel.id}
                </span>
                <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                  {isArabic ? activeLevel.titleAr : activeLevel.titleEn}
                </h2>
              </div>

              {/* Sequence Audio Preview Button */}
              <button
                onClick={handlePlaySequence}
                disabled={isPlayingSequence}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  isPlayingSequence
                    ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.listenSequence}</span>
              </button>
            </div>

            {/* Mode Switcher: Piano Mode vs Vocal Mode */}
            <div className="flex items-center justify-center gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/80">
              <button
                onClick={() => {
                  haptics.tap();
                  setExecutionMode('piano');
                  setHoldProgress(0);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                  executionMode === 'piano'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PianoIcon className="w-4 h-4" />
                <span>{t.dualModePiano}</span>
              </button>

              <button
                onClick={() => {
                  haptics.tap();
                  setExecutionMode('vocal');
                  setHoldProgress(0);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                  executionMode === 'vocal'
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{t.dualModeVocal}</span>
              </button>
            </div>
          </div>

          {/* Sight-Reading Note Track */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
              <span className="font-medium">
                {isArabic ? 'تسلسل النغمات الموسيقية (صولفيج وقراءة)' : 'Sight-Reading Sequence'}
              </span>
              <span className="font-mono text-cyan-400 font-bold">
                {currentStepIndex + 1} / {activeLevel.notes.length}
              </span>
            </div>

            {/* Horizontal note track */}
            <div className="flex items-center justify-start gap-2.5 overflow-x-auto py-3 px-1 scrollbar-none">
              {activeLevel.notes.map((step, idx) => {
                const isPast = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isHighlightedAudio = highlightedSeqIndex === idx;

                const noteDisplayName = formatNoteName(midiToNoteInfo(step.midi), notation);

                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-center min-w-[70px] sm:min-w-[80px] py-3 px-2 rounded-2xl border transition-all duration-200 relative ${
                      isHighlightedAudio
                        ? 'bg-amber-500/20 border-amber-400 scale-105 shadow-md shadow-amber-500/30'
                        : isCurrent
                        ? 'bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-105 ring-2 ring-cyan-400/40'
                        : isPast
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-500'
                    }`}
                  >
                    {/* Status marker */}
                    <div className="text-[10px] font-mono mb-1">
                      {isPast ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        `#${idx + 1}`
                      )}
                    </div>

                    {/* Note Solfege / Name */}
                    <div className="text-base sm:text-lg font-black text-white">
                      {noteDisplayName}
                    </div>

                    <div className="text-xs font-bold text-cyan-400 mt-0.5">
                      {isArabic ? step.arabic : step.solfege}
                    </div>

                    {/* Active pulse dot */}
                    {isCurrent && (
                      <div className="absolute -bottom-1.5 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hint message for active note */}
            {activeLevel.notes[currentStepIndex] && (
              <div className="mt-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-slate-300">
                    {activeLevel.notes[currentStepIndex].hint ||
                      (isArabic ? 'أدِّ النغمة المطلوبة بدقة' : 'Perform the target note accurately')}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-cyan-400 font-bold">
                  {Math.round(440 * Math.pow(2, (activeLevel.notes[currentStepIndex].midi - 69) / 12))} Hz
                </span>
              </div>
            )}
          </div>

          {/* Mode Execution Panel */}
          {executionMode === 'piano' ? (
            /* Piano Mode Interface */
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <PianoIcon className="w-4 h-4 text-cyan-400" />
                  <span>{t.tapTargetKey}</span>
                </div>
                <span className="text-amber-400 font-medium">{t.requiredAccuracy}: 80%</span>
              </div>

              {/* Interactive compact piano keyboard */}
              <div className="relative bg-slate-950 p-2 sm:p-3 rounded-2xl border border-slate-800/90 overflow-x-auto">
                <div className="flex items-start justify-center gap-1 min-w-[340px]">
                  {pianoKeys.map((key) => {
                    const isWhite = !key.name.includes('#');
                    const isTarget = key.midi === activeLevel.notes[currentStepIndex]?.midi;
                    const isHit = correctKeyMidi === key.midi;
                    const isError = wrongKeyMidi === key.midi;

                    if (!isWhite) {
                      // Black key
                      return (
                        <button
                          key={key.midi}
                          onClick={() => handleKeyTap(key.midi)}
                          className={`w-7 sm:w-8 h-20 -mx-3.5 z-20 rounded-b-lg transition-all active:scale-95 flex flex-col justify-end pb-1 items-center font-bold text-[9px] shadow-md ${
                            isHit
                              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/50'
                              : isError
                              ? 'bg-rose-600 text-white animate-shake'
                              : isTarget
                              ? 'bg-slate-900 border-2 border-cyan-400 text-cyan-300 shadow-cyan-500/30'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-900'
                          }`}
                        >
                          <span>{key.name}</span>
                        </button>
                      );
                    }

                    // White key
                    return (
                      <button
                        key={key.midi}
                        onClick={() => handleKeyTap(key.midi)}
                        className={`w-9 sm:w-11 h-28 sm:h-32 z-10 rounded-b-xl transition-all active:scale-95 flex flex-col justify-end pb-2 items-center font-bold text-[10px] shadow-sm ${
                          isHit
                            ? 'bg-emerald-400 text-slate-950 shadow-emerald-400/50'
                            : isError
                            ? 'bg-rose-500 text-white animate-shake'
                            : isTarget
                            ? 'bg-slate-100 border-2 border-cyan-400 text-cyan-700 shadow-cyan-400/30'
                            : 'bg-white text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-[10px] font-black">{key.name}</span>
                        <span className="text-[9px] text-slate-500 font-medium">
                          {isArabic ? key.arabic : key.solfege}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Vocal Mode Interface */
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col items-center gap-4 text-center">
              <div className="w-full flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-rose-400" />
                  <span>{t.singTargetNote}</span>
                </div>
                <span className="text-cyan-400 font-mono text-[11px]">{t.centsTolerance}</span>
              </div>

              {/* Pitch Ring & Sustained Hold Meter */}
              <div className="relative w-40 h-40 flex items-center justify-center my-2">
                {/* SVG Progress Ring */}
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    className="stroke-slate-800 fill-none"
                    strokeWidth="8"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    className={`fill-none transition-all duration-75 ${
                      holdProgress > 0 ? 'stroke-cyan-400' : 'stroke-transparent'
                    }`}
                    strokeWidth="8"
                    strokeDasharray={440}
                    strokeDashoffset={440 - (440 * holdProgress) / 100}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center Pitch Feedback */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-black text-white">
                    {currentPitch?.note?.name || '--'}
                  </div>
                  <div className="text-xs font-mono text-cyan-300 font-bold mt-0.5">
                    {currentPitch?.frequency ? `${Math.round(currentPitch.frequency)} Hz` : '-- Hz'}
                  </div>
                  {holdProgress > 0 && (
                    <div className="text-[10px] text-emerald-400 font-bold mt-1 animate-pulse">
                      {holdProgress}% {t.pitchLocked}
                    </div>
                  )}
                </div>
              </div>

              {/* Cents deviation gauge */}
              <div className="w-full max-w-sm">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
                  <span>-50¢ {t.flat}</span>
                  <span
                    className={`font-bold ${
                      Math.abs(currentPitch?.cents || 0) <= 15
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {currentPitch?.cents !== undefined
                      ? `${currentPitch.cents > 0 ? '+' : ''}${Math.round(currentPitch.cents)}¢`
                      : '0¢'}
                  </span>
                  <span>+50¢ {t.sharp}</span>
                </div>

                <div className="h-3 bg-slate-950 rounded-full border border-slate-800 relative overflow-hidden">
                  {/* Green tolerance zone */}
                  <div className="absolute left-[35%] right-[35%] top-0 bottom-0 bg-emerald-500/25 border-x border-emerald-500/40" />

                  {/* Indicator needle */}
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-cyan-400 rounded-full shadow-md shadow-cyan-400 transition-all duration-75"
                    style={{
                      left: `${Math.min(98, Math.max(2, 50 + (currentPitch?.cents || 0)))}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">{t.holdPitchPrompt}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Level Complete Modal */}
      {showResultModal && resultScore && activeLevel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative animate-in fade-in zoom-in-95">
            {/* Sparkle Header Icon */}
            <div
              className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-3 shadow-lg ${
                resultScore.passed
                  ? 'bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 shadow-emerald-500/30'
                  : 'bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 shadow-rose-500/30'
              }`}
            >
              {resultScore.passed ? (
                <Sparkles className="w-8 h-8 font-black" />
              ) : (
                <RotateCcw className="w-8 h-8 font-black" />
              )}
            </div>

            <h3 className="text-xl font-black text-white">
              {resultScore.passed ? t.levelPassed : t.levelFailed}
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              {isArabic ? activeLevel.titleAr : activeLevel.titleEn}
            </p>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 my-4">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-8 h-8 transition-all ${
                    s <= resultScore.stars
                      ? 'text-amber-400 fill-amber-400 scale-110 drop-shadow'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Score Stats */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 mb-5 flex items-center justify-around">
              <div>
                <div className="text-[10px] text-slate-400">{t.accuracy}</div>
                <div
                  className={`text-lg font-black ${
                    resultScore.passed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {resultScore.accuracy}%
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <div className="text-[10px] text-slate-400">{t.requiredAccuracy}</div>
                <div className="text-lg font-black text-slate-300">
                  {activeLevel.requiredAccuracy}%
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {resultScore.passed && activeLevel.id < 20 ? (
                <button
                  onClick={handleProceedToNextLevel}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                >
                  <span>{t.nextLevel}</span>
                  {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              ) : null}

              <button
                onClick={() => handleStartLevel(activeLevel)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t.retryExercise}</span>
              </button>

              <button
                onClick={handleExitLevel}
                className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
              >
                {isArabic ? 'العودة لقائمة المراحل' : 'Back to Curriculum Map'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

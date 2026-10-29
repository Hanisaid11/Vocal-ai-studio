import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, SkipForward, Volume2, Mic, Activity, CheckCircle2, RotateCcw, Flame } from 'lucide-react';
import { WarmupExercise, VocalRangeProfile, PitchDetectionResult, PracticeSessionRecord, AppLanguage, NotationSystem } from '../../types/vocal';
import { midiToNoteInfo, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { translations } from '../../utils/i18n';
import { haptics } from '../../utils/haptics';

interface ExercisePlayerProps {
  exercise: WarmupExercise;
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language?: AppLanguage;
  notation?: NotationSystem;
  onFinishSession: (session: PracticeSessionRecord) => void;
  onClose: () => void;
}

export const ExercisePlayer: React.FC<ExercisePlayerProps> = ({
  exercise,
  profile,
  currentPitch,
  language = 'en',
  notation = 'english',
  onFinishSession,
  onClose,
}) => {
  const t = translations[language];
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(exercise.defaultBpm || 90);
  const [currentRootMidi, setCurrentRootMidi] = useState(profile.middleRegisterNote.midi);
  const [stepIndex, setStepIndex] = useState(0); // Index within current pattern
  const [direction, setDirection] = useState<'ascending' | 'descending'>('ascending');
  const [notesAttempted, setNotesAttempted] = useState(0);
  const [notesInTune, setNotesInTune] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  const [centsErrorSum, setCentsErrorSum] = useState(0);

  // Interval timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Active target note
  const currentTargetMidi = currentRootMidi + (exercise.basePatternSemitones[stepIndex] || 0);
  const currentTargetNote = midiToNoteInfo(currentTargetMidi);

  // Check if user is currently singing in tune with current target note
  const isMatching =
    currentPitch?.note?.midi === currentTargetMidi &&
    Math.abs(currentPitch?.cents ?? 100) <= 18 &&
    (currentPitch?.clarity ?? 0) > 0.65;

  // Track accuracy during each step
  useEffect(() => {
    if (isPlaying && isMatching) {
      haptics.tap();
    }
  }, [isPlaying, isMatching]);

  // Main playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = (60 / bpm) * 1000 * 0.75; // Step duration

    // Play initial note
    audioEngine.playTone(currentTargetNote.frequency, intervalMs / 1000 * 0.9, 'piano');

    timerRef.current = setInterval(() => {
      setStepIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;

        // Record accuracy for current step
        setNotesAttempted((n) => n + 1);
        if (isMatching) {
          setNotesInTune((hit) => hit + 1);
        }
        if (currentPitch?.cents !== undefined && Math.abs(currentPitch.cents) < 50) {
          setCentsErrorSum((sum) => sum + Math.abs(currentPitch.cents));
        }

        // If completed this pattern iteration, transpose!
        if (nextIndex >= exercise.basePatternSemitones.length) {
          // Determine next root key
          setCurrentRootMidi((prevRoot) => {
            if (direction === 'ascending') {
              const nextRoot = prevRoot + 1;
              if (nextRoot + Math.max(...exercise.basePatternSemitones) >= profile.highestNote.midi) {
                // Reach top range, reverse direction downwards
                setDirection('descending');
                return prevRoot - 1;
              }
              return nextRoot;
            } else {
              const nextRoot = prevRoot - 1;
              if (nextRoot <= profile.lowestNote.midi) {
                // Reached bottom, complete exercise
                setIsPlaying(false);
                finishExercise();
                return profile.middleRegisterNote.midi;
              }
              return nextRoot;
            }
          });

          return 0; // Reset to start of pattern
        }

        // Play next tone in sequence
        const nextMidi = currentRootMidi + exercise.basePatternSemitones[nextIndex];
        const nextFreq = midiToNoteInfo(nextMidi).frequency;
        audioEngine.playTone(nextFreq, intervalMs / 1000 * 0.85, 'piano');

        return nextIndex;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, bpm, currentRootMidi, direction, exercise, profile]);

  const togglePlay = async () => {
    haptics.tap();
    if (!isPlaying) {
      await audioEngine.startListening();
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const finishExercise = () => {
    const durationSeconds = Math.max(10, Math.round((Date.now() - sessionStartTime) / 1000));
    const attempted = Math.max(1, notesAttempted);
    const accuracy = Math.round((notesInTune / attempted) * 100);
    const avgError = notesAttempted > 0 ? Math.round(centsErrorSum / notesAttempted) : 10;

    const record: PracticeSessionRecord = {
      id: `session-${Date.now()}`,
      timestamp: Date.now(),
      exerciseId: exercise.id,
      exerciseTitle: exercise.title,
      durationSeconds,
      notesAttempted: attempted,
      notesHitInTune: notesInTune,
      accuracyPercentage: Math.min(100, accuracy),
      averageCentsError: avgError,
      dateString: 'Just now',
    };

    onFinishSession(record);
    audioEngine.playSuccessChime();
  };

  const accuracyPct = notesAttempted > 0 ? Math.round((notesInTune / notesAttempted) * 100) : 100;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
            Range-Adaptive Warmup
          </span>
          <h3 className="text-base font-bold text-white">{exercise.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
        >
          Exit
        </button>
      </div>

      {/* Vowel & Instruction Badge */}
      <div className="bg-gradient-to-r from-indigo-950 to-slate-900 p-3 rounded-2xl border border-indigo-900/50 flex items-center justify-between">
        <div className="text-xs">
          <span className="text-slate-400">Recommended Vowel: </span>
          <span className="font-bold text-cyan-400 text-sm ml-1">&quot;{exercise.vowelSuggestion}&quot;</span>
        </div>
        <div className="text-[11px] text-indigo-300 font-mono bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-800">
          Target: {currentTargetNote.fullName} ({Math.round(currentTargetNote.frequency)} Hz)
        </div>
      </div>

      {/* Target Pitch Visualizer Arc */}
      <div className="relative p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
        {/* Glow indicator */}
        <div
          className={`absolute inset-0 transition-opacity duration-200 pointer-events-none ${
            isMatching ? 'bg-emerald-500/20' : 'bg-transparent'
          }`}
        />

        <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">{t.target}</div>
        <div className="text-6xl font-black tracking-tight text-white font-mono-numbers">
          {formatNoteName(currentTargetNote, notation)}
        </div>

        {/* Live Sung Pitch Comparison */}
        <div className="mt-4 flex items-center gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'ar' ? 'صوتك:' : 'You:'}</span>
          </div>

          {currentPitch?.note ? (
            <div
              className={`px-3 py-1 rounded-xl font-mono text-xs font-bold border transition ${
                isMatching
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950'
                  : 'bg-slate-800 border-slate-700 text-amber-400'
              }`}
            >
              {formatNoteName(currentPitch.note, notation)} ({currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch.cents}¢)
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">Sing along with piano...</span>
          )}
        </div>

        {/* Pattern Step Dots */}
        <div className="flex items-center gap-1.5 mt-5">
          {exercise.basePatternSemitones.map((semi, idx) => {
            const isCurrent = idx === stepIndex;
            const note = midiToNoteInfo(currentRootMidi + semi);
            return (
              <div
                key={idx}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isCurrent ? 'scale-110' : 'opacity-60'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                    isCurrent
                      ? isMatching
                        ? 'bg-emerald-400 text-slate-950 ring-4 ring-emerald-500/30'
                        : 'bg-indigo-500 text-white ring-4 ring-indigo-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                />
                <span className="text-[9px] font-mono text-slate-400">{note.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Session Stats Bar */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Direction</span>
          <span className="font-bold capitalize text-slate-200">{direction}</span>
        </div>
        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Pitch Accuracy</span>
          <span className="font-bold text-emerald-400 font-mono">{accuracyPct}%</span>
        </div>
        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Tempo</span>
          <span className="font-bold text-indigo-400 font-mono">{bpm} BPM</span>
        </div>
      </div>

      {/* Tempo Slider */}
      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 flex items-center gap-3 text-xs">
        <span className="text-slate-400 text-[11px] shrink-0">Tempo:</span>
        <input
          type="range"
          min="50"
          max="150"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-full accent-indigo-500 h-1.5"
        />
        <span className="font-mono text-slate-300 text-[11px] w-12 text-right">{bpm} BPM</span>
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={togglePlay}
          className={`flex-2 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-98 ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
              : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-indigo-950/50'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5 fill-current" />
              <span>Pause Warmup</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Start Warmup</span>
            </>
          )}
        </button>

        <button
          onClick={finishExercise}
          className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
        >
          <Square className="w-4 h-4" />
          <span>Save & Exit</span>
        </button>
      </div>
    </div>
  );
};

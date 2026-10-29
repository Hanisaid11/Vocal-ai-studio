import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, RotateCcw, Award, CheckCircle2, AlertTriangle, ArrowRight, Music, HelpCircle } from 'lucide-react';
import { NoteInfo, VocalRangeProfile, PitchDetectionResult, PitchGameRecord } from '../../types/vocal';
import { midiToNoteInfo, generateNotesRange } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { haptics } from '../../utils/haptics';

interface IntervalDefinition {
  name: string;
  semitones: number;
  mnemonic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const INTERVALS: IntervalDefinition[] = [
  { name: 'Major 2nd (+2 st)', semitones: 2, mnemonic: 'Happy Birthday ("Hap-py")', difficulty: 'Easy' },
  { name: 'Major 3rd (+4 st)', semitones: 4, mnemonic: 'Oh When the Saints / Kumbaya', difficulty: 'Easy' },
  { name: 'Perfect 4th (+5 st)', semitones: 5, mnemonic: 'Here Comes the Bride / Amazing Grace', difficulty: 'Medium' },
  { name: 'Perfect 5th (+7 st)', semitones: 7, mnemonic: 'Twinkle Twinkle / Star Wars theme', difficulty: 'Medium' },
  { name: 'Major 6th (+9 st)', semitones: 9, mnemonic: 'My Bonnie Lies Over the Ocean', difficulty: 'Hard' },
  { name: 'Octave (+12 st)', semitones: 12, mnemonic: 'Somewhere Over the Rainbow ("Some-where")', difficulty: 'Hard' },
];

interface IntervalChallengeGameProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  onGameComplete: (record: PitchGameRecord) => void;
  onExit: () => void;
}

export const IntervalChallengeGame: React.FC<IntervalChallengeGameProps> = ({
  profile,
  currentPitch,
  onGameComplete,
  onExit,
}) => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions] = useState(8);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [gameState, setGameState] = useState<'prompt' | 'evaluating' | 'result' | 'finished'>('prompt');
  const [heldSeconds, setHeldSeconds] = useState(0);

  // Current question data
  const [rootMidi, setRootMidi] = useState(profile.middleRegisterNote.midi);
  const [activeInterval, setActiveInterval] = useState(INTERVALS[0]);

  const targetMidi = rootMidi + activeInterval.semitones;
  const rootNote = midiToNoteInfo(rootMidi);
  const targetNote = midiToNoteInfo(targetMidi);

  // Next question generator
  const setupNextQuestion = (index: number) => {
    if (index >= totalQuestions) {
      setGameState('finished');
      onGameComplete({
        id: `interval-${Date.now()}`,
        gameType: 'interval_challenge',
        score,
        highestStreak,
        accuracyPercentage: Math.round((score / (totalQuestions * 100)) * 100),
        totalNotes: totalQuestions,
        notesHit: Math.round(score / 100),
        date: 'Just now',
        timestamp: Date.now(),
      });
      return;
    }

    const interval = INTERVALS[index % INTERVALS.length];
    // Keep root + interval within user's range
    const maxRoot = profile.highestNote.midi - interval.semitones;
    const minRoot = profile.lowestNote.midi;
    const chosenRoot = Math.max(minRoot, Math.min(maxRoot, profile.lowestNote.midi + Math.floor(Math.random() * (maxRoot - minRoot + 1))));

    setRootMidi(chosenRoot);
    setActiveInterval(interval);
    setHeldSeconds(0);
    setGameState('prompt');

    // Play root reference note
    setTimeout(() => {
      audioEngine.playTone(midiToNoteInfo(chosenRoot).frequency, 1.2, 'piano');
    }, 200);
  };

  const playRootTone = async () => {
    haptics.tap();
    await audioEngine.playTone(rootNote.frequency, 1.2, 'piano');
  };

  const playTargetTone = async () => {
    haptics.tap();
    await audioEngine.playTone(targetNote.frequency, 1.2, 'piano');
  };

  // Evaluate singing
  useEffect(() => {
    if (gameState !== 'prompt') return;

    const sungMidi = currentPitch?.note?.midi;
    const clarity = currentPitch?.clarity ?? 0;
    const cents = Math.abs(currentPitch?.cents ?? 100);

    if (sungMidi === targetMidi && clarity > 0.7 && cents <= 20) {
      setHeldSeconds((prev) => {
        const next = prev + 0.1;
        if (next >= 1.2) {
          // Success hit!
          haptics.pitchMatch();
          audioEngine.playSuccessChime();

          const pts = cents <= 8 ? 100 : 75;
          setScore((s) => s + pts);
          setStreak((st) => {
            const nextSt = st + 1;
            setHighestStreak((h) => Math.max(h, nextSt));
            return nextSt;
          });

          setGameState('result');
        }
        return next;
      });
    } else {
      setHeldSeconds(0);
    }
  }, [currentPitch, targetMidi, gameState]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl flex flex-col gap-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Interval Ear Challenge</h2>
            <p className="text-xs text-slate-400">Listen to root, then sing the requested musical interval</p>
          </div>
        </div>

        <button
          onClick={onExit}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
        >
          Exit
        </button>
      </div>

      {gameState !== 'finished' ? (
        <div className="flex flex-col gap-4 py-2">
          {/* Question progress */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Interval Question {questionIndex + 1} of {totalQuestions}</span>
            <span className="font-mono text-cyan-400 font-bold">Score: {score}</span>
          </div>

          {/* Question Prompt Card */}
          <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 flex flex-col items-center text-center space-y-3">
            <div className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
              {activeInterval.difficulty} Challenge
            </div>

            <div className="text-2xl font-black text-white">
              Sing a {activeInterval.name}
            </div>

            <p className="text-xs text-slate-400 max-w-sm">
              Mnemonic: <strong className="text-cyan-300">&quot;{activeInterval.mnemonic}&quot;</strong>
            </p>

            {/* Root note & Target note boxes */}
            <div className="flex items-center gap-3 w-full max-w-xs pt-2">
              <button
                onClick={playRootTone}
                className="flex-1 p-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-cyan-400 flex flex-col items-center transition"
              >
                <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  <span>Root Pitch</span>
                </div>
                <div className="text-xl font-black text-cyan-400 font-mono">{rootNote.fullName}</div>
                <div className="text-[9px] text-slate-500 font-mono">{Math.round(rootNote.frequency)} Hz</div>
              </button>

              <ArrowRight className="w-5 h-5 text-indigo-400 shrink-0" />

              <div className="flex-1 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center">
                <div className="text-[10px] text-slate-400 mb-1">Target Note</div>
                <div className="text-xl font-black text-pink-400 font-mono">{targetNote.fullName}</div>
                <div className="text-[9px] text-slate-500 font-mono">+{activeInterval.semitones} Semitones</div>
              </div>
            </div>

            {/* Hold progress bar */}
            <div className="w-full max-w-xs mt-2">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Hold stability</span>
                <span>{Math.min(100, Math.round((heldSeconds / 1.2) * 100))}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-400 h-2 rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, (heldSeconds / 1.2) * 100)}%` }}
                />
              </div>
            </div>

            {/* Live Sung Pitch */}
            <div className="text-xs text-slate-400 font-mono pt-1">
              {currentPitch?.note ? (
                <span className={currentPitch.note.midi === targetMidi ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  Current voice: {currentPitch.note.fullName} ({currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch.cents}¢)
                </span>
              ) : (
                'Listening for sung interval...'
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={playTargetTone}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Listen to Answer</span>
            </button>

            {gameState === 'result' ? (
              <button
                onClick={() => {
                  setQuestionIndex((q) => q + 1);
                  setupNextQuestion(questionIndex + 1);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
              >
                <span>Correct! Next Interval</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setQuestionIndex((q) => q + 1);
                  setupNextQuestion(questionIndex + 1);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-semibold"
              >
                Skip Question
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/30 text-center space-y-3">
          <Award className="w-12 h-12 text-cyan-400 mx-auto" />
          <h3 className="text-xl font-black text-white">Interval Mastery Finished!</h3>
          <p className="text-xs text-slate-400">Total Score: {score} pts • Highest Streak: {highestStreak}x</p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setQuestionIndex(0);
                setScore(0);
                setStreak(0);
                setupNextQuestion(0);
              }}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              Play Again
            </button>
            <button
              onClick={onExit}
              className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

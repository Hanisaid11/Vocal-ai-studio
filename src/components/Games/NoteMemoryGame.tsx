import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, RotateCcw, Award, Sparkles, Mic, CheckCircle2, Music, Eye, EyeOff } from 'lucide-react';
import { NoteInfo, VocalRangeProfile, PitchDetectionResult, PitchGameRecord, AppLanguage, NotationSystem } from '../../types/vocal';
import { midiToNoteInfo, generateNotesRange, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { translations } from '../../utils/i18n';
import { haptics } from '../../utils/haptics';

interface NoteMemoryGameProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language: AppLanguage;
  notation: NotationSystem;
  onGameComplete: (record: PitchGameRecord) => void;
  onExit: () => void;
}

export const NoteMemoryGame: React.FC<NoteMemoryGameProps> = ({
  profile,
  currentPitch,
  language,
  notation,
  onGameComplete,
  onExit,
}) => {
  const t = translations[language];
  const [round, setRound] = useState(1);
  const totalRounds = 6;
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [gameState, setGameState] = useState<'listening' | 'singing' | 'revealed' | 'finished'>('listening');
  const [heldSeconds, setHeldSeconds] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Candidate notes within range
  const candidateNotes = React.useMemo(() => {
    return generateNotesRange(profile.lowestNote.midi, profile.highestNote.midi);
  }, [profile]);

  const [targetNote, setTargetNote] = useState<NoteInfo>(() => {
    return candidateNotes[Math.floor(Math.random() * candidateNotes.length)];
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [singTimeLeft, setSingTimeLeft] = useState(7);

  // Play target note on round start
  const playTargetAudio = async () => {
    haptics.tap();
    await audioEngine.playTone(targetNote.frequency, 1.8);
  };

  const startRound = (nextTarget?: NoteInfo) => {
    const note = nextTarget || candidateNotes[Math.floor(Math.random() * candidateNotes.length)];
    setTargetNote(note);
    setGameState('listening');
    setHeldSeconds(0);
    setSingTimeLeft(7);
    setShowHint(false);

    // Play tone automatically
    setTimeout(async () => {
      await audioEngine.playTone(note.frequency, 1.8);
      setGameState('singing');
    }, 400);
  };

  useEffect(() => {
    startRound();
  }, []);

  // Timer while singing
  useEffect(() => {
    if (gameState !== 'singing') return;

    timerRef.current = setInterval(() => {
      setSingTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          // Time expired
          setStreak(0);
          setGameState('revealed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Track pitch hold
  useEffect(() => {
    if (gameState !== 'singing') return;

    const sungMidi = currentPitch?.note?.midi;
    const clarity = currentPitch?.clarity ?? 0;
    const cents = Math.abs(currentPitch?.cents ?? 100);

    if (sungMidi === targetNote.midi && clarity > 0.65 && cents <= 22) {
      setHeldSeconds((prev) => {
        const next = prev + 0.1;
        if (next >= 1.2) {
          // Success!
          haptics.pitchMatch();
          audioEngine.playSuccessChime();

          const pts = cents <= 8 ? 100 : 75;
          setScore((s) => s + pts);
          setStreak((st) => {
            const nextSt = st + 1;
            setHighestStreak((h) => Math.max(h, nextSt));
            return nextSt;
          });

          setGameState('revealed');
        }
        return next;
      });
    } else {
      setHeldSeconds(0);
    }
  }, [currentPitch, targetNote, gameState]);

  const handleNextRound = () => {
    haptics.tap();
    if (round >= totalRounds) {
      setGameState('finished');
      onGameComplete({
        id: `memory-${Date.now()}`,
        gameType: 'match_note',
        score,
        highestStreak,
        accuracyPercentage: Math.round((score / (totalRounds * 100)) * 100),
        totalNotes: totalRounds,
        notesHit: Math.round(score / 100),
        date: 'Just now',
        timestamp: Date.now(),
      });
    } else {
      setRound((r) => r + 1);
      startRound();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl flex flex-col gap-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{t.memoryTitle}</h2>
            <p className="text-xs text-slate-400">{t.memoryDesc}</p>
          </div>
        </div>

        <button
          onClick={onExit}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
        >
          {t.close}
        </button>
      </div>

      {gameState !== 'finished' ? (
        <div className="flex flex-col gap-4 py-2">
          {/* Status HUD */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {language === 'ar' ? `الجولة ${round} من ${totalRounds}` : `Round ${round} of ${totalRounds}`}
            </span>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-amber-400">{t.streak}: {streak}x</span>
              <span className="text-cyan-400 font-bold">{t.score}: {score}</span>
            </div>
          </div>

          {/* Mystery Card Box */}
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
            {/* Listening vs Singing banner */}
            <div className="text-xs uppercase font-bold tracking-wider text-purple-400">
              {gameState === 'listening'
                ? (language === 'ar' ? 'استمع للنغمة المرجعية...' : 'Listening to reference tone...')
                : gameState === 'singing'
                ? (language === 'ar' ? 'غنِّ النغمة من ذاكرتك الآن 🎙️' : 'Sing the pitch from memory now 🎙️')
                : (language === 'ar' ? 'تم الكشف عن النغمة' : 'Note Revealed')}
            </div>

            {/* Note Display (hidden or revealed) */}
            <div className="w-32 h-32 rounded-3xl bg-slate-900 border-2 border-dashed border-purple-500/40 flex flex-col items-center justify-center shadow-inner">
              {gameState === 'revealed' || showHint ? (
                <>
                  <div className="text-3xl font-black text-cyan-400 font-mono">
                    {formatNoteName(targetNote, notation)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    {Math.round(targetNote.frequency)} Hz
                  </div>
                </>
              ) : (
                <div className="text-4xl font-black text-purple-400/60 font-mono animate-pulse">
                  ?
                </div>
              )}
            </div>

            {/* Play tone again button */}
            <button
              onClick={playTargetAudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500 text-xs text-purple-300 font-medium transition"
            >
              <Volume2 className="w-4 h-4" />
              <span>{language === 'ar' ? 'إعادة سماع النغمة' : 'Replay Reference Tone'}</span>
            </button>

            {/* Hold progress bar */}
            {gameState === 'singing' && (
              <div className="w-full max-w-xs space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{t.holdStability}</span>
                  <span>{Math.min(100, Math.round((heldSeconds / 1.2) * 100))}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-2 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, (heldSeconds / 1.2) * 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 font-mono text-right">
                  {t.timeLeft}: {singTimeLeft}s
                </div>
              </div>
            )}

            {/* Live Sung Pitch */}
            <div className="text-xs font-mono">
              {currentPitch?.note ? (
                <span className={currentPitch.note.midi === targetNote.midi ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {language === 'ar' ? 'صوتك الآن: ' : 'Your voice: '}
                  {formatNoteName(currentPitch.note, notation)} ({currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch.cents}¢)
                </span>
              ) : (
                <span className="text-slate-500 italic">{t.singPrompt}</span>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHint(!showHint)}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs flex items-center gap-1.5"
            >
              {showHint ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showHint ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'تلميح' : 'Hint')}</span>
            </button>

            {gameState === 'revealed' ? (
              <button
                onClick={handleNextRound}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-950/40"
              >
                {round >= totalRounds ? t.gameOver : (language === 'ar' ? 'الجولة التالية ←' : 'Next Round →')}
              </button>
            ) : (
              <button
                onClick={() => setGameState('revealed')}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                {language === 'ar' ? 'استسلام وكشف النغمة' : 'Give Up & Reveal'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 p-6 rounded-3xl border border-indigo-500/40 text-center space-y-4">
          <Award className="w-12 h-12 text-cyan-400 mx-auto" />
          <h3 className="text-xl font-black text-white">{t.gameOver}</h3>
          <p className="text-xs text-slate-400">
            {language === 'ar' ? `نقاطك الإجمالية: ${score} نقطة • أعلى تتابع: ${highestStreak}x` : `Final Score: ${score} pts • Best Streak: ${highestStreak}x`}
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setRound(1);
                setScore(0);
                setStreak(0);
                startRound();
              }}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              {t.playAgain}
            </button>
            <button
              onClick={onExit}
              className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              {t.returnToHub}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

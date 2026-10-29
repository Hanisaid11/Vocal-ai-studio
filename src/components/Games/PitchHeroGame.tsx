import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Flame, Trophy, Award, Sparkles, Volume2, Mic, AlertCircle, CheckCircle2 } from 'lucide-react';
import { NoteInfo, VocalRangeProfile, PitchDetectionResult, PitchGameRecord } from '../../types/vocal';
import { midiToNoteInfo, generateNotesRange } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { haptics } from '../../utils/haptics';

interface FallingNote {
  id: string;
  midi: number;
  note: NoteInfo;
  y: number; // 0 to 100%
  speed: number;
  hit: boolean;
  missed: boolean;
  hitQuality?: 'PERFECT' | 'GREAT' | 'GOOD';
}

interface PitchHeroGameProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  onGameComplete: (record: PitchGameRecord) => void;
  onExit: () => void;
}

export const PitchHeroGame: React.FC<PitchHeroGameProps> = ({
  profile,
  currentPitch,
  onGameComplete,
  onExit,
}) => {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover'>('ready');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [notesSpawned, setNotesSpawned] = useState(0);
  const [notesHit, setNotesHit] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45); // 45 seconds game

  const [fallingNotes, setFallingNotes] = useState<FallingNote[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const lastSpawnTime = useRef<number>(0);
  const gameStartTime = useRef<number>(0);

  // Available candidate notes within user's active vocal compass
  const candidateNotes = React.useMemo(() => {
    return generateNotesRange(profile.lowestNote.midi, profile.highestNote.midi);
  }, [profile]);

  // Start game
  const startGame = async () => {
    try {
      await audioEngine.startListening();
      setScore(0);
      setStreak(0);
      setHighestStreak(0);
      setNotesSpawned(0);
      setNotesHit(0);
      setTimeLeft(45);
      setFallingNotes([]);
      gameStartTime.current = Date.now();
      lastSpawnTime.current = Date.now();
      setGameState('playing');
      haptics.tap();
    } catch {
      alert('Microphone permission is required to play Pitch Hero!');
    }
  };

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Main game physics loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const HIT_ZONE_MIN = 72; // %
    const HIT_ZONE_MAX = 94; // %

    const loop = () => {
      const now = Date.now();

      // Spawn new notes periodically (every 2.2 seconds)
      if (now - lastSpawnTime.current > 2200) {
        lastSpawnTime.current = now;
        const randomNote = candidateNotes[Math.floor(Math.random() * candidateNotes.length)];
        const newNote: FallingNote = {
          id: `note-${now}-${Math.random()}`,
          midi: randomNote.midi,
          note: randomNote,
          y: 0,
          speed: 0.38, // fall speed percentage per frame
          hit: false,
          missed: false,
        };
        setFallingNotes((prev) => [...prev, newNote]);
        setNotesSpawned((n) => n + 1);
        // Play subtle acoustic preview tone
        audioEngine.playTone(randomNote.frequency, 0.25, 'piano');
      }

      // Update positions and collision with live sung pitch
      setFallingNotes((prevNotes) => {
        return prevNotes
          .map((n) => {
            if (n.hit || n.missed) return n;

            const nextY = n.y + n.speed;

            // Check if note is inside Hit Zone
            if (nextY >= HIT_ZONE_MIN && nextY <= HIT_ZONE_MAX) {
              const sungMidi = currentPitch?.note?.midi;
              const clarity = currentPitch?.clarity ?? 0;
              const cents = Math.abs(currentPitch?.cents ?? 100);

              // Check if singer is hitting the note!
              if (sungMidi === n.midi && clarity > 0.65 && cents <= 22) {
                // Success hit!
                haptics.pitchMatch();
                audioEngine.playSuccessChime();

                let quality: 'PERFECT' | 'GREAT' | 'GOOD' = 'GOOD';
                let pts = 50;
                if (cents <= 8) {
                  quality = 'PERFECT';
                  pts = 100;
                } else if (cents <= 15) {
                  quality = 'GREAT';
                  pts = 75;
                }

                setStreak((s) => {
                  const nextS = s + 1;
                  setHighestStreak((h) => Math.max(h, nextS));
                  const multiplier = Math.min(4, Math.floor(nextS / 3) + 1);
                  setScore((sc) => sc + pts * multiplier);
                  return nextS;
                });

                setNotesHit((h) => h + 1);

                return { ...n, y: nextY, hit: true, hitQuality: quality };
              }
            }

            // If note fell past hit zone without being sung -> Miss!
            if (nextY > HIT_ZONE_MAX + 4) {
              setStreak(0); // break streak
              return { ...n, y: nextY, missed: true };
            }

            return { ...n, y: nextY };
          })
          .filter((n) => n.y <= 105); // Clean up offscreen
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, currentPitch, candidateNotes]);

  const endGame = () => {
    setGameState('gameover');
    haptics.pitchMatch();

    const accuracy = notesSpawned > 0 ? Math.round((notesHit / notesSpawned) * 100) : 0;
    const record: PitchGameRecord = {
      id: `hero-${Date.now()}`,
      gameType: 'pitch_hero',
      score,
      highestStreak,
      accuracyPercentage: accuracy,
      totalNotes: notesSpawned,
      notesHit,
      date: 'Just now',
      timestamp: Date.now(),
    };

    onGameComplete(record);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl flex flex-col gap-4 max-w-xl mx-auto">
      {/* Game Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/50">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Pitch Hero: Note Catch</h2>
            <p className="text-xs text-slate-400">Sing falling notes as they reach the hit line</p>
          </div>
        </div>

        <button
          onClick={onExit}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
        >
          Exit
        </button>
      </div>

      {/* Top HUD: Score, Streak, Timer */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Score</span>
          <span className="text-lg font-black text-cyan-400 font-mono">{score}</span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400 font-bold">
            <Flame className="w-3 h-3" /> Streak
          </div>
          <span className="text-lg font-black text-amber-400 font-mono">{streak}x</span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Time Left</span>
          <span className={`text-lg font-black font-mono ${timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Main Falling Track Canvas Area */}
      <div className="relative h-80 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden select-none">
        {/* Background Vertical Guidelines */}
        <div className="absolute inset-0 grid grid-cols-4 pointer-events-none opacity-20">
          <div className="border-r border-indigo-500/30" />
          <div className="border-r border-indigo-500/30" />
          <div className="border-r border-indigo-500/30" />
        </div>

        {/* Target Hit Zone Band */}
        <div className="absolute left-0 right-0 top-[72%] h-[22%] bg-gradient-to-b from-indigo-950/40 via-cyan-950/50 to-indigo-950/40 border-y-2 border-dashed border-cyan-400/60 flex items-center justify-between px-3">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">HIT ZONE</span>
          <span className="text-[10px] font-mono text-cyan-300">SING NOW 🎙️</span>
        </div>

        {/* Falling Note Bubbles */}
        {fallingNotes.map((item) => {
          if (item.hit) {
            return (
              <div
                key={item.id}
                style={{ top: `${item.y}%`, left: '50%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-xs font-black text-emerald-400 animate-ping font-mono"
              >
                {item.hitQuality}! +100
              </div>
            );
          }

          if (item.missed) {
            return (
              <div
                key={item.id}
                style={{ top: `${item.y}%`, left: '50%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-rose-500 opacity-60 font-mono"
              >
                MISS
              </div>
            );
          }

          return (
            <div
              key={item.id}
              style={{
                top: `${item.y}%`,
                left: '50%',
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-28 py-2 px-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-950/60 border border-indigo-300 flex flex-col items-center justify-center transition-transform hover:scale-105"
            >
              <div className="font-mono text-sm font-black tracking-tight">{item.note.fullName}</div>
              <div className="text-[9px] font-mono text-indigo-200 opacity-90">{Math.round(item.note.frequency)} Hz</div>
            </div>
          );
        })}

        {/* Live Sung Pitch Bar indicator */}
        <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Mic className={`w-3.5 h-3.5 ${currentPitch?.note ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="font-mono text-slate-300">
              {currentPitch?.note ? `${currentPitch.note.fullName} (${currentPitch.frequency} Hz)` : 'Listening for your pitch...'}
            </span>
          </div>

          {currentPitch?.note && (
            <span className={`font-mono text-[11px] font-bold ${currentPitch.isInTune ? 'text-emerald-400' : 'text-amber-400'}`}>
              {currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch.cents}¢
            </span>
          )}
        </div>
      </div>

      {/* Start / Game Over Controls */}
      {gameState === 'ready' && (
        <div className="flex flex-col gap-2">
          <button
            onClick={startGame}
            className="w-full py-4 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 transition active:scale-98"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Pitch Hero (45s Challenge)</span>
          </button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/30 text-center space-y-3 animate-in zoom-in-95">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/40">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Challenge Complete!</h3>
            <p className="text-xs text-slate-400">Great vocal agility and ear coordination session.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Final Score</span>
              <span className="text-base font-bold text-cyan-400 font-mono">{score}</span>
            </div>
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Highest Streak</span>
              <span className="text-base font-bold text-amber-400 font-mono">{highestStreak}x</span>
            </div>
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Accuracy</span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                {notesSpawned > 0 ? Math.round((notesHit / notesSpawned) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={startGame}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
            <button
              onClick={onExit}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
            >
              Return to Hub
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

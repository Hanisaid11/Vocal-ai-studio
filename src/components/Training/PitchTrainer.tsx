import React, { useState, useEffect, useRef } from 'react';
import { Volume2, RotateCcw, Target, Flame } from 'lucide-react';
import { NoteInfo, PitchDetectionResult, VocalRangeProfile, PracticeSessionRecord, AppLanguage, NotationSystem } from '../../types/vocal';
import { midiToNoteInfo, generateNotesRange, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { haptics } from '../../utils/haptics';
import { translations } from '../../utils/i18n';

interface PitchTrainerProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language?: AppLanguage;
  notation?: NotationSystem;
  onRecordSession: (session: PracticeSessionRecord) => void;
}

export const PitchTrainer: React.FC<PitchTrainerProps> = ({
  profile,
  currentPitch,
  language = 'ar',
  notation = 'arabic',
  onRecordSession,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pitchHistoryRef = useRef<Array<{ freq: number | null; cents: number; isInTune: boolean }>>([]);

  const isAr = language === 'ar';
  const t = translations[language] || translations.en;

  // Training mode: 'free_tuner' | 'target_match'
  const [mode, setMode] = useState<'free_tuner' | 'target_match'>('target_match');

  // Target note state
  const [targetMidi, setTargetMidi] = useState<number>(profile.middleRegisterNote.midi);
  const targetNote = midiToNoteInfo(targetMidi);

  // Target match sustained score
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 1
  const [scoreStreak, setScoreStreak] = useState(0);
  const [notesCompleted, setNotesCompleted] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const sessionStartTime = useRef(Date.now());

  // Available notes for trainer (restricted within vocal range)
  const availableNotes = React.useMemo(() => {
    return generateNotesRange(profile.lowestNote.midi, profile.highestNote.midi);
  }, [profile]);

  // Target match detection logic
  useEffect(() => {
    if (mode !== 'target_match') return;

    const isCurrentInTune =
      currentPitch?.note?.midi === targetMidi &&
      Math.abs(currentPitch?.cents ?? 100) <= 14 &&
      (currentPitch?.clarity ?? 0) > 0.65;

    if (isCurrentInTune) {
      setHoldProgress((prev) => {
        const next = prev + 0.05;
        if (next >= 1) {
          // Success! Target completed
          haptics.pitchMatch();
          audioEngine.playSuccessChime();
          setScoreStreak((s) => s + 1);
          setNotesCompleted((c) => c + 1);
          setTotalAttempts((a) => a + 1);

          // Pick next random note within range
          setTimeout(() => {
            const nextIdx = Math.floor(Math.random() * availableNotes.length);
            setTargetMidi(availableNotes[nextIdx].midi);
            setHoldProgress(0);
          }, 350);

          return 0;
        }
        return next;
      });
    } else {
      setHoldProgress((prev) => Math.max(0, prev - 0.03));
    }
  }, [currentPitch, targetMidi, mode, availableNotes]);

  // Canvas Scrolling Pitch Ribbon Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderRibbon = () => {
      // Add current pitch to history
      pitchHistoryRef.current.push({
        freq: currentPitch?.frequency || null,
        cents: currentPitch?.cents || 0,
        isInTune: currentPitch?.isInTune || false,
      });

      if (pitchHistoryRef.current.length > 150) {
        pitchHistoryRef.current.shift();
      }

      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      // Clear background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Target zone horizontal band
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(0, midY - 14, width, 28);

      // Center reference zero-line
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw pitch trail
      const history = pitchHistoryRef.current;
      const stepX = width / 150;

      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1];
        const curr = history[i];

        if (prev.freq === null || curr.freq === null) continue;

        const x1 = (i - 1) * stepX;
        const x2 = i * stepX;

        // Cents mapped from -50 to +50
        const y1 = midY - (prev.cents / 50) * (height / 2.4);
        const y2 = midY - (curr.cents / 50) * (height / 2.4);

        ctx.strokeStyle = curr.isInTune ? '#10b981' : '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Live head orb
      if (history.length > 0) {
        const last = history[history.length - 1];
        if (last.freq !== null) {
          const x = (history.length - 1) * stepX;
          const y = midY - (last.cents / 50) * (height / 2.4);

          ctx.fillStyle = last.isInTune ? '#34d399' : '#fbbf24';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(renderRibbon);
    };

    animId = requestAnimationFrame(renderRibbon);
    return () => cancelAnimationFrame(animId);
  }, [currentPitch]);

  const playReferenceTone = () => {
    setIsPlayingReference(true);
    audioEngine.playTone(targetNote.frequency, 1.2);
    setTimeout(() => {
      setIsPlayingReference(false);
    }, 1200);
  };

  const nextRandomNote = () => {
    haptics.tap();
    const nextIdx = Math.floor(Math.random() * availableNotes.length);
    setTargetMidi(availableNotes[nextIdx].midi);
    setHoldProgress(0);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl flex flex-col gap-4 max-w-xl mx-auto">
      {/* Header & Mode Switch */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {isAr ? 'محرك ضبط وتدريب النغمة التفاعلي' : 'Interactive Pitch Engine'}
            </h2>
            <p className="text-xs text-slate-400">
              {isAr ? 'كشف النغمات اللحظي بالخوارزمية وضابط النغمات الدقيق' : 'Real-time YIN pitch detection & precision tuner'}
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setMode('target_match')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              mode === 'target_match' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'مطابقة الهدف' : 'Target Match'}
          </button>
          <button
            onClick={() => setMode('free_tuner')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              mode === 'free_tuner' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'ضابط النغمات' : 'Chromatic Tuner'}
          </button>
        </div>
      </div>

      {/* Target Note Banner (in Target Match mode) */}
      {mode === 'target_match' && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-950 to-slate-900 p-4 rounded-2xl border border-indigo-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={playReferenceTone}
              disabled={isPlayingReference}
              className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-950/60 transition active:scale-95 shrink-0"
              aria-label="Play reference audio tone"
            >
              <Volume2 className={`w-5 h-5 ${isPlayingReference ? 'animate-pulse' : ''}`} />
            </button>
            <div>
              <div className="text-[10px] uppercase font-bold text-indigo-400">
                {isAr ? 'النغمة المستهدفة' : 'Target Note'}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">
                  {formatNoteName(targetNote, notation)}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({Math.round(targetNote.frequency)} {t.hzUnit})
                </span>
              </div>
            </div>
          </div>

          {/* Quick Note Selector Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={targetMidi}
              onChange={(e) => {
                setTargetMidi(Number(e.target.value));
                setHoldProgress(0);
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
            >
              {availableNotes.map((n) => (
                <option key={n.midi} value={n.midi}>
                  {formatNoteName(n, notation)} ({Math.round(n.frequency)} {t.hzUnit})
                </option>
              ))}
            </select>
            <button
              onClick={nextRandomNote}
              title={isAr ? 'النغمة التالية العشوائية' : 'Next Random Note'}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Real-Time Pitch Ribbon Canvas Visualizer */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          className="w-full h-40 block"
        />

        {/* Live Centered Note Overlay */}
        <div className="absolute top-2 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${currentPitch?.note ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
          <span className="font-mono text-slate-300">
            {currentPitch?.note
              ? `${formatNoteName(currentPitch.note, notation)} (${currentPitch.frequency} ${t.hzUnit})`
              : (isAr ? 'غنِّ لتتبع نغمتك بدقة' : 'Sing to track pitch')}
          </span>
        </div>

        {/* Cents deviation indicator top right */}
        {currentPitch?.note && (
          <div
            className={`absolute top-2 right-3 px-2 py-1 rounded-lg text-xs font-mono font-bold border backdrop-blur-md ${
              currentPitch.isInTune
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
            }`}
          >
            {currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch.cents} {isAr ? 'سنت' : 'cents'}
          </div>
        )}
      </div>

      {/* Target Match Hold Progress (when in target mode) */}
      {mode === 'target_match' && (
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">
              {isAr ? 'طابق واثبت على النغمة المستهدفة:' : 'Match & Sustain Target Pitch:'}
            </span>
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Flame className="w-3.5 h-3.5" />
              <span>{isAr ? 'التتابع' : 'Streak'}: {scoreStreak}</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-2.5 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${Math.min(100, Math.round(holdProgress * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Precision Tuner Gauge (-50 to +50 cents) */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
        {/* Note display */}
        <div className="text-4xl font-black text-white font-mono-numbers">
          {currentPitch?.note ? formatNoteName(currentPitch.note, notation) : '—'}
        </div>

        {/* Cents meter bar */}
        <div className="w-full max-w-xs mt-3">
          <div className="relative h-6 bg-slate-900 rounded-full border border-slate-800 flex items-center px-1 overflow-hidden">
            {/* Center target zone (+/- 10 cents) */}
            <div className="absolute left-1/2 -translate-x-1/2 w-8 h-full bg-emerald-500/20 border-x border-emerald-500/40" />
            <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-indigo-500" />

            {/* Needle / Ball */}
            {currentPitch?.note && (
              <div
                className={`absolute w-4 h-4 rounded-full shadow-lg transition-all duration-75 -translate-x-1/2 ${
                  currentPitch.isInTune
                    ? 'bg-emerald-400 ring-4 ring-emerald-500/30'
                    : 'bg-amber-400 ring-2 ring-amber-500/30'
                }`}
                style={{
                  left: `${Math.max(5, Math.min(95, 50 + (currentPitch.cents / 50) * 45))}%`,
                }}
              />
            )}
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 px-1">
            <span>{isAr ? '-50 سنت (هابط ♭)' : '-50¢ (Flat)'}</span>
            <span className="text-emerald-400 font-bold">{isAr ? '0 نغمة صحيحة' : '0¢ In-Tune'}</span>
            <span>{isAr ? '+50 سنت (حاد ♯)' : '+50¢ (Sharp)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

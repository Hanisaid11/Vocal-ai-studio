import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Pause, RotateCcw, CheckCircle2, Award, ArrowRight, Mic, Sparkles } from 'lucide-react';
import { NoteInfo, VocalRangeProfile, PitchDetectionResult, AppLanguage, NotationSystem, PitchGameRecord } from '../../types/vocal';
import { midiToNoteInfo, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { translations } from '../../utils/i18n';
import { haptics } from '../../utils/haptics';

interface SirenGlideGameProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language: AppLanguage;
  notation: NotationSystem;
  onRecordGameSession: (record: PitchGameRecord) => void;
  onBackToHub: () => void;
}

export const SirenGlideGame: React.FC<SirenGlideGameProps> = ({
  profile,
  currentPitch,
  language,
  notation,
  onRecordGameSession,
  onBackToHub,
}) => {
  const t = translations[language];
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [score, setScore] = useState(0);
  const [accuracySamples, setAccuracySamples] = useState<number[]>([]);
  const [glidePoints, setGlidePoints] = useState<Array<{ progress: number; sungMidi: number; targetMidi: number; isHit: boolean }>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Siren range: from lowest comfort to middle/head tone
  const startMidi = useMemoMidi(profile.lowestNote.midi + 3);
  const peakMidi = useMemoMidi(Math.min(profile.highestNote.midi - 2, startMidi + 12)); // Octave siren glide

  function useMemoMidi(m: number) {
    return Math.max(36, Math.min(84, m));
  }

  const startNote = midiToNoteInfo(startMidi);
  const peakNote = midiToNoteInfo(peakMidi);

  // Play demonstration siren guide tone
  const playGuideSiren = async () => {
    audioEngine.playTone(startNote.frequency, 0.6);
    setTimeout(() => {
      audioEngine.playTone(peakNote.frequency, 0.6);
    }, 700);
  };

  // Run Glide animation timer
  useEffect(() => {
    if (!isPlaying) return;

    const DURATION_MS = 6000; // 6 second glissando glide up and down
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(1, elapsed / DURATION_MS);
      setProgress(p);

      // Target curve: Sine wave curve up to peak at p=0.5, then back down
      const curveHeight = Math.sin(p * Math.PI); // 0 -> 1 -> 0
      const currentTargetMidi = startMidi + curveHeight * (peakMidi - startMidi);

      if (currentPitch?.note && currentPitch.clarity > 0.65) {
        const userMidi = currentPitch.note.midi + currentPitch.cents / 100;
        const diff = Math.abs(userMidi - currentTargetMidi);
        const isHit = diff <= 1.5; // Within 1.5 semitones

        setGlidePoints((prev) => [
          ...prev.slice(-120),
          { progress: p, sungMidi: userMidi, targetMidi: currentTargetMidi, isHit },
        ]);

        if (isHit) {
          setScore((s) => s + 5);
          haptics.pitchMatch();
        }
        setAccuracySamples((prev) => [...prev, isHit ? 100 : Math.max(0, 100 - diff * 35)]);
      }

      if (p >= 1) {
        clearInterval(interval);
        setIsPlaying(false);
        haptics.pitchMatch();
        audioEngine.playSuccessChime();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, startMidi, peakMidi, currentPitch]);

  // Render Sing Sharp Pitch Ribbon Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Draw horizontal octave grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    for (let m = startMidi; m <= peakMidi + 2; m += 2) {
      const y = height - ((m - startMidi + 1) / (peakMidi - startMidi + 3)) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '10px monospace';
      ctx.fillText(formatNoteName(midiToNoteInfo(m), notation), 8, y - 3);
    }

    // Draw Target Glide Ribbon (Cyan smooth curve)
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';

    for (let x = 0; x <= width; x += 4) {
      const p = x / width;
      const curveHeight = Math.sin(p * Math.PI);
      const targetM = startMidi + curveHeight * (peakMidi - startMidi);
      const y = height - ((targetM - startMidi + 1) / (peakMidi - startMidi + 3)) * height;

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw User Sung Trail Points
    glidePoints.forEach((pt) => {
      const x = pt.progress * width;
      const y = height - ((pt.sungMidi - startMidi + 1) / (peakMidi - startMidi + 3)) * height;

      ctx.fillStyle = pt.isHit ? '#10b981' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(x, y, pt.isHit ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Live Playhead Cursor
    if (isPlaying) {
      const cursorX = progress * width;
      const curveHeight = Math.sin(progress * Math.PI);
      const targetM = startMidi + curveHeight * (peakMidi - startMidi);
      const cursorY = height - ((targetM - startMidi + 1) / (peakMidi - startMidi + 3)) * height;

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [progress, glidePoints, startMidi, peakMidi, isPlaying, notation]);

  const avgAccuracy =
    accuracySamples.length > 0
      ? Math.round(accuracySamples.reduce((a, b) => a + b, 0) / accuracySamples.length)
      : 0;

  const handleFinish = () => {
    const record: PitchGameRecord = {
      id: `siren-${Date.now()}`,
      gameType: 'siren_glide',
      score,
      highestStreak: Math.round(score / 5),
      accuracyPercentage: avgAccuracy,
      totalNotes: accuracySamples.length,
      notesHit: Math.round((avgAccuracy / 100) * accuracySamples.length),
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
    };
    onRecordGameSession(record);
    onBackToHub();
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full select-none animate-in fade-in">
      {/* Top Header Card */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <span>{t.sirenGlideTitle}</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] border border-cyan-500/30">
              Sing Sharp Style
            </span>
          </h2>
          <p className="text-xs text-slate-400">{t.sirenGlideDesc}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={playGuideSiren}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.replaySound}</span>
          </button>
          <button
            onClick={handleFinish}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
          >
            {t.saveExit}
          </button>
        </div>
      </div>

      {/* Score & Accuracy Strip */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
          <span className="text-slate-400 text-[10px] block">{language === 'ar' ? 'الدرجة' : 'Score'}</span>
          <span className="text-base font-bold text-cyan-400 font-mono">{score}</span>
        </div>
        <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
          <span className="text-slate-400 text-[10px] block">{language === 'ar' ? 'دقة الانزلاق' : 'Glide Accuracy'}</span>
          <span className="text-base font-bold text-emerald-400 font-mono">{avgAccuracy}%</span>
        </div>
        <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
          <span className="text-slate-400 text-[10px] block">{language === 'ar' ? 'المسار الصوتي' : 'Vocal Compass'}</span>
          <span className="text-xs font-bold text-pink-400 font-mono">
            {formatNoteName(startNote, notation)} ↗ {formatNoteName(peakNote, notation)}
          </span>
        </div>
      </div>

      {/* Main Sing Sharp Canvas */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={800}
          height={320}
          className="w-full h-[280px] sm:h-[320px] block"
        />

        {/* Live Sung Pitch Overlay */}
        {currentPitch?.note && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-xs flex items-center gap-1.5 animate-pulse">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>{formatNoteName(currentPitch.note, notation)}</span>
            <span>({Math.round(currentPitch.frequency || 0)} {t.hzUnit})</span>
          </div>
        )}

        {/* Start / Action Controls */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
          <button
            onClick={() => {
              haptics.tap();
              setGlidePoints([]);
              setAccuracySamples([]);
              setScore(0);
              setProgress(0);
              setIsPlaying(true);
            }}
            disabled={isPlaying}
            className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl transition active:scale-95 ${
              isPlaying
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-950/60'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{language === 'ar' ? 'ابدأ تمرين الانزلاق (Siren)' : 'Start Siren Glide'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

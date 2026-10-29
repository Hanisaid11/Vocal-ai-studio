import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Flame,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Layers,
  Award,
} from 'lucide-react';
import {
  VocalRangeProfile,
  PitchDetectionResult,
  PitchGameRecord,
  AppLanguage,
  NotationSystem,
  InstrumentType,
  AppTheme,
  NoteInfo,
} from '../../types/vocal';
import { midiToNoteInfo, generateNotesRange, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { translations, INSTRUMENT_NAMES } from '../../utils/i18n';
import { THEMES } from '../../utils/theme';
import { haptics } from '../../utils/haptics';

interface PitchRecognitionGameProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language: AppLanguage;
  notation: NotationSystem;
  theme?: AppTheme;
  onRecordGameSession: (record: PitchGameRecord) => void;
  onBackToHub: () => void;
}

export const PitchRecognitionGame: React.FC<PitchRecognitionGameProps> = ({
  profile,
  language,
  notation,
  theme = 'classic-piano',
  onRecordGameSession,
  onBackToHub,
}) => {
  const isAr = language === 'ar';
  const t = translations[language] || translations.en;
  const themeConfig = THEMES[theme] || THEMES['classic-piano'];

  // Selected instrument for playing the pitch: Piano or Oud
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>('piano');

  // Game state
  const [roundNumber, setRoundNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctHits, setCorrectHits] = useState(0);

  // Target note state
  const [targetMidi, setTargetMidi] = useState<number>(profile.middleRegisterNote.midi);
  const targetNote = useMemo(() => midiToNoteInfo(targetMidi), [targetMidi]);

  // UI state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [lastGuessedMidi, setLastGuessedMidi] = useState<number | null>(null);
  const [lastGuessResult, setLastGuessResult] = useState<'correct' | 'too_high' | 'too_low' | null>(null);
  const [semitonesOff, setSemitonesOff] = useState<number | null>(null);
  const [hintActive, setHintActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // Container ref for scrolling the vertical piano
  const pianoContainerRef = useRef<HTMLDivElement>(null);
  const sessionStartTime = useRef(Date.now());

  // Notes in the user's vocal range + 2 extra buffer semitones on either side
  const availableRangeNotes = useMemo(() => {
    const min = Math.max(24, profile.lowestNote.midi);
    const max = Math.min(108, profile.highestNote.midi);
    return generateNotesRange(min, max);
  }, [profile]);

  // Notes displayed on the vertical piano (running from top = highest to bottom = lowest)
  const verticalDisplayNotes = useMemo(() => {
    const min = Math.max(24, profile.lowestNote.midi - 1);
    const max = Math.min(108, profile.highestNote.midi + 1);
    const list: NoteInfo[] = [];
    for (let m = min; m <= max; m++) {
      list.push(midiToNoteInfo(m));
    }
    return list.reverse(); // Reverse so highest is at the top, lowest at bottom
  }, [profile]);

  // Play the target note with high-fidelity synthesis
  const playTargetPitch = async (midiToPlay = targetMidi, inst = selectedInstrument) => {
    setIsPlayingAudio(true);
    const note = midiToNoteInfo(midiToPlay);
    try {
      await audioEngine.playTone(note.frequency, 1.4, inst, midiToPlay);
    } finally {
      setTimeout(() => {
        setIsPlayingAudio(false);
      }, 1300);
    }
  };

  // Pick a new random target note within user's active vocal compass
  const spawnNewTarget = (excludeMidi?: number) => {
    if (availableRangeNotes.length === 0) return;
    let nextNote = availableRangeNotes[Math.floor(Math.random() * availableRangeNotes.length)];
    if (availableRangeNotes.length > 2 && excludeMidi && nextNote.midi === excludeMidi) {
      const filtered = availableRangeNotes.filter((n) => n.midi !== excludeMidi);
      nextNote = filtered[Math.floor(Math.random() * filtered.length)];
    }

    setTargetMidi(nextNote.midi);
    setLastGuessedMidi(null);
    setLastGuessResult(null);
    setSemitonesOff(null);
    setHintActive(false);

    // Play after short pause
    setTimeout(() => {
      playTargetPitch(nextNote.midi);
    }, 400);
  };

  // Initial prompt note play on mount
  useEffect(() => {
    spawnNewTarget();
  }, []);

  // Handle user tapping a key on the vertical piano
  const handleKeyTap = async (guessedMidi: number) => {
    if (isPlayingAudio || lastGuessResult === 'correct') return;

    haptics.tap();
    setLastGuessedMidi(guessedMidi);
    setTotalAttempts((prev) => prev + 1);

    const guessedNote = midiToNoteInfo(guessedMidi);
    // Play what the user tapped so they get immediate auditory feedback
    audioEngine.playTone(guessedNote.frequency, 0.75, selectedInstrument, guessedMidi);

    if (guessedMidi === targetMidi) {
      // Correct!
      haptics.pitchMatch();
      audioEngine.playSuccessChime();

      const newStreak = currentStreak + 1;
      const streakBonus = Math.min(250, newStreak * 25);
      const pointsEarned = 100 + streakBonus;

      setCurrentStreak(newStreak);
      setHighestStreak((prev) => Math.max(prev, newStreak));
      setScore((prev) => prev + pointsEarned);
      setCorrectHits((prev) => prev + 1);
      setLastGuessResult('correct');
      setSemitonesOff(0);

      // Auto advance to next round after 900ms
      setTimeout(() => {
        setRoundNumber((r) => r + 1);
        spawnNewTarget(targetMidi);
      }, 900);
    } else {
      // Incorrect
      haptics.streakLost();
      setCurrentStreak(0);

      const diff = guessedMidi - targetMidi;
      setSemitonesOff(diff);
      if (diff > 0) {
        setLastGuessResult('too_high');
      } else {
        setLastGuessResult('too_low');
      }
    }
  };

  const handleFinishGame = () => {
    const accuracy = totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 0;
    const record: PitchGameRecord = {
      id: `pitch-recog-${Date.now()}`,
      gameType: 'pitch_recognition',
      score,
      highestStreak,
      accuracyPercentage: Math.min(100, accuracy),
      totalNotes: totalAttempts,
      notesHit: correctHits,
      date: new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US'),
      timestamp: Date.now(),
    };

    onRecordGameSession(record);
    setIsGameOver(true);
  };

  const accuracyPct = totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 100;

  return (
    <div className="flex flex-col gap-3 animate-in fade-in max-w-2xl mx-auto select-none pb-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-xl">
        <button
          onClick={onBackToHub}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
          <span>{isAr ? 'مركز الألعاب' : 'Hub'}</span>
        </button>

        <div className="text-center">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5 justify-center">
            <span>{t.pitchRecognitionTitle}</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] border border-cyan-500/30">
              {isAr ? 'بيانو رأسي' : 'Vertical'}
            </span>
          </h2>
          <p className="text-[11px] text-slate-400">
            {isAr ? 'استمع للنغمة وخمّن بالضغط على المفتاح المطابق' : 'Listen and tap the matching key'}
          </p>
        </div>

        <button
          onClick={handleFinishGame}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          {isAr ? 'إنهاء وحفظ' : 'Finish'}
        </button>
      </div>

      {/* Score & HUD Strip */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 block">{t.score}</span>
          <span className="text-base font-black text-white font-mono">{score}</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400">
            <Flame className="w-3 h-3 fill-amber-500" />
            <span>{t.streak}</span>
          </div>
          <span className="text-base font-black text-amber-400 font-mono">
            {currentStreak}
            {currentStreak >= 3 && <span className="text-[10px] ml-1 text-emerald-400">🔥</span>}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 block">{isAr ? 'الدقة' : 'Accuracy'}</span>
          <span className="text-base font-black text-emerald-400 font-mono">{accuracyPct}%</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 block">{isAr ? 'الجولة' : 'Round'}</span>
          <span className="text-base font-black text-cyan-400 font-mono">#{roundNumber}</span>
        </div>
      </div>

      {/* Instrument Switcher (Grand Piano vs Arabic Oud) */}
      <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-2xl flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-400 font-medium px-2">
          {isAr ? 'صوت الآلة المستخدمة:' : 'Instrument Sound:'}
        </span>
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
          <button
            onClick={() => {
              setSelectedInstrument('piano');
              haptics.tap();
              playTargetPitch(targetMidi, 'piano');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              selectedInstrument === 'piano'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🎹</span>
            <span>{isAr ? 'بيانو كونسرت' : 'Grand Piano'}</span>
          </button>

          <button
            onClick={() => {
              setSelectedInstrument('oud');
              haptics.tap();
              playTargetPitch(targetMidi, 'oud');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              selectedInstrument === 'oud'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🪕</span>
            <span>{isAr ? 'عود عربي أصيل' : 'Arabic Oud'}</span>
          </button>
        </div>
      </div>

      {/* Target Audio & Feedback Control Banner */}
      <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/30 p-4 rounded-3xl shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Big Replay Sound Button */}
            <button
              onClick={() => playTargetPitch()}
              disabled={isPlayingAudio}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition active:scale-95 shadow-xl ${
                isPlayingAudio
                  ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-400/30 animate-pulse'
                  : 'bg-gradient-to-tr from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-950/80'
              }`}
              title={t.replaySound}
            >
              <Volume2 className={`w-7 h-7 ${isPlayingAudio ? 'animate-bounce' : ''}`} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold text-cyan-400 tracking-wider">
                  {isPlayingAudio
                    ? (isAr ? 'جاري العزف...' : 'Playing note...')
                    : (isAr ? 'استمع إلى النغمة المجهولة' : 'Mystery Vocal Note')}
                </span>
                {hintActive && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
                    {targetNote.octave} {t.octave}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                {lastGuessResult === 'correct'
                  ? (isAr ? 'أحسنت! إجابة دقيقة وصحيحة 🎉' : 'Correct! Bullseye pitch accuracy 🎉')
                  : lastGuessResult === 'too_high'
                  ? (isAr ? `نغمتك المختارة أعلى (${semitonesOff} نصف بعد)` : `Too High by +${semitonesOff} semitones!`)
                  : lastGuessResult === 'too_low'
                  ? (isAr ? `نغمتك المختارة أخفض (${Math.abs(semitonesOff || 0)} نصف بعد)` : `Too Low by ${semitonesOff} semitones!`)
                  : t.tapKeyToIdentify}
              </p>
            </div>
          </div>

          {/* Action buttons: Hint & Reveal */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                haptics.tap();
                setHintActive(true);
              }}
              disabled={hintActive}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                hintActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title={t.showHint}
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{t.showHint}</span>
            </button>

            <button
              onClick={() => spawnNewTarget(targetMidi)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              title={t.skipQuestion}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Feedback Pill */}
        {lastGuessResult && (
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in zoom-in-95 ${
              lastGuessResult === 'correct'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {lastGuessResult === 'correct' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>
                {lastGuessResult === 'correct'
                  ? `${t.correct} — ${formatNoteName(targetNote, notation)} (${Math.round(targetNote.frequency)} ${t.hzUnit})`
                  : lastGuessResult === 'too_high'
                  ? t.tooHigh
                  : t.tooLow}
              </span>
            </div>

            {lastGuessResult === 'correct' ? (
              <span className="font-mono text-emerald-300 font-bold">+100 pts</span>
            ) : (
              <button
                onClick={() => playTargetPitch()}
                className="text-cyan-300 hover:underline flex items-center gap-1 font-mono text-[11px]"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'سماع مجدداً' : 'Listen again'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Direction Guide Indicator */}
      <div className="px-3 py-1.5 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ArrowUp className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-[11px] font-semibold text-pink-300">{t.highNotes} ({isAr ? 'الأعلى' : 'Top'})</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          {profile.lowestNote.fullName} – {profile.highestNote.fullName} ({profile.octavesSpan} {t.octave})
        </div>
        <div className="flex items-center gap-2">
          <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-semibold text-cyan-300">{t.lowNotes} ({isAr ? 'الأسفل' : 'Bottom'})</span>
        </div>
      </div>

      {/* Vertical Piano Keyboard (Optimized for Mobile Portrait) */}
      <div
        ref={pianoContainerRef}
        className="relative bg-slate-950 border border-slate-800 rounded-3xl p-2.5 overflow-y-auto max-h-[520px] shadow-2xl flex flex-col gap-1"
      >
        {verticalDisplayNotes.map((note) => {
          const isBlack = note.name.includes('#');
          const isTarget = note.midi === targetMidi;
          const isLastGuessed = note.midi === lastGuessedMidi;
          const isInVocalCompass = note.midi >= profile.lowestNote.midi && note.midi <= profile.highestNote.midi;
          const isLowest = profile.lowestNote.midi === note.midi;
          const isHighest = profile.highestNote.midi === note.midi;
          const isMiddle = profile.middleRegisterNote?.midi === note.midi;

          // Feedback styles for tapped key
          let keyBg = isBlack
            ? 'bg-slate-900/95 text-slate-200 border-slate-800'
            : 'bg-slate-800/80 text-white border-slate-700/60';

          if (isLastGuessed) {
            if (lastGuessResult === 'correct') {
              keyBg = 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold ring-4 ring-emerald-500/30 scale-[1.01]';
            } else {
              keyBg = 'bg-rose-600 text-white border-rose-400 font-bold ring-4 ring-rose-500/30';
            }
          } else if (lastGuessResult === 'correct' && isTarget) {
            keyBg = 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold ring-4 ring-emerald-500/30';
          }

          // Octave hint highlight
          const isHintOctave = hintActive && note.octave === targetNote.octave;

          return (
            <button
              key={`recog-key-${note.midi}`}
              onClick={() => handleKeyTap(note.midi)}
              className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98] ${keyBg} ${
                !isInVocalCompass ? 'opacity-40' : ''
              } ${isHintOctave && !isLastGuessed ? 'ring-2 ring-amber-400/40' : ''}`}
            >
              {/* Left Side: Note Representation & Labels */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center font-mono text-[9px] font-black ${
                    isBlack ? 'bg-slate-950 border border-slate-700 text-indigo-300' : 'bg-slate-200 text-slate-900'
                  }`}
                >
                  {isBlack ? '♯' : ''}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-black">
                    {formatNoteName(note, notation)}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {Math.round(note.frequency)} {t.hzUnit}
                  </span>
                </div>
              </div>

              {/* Right Side: Vocal Range Boundary Badges */}
              <div className="flex items-center gap-1.5">
                {isHighest && (
                  <span className="px-2 py-0.5 rounded-md bg-pink-500/20 text-pink-300 text-[10px] font-mono font-bold border border-pink-500/40">
                    {t.maxBadge}
                  </span>
                )}
                {isMiddle && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-500/40">
                    {t.midBadge}
                  </span>
                )}
                {isLowest && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/40">
                    {t.minBadge}
                  </span>
                )}

                {/* Last guess indicator */}
                {isLastGuessed && lastGuessResult === 'correct' && (
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                )}
                {isLastGuessed && lastGuessResult !== 'correct' && (
                  <XCircle className="w-4 h-4 text-white" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Game Over / Summary Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-950/60">
              <Trophy className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">{t.gameOver}</h3>
              <p className="text-xs text-slate-400 mt-1">{t.pitchRecognitionTitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t.score}</span>
                <span className="text-xl font-black text-amber-400 font-mono mt-0.5 block">{score}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{isAr ? 'أعلى تتابع' : 'Best Streak'}</span>
                <span className="text-xl font-black text-pink-400 font-mono mt-0.5 block">{highestStreak}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{isAr ? 'الدقة' : 'Accuracy'}</span>
                <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">{accuracyPct}%</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{isAr ? 'نغمات صحيحة' : 'Hits'}</span>
                <span className="text-xl font-black text-cyan-400 font-mono mt-0.5 block">
                  {correctHits}/{totalAttempts}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setIsGameOver(false);
                  setScore(0);
                  setCurrentStreak(0);
                  setHighestStreak(0);
                  setTotalAttempts(0);
                  setCorrectHits(0);
                  setRoundNumber(1);
                  spawnNewTarget();
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
              >
                {t.playAgain}
              </button>
              <button
                onClick={onBackToHub}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                {t.returnToHub}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

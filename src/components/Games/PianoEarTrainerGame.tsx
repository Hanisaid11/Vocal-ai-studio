import React, { useState, useEffect, useMemo } from 'react';
import { Volume2, RotateCcw, Award, CheckCircle2, XCircle, HelpCircle, ArrowRight, Music, Zap, Flame, Sparkles } from 'lucide-react';
import { NoteInfo, VocalRangeProfile, PitchDetectionResult, AppLanguage, NotationSystem, PitchGameRecord, AppTheme } from '../../types/vocal';
import { midiToNoteInfo, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { translations, INSTRUMENT_NAMES } from '../../utils/i18n';
import { THEMES } from '../../utils/theme';
import { haptics } from '../../utils/haptics';

interface PianoEarTrainerGameProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language: AppLanguage;
  notation: NotationSystem;
  theme?: AppTheme;
  onRecordGameSession: (record: PitchGameRecord) => void;
  onBackToHub: () => void;
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const PianoEarTrainerGame: React.FC<PianoEarTrainerGameProps> = ({
  profile,
  currentPitch,
  language,
  notation,
  theme = 'classic-piano',
  onRecordGameSession,
  onBackToHub,
}) => {
  const t = translations[language];
  const themeConfig = THEMES[theme] || THEMES['classic-piano'];

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [targetNote, setTargetNote] = useState<NoteInfo | null>(null);
  const [isPlayingTarget, setIsPlayingTarget] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctGuesses, setCorrectGuesses] = useState(0);
  const [lastGuess, setLastGuess] = useState<{ note: NoteInfo; isCorrect: boolean } | null>(null);
  const [hintUsed, setHintUsed] = useState(false);

  // Available notes pool based on difficulty
  const notePool = useMemo(() => {
    let minMidi = 60; // C4
    let maxMidi = 72; // C5
    let whiteOnly = false;

    if (difficulty === 'easy') {
      minMidi = 60; // C4
      maxMidi = 67; // G4
      whiteOnly = true;
    } else if (difficulty === 'medium') {
      minMidi = 60; // C4
      maxMidi = 72; // C5
      whiteOnly = true;
    } else if (difficulty === 'hard') {
      minMidi = 60; // C4
      maxMidi = 72; // C5
      whiteOnly = false;
    } else {
      // Expert: 2 full octaves calibrated to user range
      minMidi = Math.max(48, profile.lowestNote.midi);
      maxMidi = Math.min(84, profile.highestNote.midi);
      whiteOnly = false;
    }

    const list: NoteInfo[] = [];
    for (let m = minMidi; m <= maxMidi; m++) {
      const note = midiToNoteInfo(m);
      if (!whiteOnly || !note.name.includes('#')) {
        list.push(note);
      }
    }
    return list;
  }, [difficulty, profile]);

  // Keys to display on the mini piano (C4 to C5 or C3 to C5)
  const displayNotes = useMemo(() => {
    let minM = 60;
    let maxM = 72;
    if (difficulty === 'expert') {
      minM = 48;
      maxM = 72;
    }
    const list: NoteInfo[] = [];
    for (let m = minM; m <= maxM; m++) {
      list.push(midiToNoteInfo(m));
    }
    return list;
  }, [difficulty]);

  const whiteKeys = useMemo(() => {
    return displayNotes.filter((n) => !n.name.includes('#'));
  }, [displayNotes]);

  // Pick new mystery note
  const pickNewTarget = () => {
    if (notePool.length === 0) return;
    const randomIndex = Math.floor(Math.random() * notePool.length);
    const chosen = notePool[randomIndex];
    setTargetNote(chosen);
    setLastGuess(null);
    setHintUsed(false);
    playTargetSound(chosen);
  };

  const playTargetSound = async (note: NoteInfo) => {
    setIsPlayingTarget(true);
    await audioEngine.playTone(note.frequency, 1.4);
    setTimeout(() => setIsPlayingTarget(false), 800);
  };

  // Start initial round
  useEffect(() => {
    pickNewTarget();
  }, [difficulty]);

  // Microphone singing detection: if user sings the pitch into mic
  useEffect(() => {
    if (!targetNote || !currentPitch?.note || currentPitch.clarity < 0.8) return;
    if (currentPitch.note.midi === targetNote.midi) {
      handleGuess(targetNote);
    }
  }, [currentPitch, targetNote]);

  // Handle User Guess (by clicking piano key)
  const handleGuess = (guessedNote: NoteInfo) => {
    if (!targetNote) return;
    haptics.tap();

    // Play guessed sound so user hears their own pick
    audioEngine.playTone(guessedNote.frequency, 0.6);

    const isCorrect = guessedNote.midi === targetNote.midi;
    setTotalAttempts((prev) => prev + 1);

    if (isCorrect) {
      haptics.pitchMatch();
      audioEngine.playSuccessChime();
      const points = 100 + streak * 20;
      setScore((s) => s + points);
      setStreak((s) => {
        const next = s + 1;
        if (next > highestStreak) setHighestStreak(next);
        return next;
      });
      setCorrectGuesses((c) => c + 1);
      setLastGuess({ note: guessedNote, isCorrect: true });

      // Auto advance after short delay
      setTimeout(() => {
        pickNewTarget();
      }, 1200);
    } else {
      haptics.streakLost();
      setStreak(0);
      setLastGuess({ note: guessedNote, isCorrect: false });
    }
  };

  const handleFinishGame = () => {
    const accuracy = totalAttempts > 0 ? Math.round((correctGuesses / totalAttempts) * 100) : 0;
    const record: PitchGameRecord = {
      id: `ear-trainer-${Date.now()}`,
      gameType: 'ear_trainer',
      score,
      highestStreak,
      accuracyPercentage: accuracy,
      totalNotes: totalAttempts,
      notesHit: correctGuesses,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
    };
    onRecordGameSession(record);
    onBackToHub();
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full select-none animate-in fade-in">
      {/* Top Header Card */}
      <div className={`p-4 rounded-3xl ${themeConfig.topBarBg} border ${themeConfig.topBarBorder} shadow-2xl flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-amber-950/40">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>{t.earTrainerTitle}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                {t.games}
              </span>
            </h2>
            <p className="text-xs text-slate-400">{t.earTrainerDesc}</p>
          </div>
        </div>

        {/* Score & Streak Counters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">{t.score}:</span>
            <span className="font-black text-amber-300 font-mono text-sm">{score}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <Flame className="w-3.5 h-3.5 text-pink-500" />
            <span className="text-slate-400">{t.streak}:</span>
            <span className="font-black text-pink-300 font-mono text-sm">{streak}</span>
          </div>

          <button
            onClick={handleFinishGame}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition"
          >
            {t.saveExit}
          </button>
        </div>
      </div>

      {/* Difficulty Tabs */}
      <div className="flex items-center justify-between bg-slate-900/70 p-1.5 rounded-2xl border border-slate-800 text-xs overflow-x-auto">
        <span className="text-slate-400 px-2 font-bold hidden sm:inline">{language === 'ar' ? 'مستوى الصعوبة:' : 'Difficulty:'}</span>
        <div className="flex gap-1 w-full sm:w-auto">
          {[
            { id: 'easy' as Difficulty, labelEn: 'Easy (5 White Notes)', labelAr: 'مبتدئ (٥ نغمات أساسية)' },
            { id: 'medium' as Difficulty, labelEn: 'Medium (1 Octave White)', labelAr: 'متوسط (أوكتاف كامل)' },
            { id: 'hard' as Difficulty, labelEn: 'Hard (Chromatic 12)', labelAr: 'صعب (جميع النغمات ١٢)' },
            { id: 'expert' as Difficulty, labelEn: 'Expert (2 Octaves)', labelAr: 'محترف (أوكتافان كاملان)' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => {
                haptics.tap();
                setDifficulty(d.id);
              }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl font-bold transition ${
                difficulty === d.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {language === 'ar' ? d.labelAr : d.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Main Mystery Sound Stage */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
        <div className="relative mb-3">
          <button
            onClick={() => targetNote && playTargetSound(targetNote)}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition shadow-2xl active:scale-95 ${
              isPlayingTarget
                ? 'bg-gradient-to-tr from-amber-400 to-pink-500 text-slate-950 scale-105 shadow-amber-500/50 ring-4 ring-amber-400/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/60'
            }`}
            title={t.replaySound}
          >
            <Volume2 className={`w-9 h-9 ${isPlayingTarget ? 'animate-bounce' : ''}`} />
          </button>
          {isPlayingTarget && (
            <span className="absolute -inset-2 rounded-full border-2 border-amber-400/50 animate-ping pointer-events-none" />
          )}
        </div>

        <button
          onClick={() => targetNote && playTargetSound(targetNote)}
          className="text-sm font-bold text-slate-200 hover:text-amber-400 flex items-center gap-1.5 transition mb-1"
        >
          <span>{t.replaySound}</span>
        </button>
        <p className="text-xs text-slate-400 max-w-md">
          {language === 'ar'
            ? 'انقر على مفتاح البيانو بالأسفل الذي يطابق النغمة التي سمعتها، أو غنِّها بالميكروفون!'
            : 'Click the piano key below that matches the sound you heard, or sing it into your mic!'}
        </p>

        {/* Feedback Alert */}
        {lastGuess && (
          <div
            className={`mt-4 px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in zoom-in-95 border ${
              lastGuess.isCorrect
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
            }`}
          >
            {lastGuess.isCorrect ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {t.correct} {formatNoteName(targetNote, notation)} ({Math.round(targetNote?.frequency || 0)} {t.hzUnit})
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  {t.incorrect} {t.yourGuess}: {formatNoteName(lastGuess.note, notation)} ({lastGuess.note.midi > (targetNote?.midi || 0) ? (language === 'ar' ? 'أعلى من الهدف' : 'Too high') : (language === 'ar' ? 'أخفض من الهدف' : 'Too low')})
                </span>
              </>
            )}
          </div>
        )}

        {/* Hint button */}
        {!lastGuess?.isCorrect && targetNote && (
          <div className="mt-3">
            {hintUsed ? (
              <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                {language === 'ar' ? 'النغمة المستهدفة تقع في الأوكتاف ' : 'Note is in octave: '} {targetNote.octave} ({formatNoteName(targetNote, notation)[0]})
              </span>
            ) : (
              <button
                onClick={() => setHintUsed(true)}
                className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{t.showHint}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Interactive On-Screen Piano Keyboard to Guess */}
      <div className={`p-4 rounded-3xl ${themeConfig.topBarBg} border ${themeConfig.topBarBorder} shadow-2xl flex flex-col gap-3`}>
        <div className="flex items-center justify-between text-xs text-slate-300 px-1">
          <span className="font-bold flex items-center gap-1.5">
            <span>🎹</span>
            <span>{language === 'ar' ? 'اختر النغمة بالضغط على المفتاح:' : 'Tap key to guess:'}</span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {whiteKeys[0]?.fullName} – {whiteKeys[whiteKeys.length - 1]?.fullName}
          </span>
        </div>

        {/* Piano Keys Viewport */}
        <div className="relative overflow-x-auto pb-2 select-none">
          <div
            className="relative flex h-[180px] mx-auto"
            style={{ width: `${whiteKeys.length * 48}px` }}
          >
            {/* White Keys */}
            {whiteKeys.map((note, idx) => {
              const isTargetRevealed = lastGuess?.isCorrect && targetNote?.midi === note.midi;
              const isLastGuessedWrong = lastGuess && !lastGuess.isCorrect && lastGuess.note.midi === note.midi;

              return (
                <button
                  key={`white-${note.midi}`}
                  onClick={() => handleGuess(note)}
                  style={{
                    left: `${idx * 48}px`,
                    width: '48px',
                  }}
                  className={`absolute top-0 h-[180px] rounded-b-xl flex flex-col justify-end items-center pb-3 border-r border-slate-300/80 transition-all active:scale-[0.98] ${
                    isTargetRevealed
                      ? 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/60 ring-4 ring-emerald-300 z-20'
                      : isLastGuessedWrong
                      ? 'bg-rose-400 text-slate-950 font-bold z-20'
                      : `${themeConfig.keyWhiteBg} ${themeConfig.keyWhiteText}`
                  }`}
                >
                  <span className="font-bold font-mono text-xs">
                    {formatNoteName(note, notation)}
                  </span>
                  <span className="text-[9px] opacity-60 font-mono">
                    {Math.round(note.frequency)}
                  </span>
                </button>
              );
            })}

            {/* Black Keys */}
            {whiteKeys.map((whiteNote, idx) => {
              const blackMidi = whiteNote.midi + 1;
              const blackNote = displayNotes.find((n) => n.midi === blackMidi && n.name.includes('#'));
              if (!blackNote) return null;

              const isTargetRevealed = lastGuess?.isCorrect && targetNote?.midi === blackNote.midi;
              const isLastGuessedWrong = lastGuess && !lastGuess.isCorrect && lastGuess.note.midi === blackNote.midi;
              const leftOffset = idx * 48 + 32;

              return (
                <button
                  key={`black-${blackNote.midi}`}
                  onClick={() => handleGuess(blackNote)}
                  style={{
                    left: `${leftOffset}px`,
                    width: '32px',
                  }}
                  className={`absolute top-0 h-[110px] rounded-b-lg z-30 flex flex-col justify-end items-center pb-2.5 transition-all active:scale-[0.98] ${
                    isTargetRevealed
                      ? 'bg-emerald-400 text-slate-950 font-black shadow-xl ring-2 ring-emerald-300'
                      : isLastGuessedWrong
                      ? 'bg-rose-500 text-white font-bold'
                      : `${themeConfig.keyBlackBg} ${themeConfig.keyBlackText}`
                  }`}
                >
                  <span className="text-[9px] font-bold font-mono">
                    {formatNoteName(blackNote, notation)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Red Felt Cushion (matching Real Piano from screenshot!) */}
        <div className={`w-full py-2 px-4 rounded-xl flex items-center justify-between text-xs ${themeConfig.cushionBg}`}>
          <span className={`font-serif tracking-wider ${themeConfig.cushionText}`}>
            {language === 'ar' ? themeConfig.cushionTitleAr : themeConfig.cushionTitleEn}
          </span>
          <span className="text-[11px] text-white/80 font-mono">
            {correctGuesses} / {totalAttempts} ({totalAttempts > 0 ? Math.round((correctGuesses / totalAttempts) * 100) : 0}%)
          </span>
        </div>
      </div>
    </div>
  );
};

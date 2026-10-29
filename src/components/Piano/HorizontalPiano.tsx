import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Volume2, Circle, Play, Square, ChevronLeft, ChevronRight, Mic, Sparkles, Target } from 'lucide-react';
import { NoteInfo, VocalRangeProfile, PitchDetectionResult, AppLanguage, NotationSystem, AppTheme } from '../../types/vocal';
import { midiToNoteInfo, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { translations } from '../../utils/i18n';
import { THEMES } from '../../utils/theme';
import { haptics } from '../../utils/haptics';

interface HorizontalPianoProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language?: AppLanguage;
  notation?: NotationSystem;
  theme?: AppTheme;
  onSelectRangeProfile?: (profile: VocalRangeProfile) => void;
}

export const HorizontalPiano: React.FC<HorizontalPianoProps> = ({
  profile,
  currentPitch,
  language = 'en',
  notation = 'english',
  theme = 'classic-piano',
}) => {
  const t = translations[language];
  const isAr = language === 'ar';
  const themeConfig = THEMES[theme] || THEMES['classic-piano'];

  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);

  // Direct appear my range: defaults to 'my_range' so vocal range is immediately visible!
  const [viewCompass, setViewCompass] = useState<'my_range' | 'full_88'>('my_range');
  const [keyWidth, setKeyWidth] = useState<number>(48);
  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<number>>(new Set());
  const [scrollProgress, setScrollProgress] = useState<number>(0.35);
  const [visibleRatio, setVisibleRatio] = useState<number>(0.2);

  const [noteDuration, setNoteDuration] = useState<1 | 2 | 4>(audioEngine.getNoteDuration());

  // Recording & Playback state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [recordedCount, setRecordedCount] = useState(0);

  // Full 88-Key Standard Piano Compass: A0 (21) to C8 (108)
  const full88Keys = useMemo(() => {
    const list: NoteInfo[] = [];
    for (let m = 21; m <= 108; m++) {
      list.push(midiToNoteInfo(m));
    }
    return list;
  }, []);

  // Filter active compass: My Range mode vs Full 88-Key mode
  const activeCompass = useMemo(() => {
    if (viewCompass === 'full_88') return full88Keys;
    const minMidi = Math.max(21, profile.lowestNote.midi - 1);
    const maxMidi = Math.min(108, profile.highestNote.midi + 1);
    return full88Keys.filter((n) => n.midi >= minMidi && n.midi <= maxMidi);
  }, [full88Keys, profile, viewCompass]);

  const whiteKeys = useMemo(() => {
    return activeCompass.filter((note) => !note.name.includes('#'));
  }, [activeCompass]);

  // Subscribe to audio engine recording events
  useEffect(() => {
    const unsub = audioEngine.subscribeRecording((rec, play, count) => {
      setIsRecording(rec);
      setIsPlayingRecording(play);
      setRecordedCount(count);
    });
    return unsub;
  }, []);

  // When switching compass or mounting, focus on vocal range
  useEffect(() => {
    if (containerRef.current) {
      if (viewCompass === 'my_range') {
        containerRef.current.scrollLeft = 0;
        updateScrollMetrics();
      } else {
        const middleMidi = profile.middleRegisterNote?.midi || 60; // C4
        const whiteKeyIndex = whiteKeys.findIndex((k) => k.midi >= middleMidi);
        if (whiteKeyIndex !== -1) {
          const scrollTarget = Math.max(0, whiteKeyIndex * keyWidth - containerRef.current.clientWidth / 2 + keyWidth);
          containerRef.current.scrollLeft = scrollTarget;
          updateScrollMetrics();
        }
      }
    }
  }, [keyWidth, viewCompass]);

  // Track scroll metrics for the mini 88-key scrubber overview
  const updateScrollMetrics = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    const maxScroll = Math.max(1, scrollWidth - clientWidth);
    const progress = Math.max(0, Math.min(1, scrollLeft / maxScroll));
    setScrollProgress(progress);
    setVisibleRatio(Math.min(1, clientWidth / scrollWidth));
  };

  const scrollByDelta = (semitones: number) => {
    haptics.tap();
    if (!containerRef.current) return;
    const targetScroll = containerRef.current.scrollLeft + (semitones * keyWidth);
    containerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };

  // Jump to user vocal range in Full 88 mode
  const handleFocusVocalRange = () => {
    haptics.tap();
    if (!containerRef.current) return;
    const lowestWhiteIndex = whiteKeys.findIndex((k) => k.midi >= profile.lowestNote.midi);
    if (lowestWhiteIndex !== -1) {
      const targetScroll = Math.max(0, lowestWhiteIndex * keyWidth - 20);
      containerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  // Click on minimap scrubber to jump
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapRef.current || !containerRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));

    const maxScroll = containerRef.current.scrollWidth - containerRef.current.clientWidth;
    containerRef.current.scrollTo({ left: ratio * maxScroll, behavior: 'smooth' });
  };

  // Play a note
  const handlePlayNote = async (midi: number) => {
    haptics.tap();
    setActiveMidiNotes((prev) => new Set(prev).add(midi));
    audioEngine.playNote(midi, 2.0);

    setTimeout(() => {
      setActiveMidiNotes((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    }, 280);
  };

  const isInVocalRange = (midi: number) => {
    return midi >= profile.lowestNote.midi && midi <= profile.highestNote.midi;
  };

  const isSungNote = (midi: number) => {
    return currentPitch?.note?.midi === midi && (currentPitch.clarity ?? 0) > 0.65;
  };

  const handleJumpToMidi = (targetMidi: number) => {
    haptics.tap();
    if (!containerRef.current) return;
    const idx = whiteKeys.findIndex((k) => k.midi >= targetMidi);
    if (idx !== -1) {
      const targetScroll = Math.max(0, idx * keyWidth - containerRef.current.clientWidth / 2 + keyWidth / 2);
      containerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden select-none">
      {/* 
        TOP CONTROL BAR: EXACT PHOTO LAYOUT
        [<] [Record Keys + LED] [Play Button] [--- 88-Key Mini Scrubber ---] [My Range Toggle] [Key Size - +] [>]
      */}
      <div className={`p-2 sm:p-2.5 ${themeConfig.topBarBg} border-b ${themeConfig.topBarBorder} flex items-center justify-between gap-1 sm:gap-2.5 text-xs`}>
        {/* Left Arrow Scroll */}
        <button
          onClick={() => scrollByDelta(-7)}
          aria-label="Scroll Piano Left"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-600 text-slate-100 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Record Keys Button with glowing red LED */}
        <button
          onClick={() => {
            haptics.tap();
            if (isRecording) {
              audioEngine.stopRecording();
            } else {
              audioEngine.startRecording();
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition shadow text-xs font-bold shrink-0 ${
            isRecording
              ? 'bg-rose-950 border-rose-500 text-rose-300 ring-2 ring-rose-500/40 animate-pulse'
              : 'bg-gradient-to-b from-slate-800 to-slate-950 border-slate-700 text-slate-200 hover:text-white'
          }`}
          title={isRecording ? t.stopRecording : t.recordKeys}
        >
          <div className="relative flex items-center justify-center">
            <div className={`w-3.5 h-3.5 rounded-full ${isRecording ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-red-800'}`} />
            {isRecording && <div className="absolute w-3.5 h-3.5 rounded-full bg-red-400 animate-ping" />}
          </div>
          <span className="hidden md:inline">{isRecording ? t.recording : t.recordKeys}</span>
          {recordedCount > 0 && (
            <span className="font-mono text-[10px] text-amber-300">({recordedCount})</span>
          )}
        </button>

        {/* Play Button */}
        <button
          onClick={() => {
            haptics.tap();
            if (isPlayingRecording) {
              audioEngine.stopPlayback();
            } else {
              audioEngine.playBackRecording();
            }
          }}
          disabled={recordedCount === 0 && !isPlayingRecording}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition shadow shrink-0 ${
            isPlayingRecording
              ? 'bg-amber-500 border-amber-400 text-slate-950 scale-105'
              : recordedCount > 0
              ? 'bg-gradient-to-b from-slate-700 to-slate-900 border-slate-600 text-slate-100 hover:text-amber-400 hover:scale-105'
              : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
          }`}
          title={isPlayingRecording ? 'Stop' : t.playRecording}
        >
          {isPlayingRecording ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* 88-Key Minimap Overview Strip (Exact as screenshot) */}
        <div
          ref={minimapRef}
          onClick={handleMinimapClick}
          className="flex-1 h-7 bg-slate-900 border border-slate-700/80 rounded-md relative cursor-pointer overflow-hidden flex items-stretch shadow-inner min-w-[70px]"
          title="Full 88-key overview (click to jump)"
        >
          {/* Miniature White & Black Keys Grid */}
          <div className="w-full h-full flex pointer-events-none relative">
            {full88Keys
              .filter((k) => !k.name.includes('#'))
              .map((k) => (
                <div key={`mini-w-${k.midi}`} className="flex-1 border-r border-slate-800/60 bg-slate-200" />
              ))}

            {/* Miniature Black Keys Overlay */}
            {full88Keys
              .filter((k) => k.name.includes('#'))
              .map((bk) => {
                const whiteList = full88Keys.filter((k) => !k.name.includes('#'));
                const whiteIndex = whiteList.findIndex((wk) => wk.midi > bk.midi);
                const pct = (whiteIndex / whiteList.length) * 100;
                return (
                  <div
                    key={`mini-b-${bk.midi}`}
                    style={{ left: `${pct}%` }}
                    className="absolute top-0 h-4 w-[1.5%] bg-slate-950 rounded-b-xs -translate-x-1/2 z-10"
                  />
                );
              })}
          </div>

          {/* Shaded Viewport Box (Sliding window representing visible keys) */}
          <div
            style={{
              left: `${scrollProgress * (100 - visibleRatio * 100)}%`,
              width: `${visibleRatio * 100}%`,
            }}
            className="absolute top-0 bottom-0 bg-slate-900/75 border-x-2 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)] z-20 transition-all duration-75 pointer-events-none"
          />
        </div>

        {/* 
          DIRECT APPEAR MY RANGE TOGGLE BUTTON
          Satisfies: "And in horisintal direct appear my range"
        */}
        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => {
              haptics.tap();
              setViewCompass('my_range');
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
              viewCompass === 'my_range'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Directly display my vocal range"
          >
            <Target className="w-3 h-3 text-current" />
            <span>{isAr ? 'طبقتي' : 'My Range'}</span>
          </button>
          <button
            onClick={() => {
              haptics.tap();
              setViewCompass('full_88');
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
              viewCompass === 'full_88'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Display full 88-key piano"
          >
            <span>{isAr ? 'الكامل 88' : '88 Keys'}</span>
          </button>
        </div>

        {/* Pitch Duration Selector (4s, 2s, 1s) */}
        <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-0.5 shrink-0" title={isAr ? 'مدة النغمة (ثواني)' : 'Pitch Duration'}>
          {([1, 2, 4] as const).map((dur) => (
            <button
              key={dur}
              onClick={() => {
                haptics.tap();
                setNoteDuration(dur);
                audioEngine.setNoteDuration(dur);
              }}
              className={`px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${
                noteDuration === dur
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {dur}{isAr ? 'ث' : 's'}
            </button>
          ))}
        </div>

        {/* Key Size (-) and (+) Metallic Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              haptics.tap();
              setKeyWidth((w) => Math.max(34, w - 4));
            }}
            aria-label="Decrease key size"
            className="w-7 h-7 rounded-full bg-gradient-to-b from-slate-600 via-slate-700 to-slate-900 border border-slate-500 text-slate-100 flex items-center justify-center font-bold text-sm shadow hover:scale-105 active:scale-95 transition"
          >
            –
          </button>
          <button
            onClick={() => {
              haptics.tap();
              setKeyWidth((w) => Math.min(72, w + 4));
            }}
            aria-label="Increase key size"
            className="w-7 h-7 rounded-full bg-gradient-to-b from-slate-600 via-slate-700 to-slate-900 border border-slate-500 text-slate-100 flex items-center justify-center font-bold text-sm shadow hover:scale-105 active:scale-95 transition"
          >
            +
          </button>
        </div>

        {/* Right Arrow Scroll */}
        <button
          onClick={() => scrollByDelta(7)}
          aria-label="Scroll Piano Right"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-600 text-slate-100 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 
        VOCAL RANGE DIRECT MONITOR STRIP
        Directly displays the user's vocal range with jump-to buttons
      */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs gap-2">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-semibold text-slate-200">
            {isAr ? 'نطاق صوتك المسجّل:' : 'Your Vocal Range:'}
          </span>
          <span className="font-mono text-cyan-300 font-bold">
            {formatNoteName(profile.lowestNote, notation)}
            {' – '}
            {formatNoteName(profile.highestNote, notation)}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-semibold hidden sm:inline">
            {profile.voiceType}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleJumpToMidi(profile.lowestNote.midi)}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/40 transition"
            title="Jump to lowest note"
          >
            {t.minBadge}: {formatNoteName(profile.lowestNote, notation)}
          </button>
          {profile.middleRegisterNote && (
            <button
              onClick={() => handleJumpToMidi(profile.middleRegisterNote!.midi)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/40 transition"
              title="Jump to middle register"
            >
              {t.midBadge}: {formatNoteName(profile.middleRegisterNote, notation)}
            </button>
          )}
          <button
            onClick={() => handleJumpToMidi(profile.highestNote.midi)}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 hover:bg-pink-500/40 transition"
            title="Jump to highest note"
          >
            {t.maxBadge}: {formatNoteName(profile.highestNote, notation)}
          </button>
        </div>
      </div>

      {/* Main Piano Keyboard Area */}
      <div
        ref={containerRef}
        onScroll={updateScrollMetrics}
        className="relative overflow-x-auto overflow-y-hidden select-none bg-slate-950 py-1 px-1 min-h-[220px]"
      >
        <div
          className="relative inline-flex items-start h-[190px]"
          style={{ width: `${whiteKeys.length * keyWidth}px` }}
        >
          {/* White Keys with Realistic 3D Ivory Gradient & Bevel */}
          {whiteKeys.map((note, index) => {
            const inRange = isInVocalRange(note.midi);
            const isSung = isSungNote(note.midi);
            const isPlayed = activeMidiNotes.has(note.midi);
            const isLowest = profile.lowestNote.midi === note.midi;
            const isHighest = profile.highestNote.midi === note.midi;
            const isMiddle = profile.middleRegisterNote?.midi === note.midi;

            return (
              <button
                key={`white-${note.midi}`}
                onPointerDown={() => handlePlayNote(note.midi)}
                style={{
                  left: `${index * keyWidth}px`,
                  width: `${keyWidth}px`,
                }}
                className={`absolute top-0 h-[196px] rounded-b-[4px] flex flex-col justify-end items-center pb-2.5 border-r border-[#cfd4de] transition-all active:translate-y-0.5 select-none ${
                  isSung
                    ? 'bg-gradient-to-b from-emerald-100 via-emerald-300 to-emerald-500 text-slate-950 font-bold ring-2 ring-emerald-300 shadow-xl z-20'
                    : isPlayed
                    ? `${themeConfig.keyWhiteActive} z-20`
                    : inRange
                    ? 'bg-gradient-to-b from-[#ffffff] via-[#f7f8fa] to-[#dfe3ea] text-slate-800 shadow-[inset_0_-4px_3px_rgba(0,0,0,0.14)] hover:brightness-[1.02]'
                    : 'bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 text-slate-500 opacity-60'
                }`}
              >
                {/* Vocal Range Badges */}
                {isLowest && (
                  <span className="absolute top-2 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[8px] font-black shadow">
                    {t.minBadge}
                  </span>
                )}
                {isHighest && (
                  <span className="absolute top-2 px-1.5 py-0.5 rounded-full bg-pink-600 text-white text-[8px] font-black shadow">
                    {t.maxBadge}
                  </span>
                )}
                {isMiddle && !isLowest && !isHighest && (
                  <span className="absolute top-2 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[8px] font-black shadow">
                    {t.midBadge}
                  </span>
                )}

                {/* Note Label */}
                <div className="flex flex-col items-center pointer-events-none mb-1">
                  <span className="font-extrabold text-xs tracking-tight font-mono text-slate-800">
                    {formatNoteName(note, notation)}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {Math.round(note.frequency)}
                  </span>
                </div>

                {/* Bottom 3D Bevel Lip */}
                <div className="w-[88%] h-[3px] bg-slate-400/30 rounded-full pointer-events-none" />
              </button>
            );
          })}

          {/* Black Keys with Photo Specular Reflections & Beveled Facets */}
          {whiteKeys.map((whiteNote, index) => {
            const blackMidi = whiteNote.midi + 1;
            const blackNote = activeCompass.find((n) => n.midi === blackMidi && n.name.includes('#'));
            if (!blackNote) return null;

            const inRange = isInVocalRange(blackNote.midi);
            const isSung = isSungNote(blackNote.midi);
            const isPlayed = activeMidiNotes.has(blackNote.midi);
            const isLowest = profile.lowestNote.midi === blackNote.midi;
            const isHighest = profile.highestNote.midi === blackNote.midi;

            const blackWidth = Math.max(22, keyWidth * 0.62);
            const leftOffset = index * keyWidth + keyWidth - blackWidth / 2;

            return (
              <button
                key={`black-${blackNote.midi}`}
                onPointerDown={() => handlePlayNote(blackNote.midi)}
                style={{
                  left: `${leftOffset}px`,
                  width: `${blackWidth}px`,
                }}
                className={`absolute top-0 h-[122px] rounded-b-[3px] z-30 flex flex-col justify-end items-center pb-2 transition-all active:translate-y-0.5 select-none shadow-[2px_5px_8px_rgba(0,0,0,0.7),_0_2px_4px_rgba(0,0,0,0.6)] ${
                  isSung
                    ? 'bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-800 text-white ring-2 ring-emerald-300'
                    : isPlayed
                    ? `${themeConfig.keyBlackActive}`
                    : inRange
                    ? 'bg-gradient-to-b from-[#111113] via-[#1c1c20] to-[#111113] text-white/90 border-x border-black'
                    : 'bg-[#18181b] opacity-60'
                }`}
              >
                {/* Double oval specular reflections matching user's photo */}
                <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1 opacity-55 pointer-events-none">
                  <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-white/90 to-transparent" />
                  <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-white/90 to-transparent" />
                </div>

                {/* Bottom Beveled Front Facet of Black Key */}
                <div className="w-[88%] h-2.5 bg-gradient-to-b from-[#3d3d46] to-[#1c1c20] rounded-b-[2px] mb-1 border-t border-white/10 shadow-inner pointer-events-none" />

                {isLowest && (
                  <span className="absolute top-1 text-[7px] text-blue-300 font-bold">{t.minBadge}</span>
                )}
                {isHighest && (
                  <span className="absolute top-1 text-[7px] text-pink-300 font-bold">{t.maxBadge}</span>
                )}
                <span className="text-[9px] font-bold font-mono text-white/80">
                  {formatNoteName(blackNote, notation)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 
        BOTTOM BAR: CLASSIC RED VELVET CUSHION (NO "REAL PIANO" TEXT)
      */}
      <div className={`w-full py-2.5 px-4 flex items-center justify-between text-xs ${themeConfig.cushionBg}`}>
        <div className="flex items-center gap-2">
          <span className={`font-serif tracking-widest text-sm ${themeConfig.cushionText}`}>
            {language === 'ar' ? themeConfig.cushionTitleAr : themeConfig.cushionTitleEn}
          </span>
          <span className="text-[11px] text-white/70 font-mono hidden sm:inline">
            • {profile.voiceType} ({formatNoteName(profile.lowestNote, notation)} – {formatNoteName(profile.highestNote, notation)})
          </span>
        </div>

        {/* Live Sung Pitch */}
        {currentPitch?.note ? (
          <div className="flex items-center gap-2 bg-black/40 border border-white/20 text-white px-3 py-1 rounded-full font-mono text-xs animate-pulse">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">{formatNoteName(currentPitch.note, notation)}</span>
            <span>({Math.round(currentPitch.frequency || 0)} {t.hzUnit})</span>
            <span className={currentPitch.isInTune ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
              {currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch.cents}¢
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-white/70 italic hidden sm:inline">
            {t.singPrompt}
          </span>
        )}
      </div>
    </div>
  );
};

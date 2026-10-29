import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Play,
  Square,
  ChevronUp,
  ChevronDown,
  Mic,
  Maximize2,
  Minimize2,
  Target,
  Eye,
  Sliders,
} from 'lucide-react';
import {
  NoteInfo,
  VocalRangeProfile,
  PitchDetectionResult,
  AppLanguage,
  NotationSystem,
  AppTheme,
} from '../../types/vocal';
import { midiToNoteInfo, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { translations } from '../../utils/i18n';
import { THEMES } from '../../utils/theme';
import { haptics } from '../../utils/haptics';

interface VerticalPianoProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language?: AppLanguage;
  notation?: NotationSystem;
  theme?: AppTheme;
  onSelectRangeProfile?: (profile: VocalRangeProfile) => void;
  targetMidi?: number | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const VerticalPiano: React.FC<VerticalPianoProps> = ({
  profile,
  currentPitch,
  language = 'ar',
  notation = 'arabic',
  theme = 'classic-piano',
  targetMidi,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const isAr = language === 'ar';
  const t = translations[language] || translations.en;
  const themeConfig = THEMES[theme] || THEMES['classic-piano'];

  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);

  // Key Height controls vertical key size (adjustable with - / + buttons)
  const [keyHeight, setKeyHeight] = useState<number>(isFullscreen ? 46 : 40);
  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<number>>(new Set());
  const [scrollProgress, setScrollProgress] = useState<number>(0.4);
  const [visibleRatio, setVisibleRatio] = useState<number>(0.25);
  const [rangeOnlyMode, setRangeOnlyMode] = useState<boolean>(false);
  
  // Display style: 'engraved' (subtle musical text), 'badges' (with min/max/hz), 'photo' (pure photo look, no labels)
  const [labelStyle, setLabelStyle] = useState<'engraved' | 'badges' | 'photo'>('engraved');

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

  // Filter keys if rangeOnlyMode is enabled
  const activeCompass = useMemo(() => {
    if (!rangeOnlyMode) return full88Keys;
    const minMidi = Math.max(21, profile.lowestNote.midi - 1);
    const maxMidi = Math.min(108, profile.highestNote.midi + 1);
    return full88Keys.filter((n) => n.midi >= minMidi && n.midi <= maxMidi);
  }, [rangeOnlyMode, full88Keys, profile]);

  // Direction inversion: Low notes at top, high notes at bottom (as requested by user)
  const [lowNotesAtTop, setLowNotesAtTop] = useState<boolean>(true);
  const [noteDuration, setNoteDuration] = useState<1 | 2 | 4>(audioEngine.getNoteDuration());

  // White keys ordered based on lowNotesAtTop (Low A0 at top, High C8 at bottom by default)
  const displayWhiteKeys = useMemo(() => {
    const keys = activeCompass.filter((note) => !note.name.includes('#'));
    return lowNotesAtTop ? keys : [...keys].reverse();
  }, [activeCompass, lowNotesAtTop]);

  // Black keys mapped to boundary between adjacent white keys
  interface BlackKeyInfo {
    note: NoteInfo;
    boundaryWhiteIndex: number; // boundary between whiteKey[index - 1] and whiteKey[index]
  }

  const displayBlackKeys = useMemo(() => {
    const list: BlackKeyInfo[] = [];
    for (let i = 0; i < displayWhiteKeys.length - 1; i++) {
      const topWhite = displayWhiteKeys[i];
      const bottomWhite = displayWhiteKeys[i + 1];

      if (lowNotesAtTop) {
        // Notes increase downwards: bottomWhite.midi > topWhite.midi
        if (bottomWhite.midi - topWhite.midi === 2) {
          const blackMidi = topWhite.midi + 1;
          const blackNote = full88Keys.find((n) => n.midi === blackMidi);
          if (blackNote) {
            list.push({
              note: blackNote,
              boundaryWhiteIndex: i + 1,
            });
          }
        }
      } else {
        // Notes decrease downwards: topWhite.midi > bottomWhite.midi
        if (topWhite.midi - bottomWhite.midi === 2) {
          const blackMidi = bottomWhite.midi + 1;
          const blackNote = full88Keys.find((n) => n.midi === blackMidi);
          if (blackNote) {
            list.push({
              note: blackNote,
              boundaryWhiteIndex: i + 1,
            });
          }
        }
      }
    }
    return list;
  }, [displayWhiteKeys, full88Keys, lowNotesAtTop]);

  // Adjust key height when entering fullscreen
  useEffect(() => {
    if (isFullscreen) {
      setKeyHeight((prev) => Math.max(46, prev));
    }
  }, [isFullscreen]);

  // Subscribe to recording events
  useEffect(() => {
    const unsub = audioEngine.subscribeRecording((rec, play, count) => {
      setIsRecording(rec);
      setIsPlayingRecording(play);
      setRecordedCount(count);
    });
    return () => unsub();
  }, []);

  // Center vertical piano on the user's middle register on initial mount
  useEffect(() => {
    if (containerRef.current) {
      const middleMidi = profile.middleRegisterNote?.midi || 60;
      const index = displayWhiteKeys.findIndex((n) => n.midi <= middleMidi);
      if (index !== -1) {
        const targetScroll = Math.max(
          0,
          index * keyHeight - containerRef.current.clientHeight / 2 + keyHeight
        );
        containerRef.current.scrollTop = targetScroll;
        handleScroll();
      }
    }
  }, [keyHeight, rangeOnlyMode]);

  // Track vertical scroll to update minimap sliding viewport window
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 0) {
      const progress = 1 - scrollTop / maxScroll;
      setScrollProgress(Math.max(0, Math.min(1, progress)));
      setVisibleRatio(Math.max(0.1, Math.min(0.5, clientHeight / scrollHeight)));
    }
  };

  const scrollByDelta = (semitones: number) => {
    haptics.tap();
    if (!containerRef.current) return;
    const targetScroll = containerRef.current.scrollTop + semitones * keyHeight;
    containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  // Click on minimap scrubber to jump
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapRef.current || !containerRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));

    const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
    // ratio 0 = low notes (bottom), ratio 1 = high notes (top)
    containerRef.current.scrollTo({ top: (1 - ratio) * maxScroll, behavior: 'smooth' });
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

  const blackKeyHeight = Math.max(26, Math.round(keyHeight * 0.72));

  return (
    <div
      className={`flex flex-col bg-[#07090e] select-none transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none h-screen w-screen'
          : 'rounded-3xl overflow-hidden border border-slate-800 shadow-2xl'
      }`}
    >
      {/* 
        ========================================================================
        TOP TOOLBAR: EXACT REAL PIANO PHOTO LAYOUT
        [▲ Up] [Record Keys + LED] [Play] [--- 88-Key Minimap ---] [Labels] [Range] [Key Size - +] [▼ Down] [Fullscreen]
        ========================================================================
      */}
      <div className={`p-2 sm:p-2.5 ${themeConfig.topBarBg} border-b ${themeConfig.topBarBorder} flex items-center justify-between gap-1 sm:gap-2 text-xs z-30 shrink-0`}>
        {/* Scroll Up (Higher notes) */}
        <button
          onClick={() => scrollByDelta(-5)}
          aria-label="Scroll Piano Up"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-600 text-slate-100 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow shrink-0"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {/* Record Keys with glowing red LED */}
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
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-red-700'}`} />
            {isRecording && <div className="absolute w-3 h-3 rounded-full bg-red-400 animate-ping" />}
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

        {/* 88-Key Minimap Overview Strip */}
        <div
          ref={minimapRef}
          onClick={handleMinimapClick}
          className="flex-1 h-7 bg-slate-900 border border-slate-700/80 rounded-md relative cursor-pointer overflow-hidden flex items-stretch shadow-inner min-w-[65px]"
          title="Full 88-key overview"
        >
          <div className="w-full h-full flex pointer-events-none relative">
            {full88Keys
              .filter((k) => !k.name.includes('#'))
              .map((k) => (
                <div key={`vert-mini-w-${k.midi}`} className="flex-1 border-r border-slate-800/60 bg-slate-200" />
              ))}
            {full88Keys
              .filter((k) => k.name.includes('#'))
              .map((bk) => {
                const whiteList = full88Keys.filter((k) => !k.name.includes('#'));
                const whiteIndex = whiteList.findIndex((wk) => wk.midi > bk.midi);
                const pct = (whiteIndex / whiteList.length) * 100;
                return (
                  <div
                    key={`vert-mini-b-${bk.midi}`}
                    style={{ left: `${pct}%` }}
                    className="absolute top-0 h-4 w-[1.5%] bg-slate-950 rounded-b-xs -translate-x-1/2 z-10"
                  />
                );
              })}
          </div>

          {/* Sliding viewport window */}
          <div
            style={{
              left: `${scrollProgress * (100 - visibleRatio * 100)}%`,
              width: `${visibleRatio * 100}%`,
            }}
            className="absolute top-0 bottom-0 bg-slate-900/80 border-x-2 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)] z-20 transition-all duration-75 pointer-events-none"
          />
        </div>

        {/* Label View Mode Toggle (Engraved Subtle | Range Badges | Pure Photo) */}
        <button
          onClick={() => {
            haptics.tap();
            setLabelStyle((prev) =>
              prev === 'engraved' ? 'badges' : prev === 'badges' ? 'photo' : 'engraved'
            );
          }}
          className="px-2 py-1 rounded-xl text-[10px] font-bold border border-slate-700 bg-slate-800/80 text-slate-200 hover:text-white transition flex items-center gap-1 shrink-0"
          title={
            labelStyle === 'photo'
              ? (isAr ? 'مظهر الصورة الواقعي النقي' : 'Clean Photo Look')
              : labelStyle === 'engraved'
              ? (isAr ? 'نغمات محفورة أنيقة' : 'Engraved Notes')
              : (isAr ? 'شارات النطاق الكامل' : 'Range Badges')
          }
        >
          <Eye className="w-3 h-3 text-amber-400" />
          <span className="hidden sm:inline">
            {labelStyle === 'photo'
              ? (isAr ? 'نقي' : 'Photo')
              : labelStyle === 'engraved'
              ? (isAr ? 'نغمات' : 'Notes')
              : (isAr ? 'شارات' : 'Badges')}
          </span>
        </button>

        {/* Range Filter Pill Toggle */}
        <button
          onClick={() => {
            haptics.tap();
            setRangeOnlyMode(!rangeOnlyMode);
          }}
          className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition flex items-center gap-1 shrink-0 ${
            rangeOnlyMode
              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
          }`}
          title="Filter to my vocal range only"
        >
          <Target className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline">{rangeOnlyMode ? t.myRange : t.fullRange}</span>
        </button>

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

        {/* Direction Indicator & Toggle (Low at Top vs High at Top) */}
        <button
          onClick={() => {
            haptics.tap();
            setLowNotesAtTop(!lowNotesAtTop);
          }}
          className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition flex items-center gap-1 shrink-0 ${
            lowNotesAtTop
              ? 'bg-purple-500/25 border-purple-400 text-purple-300 shadow'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
          title={isAr ? 'اتجاه النغمات: المنخفضة بالأعلى' : 'Pitch Direction: Low at Top'}
        >
          <span>{lowNotesAtTop ? (isAr ? 'منخفض ⬆' : 'Low ⬆') : (isAr ? 'مرتفع ⬆' : 'High ⬆')}</span>
        </button>

        {/* Key Size (-) and (+) Metallic Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              haptics.tap();
              setKeyHeight((h) => Math.max(28, h - 4));
            }}
            aria-label="Decrease key height"
            className="w-7 h-7 rounded-full bg-gradient-to-b from-slate-600 via-slate-700 to-slate-900 border border-slate-500 text-slate-100 flex items-center justify-center font-bold text-sm shadow hover:scale-105 active:scale-95 transition"
          >
            –
          </button>
          <button
            onClick={() => {
              haptics.tap();
              setKeyHeight((h) => Math.min(64, h + 4));
            }}
            aria-label="Increase key height"
            className="w-7 h-7 rounded-full bg-gradient-to-b from-slate-600 via-slate-700 to-slate-900 border border-slate-500 text-slate-100 flex items-center justify-center font-bold text-sm shadow hover:scale-105 active:scale-95 transition"
          >
            +
          </button>
        </div>

        {/* Scroll Down (Lower notes) */}
        <button
          onClick={() => scrollByDelta(5)}
          aria-label="Scroll Piano Down"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-600 text-slate-100 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow shrink-0"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition shadow shrink-0 ${
              isFullscreen
                ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isFullscreen ? t.exitFullscreen : t.fullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* 
        ========================================================================
        AUTHENTIC VERTICAL REAL PIANO KEYBOARD
        EXACTLY MATCHING Screenshot_20261028_110503_Real_Piano_916ea9f7.png:
        - Continuous stacked white keys spanning full width with left rounded tips
          and subtle soft ivory gradient.
        - Black keys positioned ON THE RIGHT SIDE, overlaying the seam between adjacent
          white keys, with rounded left ends, dual specular gloss reflections,
          and cast drop shadows.
        - Left casing simulating real upright piano cheek wood rim.
        ========================================================================
      */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#07090e] flex ${
          isFullscreen ? 'h-full' : 'h-[540px] max-h-[680px]'
        }`}
      >
        {/* Left Piano Wood Cheek Block (realistic rim matching piano body) */}
        <div className="w-2.5 sm:w-3 bg-gradient-to-r from-[#200508] via-[#3a0d12] to-[#1a0406] border-r border-[#100204] shrink-0 shadow-lg z-25" />

        {/* Keys Canvas Container */}
        <div
          className="relative flex-1 min-h-full"
          style={{ height: `${displayWhiteKeys.length * keyHeight}px` }}
        >
          {/* 
            LAYER 1: CONTINUOUS WHITE KEYS
            Stacked vertically with thin 1px black divider separating them.
            Full width across from left to right.
          */}
          {displayWhiteKeys.map((note, index) => {
            const inRange = isInVocalRange(note.midi);
            const isSung = isSungNote(note.midi);
            const isPlayed = activeMidiNotes.has(note.midi);
            const isLowest = profile.lowestNote.midi === note.midi;
            const isHighest = profile.highestNote.midi === note.midi;
            const isMiddle = profile.middleRegisterNote?.midi === note.midi;
            const isTarget = targetMidi === note.midi;

            return (
              <button
                key={`vert-white-${note.midi}`}
                onPointerDown={() => handlePlayNote(note.midi)}
                style={{
                  top: `${index * keyHeight}px`,
                  height: `${keyHeight}px`,
                }}
                className={`absolute left-0 right-0 rounded-l-[4px] border-b border-[#0d0e12] flex items-center justify-between px-3 select-none transition-all active:brightness-95 ${
                  isSung
                    ? 'bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 text-slate-950 font-black shadow-[inset_0_0_15px_rgba(16,185,129,0.8)] z-10'
                    : isPlayed
                    ? 'bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 text-slate-950 font-black shadow-inner z-10'
                    : isTarget
                    ? 'bg-gradient-to-r from-amber-100 via-amber-200 to-amber-300 text-slate-950 z-10'
                    : inRange
                    ? 'bg-gradient-to-r from-[#d9dfe8] via-[#fafbfd] via-45% to-[#f7f8fb] to-[#d8dde8] text-slate-800 shadow-[inset_2px_1px_3px_rgba(255,255,255,0.9),inset_-2px_0_4px_rgba(0,0,0,0.08)] hover:brightness-[1.02]'
                    : 'bg-gradient-to-r from-slate-300 via-slate-200 to-slate-400 text-slate-500 opacity-65'
                }`}
              >
                {/* Left Tip of White Key: Note Label & Vocal Range Badges */}
                <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-none z-10">
                  {labelStyle === 'badges' && isLowest && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[8px] font-black shadow">
                      {t.minBadge}
                    </span>
                  )}
                  {labelStyle === 'badges' && isHighest && (
                    <span className="px-1.5 py-0.5 rounded bg-pink-600 text-white text-[8px] font-black shadow">
                      {t.maxBadge}
                    </span>
                  )}
                  {labelStyle === 'badges' && isMiddle && !isLowest && !isHighest && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[8px] font-black shadow">
                      {t.midBadge}
                    </span>
                  )}

                  {labelStyle !== 'photo' && (
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-xs font-black tracking-tight text-slate-900/90">
                        {formatNoteName(note, notation)}
                      </span>
                      {labelStyle === 'badges' && (
                        <span className="text-[9px] font-mono text-slate-500 hidden sm:inline">
                          {Math.round(note.frequency)} {t.hzUnit}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Subtle right-side octave watermark (only if not clean photo) */}
                {labelStyle !== 'photo' && (
                  <span className="text-[10px] font-mono font-bold text-slate-400/40 pointer-events-none pr-1">
                    {note.octave}
                  </span>
                )}
              </button>
            );
          })}

          {/* 
            LAYER 2: 3D EBONY BLACK KEYS
            Positioned on the RIGHT side, spanning 58% width, overlaying the exact seam
            between adjacent white keys. Left tip features double specular gloss reflections
            and beveled facet, matching Screenshot_20261028_110503_Real_Piano_916ea9f7.png!
          */}
          {displayBlackKeys.map(({ note, boundaryWhiteIndex }) => {
            const inRange = isInVocalRange(note.midi);
            const isSung = isSungNote(note.midi);
            const isPlayed = activeMidiNotes.has(note.midi);
            const isLowest = profile.lowestNote.midi === note.midi;
            const isHighest = profile.highestNote.midi === note.midi;
            const isTarget = targetMidi === note.midi;

            // Centered on the seam between white keys
            const topPosition = boundaryWhiteIndex * keyHeight - blackKeyHeight / 2;

            return (
              <button
                key={`vert-black-${note.midi}`}
                onPointerDown={() => handlePlayNote(note.midi)}
                style={{
                  top: `${topPosition}px`,
                  height: `${blackKeyHeight}px`,
                  width: '58%',
                  right: 0,
                }}
                className={`absolute z-20 rounded-l-[5px] border-l border-y border-[#000000] flex items-center justify-between px-2.5 select-none transition-all shadow-[0_4px_8px_rgba(0,0,0,0.9),-3px_2px_5px_rgba(0,0,0,0.7)] active:brightness-95 ${
                  isSung
                    ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-800 text-white ring-2 ring-emerald-300'
                    : isPlayed
                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-800 text-white ring-2 ring-amber-300'
                    : isTarget
                    ? 'bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950 text-white ring-2 ring-amber-400'
                    : inRange
                    ? 'bg-gradient-to-r from-[#2c2c34] via-[#161619] via-15% to-[#0d0d0f] to-[#1c1c22] text-white/90'
                    : 'bg-[#151518] text-slate-500 opacity-60'
                }`}
              >
                {/* Left Tip of Black Key: Exact Double Specular Oval Reflections & Bevel from Photo */}
                <div className="flex items-center gap-1.5 pointer-events-none">
                  {/* Specular gloss mark )( */}
                  <div className="flex items-center gap-[2px] opacity-80 pl-0.5">
                    <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
                      <path d="M3.5 2 C1.8 5.5, 1.8 12.5, 3.5 16" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M6.5 2 C8.2 5.5, 8.2 12.5, 6.5 16" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Left beveled facet rim */}
                  <div className="w-1 h-4 bg-gradient-to-r from-[#4b4b56] to-[#1c1c20] rounded-l-xs shadow-inner" />

                  {/* Note Label (if enabled) */}
                  {labelStyle !== 'photo' && (
                    <span className="font-mono text-[11px] font-bold text-white/90">
                      {formatNoteName(note, notation)}
                    </span>
                  )}
                </div>

                {/* Right side frequency & range badge */}
                {labelStyle !== 'photo' && (
                  <div className="flex items-center gap-1.5 pointer-events-none">
                    {labelStyle === 'badges' && isLowest && (
                      <span className="px-1 py-0.2 rounded bg-blue-600 text-white text-[7px] font-bold">
                        {t.minBadge}
                      </span>
                    )}
                    {labelStyle === 'badges' && isHighest && (
                      <span className="px-1 py-0.2 rounded bg-pink-600 text-white text-[7px] font-bold">
                        {t.maxBadge}
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-slate-400">
                      {Math.round(note.frequency)}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 
        ========================================================================
        BOTTOM CUSHION: CLASSIC RED VELVET (NO "REAL PIANO" TEXT)
        Labeled with "VocalMaster Grand" (or Arabic) with live pitch monitor
        ========================================================================
      */}
      <div className={`w-full py-2 px-3.5 flex items-center justify-between text-xs z-30 shrink-0 ${themeConfig.cushionBg}`}>
        <div className="flex items-center gap-2">
          <span className={`font-serif tracking-widest text-xs sm:text-sm ${themeConfig.cushionText}`}>
            {isAr ? themeConfig.cushionTitleAr : themeConfig.cushionTitleEn}
          </span>
          <span className="text-[10px] sm:text-[11px] text-white/70 font-mono hidden sm:inline">
            • {profile.voiceType} ({formatNoteName(profile.lowestNote, notation)} – {formatNoteName(profile.highestNote, notation)})
          </span>
        </div>

        {/* Live Sung Pitch */}
        {currentPitch?.note ? (
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/20 text-white px-2.5 py-0.5 rounded-full font-mono text-xs animate-pulse">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">{formatNoteName(currentPitch.note, notation)}</span>
            <span className="text-[10px]">({Math.round(currentPitch.frequency || 0)} {t.hzUnit})</span>
            <span className={currentPitch.isInTune ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
              {currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch.cents}¢
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-white/70 italic hidden sm:inline">
            {t.singPrompt}
          </span>
        )}
      </div>
    </div>
  );
};

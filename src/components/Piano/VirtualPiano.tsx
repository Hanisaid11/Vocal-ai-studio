import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Volume2, ZoomIn, ZoomOut, Target, Sliders, Music, Mic, ChevronLeft, ChevronRight } from 'lucide-react';
import { NoteInfo, VocalRangeProfile, PitchDetectionResult } from '../../types/vocal';
import { midiToNoteInfo, NOTE_NAMES, STANDARD_VOICE_RANGES } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { haptics } from '../../utils/haptics';

interface VirtualPianoProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  onSelectRangeProfile?: (profile: VocalRangeProfile) => void;
}

export const VirtualPiano: React.FC<VirtualPianoProps> = ({
  profile,
  currentPitch,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [keyWidth, setKeyWidth] = useState<number>(44); // px per white key
  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<number>>(new Set());
  const [octaveSpan, setOctaveSpan] = useState<{ startMidi: number; endMidi: number }>({
    startMidi: 24, // C1 (32.7 Hz)
    endMidi: 96,   // C7 (2093 Hz)
  });
  const [viewFilter, setViewFilter] = useState<'all' | 'rangeOnly'>('all');
  const [showLabels, setShowLabels] = useState(true);

  // Generate piano keys chromatic list
  const allMidiNotes = useMemo(() => {
    const list: NoteInfo[] = [];
    const min = viewFilter === 'rangeOnly' ? Math.max(24, profile.lowestNote.midi - 2) : octaveSpan.startMidi;
    const max = viewFilter === 'rangeOnly' ? Math.min(108, profile.highestNote.midi + 2) : octaveSpan.endMidi;

    for (let midi = min; midi <= max; midi++) {
      list.push(midiToNoteInfo(midi));
    }
    return list;
  }, [octaveSpan, viewFilter, profile]);

  // Separate into white keys and black keys
  const whiteKeys = useMemo(() => {
    return allMidiNotes.filter((note) => !note.name.includes('#'));
  }, [allMidiNotes]);

  // Scroll to middle register on initial mount
  useEffect(() => {
    if (containerRef.current) {
      const middleMidi = profile.middleRegisterNote?.midi || 60;
      const whiteKeyIndex = whiteKeys.findIndex((k) => k.midi >= middleMidi);
      if (whiteKeyIndex !== -1) {
        const scrollTarget = Math.max(0, whiteKeyIndex * keyWidth - containerRef.current.clientWidth / 2 + keyWidth);
        containerRef.current.scrollLeft = scrollTarget;
      }
    }
  }, [viewFilter]);

  const handlePlayNote = async (midi: number) => {
    haptics.tap();
    const note = midiToNoteInfo(midi);
    setActiveMidiNotes((prev) => new Set(prev).add(midi));
    try {
      await audioEngine.playTone(note.frequency, 0.9, 'piano');
    } finally {
      setTimeout(() => {
        setActiveMidiNotes((prev) => {
          const next = new Set(prev);
          next.delete(midi);
          return next;
        });
      }, 300);
    }
  };

  const scrollToMidi = (midi: number) => {
    if (containerRef.current) {
      const whiteKeyIndex = whiteKeys.findIndex((k) => k.midi >= midi);
      if (whiteKeyIndex !== -1) {
        const target = Math.max(0, whiteKeyIndex * keyWidth - containerRef.current.clientWidth / 2 + keyWidth);
        containerRef.current.scrollTo({ left: target, behavior: 'smooth' });
      }
    }
  };

  // Check if midi note is within user's active vocal range
  const isInVocalRange = (midi: number) => {
    return midi >= profile.lowestNote.midi && midi <= profile.highestNote.midi;
  };

  // Check if this note is currently being sung into the mic
  const isSungNote = (midi: number) => {
    return currentPitch?.note?.midi === midi && (currentPitch.clarity ?? 0) > 0.65;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Vocal Range Summary */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100">{profile.voiceType} Voice</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] border border-indigo-500/30">
                {profile.lowestNote.fullName} – {profile.highestNote.fullName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {profile.octavesSpan} octaves ({profile.totalSemitones} semitones)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setKeyWidth((w) => Math.max(34, w - 6))}
              aria-label="Zoom Out Piano"
              className="p-1 hover:text-white text-slate-400 rounded transition"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[10px] font-mono text-slate-400">{keyWidth}px</span>
            <button
              onClick={() => setKeyWidth((w) => Math.min(64, w + 6))}
              aria-label="Zoom In Piano"
              className="p-1 hover:text-white text-slate-400 rounded transition"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Range highlight filter */}
          <button
            onClick={() => setViewFilter((f) => (f === 'all' ? 'rangeOnly' : 'all'))}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition ${
              viewFilter === 'rangeOnly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Target className="w-3 h-3" />
            <span>{viewFilter === 'rangeOnly' ? 'My Range' : 'Full C1-C7'}</span>
          </button>

          {/* Toggle Labels */}
          <button
            onClick={() => setShowLabels((l) => !l)}
            className={`px-2 py-1.5 rounded-lg text-slate-300 hover:text-white transition ${
              showLabels ? 'bg-slate-800 border border-slate-700 text-indigo-300' : 'bg-slate-900 text-slate-500'
            }`}
          >
            Labels
          </button>
        </div>
      </div>

      {/* Live Sung Pitch Bar & Range Markers */}
      <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/40 border border-indigo-400 inline-block"></span>
            <span>Vocal Range Area</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block shadow-sm shadow-emerald-400"></span>
            <span>Live Sung Pitch</span>
          </div>
        </div>

        {/* Current mic pitch readout */}
        {currentPitch?.note ? (
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-md font-mono text-[11px] animate-pulse">
            <Mic className="w-3 h-3 text-emerald-400" />
            <span className="font-bold">{currentPitch.note.fullName}</span>
            <span>({currentPitch.frequency} Hz)</span>
            <span className={currentPitch.isInTune ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch.cents}¢
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 italic">Sing into microphone to see pitch light up</span>
        )}
      </div>

      {/* Octave Quick Jump Bar */}
      <div className="px-2 py-1.5 bg-slate-900/40 border-b border-slate-800/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] uppercase font-bold text-slate-500 px-1 shrink-0">Octaves:</span>
        {[1, 2, 3, 4, 5, 6].map((oct) => {
          const cMidi = (oct + 1) * 12;
          const isMid = profile.middleRegisterNote?.octave === oct;
          return (
            <button
              key={oct}
              onClick={() => scrollToMidi(cMidi)}
              className={`px-2.5 py-0.5 rounded text-[11px] font-mono shrink-0 transition ${
                isMid
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              C{oct}
            </button>
          );
        })}
      </div>

      {/* Interactive Piano Keys Canvas / Touch Area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-x-auto overflow-y-hidden select-none bg-slate-950 py-4 px-2 min-h-[220px]"
      >
        <div
          className="relative inline-flex items-start h-[190px]"
          style={{ width: `${whiteKeys.length * keyWidth}px` }}
        >
          {/* White Keys */}
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
                className={`absolute top-0 h-[190px] border-r border-slate-800/90 rounded-b-lg flex flex-col justify-end items-center pb-3 transition-colors ${
                  isSung
                    ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300 shadow-lg shadow-emerald-500/50 z-20'
                    : isPlayed
                    ? 'bg-indigo-300 text-slate-950 z-20'
                    : inRange
                    ? 'bg-slate-100 hover:bg-indigo-50 text-slate-800 shadow-inner'
                    : 'bg-slate-300/80 hover:bg-slate-200 text-slate-600 opacity-60'
                }`}
              >
                {/* Boundary Badges */}
                {isLowest && (
                  <span className="absolute top-2 px-1 py-0.5 rounded bg-blue-600 text-white text-[8px] font-bold shadow">
                    MIN
                  </span>
                )}
                {isHighest && (
                  <span className="absolute top-2 px-1 py-0.5 rounded bg-pink-600 text-white text-[8px] font-bold shadow">
                    MAX
                  </span>
                )}
                {isMiddle && !isLowest && !isHighest && (
                  <span className="absolute top-2 px-1 py-0.5 rounded bg-indigo-600 text-white text-[8px] font-bold shadow">
                    MID
                  </span>
                )}

                {/* Note Label */}
                {showLabels && (
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-xs tracking-tight">{note.fullName}</span>
                    <span className="text-[9px] opacity-75 font-mono">{Math.round(note.frequency)}</span>
                  </div>
                )}
              </button>
            );
          })}

          {/* Black Keys */}
          {whiteKeys.map((whiteNote, index) => {
            const blackMidi = whiteNote.midi + 1;
            const blackNote = allMidiNotes.find((n) => n.midi === blackMidi && n.name.includes('#'));
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
                className={`absolute top-0 h-[115px] rounded-b-md z-30 flex flex-col justify-end items-center pb-2.5 transition-colors ${
                  isSung
                    ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300 shadow-xl shadow-emerald-500/60'
                    : isPlayed
                    ? 'bg-indigo-400 text-slate-950'
                    : inRange
                    ? 'bg-slate-900 border-x border-b border-indigo-500/40 shadow-md text-indigo-300'
                    : 'bg-slate-950/90 border border-slate-800 text-slate-500 opacity-70'
                }`}
              >
                {isLowest && (
                  <span className="absolute top-1 text-[7px] text-blue-300 font-bold">MIN</span>
                )}
                {isHighest && (
                  <span className="absolute top-1 text-[7px] text-pink-300 font-bold">MAX</span>
                )}
                {showLabels && (
                  <span className="text-[9px] font-bold font-mono">
                    {blackNote.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Touch Instructions footer */}
      <div className="p-2.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between text-slate-400 text-[11px]">
        <span>Tap any key to play reference pitch • Drag horizontally to scroll</span>
        <button
          onClick={() => scrollToMidi(profile.lowestNote.midi)}
          className="text-indigo-400 hover:text-indigo-300 font-semibold"
        >
          Center on vocal range →
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Play, Sparkles, Activity, Music, Flame, Zap, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { WarmupExercise, VocalRangeProfile, PitchDetectionResult, PracticeSessionRecord, AppLanguage, NotationSystem } from '../../types/vocal';
import { formatNoteName } from '../../utils/noteUtils';
import { translations } from '../../utils/i18n';
import { ExercisePlayer } from './ExercisePlayer';

interface WarmupRoutinesProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language?: AppLanguage;
  notation?: NotationSystem;
  onSessionComplete: (session: PracticeSessionRecord) => void;
}

export const PRESET_WARMUPS: WarmupExercise[] = [
  {
    id: 'lip-trill-basic',
    title: 'Gentle Lip Trills (3-Tone)',
    category: 'lip_trill',
    difficulty: 'Beginner',
    description: 'Relieves vocal fold pressure and gently warms up airflow balance through bubbling.',
    instructions: [
      'Gently vibrate lips together like an engine hum or child making motorboat sounds.',
      'Maintain steady abdominal breath support without pushing pitch.',
      'Allow pitch to float effortlessly up and down.',
    ],
    vowelSuggestion: 'Brrr / Lip Trill',
    defaultBpm: 80,
    basePatternSemitones: [0, 2, 4, 2, 0], // 1 - 2 - 3 - 2 - 1
    repetitionsCount: 12,
  },
  {
    id: '5-tone-scale',
    title: '5-Tone Vocalise (Ma-Me-Mi)',
    category: 'scale',
    difficulty: 'Beginner',
    description: 'Classic Italian bel canto scale to promote forward pharyngeal resonance and smooth vowels.',
    instructions: [
      'Sing clearly on "Ma-Me-Mi-Mo-Mu" or "Nay-Nay-Nay".',
      'Keep your jaw relaxed and let tongue position articulate vowels cleanly.',
      'Avoid sudden volume spikes on upper notes.',
    ],
    vowelSuggestion: 'Ma - Me - Mi - Mo - Mu',
    defaultBpm: 92,
    basePatternSemitones: [0, 2, 4, 5, 7, 5, 4, 2, 0], // 1-2-3-4-5-4-3-2-1
    repetitionsCount: 14,
  },
  {
    id: 'arpeggio-triad',
    title: 'Major Arpeggio (1-3-5-8)',
    category: 'arpeggio',
    difficulty: 'Intermediate',
    description: 'Builds vocal cord agility, octave expansion, and bridges chest to mix/head voice.',
    instructions: [
      'Engage breath support right before the octave leap.',
      'Keep vowels tall and narrow on the top note.',
      'Feel the tone ring behind your upper teeth and soft palate.',
    ],
    vowelSuggestion: 'Gee / Ah',
    defaultBpm: 96,
    basePatternSemitones: [0, 4, 7, 12, 7, 4, 0], // 1-3-5-8-5-3-1
    repetitionsCount: 16,
  },
  {
    id: 'octave-interval',
    title: 'Octave Leap & Pitch Accuracy',
    category: 'intervals',
    difficulty: 'Intermediate',
    description: 'Sharpens inner pitch hearing and vocal stability across wide intervals.',
    instructions: [
      'Sing root, then cleanly leap full octave without sliding.',
      'Check cents indicator for exact center of pitch.',
    ],
    vowelSuggestion: 'Oh - Ee',
    defaultBpm: 84,
    basePatternSemitones: [0, 12, 0, 12, 0],
    repetitionsCount: 10,
  },
  {
    id: 'staccato-agility',
    title: 'Staccato Diaphragm Bounce',
    category: 'staccato',
    difficulty: 'Advanced',
    description: 'Quick diaphragmatic pulses for vocal onset clarity and fast register coordination.',
    instructions: [
      'Short, crisp, separated notes without clearing throat.',
      'Activate lower abdominal muscles for each bounce.',
    ],
    vowelSuggestion: 'Ha - Ha - Ha',
    defaultBpm: 104,
    basePatternSemitones: [0, 4, 7, 4, 0],
    repetitionsCount: 12,
  },
];

export const WarmupRoutines: React.FC<WarmupRoutinesProps> = ({
  profile,
  currentPitch,
  language = 'en',
  notation = 'english',
  onSessionComplete,
}) => {
  const [selectedExercise, setSelectedExercise] = useState<WarmupExercise | null>(null);
  const t = translations[language];

  if (selectedExercise) {
    return (
      <ExercisePlayer
        exercise={selectedExercise}
        profile={profile}
        currentPitch={currentPitch}
        language={language}
        notation={notation}
        onFinishSession={(session) => {
          onSessionComplete(session);
          setSelectedExercise(null);
        }}
        onClose={() => setSelectedExercise(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-800/40 p-4 rounded-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{t.warmupTitle}</h2>
            <p className="text-xs text-slate-300">
              {t.warmupDesc} • <span className="font-semibold text-cyan-300">{profile.voiceType}</span> ({formatNoteName(profile.lowestNote, notation)} – {formatNoteName(profile.highestNote, notation)})
            </p>
          </div>
        </div>
      </div>

      {/* Routine Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PRESET_WARMUPS.map((exercise) => {
          const difficultyColor =
            exercise.difficulty === 'Beginner'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : exercise.difficulty === 'Intermediate'
              ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
              : 'bg-purple-500/10 text-purple-300 border-purple-500/30';

          return (
            <div
              key={exercise.id}
              className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 p-4 rounded-2xl shadow-md transition flex flex-col justify-between gap-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-sm group-hover:text-indigo-300 transition">
                    {exercise.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${difficultyColor}`}>
                    {exercise.difficulty}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {exercise.description}
                </p>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
                  <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-cyan-300">
                    &quot;{exercise.vowelSuggestion}&quot;
                  </span>
                  <span>{exercise.defaultBpm} BPM</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <div className="text-[11px] text-slate-500">
                  Range: {profile.middleRegisterNote.fullName} ↗ {profile.highestNote.fullName} ↘ {profile.lowestNote.fullName}
                </div>
                <button
                  onClick={() => setSelectedExercise(exercise)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/40 transition active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Practice</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

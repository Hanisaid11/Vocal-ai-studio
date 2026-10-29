import React, { useState } from 'react';
import { Trophy, Play, Flame, Music, Sparkles, Award, ArrowRight, Brain, Ear, Activity, Compass, Target, Lock, Star, Zap } from 'lucide-react';
import { VocalRangeProfile, PitchDetectionResult, PitchGameRecord, UserStats, AppLanguage, NotationSystem, AppTheme } from '../../types/vocal';
import { PitchHeroGame } from './PitchHeroGame';
import { IntervalChallengeGame } from './IntervalChallengeGame';
import { NoteMemoryGame } from './NoteMemoryGame';
import { PianoEarTrainerGame } from './PianoEarTrainerGame';
import { SirenGlideGame } from './SirenGlideGame';
import { PitchRecognitionGame } from './PitchRecognitionGame';
import { EarTrainingProgressionGame } from './EarTrainingProgressionGame';
import { translations } from '../../utils/i18n';
import { haptics } from '../../utils/haptics';

interface PitchGamesHubProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  stats: UserStats;
  language: AppLanguage;
  notation: NotationSystem;
  theme?: AppTheme;
  onRecordGameSession: (record: PitchGameRecord) => void;
}

export const PitchGamesHub: React.FC<PitchGamesHubProps> = ({
  profile,
  currentPitch,
  stats,
  language,
  notation,
  theme = 'classic-piano',
  onRecordGameSession,
}) => {
  const [activeGame, setActiveGame] = useState<'hub' | 'ear_progression' | 'pitch_recognition' | 'ear_trainer' | 'siren_glide' | 'pitch_hero' | 'interval' | 'memory'>('hub');
  const t = translations[language];
  const isAr = language === 'ar';

  if (activeGame === 'ear_progression') {
    return (
      <EarTrainingProgressionGame
        profile={profile}
        currentPitch={currentPitch}
        stats={stats}
        language={language}
        notation={notation}
        theme={theme}
        onRecordGameSession={onRecordGameSession}
        onBackToHub={() => setActiveGame('hub')}
      />
    );
  }

  if (activeGame === 'pitch_recognition') {
    return (
      <PitchRecognitionGame
        profile={profile}
        currentPitch={currentPitch}
        language={language}
        notation={notation}
        theme={theme}
        onRecordGameSession={onRecordGameSession}
        onBackToHub={() => setActiveGame('hub')}
      />
    );
  }

  if (activeGame === 'ear_trainer') {
    return (
      <PianoEarTrainerGame
        profile={profile}
        currentPitch={currentPitch}
        language={language}
        notation={notation}
        theme={theme}
        onRecordGameSession={onRecordGameSession}
        onBackToHub={() => setActiveGame('hub')}
      />
    );
  }

  if (activeGame === 'siren_glide') {
    return (
      <SirenGlideGame
        profile={profile}
        currentPitch={currentPitch}
        language={language}
        notation={notation}
        onRecordGameSession={onRecordGameSession}
        onBackToHub={() => setActiveGame('hub')}
      />
    );
  }

  if (activeGame === 'pitch_hero') {
    return (
      <PitchHeroGame
        profile={profile}
        currentPitch={currentPitch}
        onGameComplete={(record) => {
          onRecordGameSession(record);
        }}
        onExit={() => setActiveGame('hub')}
      />
    );
  }

  if (activeGame === 'interval') {
    return (
      <IntervalChallengeGame
        profile={profile}
        currentPitch={currentPitch}
        onGameComplete={(record) => {
          onRecordGameSession(record);
        }}
        onExit={() => setActiveGame('hub')}
      />
    );
  }

  if (activeGame === 'memory') {
    return (
      <NoteMemoryGame
        profile={profile}
        currentPitch={currentPitch}
        language={language}
        notation={notation}
        onGameComplete={(record) => {
          onRecordGameSession(record);
        }}
        onExit={() => setActiveGame('hub')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in select-none">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-950/70 via-indigo-950 to-purple-950 border border-amber-600/30 p-4 rounded-3xl shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/60">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>{t.gamesHubTitle}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                7 {isAr ? 'أنماط تدريبية' : 'Training Modes'}
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              {t.gamesHubDesc}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-slate-950/70 px-3.5 py-1.5 rounded-2xl border border-slate-800 text-xs">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white font-mono">{stats.earProgressionXP || stats.highScorePitchRecognition || 120} XP</span>
          <span className="text-[10px] text-slate-400">{isAr ? 'النقاط' : 'Progression'}</span>
        </div>
      </div>

      {/* 
        FEATURED SYSTEM: EAR TRAINING PROGRESSION LADDER
        Progression from Major Scales -> Consonances -> Minor/Modal -> 7th Chords -> Dissonant Tritones
      */}
      <div className="bg-gradient-to-br from-[#120f2e] via-[#1a1444] to-[#26133a] border-2 border-indigo-500/50 p-5 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/25 text-indigo-300 font-bold text-[10px] uppercase tracking-wider border border-indigo-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                {isAr ? 'نظام التدرج السمعي الذكي' : 'Ear Progression System'}
              </span>
              <span className="text-[11px] text-amber-300 font-mono font-bold">
                Tier {stats.earProgressionTierUnlocked || 1} / 5 {isAr ? 'متاح' : 'Unlocked'}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Ear className="w-5 h-5 text-cyan-400 shrink-0" />
              <span>{t.earProgressionTitle}</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {t.earProgressionDesc}
            </p>

            {/* Stage Preview Chips */}
            <div className="flex items-center gap-1.5 pt-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 1, label: isAr ? '1. السلالم الكبيرة' : '1. Major Scales' },
                { id: 2, label: isAr ? '2. التوافقات (3rds/5ths)' : '2. Consonance (3/5)' },
                { id: 3, label: isAr ? '3. المسافات الصغيرة' : '3. Minor & Modal' },
                { id: 4, label: isAr ? '4. كوردات سابعة' : '4. 7th Chords' },
                { id: 5, label: isAr ? '5. التريتون والتنافرات' : '5. Tritones & Clash' },
              ].map((stage) => {
                const isUnlocked = stage.id <= (stats.earProgressionTierUnlocked || 1);
                return (
                  <span
                    key={stage.id}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition ${
                      isUnlocked
                        ? 'bg-indigo-900/60 text-cyan-300 border border-cyan-500/30'
                        : 'bg-slate-900/60 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {isUnlocked ? '✓ ' : '🔒 '}
                    {stage.label}
                  </span>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => {
              haptics.tap();
              setActiveGame('ear_progression');
            }}
            className="w-full md:w-auto px-6 py-4 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-400 hover:to-pink-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-2xl shadow-indigo-950/80 transition active:scale-95 shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t.startProgression}</span>
          </button>
        </div>
      </div>

      {/* Featured Secondary Game: Vertical Piano Pitch Recognition */}
      <div className="bg-gradient-to-r from-[#0c1c2e] via-[#10243d] to-[#1c183a] border border-cyan-500/40 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40 shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] uppercase tracking-wider border border-cyan-500/30">
                {isAr ? 'التعرف على النغمات' : 'Pitch Recognition'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">🎹 Piano & 🪕 Arabic Oud</span>
            </div>
            <h3 className="text-lg font-black text-white">{t.pitchRecognitionTitle}</h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">{t.pitchRecognitionDesc}</p>
          </div>
        </div>

        <button
          onClick={() => {
            haptics.tap();
            setActiveGame('pitch_recognition');
          }}
          className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-cyan-950/60 transition active:scale-95 shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{t.playGame}</span>
        </button>
      </div>

      {/* Game Selection Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Game Card: Ear Training Progression Ladder */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-3xl shadow-md flex flex-col justify-between gap-3 group transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                {isAr ? 'سلّم التدرج' : 'Progression Ladder'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] border border-indigo-500/30 font-bold">
                Lvl {stats.earProgressionTierUnlocked || 1}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
              {t.earProgressionTitle}
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
              {t.earProgressionDesc}
            </p>

            <div className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30 inline-block">
              5 Unlockable Tiers • Chords & Tritones
            </div>
          </div>

          <button
            onClick={() => {
              haptics.tap();
              setActiveGame('ear_progression');
            }}
            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t.playGame}</span>
          </button>
        </div>
        {/* Game 2: Piano Ear Pitch Guess (Horizontal Real Piano) */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 p-4 rounded-3xl shadow-md flex flex-col justify-between gap-3 group transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                {isAr ? 'تخمين بالسمع' : 'Ear Trainer'}
              </span>
              <Ear className="w-4 h-4 text-amber-400" />
            </div>

            <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
              {t.earTrainerTitle}
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
              {t.earTrainerDesc}
            </p>

            <div className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/30 inline-block">
              88-Key Interactive Piano
            </div>
          </div>

          <button
            onClick={() => {
              haptics.tap();
              setActiveGame('ear_trainer');
            }}
            className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t.playGame}</span>
          </button>
        </div>

        {/* Game 3: Sing Sharp Siren Glide */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-3xl shadow-md flex flex-col justify-between gap-3 group transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                Sing Sharp
              </span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>

            <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
              {t.sirenGlideTitle}
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
              {t.sirenGlideDesc}
            </p>

            <div className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30 inline-block">
              Continuous Pitch Curve
            </div>
          </div>

          <button
            onClick={() => {
              haptics.tap();
              setActiveGame('siren_glide');
            }}
            className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t.playGame}</span>
          </button>
        </div>

        {/* Game 4: Pitch Hero */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-pink-500/50 p-4 rounded-3xl shadow-md flex flex-col justify-between gap-3 group transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider">
                {isAr ? 'التقاط النغمات' : 'Falling Notes'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono text-[10px] border border-pink-500/30">
                {stats.highScorePitchHero || 0}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white group-hover:text-pink-300 transition">
              {t.pitchHeroTitle}
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
              {t.pitchHeroDesc}
            </p>

            <div className="text-[10px] font-mono text-pink-400 bg-pink-950/40 px-2 py-0.5 rounded border border-pink-800/30 inline-block">
              45s Speed Trial
            </div>
          </div>

          <button
            onClick={() => {
              haptics.tap();
              setActiveGame('pitch_hero');
            }}
            className="w-full py-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t.playGame}</span>
          </button>
        </div>

        {/* Game 5: Note Memory Match */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 p-4 rounded-3xl shadow-md flex flex-col justify-between gap-3 group transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                {isAr ? 'الذاكرة السمعية' : 'Aural Memory'}
              </span>
              <Brain className="w-4 h-4 text-purple-400" />
            </div>

            <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition">
              {t.memoryTitle}
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
              {t.memoryDesc}
            </p>

            <div className="text-[10px] font-mono text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/30 inline-block">
              6 Hidden Rounds
            </div>
          </div>

          <button
            onClick={() => {
              haptics.tap();
              setActiveGame('memory');
            }}
            className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t.playGame}</span>
          </button>
        </div>

        {/* Game 6: Interval Challenge */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-3xl shadow-md flex flex-col justify-between gap-3 group transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                {isAr ? 'المسافات الصوتية' : 'Intervals'}
              </span>
              <Music className="w-4 h-4 text-indigo-400" />
            </div>

            <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
              {t.intervalTitle}
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
              {t.intervalDesc}
            </p>

            <div className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/30 inline-block">
              3rds, 4ths, 5ths, Octaves
            </div>
          </div>

          <button
            onClick={() => {
              haptics.tap();
              setActiveGame('interval');
            }}
            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t.playGame}</span>
          </button>
        </div>
      </div>

      {/* Recent Game Activity Log */}
      {stats.gameRecords && stats.gameRecords.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl space-y-2">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            {isAr ? 'سجل نتائج الألعاب الأخيرة' : 'Recent Pitch Game Records'}
          </h4>
          <div className="divide-y divide-slate-800/80">
            {stats.gameRecords.slice(0, 4).map((rec) => (
              <div key={rec.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200 capitalize">
                    {rec.gameType.replace(/_/g, ' ')}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {rec.date} • {t.streak}: {rec.highestStreak}x
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-cyan-400 font-mono text-sm">{rec.score} pts</span>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {rec.accuracyPercentage}% {isAr ? 'دقة' : 'acc'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

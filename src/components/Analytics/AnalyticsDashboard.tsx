import React from 'react';
import { TrendingUp, Clock, Flame, Award, BarChart3, Shield, Trophy } from 'lucide-react';
import { UserStats, VocalRangeProfile, AppLanguage, NotationSystem } from '../../types/vocal';
import { formatNoteName } from '../../utils/noteUtils';
import { translations } from '../../utils/i18n';

interface AnalyticsDashboardProps {
  stats: UserStats;
  profile: VocalRangeProfile;
  language?: AppLanguage;
  notation?: NotationSystem;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  stats,
  profile,
  language = 'ar',
  notation = 'arabic',
}) => {
  const isAr = language === 'ar';
  const t = translations[language] || translations.en;

  // Reverse sessions for chronological trend
  const sessions = [...stats.sessions].slice(0, 10).reverse();

  // Note-by-Note Accuracy Map (typical notes evaluated in sessions)
  const evaluatedNotes = [
    { note: 'C3', accuracy: 88, statusEn: 'In-Tune', statusAr: 'صحيح النغمة', biasEn: 'Centered', biasAr: 'متوازن' },
    { note: 'D3', accuracy: 91, statusEn: 'In-Tune', statusAr: 'صحيح النغمة', biasEn: 'Centered', biasAr: 'متوازن' },
    { note: 'E3', accuracy: 85, statusEn: 'In-Tune', statusAr: 'صحيح النغمة', biasEn: 'Centered', biasAr: 'متوازن' },
    { note: 'F3', accuracy: 78, statusEn: 'Good', statusAr: 'جيد', biasEn: 'Slightly Flat (-8¢)', biasAr: 'هابط قليلاً (-8س)' },
    { note: 'G3', accuracy: 94, statusEn: 'Mastered', statusAr: 'ممتاز ومتقن', biasEn: 'Centered', biasAr: 'متوازن' },
    { note: 'A3', accuracy: 89, statusEn: 'In-Tune', statusAr: 'صحيح النغمة', biasEn: 'Centered', biasAr: 'متوازن' },
    { note: 'B3', accuracy: 82, statusEn: 'Good', statusAr: 'جيد', biasEn: 'Centered', biasAr: 'متوازن' },
    { note: 'C4', accuracy: 95, statusEn: 'Mastered', statusAr: 'ممتاز ومتقن', biasEn: 'Centered', biasAr: 'متوازن' },
    { note: 'D4', accuracy: 86, statusEn: 'In-Tune', statusAr: 'صحيح النغمة', biasEn: 'Centered', biasAr: 'متوازن' },
    { note: 'E4', accuracy: 79, statusEn: 'Good', statusAr: 'جيد', biasEn: 'Slightly Sharp (+9¢)', biasAr: 'حاد قليلاً (+9س)' },
    { note: 'F4', accuracy: 73, statusEn: 'Passagio', statusAr: 'منطقة التحول (باساجيو)', biasEn: 'Slightly Sharp (+12¢)', biasAr: 'حاد قليلاً (+12س)' },
    { note: 'G4', accuracy: 81, statusEn: 'In-Tune', statusAr: 'صحيح النغمة', biasEn: 'Centered', biasAr: 'متوازن' },
    { note: 'A4', accuracy: 76, statusEn: 'Upper Reg', statusAr: 'الطبقة العالية', biasEn: 'Slightly Flat (-10¢)', biasAr: 'هابط قليلاً (-10س)' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Pitch Accuracy */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isAr ? 'الدقة العامة' : 'Overall Accuracy'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono mt-2">
            {stats.overallAccuracyPct}%
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-1">
            {isAr ? '+4.2% هذا الأسبوع' : '+4.2% this week'}
          </div>
        </div>

        {/* Practice Streak */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isAr ? 'أيام التمرين المتتالية' : 'Practice Streak'}</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl font-black text-white font-mono mt-2">
            {stats.streakDays} {isAr ? 'أيام' : 'Days'}
          </div>
          <div className="text-[11px] text-amber-400 font-semibold mt-1">
            {isAr ? 'عادة تدريب مستمرة!' : 'Consistent habit!'}
          </div>
        </div>

        {/* Practice Time */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isAr ? 'إجمالي التمرين' : 'Total Practice'}</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono mt-2">
            {stats.totalPracticeTimeMinutes} {isAr ? 'دقيقة' : 'min'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.totalSessionsCompleted} {isAr ? 'جلسات تدريبية' : 'sessions'}
          </div>
        </div>

        {/* Vocal Span */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isAr ? 'المدى الصوتي النشط' : 'Active Range'}</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono mt-2">
            {profile.octavesSpan} {isAr ? 'أوكتاف' : 'Oct'}
          </div>
          <div className="text-[11px] text-indigo-300 font-mono mt-1">
            {formatNoteName(profile.lowestNote, notation)} – {formatNoteName(profile.highestNote, notation)}
          </div>
        </div>
      </div>

      {/* Accuracy Trend SVG Chart */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 md:p-5 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">
              {isAr ? 'منحنى دقة النبرة التراكمي (%)' : 'Pitch Accuracy Trend (%)'}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {isAr ? `آخر ${sessions.length} جلسات` : `Last ${sessions.length} sessions`}
          </span>
        </div>

        {/* SVG Curve Chart */}
        <div className="relative h-44 w-full bg-slate-950/80 rounded-2xl p-2 border border-slate-800/80 flex items-center justify-center">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 400 130" preserveAspectRatio="none">
            <defs>
              <linearGradient id="accGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[20, 50, 80, 110].map((y) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
            ))}

            {/* Target 80% line */}
            <line x1="0" y1="45" x2="400" y2="45" stroke="#10b981" strokeWidth="1" strokeOpacity="0.4" />
            <text x="330" y="40" fill="#10b981" fontSize="9" fontFamily="monospace">
              {isAr ? 'هدف 80%' : '80% Target'}
            </text>

            {/* Path for sessions */}
            {sessions.length > 1 && (() => {
              const points = sessions.map((s, idx) => {
                const x = (idx / (sessions.length - 1)) * 380 + 10;
                // Accuracy maps from 50% (y=120) to 100% (y=10)
                const clamped = Math.max(50, Math.min(100, s.accuracyPercentage));
                const y = 120 - ((clamped - 50) / 50) * 110;
                return { x, y, acc: s.accuracyPercentage, title: s.exerciseTitle };
              });

              const pathD = points.reduce((acc, p, idx) => {
                return `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
              }, '');

              const areaD = `${pathD} L ${points[points.length - 1].x} 125 L ${points[0].x} 125 Z`;

              return (
                <>
                  <path d={areaD} fill="url(#accGrad)" />
                  <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  {points.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r="4.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
                      <text x={p.x} y={p.y - 8} fill="#e2e8f0" fontSize="8" textAnchor="middle" fontFamily="monospace">
                        {p.acc}%
                      </text>
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Note-by-Note Precision Heatmap */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 md:p-5 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              {isAr ? 'خريطة الدقة الصوتية نغمة بنغمة' : 'Note-by-Note Vocal Precision Heatmap'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {isAr ? 'تحليل الانحراف الصوتي' : 'Tuning Bias Analysis'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
          {evaluatedNotes.map((item) => {
            const isHigh = item.accuracy >= 88;
            const isMid = item.accuracy >= 80;

            return (
              <div
                key={item.note}
                className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-white font-mono">{item.note}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isHigh
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isMid
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {item.accuracy}%
                  </span>
                </div>

                <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>{isAr ? item.statusAr : item.statusEn}</span>
                  <span className="font-mono text-slate-500">{isAr ? item.biasAr : item.biasEn}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pitch Games High Scores & Arcade Badges */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 md:p-5 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-pink-400" />
            <h3 className="text-sm font-bold text-white">
              {isAr ? 'أفضل النتائج في ساحة الألعاب الصوتية' : 'Gamified Pitch Arena High Scores'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {isAr ? 'الأرقام القياسية الشخصية' : 'Personal Best Records'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {isAr ? 'بطل النغمات: التقاط الفقاعات' : 'Pitch Hero: Note Catch'}
              </span>
              <span className="text-xl font-black text-pink-400 font-mono mt-0.5 block">
                {stats.highScorePitchHero || 0} {isAr ? 'نقطة' : 'pts'}
              </span>
              <span className="text-[10px] text-slate-500">
                {isAr ? 'سرعة البديهة والتقاط النغمات الهابطة' : 'Fast Reflexes & Falling Pitch'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {isAr ? 'تحدي المسافات الصوتية (الإنترفال)' : 'Interval Ear Challenge'}
              </span>
              <span className="text-xl font-black text-cyan-400 font-mono mt-0.5 block">
                {stats.highScoreInterval || 0} {isAr ? 'نقطة' : 'pts'}
              </span>
              <span className="text-[10px] text-slate-500">
                {isAr ? 'تدريب السمع على المسافات الموسيقية النسبية' : 'Relative Pitch Ear Training'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Session Log */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 md:p-5 rounded-3xl space-y-3">
        <h3 className="text-sm font-bold text-white">
          {isAr ? 'سجل جلسات التدريب الأخيرة' : 'Recent Training History'}
        </h3>

        <div className="divide-y divide-slate-800/80">
          {stats.sessions.slice(0, 5).map((session) => (
            <div key={session.id} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-200">{session.exerciseTitle}</span>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {session.dateString} • {Math.round(session.durationSeconds / 60)} {isAr ? 'دقيقة' : 'min'}
                </div>
              </div>

              <div className="text-right">
                <span className="font-bold text-emerald-400 font-mono text-sm">{session.accuracyPercentage}%</span>
                <div className="text-[10px] text-slate-400 font-mono">
                  {session.notesHitInTune}/{session.notesAttempted} {isAr ? 'نغمات صحيحة' : 'notes'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

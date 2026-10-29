import { AppTheme } from '../types/vocal';

export interface ThemeConfig {
  id: AppTheme;
  nameEn: string;
  nameAr: string;
  icon: string;
  cushionBg: string;
  cushionText: string;
  cushionTitleEn: string;
  cushionTitleAr: string;
  topBarBg: string;
  topBarBorder: string;
  keyWhiteBg: string;
  keyWhiteText: string;
  keyWhiteActive: string;
  keyBlackBg: string;
  keyBlackText: string;
  keyBlackActive: string;
  accentColor: string;
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  'classic-piano': {
    id: 'classic-piano',
    nameEn: 'Concert Grand (Classic Red Felt)',
    nameAr: 'بيانو غراند كلاسيكي (مخمل أحمر)',
    icon: '🎹',
    cushionBg: 'bg-gradient-to-r from-[#7a060a] via-[#a30b11] to-[#7a060a] border-t-2 border-[#540206] shadow-inner',
    cushionText: 'text-white font-extrabold tracking-widest text-shadow-md',
    cushionTitleEn: 'VocalMaster Grand',
    cushionTitleAr: 'بيانو فوكال ماستر غراند',
    topBarBg: 'bg-gradient-to-b from-[#181d28] to-[#0c0f17]',
    topBarBorder: 'border-slate-800',
    keyWhiteBg: 'bg-gradient-to-b from-[#ffffff] via-[#f7f6f2] to-[#e8e5dc] hover:from-[#fcfcfb] hover:to-[#dfdcd3] border-r border-slate-400/80 shadow-[inset_0_-8px_12px_rgba(0,0,0,0.15)]',
    keyWhiteText: 'text-slate-800',
    keyWhiteActive: 'bg-gradient-to-b from-[#d8d5cb] to-[#c2bfb5] shadow-[inset_0_4px_8px_rgba(0,0,0,0.35)]',
    keyBlackBg: 'bg-gradient-to-b from-[#1c1c1e] via-[#2d2d30] to-[#121214] border-x border-b border-black shadow-[0_4px_8px_rgba(0,0,0,0.7)]',
    keyBlackText: 'text-slate-300',
    keyBlackActive: 'bg-gradient-to-b from-[#0a0a0c] to-[#1e1e22] shadow-[inset_0_2px_4px_rgba(255,255,255,0.15)]',
    accentColor: '#a30b11',
  },
  'dark-studio': {
    id: 'dark-studio',
    nameEn: 'Dark Studio (AMOLED Neon)',
    nameAr: 'استوديو نيون داكن',
    icon: '✨',
    cushionBg: 'bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 border-t border-cyan-500/30',
    cushionText: 'text-cyan-400 font-bold tracking-wider',
    cushionTitleEn: 'VocalMaster Studio',
    cushionTitleAr: 'فوكال ماستر ستوديو',
    topBarBg: 'bg-slate-950/95',
    topBarBorder: 'border-slate-800',
    keyWhiteBg: 'bg-slate-900 hover:bg-slate-800 text-slate-100 border-r border-slate-800 shadow-inner',
    keyWhiteText: 'text-slate-200',
    keyWhiteActive: 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_#06b6d4]',
    keyBlackBg: 'bg-slate-950 border border-slate-800 text-cyan-300 shadow-md',
    keyBlackText: 'text-cyan-300',
    keyBlackActive: 'bg-indigo-600 text-white shadow-[0_0_15px_#6366f1]',
    accentColor: '#06b6d4',
  },
  'oriental-oud': {
    id: 'oriental-oud',
    nameEn: 'Oriental Oud & Walnut Wood',
    nameAr: 'عود أندلسي وجوز شرقي',
    icon: '🪕',
    cushionBg: 'bg-gradient-to-r from-[#3e2110] via-[#5d3119] to-[#3e2110] border-t-2 border-[#2b160b]',
    cushionText: 'text-amber-200 font-extrabold tracking-wider font-serif',
    cushionTitleEn: 'Acoustic Oud & Maqam',
    cushionTitleAr: 'عود عربي أصيل ومقامات',
    topBarBg: 'bg-[#1e120a]',
    topBarBorder: 'border-amber-900/60',
    keyWhiteBg: 'bg-gradient-to-b from-[#faf6ed] via-[#f1e9d8] to-[#dfd1b8] border-r border-[#c2b294] shadow-[inset_0_-6px_10px_rgba(62,33,16,0.15)]',
    keyWhiteText: 'text-[#422513]',
    keyWhiteActive: 'bg-gradient-to-b from-[#d5c3a3] to-[#bcab8d] shadow-[inset_0_3px_6px_rgba(0,0,0,0.3)]',
    keyBlackBg: 'bg-gradient-to-b from-[#2a170d] via-[#3d2214] to-[#1d1009] border border-[#522f1b] shadow-md',
    keyBlackText: 'text-amber-300',
    keyBlackActive: 'bg-gradient-to-b from-[#522f1b] to-[#2a170d]',
    accentColor: '#d97706',
  },
  'midnight-stage': {
    id: 'midnight-stage',
    nameEn: 'Midnight Stage (Royal Sapphire)',
    nameAr: 'المسرح الملكي (أزرق ياقوتي)',
    icon: '🎭',
    cushionBg: 'bg-gradient-to-r from-[#09152e] via-[#102a5c] to-[#09152e] border-t border-blue-500/40',
    cushionText: 'text-blue-200 font-bold tracking-widest',
    cushionTitleEn: 'Grand Concert Stage',
    cushionTitleAr: 'مسرح الحفل الموسيقي',
    topBarBg: 'bg-[#091122]',
    topBarBorder: 'border-blue-900/50',
    keyWhiteBg: 'bg-gradient-to-b from-[#ffffff] to-[#e6ecf7] border-r border-blue-300/40',
    keyWhiteText: 'text-slate-900',
    keyWhiteActive: 'bg-gradient-to-b from-[#bacfe8] to-[#9cb8d9]',
    keyBlackBg: 'bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0b1120] border border-blue-950',
    keyBlackText: 'text-blue-300',
    keyBlackActive: 'bg-blue-600 text-white',
    accentColor: '#3b82f6',
  },
};

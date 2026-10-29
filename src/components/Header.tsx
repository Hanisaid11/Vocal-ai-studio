import React from 'react';
import { Mic, MicOff, Cloud, Sliders, Smartphone, Music, Shield, Globe } from 'lucide-react';
import { VocalRangeProfile, PitchDetectionResult, AppLanguage, NotationSystem } from '../types/vocal';
import { PWAInstallButton } from './PWAInstallButton';
import { translations } from '../utils/i18n';
import { formatNoteName } from '../utils/noteUtils';
import { haptics } from '../utils/haptics';

interface HeaderProps {
  profile: VocalRangeProfile;
  isListening: boolean;
  onToggleMic: () => void;
  onOpenSync: () => void;
  onOpenProfiler: () => void;
  onOpenSettings?: () => void;
  onToggleLanguage?: () => void;
  language?: AppLanguage;
  notation?: NotationSystem;
  currentPitch: PitchDetectionResult | null;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  isListening,
  onToggleMic,
  onOpenSync,
  onOpenProfiler,
  onOpenSettings,
  onToggleLanguage,
  language = 'en',
  notation = 'english',
  currentPitch,
}) => {
  const t = translations[language];

  return (
    <header className="sticky top-0 z-40 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-pink-500 p-[1.5px] shadow-lg shadow-indigo-950/50 shrink-0">
            <div className="w-full h-full bg-[#090d16] rounded-2xl flex items-center justify-center text-cyan-400">
              <Music className="w-4 h-4 text-cyan-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1">
                <span>{t.appName}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-600/40 text-indigo-300 font-extrabold border border-indigo-500/30">PRO</span>
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">{t.appTagline}</p>
          </div>
        </div>

        {/* Center: Range Badge (clickable to calibrate) */}
        <button
          onClick={() => {
            haptics.tap();
            onOpenProfiler();
          }}
          className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs transition"
          title={t.voiceProfilerDesc}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span className="font-bold text-slate-200">{profile.voiceType}</span>
          <span className="font-mono text-slate-400 text-[11px]">
            ({formatNoteName(profile.lowestNote, notation)} – {formatNoteName(profile.highestNote, notation)})
          </span>
        </button>

        {/* Right actions: Language toggle, Settings, Mic, PWA Install, Cloud Sync */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Language Toggle */}
          {onToggleLanguage && (
            <button
              onClick={() => {
                haptics.tap();
                onToggleLanguage();
              }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition text-xs font-semibold"
              title={language === 'en' ? 'التحويل إلى اللغة العربية' : 'Switch to English'}
              aria-label="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-bold font-mono">
                {language === 'en' ? 'عربي' : 'EN'}
              </span>
            </button>
          )}

          {/* Settings Modal Button */}
          {onOpenSettings && (
            <button
              onClick={() => {
                haptics.tap();
                onOpenSettings();
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition shadow-sm"
              title={t.settingsTitle}
              aria-label={t.settings}
            >
              <Sliders className="w-4 h-4 text-slate-300" />
            </button>
          )}

          {/* PWA Install Button */}
          <PWAInstallButton language={language} />

          {/* Cloud Sync Button */}
          <button
            onClick={() => {
              haptics.tap();
              onOpenSync();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition shadow-sm"
            title={t.cloudSync}
            aria-label={t.cloudSync}
          >
            <Cloud className="w-4 h-4 text-indigo-400" />
          </button>

          {/* Master Microphone Button */}
          <button
            onClick={() => {
              haptics.tap();
              onToggleMic();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-md active:scale-95 ${
              isListening
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 ring-2 ring-emerald-400/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            aria-label={isListening ? 'Mute Microphone' : 'Enable Microphone'}
          >
            {isListening ? (
              <>
                <Mic className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">{t.micActive}</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">{t.enableMic}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

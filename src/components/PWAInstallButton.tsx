import React, { useState } from 'react';
import { Download, Share2, X, Smartphone, CheckCircle2, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { AppLanguage } from '../types/vocal';
import { translations } from '../utils/i18n';
import { haptics } from '../utils/haptics';

interface PWAInstallButtonProps {
  language?: AppLanguage;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ language = 'en' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const t = translations[language];

  // If already running inside installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    haptics.tap();
    if (isInstallable) {
      try {
        await install();
      } catch {
        setShowAndroidGuide(true);
      }
    } else {
      setShowAndroidGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        aria-label={t.installApp}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/50 transition active:scale-95"
        title={t.androidAppPrompt}
      >
        <Smartphone className="w-3.5 h-3.5 animate-pulse" />
        <span className="hidden sm:inline">{t.installApp}</span>
      </button>

      {/* Android & Mobile Installation Guide Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in select-none">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {t.installGuideTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowAndroidGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <p>
                  {language === 'ar'
                    ? 'اضغط على زر القائمة في متصفح كروم (النقاط الثلاثة ⋮ في أعلى الزاوية).'
                    : 'Tap the Chrome menu (the three dots ⋮ in the top right corner).'}
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <p>
                  {language === 'ar'
                    ? 'اختر "تثبيت التطبيق" (Install App) أو "إضافة إلى الشاشة الرئيسية".'
                    : 'Select "Install app" or "Add to Home screen".'}
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <p>
                  {language === 'ar'
                    ? 'سيعمل التطبيق كبرنامج أندرويد حقيقي بملء الشاشة وبدون شريط عنوان المتصفح!'
                    : 'VocalMaster will launch as a true native-like Android app in full-screen immersion!'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg"
            >
              {language === 'ar' ? 'فهمت ذلك' : 'Got It'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

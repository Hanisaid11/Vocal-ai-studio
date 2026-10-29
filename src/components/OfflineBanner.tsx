import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../utils/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-600/90 text-amber-50 px-3 py-1.5 text-xs font-medium flex items-center justify-center gap-2 shadow-sm animate-in slide-in-from-top">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode active — audio engine and local progress run 100% uninterrupted offline.</span>
    </div>
  );
};

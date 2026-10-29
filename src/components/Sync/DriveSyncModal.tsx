import React, { useState } from 'react';
import { Cloud, Upload, Download, Check, AlertCircle, RefreshCw, Key, HelpCircle, HardDrive, FileJson, X, ExternalLink } from 'lucide-react';
import { createFullDataBackup, restoreDataFromBackup, FullAppDataBackup, loadAppSettings, saveAppSettings } from '../../utils/storage';
import { VocalRangeProfile, UserStats } from '../../types/vocal';
import { haptics } from '../../utils/haptics';

interface DriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
  currentProfile: VocalRangeProfile;
  stats: UserStats;
}

export const DriveSyncModal: React.FC<DriveSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  currentProfile,
  stats,
}) => {
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return loadAppSettings().lastDriveSyncDate || null;
  });

  if (!isOpen) return null;

  // 1. Export local JSON backup directly to device filesystem
  const handleExportJSON = async () => {
    haptics.tap();
    setIsExporting(true);
    try {
      const backup = await createFullDataBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vocalmaster-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSyncMessage({ text: 'Backup file exported successfully!', type: 'success' });
    } catch (err) {
      setSyncMessage({ text: 'Failed to create JSON backup', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Import JSON backup file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    haptics.tap();
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string) as FullAppDataBackup;
        await restoreDataFromBackup(json);
        setSyncMessage({ text: 'Data successfully restored from backup file!', type: 'success' });
        onDataRestored();
      } catch (err) {
        setSyncMessage({ text: 'Invalid backup file structure or corrupted data.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  // 3. Sync to Google Drive via Drive v3 REST API
  const handleSyncToGoogleDrive = async () => {
    if (!googleAccessToken.trim()) {
      setSyncMessage({
        text: 'Please paste your Google OAuth Access Token below or view the Setup Guide.',
        type: 'error',
      });
      return;
    }

    setIsSyncingDrive(true);
    setSyncMessage(null);

    try {
      const backup = await createFullDataBackup();
      const fileName = 'vocalmaster_backup.json';
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        description: 'VocalMaster Pro vocal range, exercises, and analytics cloud backup.',
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(backup, null, 2) +
        closeDelim;

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleAccessToken.trim()}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const syncDate = new Date().toLocaleString();
      setLastSyncTime(syncDate);

      const settings = loadAppSettings();
      settings.googleDriveConnected = true;
      settings.lastDriveSyncDate = syncDate;
      saveAppSettings(settings);

      setSyncMessage({
        text: 'Successfully backed up profile & session data to your Google Drive!',
        type: 'success',
      });
      haptics.pitchMatch();
    } catch (err: unknown) {
      console.error('Drive upload failed', err);
      setSyncMessage({
        text: `Google Drive sync error: ${(err as Error).message}`,
        type: 'error',
      });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // 4. Restore from Google Drive (fetches the latest backup file)
  const handleRestoreFromGoogleDrive = async () => {
    if (!googleAccessToken.trim()) {
      setSyncMessage({
        text: 'Please paste your Google OAuth Access Token to retrieve backups.',
        type: 'error',
      });
      return;
    }

    setIsSyncingDrive(true);
    setSyncMessage(null);

    try {
      // Search for vocalmaster_backup.json in user's Drive
      const query = encodeURIComponent("name = 'vocalmaster_backup.json' and trashed = false");
      const listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&fields=files(id, name, modifiedTime)`,
        {
          headers: {
            Authorization: `Bearer ${googleAccessToken.trim()}`,
          },
        }
      );

      if (!listRes.ok) {
        throw new Error(`Failed to list Drive files (${listRes.status})`);
      }

      const listData = await listRes.json();
      if (!listData.files || listData.files.length === 0) {
        setSyncMessage({
          text: 'No "vocalmaster_backup.json" found in your Google Drive.',
          type: 'info',
        });
        return;
      }

      const fileId = listData.files[0].id;
      // Download content
      const fileRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${googleAccessToken.trim()}`,
          },
        }
      );

      if (!fileRes.ok) {
        throw new Error(`Failed to download backup (${fileRes.status})`);
      }

      const backupData = (await fileRes.json()) as FullAppDataBackup;
      await restoreDataFromBackup(backupData);

      setSyncMessage({
        text: `Restored successfully from Google Drive backup (${new Date(listData.files[0].modifiedTime).toLocaleString()})!`,
        type: 'success',
      });
      onDataRestored();
      haptics.pitchMatch();
    } catch (err: unknown) {
      setSyncMessage({
        text: `Google Drive restore error: ${(err as Error).message}`,
        type: 'error',
      });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-5 md:p-6 shadow-2xl text-slate-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cloud Sync & Backup Hub</h2>
              <p className="text-xs text-slate-400">Offline persistence & Google Drive synchronization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Message */}
        {syncMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
              syncMessage.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                : syncMessage.type === 'error'
                ? 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
                : 'bg-indigo-950/80 border border-indigo-500/40 text-indigo-200'
            }`}
          >
            {syncMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{syncMessage.text}</span>
          </div>
        )}

        {/* Storage Health Pill */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Local Storage</span>
            </div>
            <div className="font-bold text-white">IndexedDB + Cache</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{stats.sessions.length} sessions stored</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Cloud className="w-3.5 h-3.5 text-indigo-400" />
              <span>Google Drive</span>
            </div>
            <div className="font-bold text-white">
              {lastSyncTime ? 'Backed Up' : 'Not Synced'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{lastSyncTime || 'Ready to sync'}</div>
          </div>
        </div>

        {/* Section 1: Google Drive Sync */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-white">Google Drive Cloud Sync</span>
            </div>
            <button
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Setup Guide</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Securely back up your vocal range profile, exercise logs, and streaks directly to your personal Google Drive account.
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 flex items-center gap-1">
              <Key className="w-3 h-3 text-cyan-400" />
              <span>OAuth Bearer Access Token:</span>
            </label>
            <input
              type="password"
              placeholder="ya29.a0AfH6SM..."
              value={googleAccessToken}
              onChange={(e) => setGoogleAccessToken(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSyncToGoogleDrive}
              disabled={isSyncingDrive}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSyncingDrive ? 'Syncing...' : 'Backup to Drive'}</span>
            </button>

            <button
              onClick={handleRestoreFromGoogleDrive}
              disabled={isSyncingDrive}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Restore from Drive</span>
            </button>
          </div>
        </div>

        {/* Setup Guide Collapsible */}
        {showSetupGuide && (
          <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-900/60 text-xs text-slate-300 space-y-2.5 animate-in fade-in">
            <div className="font-bold text-white flex items-center gap-2">
              <span>Google Drive API Client Configuration Instructions</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
              <li>Open <strong>Google Cloud Console</strong> (<a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">console.cloud.google.com</a>).</li>
              <li>Create or select your project, navigate to <strong>APIs & Services &gt; Library</strong>, and enable <strong>Google Drive API</strong>.</li>
              <li>Under <strong>OAuth consent screen</strong>, select External and add the scope: <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">https://www.googleapis.com/auth/drive.file</code> (least privilege).</li>
              <li>Go to <strong>Credentials &gt; Create Credentials &gt; OAuth Client ID</strong>, select <strong>Web application</strong>, and add your app domain to <em>Authorized JavaScript origins</em>.</li>
              <li>Generate an access token via Google Identity Services button or OAuth playground and paste it above for instant cloud sync!</li>
            </ol>
          </div>
        )}

        {/* Section 2: Direct Offline File Backup (JSON) */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-white">Direct File Export & Import (100% Offline)</span>
            <FileJson className="w-4 h-4 text-cyan-400" />
          </div>

          <p className="text-xs text-slate-400">
            Export a full JSON backup file to your device, or restore existing data anytime without internet connection.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              disabled={isExporting}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON File</span>
            </button>

            <label className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Import JSON File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
        >
          Close Backup Hub
        </button>
      </div>
    </div>
  );
};

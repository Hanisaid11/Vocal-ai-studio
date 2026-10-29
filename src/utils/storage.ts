import { VocalRangeProfile, PracticeSessionRecord, UserStats, LevelProgressRecord, ExerciseExecutionMode } from '../types/vocal';
import { getDefaultVocalProfile } from './noteUtils';

const DB_NAME = 'VocalMasterProDB';
const DB_VERSION = 1;
const STORE_PROFILES = 'profiles';
const STORE_SESSIONS = 'sessions';
const STORE_SETTINGS = 'settings';

const LOCAL_STORAGE_PROFILE_KEY = 'vocalmaster_current_profile';
const LOCAL_STORAGE_STATS_KEY = 'vocalmaster_user_stats';
const LOCAL_STORAGE_SETTINGS_KEY = 'vocalmaster_app_settings';

export interface AppSettings {
  a4Frequency: number;
  showPianoLabels: boolean;
  hapticFeedbackEnabled: boolean;
  keepScreenAwake: boolean;
  synthVolume: number;
  tuningToleranceCents: number; // e.g. 10 or 15 cents
  voiceGuidanceVowels: boolean;
  googleDriveConnected: boolean;
  googleDriveUserEmail?: string;
  lastDriveSyncDate?: string;
  language: import('../types/vocal').AppLanguage;
  notation: import('../types/vocal').NotationSystem;
  instrument: import('../types/vocal').InstrumentType;
  vocalVowel: import('../types/vocal').VocalSampleVowel;
  noteDurationBeats: import('../types/vocal').NoteDurationBeat;
  theme: import('../types/vocal').AppTheme;
  autoVerticalOnFullscreen: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  a4Frequency: 440,
  showPianoLabels: true,
  hapticFeedbackEnabled: true,
  keepScreenAwake: true,
  synthVolume: 0.8,
  tuningToleranceCents: 12,
  voiceGuidanceVowels: true,
  googleDriveConnected: false,
  language: 'en',
  notation: 'english',
  instrument: 'piano',
  vocalVowel: 'aah',
  noteDurationBeats: 2,
  theme: 'classic-piano',
  autoVerticalOnFullscreen: true,
};

/**
 * Open or upgrade IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const sessionStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save user's vocal range profile
 */
export async function saveVocalProfile(profile: VocalRangeProfile): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
    const db = await openDB();
    const tx = db.transaction(STORE_PROFILES, 'readwrite');
    tx.objectStore(STORE_PROFILES).put(profile);
  } catch (err) {
    console.warn('Fallback saving vocal profile to localStorage only:', err);
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
  }
}

/**
 * Load active vocal range profile
 */
export async function loadVocalProfile(): Promise<VocalRangeProfile> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }

    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PROFILES, 'readonly');
      const store = tx.objectStore(STORE_PROFILES);
      const req = store.getAll();
      req.onsuccess = () => {
        if (req.result && req.result.length > 0) {
          const profile = req.result[req.result.length - 1];
          localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
          resolve(profile);
        } else {
          resolve(getDefaultVocalProfile());
        }
      };
      req.onerror = () => resolve(getDefaultVocalProfile());
    });
  } catch {
    return getDefaultVocalProfile();
  }
}

/**
 * Save a practice session record and update streaks/analytics
 */
export async function savePracticeSession(session: PracticeSessionRecord): Promise<UserStats> {
  // Save to IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SESSIONS, 'readwrite');
    tx.objectStore(STORE_SESSIONS).put(session);
  } catch (e) {
    console.warn('Failed saving session to IndexedDB, keeping in stats:', e);
  }

  // Update aggregated UserStats
  const stats = loadUserStats();
  stats.sessions.unshift(session);
  if (stats.sessions.length > 100) {
    stats.sessions = stats.sessions.slice(0, 100);
  }

  stats.totalPracticeTimeMinutes += Math.round(session.durationSeconds / 60);
  stats.totalSessionsCompleted += 1;

  // Recalculate streak
  const today = new Date().toISOString().split('T')[0];
  const lastDate = stats.lastPracticeDate ? stats.lastPracticeDate.split('T')[0] : null;

  if (!lastDate) {
    stats.streakDays = 1;
  } else if (lastDate === today) {
    // Already practiced today, keep streak
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (lastDate === yesterday) {
      stats.streakDays += 1;
    } else {
      stats.streakDays = 1; // Streak broken, restart
    }
  }

  stats.lastPracticeDate = new Date().toISOString();

  // Average accuracy
  const totalAcc = stats.sessions.reduce((acc, s) => acc + s.accuracyPercentage, 0);
  stats.overallAccuracyPct = Math.round(totalAcc / stats.sessions.length);

  localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(stats));
  return stats;
}

/**
 * Load overall user analytics and session history
 */
export function loadUserStats(): UserStats {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        totalPracticeTimeMinutes: parsed.totalPracticeTimeMinutes ?? 24,
        streakDays: parsed.streakDays ?? 3,
        lastPracticeDate: parsed.lastPracticeDate ?? new Date().toISOString(),
        totalSessionsCompleted: parsed.totalSessionsCompleted ?? 4,
        overallAccuracyPct: parsed.overallAccuracyPct ?? 82,
        highScorePitchHero: parsed.highScorePitchHero ?? 1250,
        highScoreMatchNote: parsed.highScoreMatchNote ?? 940,
        highScoreInterval: parsed.highScoreInterval ?? 820,
        highScorePitchRecognition: parsed.highScorePitchRecognition ?? 0,
        highScoreEarProgression: parsed.highScoreEarProgression ?? 0,
        earProgressionTierUnlocked: parsed.earProgressionTierUnlocked ?? 1,
        earProgressionStars: parsed.earProgressionStars ?? { 1: 1 },
        earProgressionXP: parsed.earProgressionXP ?? 120,
        sessions: parsed.sessions ?? [],
        gameRecords: parsed.gameRecords ?? [],
      };
    }
  } catch (e) {
    console.error('Error loading user stats from storage', e);
  }

  // Initial stats with starter history
  return {
    totalPracticeTimeMinutes: 24,
    streakDays: 3,
    lastPracticeDate: new Date().toISOString(),
    totalSessionsCompleted: 4,
    overallAccuracyPct: 82,
    highScorePitchHero: 1250,
    highScoreMatchNote: 940,
    highScoreInterval: 820,
    highScorePitchRecognition: 0,
    highScoreEarProgression: 0,
    earProgressionTierUnlocked: 1,
    earProgressionStars: { 1: 1 },
    earProgressionXP: 120,
    gameRecords: [
      {
        id: 'game-starter-1',
        gameType: 'pitch_hero',
        score: 1250,
        highestStreak: 7,
        accuracyPercentage: 88,
        totalNotes: 15,
        notesHit: 13,
        date: 'Yesterday',
        timestamp: Date.now() - 86400000,
      },
    ],
    sessions: [
      {
        id: 'starter-1',
        timestamp: Date.now() - 86400000 * 2,
        exerciseTitle: 'Lip Trill Glide',
        durationSeconds: 320,
        notesAttempted: 18,
        notesHitInTune: 15,
        accuracyPercentage: 83,
        averageCentsError: 8,
        dateString: '2 days ago',
      },
      {
        id: 'starter-2',
        timestamp: Date.now() - 86400000,
        exerciseTitle: '5-Tone Major Scales',
        durationSeconds: 450,
        notesAttempted: 24,
        notesHitInTune: 20,
        accuracyPercentage: 83,
        averageCentsError: 7,
        dateString: 'Yesterday',
      },
      {
        id: 'starter-3',
        timestamp: Date.now() - 3600000 * 4,
        exerciseTitle: 'Target Pitch Mastery',
        durationSeconds: 380,
        notesAttempted: 16,
        notesHitInTune: 14,
        accuracyPercentage: 87,
        averageCentsError: 6,
        dateString: 'Today',
      },
    ],
  };
}

/**
 * Save pitch game record & update high score
 */
export function savePitchGameRecord(record: import('../types/vocal').PitchGameRecord): UserStats {
  const stats = loadUserStats();
  if (!stats.gameRecords) stats.gameRecords = [];
  stats.gameRecords.unshift(record);
  if (stats.gameRecords.length > 50) {
    stats.gameRecords = stats.gameRecords.slice(0, 50);
  }

  if (record.gameType === 'pitch_hero') {
    stats.highScorePitchHero = Math.max(stats.highScorePitchHero || 0, record.score);
  } else if (record.gameType === 'match_note') {
    stats.highScoreMatchNote = Math.max(stats.highScoreMatchNote || 0, record.score);
  } else if (record.gameType === 'interval_challenge') {
    stats.highScoreInterval = Math.max(stats.highScoreInterval || 0, record.score);
  } else if (record.gameType === 'pitch_recognition') {
    stats.highScorePitchRecognition = Math.max(stats.highScorePitchRecognition || 0, record.score);
  } else if (record.gameType === 'ear_progression') {
    stats.highScoreEarProgression = Math.max(stats.highScoreEarProgression || 0, record.score);
    // XP gained based on score
    stats.earProgressionXP = (stats.earProgressionXP || 0) + record.score;
  }

  // Add practice minutes
  stats.totalPracticeTimeMinutes += 2;
  stats.totalSessionsCompleted += 1;
  stats.lastPracticeDate = new Date().toISOString();

  localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(stats));
  return stats;
}

/**
 * Update ear training progression unlocked tier & stars
 */
export function saveEarProgressionProgress(tier: number, stars: Record<number, number>): UserStats {
  const stats = loadUserStats();
  stats.earProgressionTierUnlocked = Math.max(stats.earProgressionTierUnlocked || 1, tier);
  stats.earProgressionStars = { ...(stats.earProgressionStars || {}), ...stars };
  localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(stats));
  return stats;
}

/**
 * App Settings persistence
 */
export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed reading settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveAppSettings(settings: AppSettings) {
  localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
}

export const loadSettings = loadAppSettings;
export const saveSettings = saveAppSettings;

/**
 * Complete Data Backup Structure (for JSON Export and Google Drive Sync)
 */
export interface FullAppDataBackup {
  version: number;
  appName: string;
  exportDate: string;
  profile: VocalRangeProfile;
  stats: UserStats;
  settings: AppSettings;
  levelsProgress?: Record<number, LevelProgressRecord>;
}

/**
 * Generate full JSON backup
 */
export async function createFullDataBackup(): Promise<FullAppDataBackup> {
  const profile = await loadVocalProfile();
  const stats = loadUserStats();
  const settings = loadAppSettings();
  const levelsProgress = loadLevelsProgress();

  return {
    version: 1,
    appName: 'VocalMaster Pro',
    exportDate: new Date().toISOString(),
    profile,
    stats,
    settings,
    levelsProgress,
  };
}

/**
 * Restore data from parsed JSON backup
 */
export async function restoreDataFromBackup(backup: FullAppDataBackup): Promise<boolean> {
  if (!backup || !backup.profile || !backup.stats) {
    throw new Error('Invalid VocalMaster backup format');
  }

  await saveVocalProfile(backup.profile);
  localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(backup.stats));
  if (backup.settings) {
    saveAppSettings(backup.settings);
  }
  if (backup.levelsProgress) {
    saveAllLevelsProgress(backup.levelsProgress);
  }

  return true;
}

/**
 * Song Karaoke & Vocal Match Tracking
 */
export interface SongErrorPoint {
  timeSec: number;
  expectedNote: string;
  expectedMidi: number;
  sungNote?: string;
  sungMidi?: number;
  centsDeviation: number;
  type: 'flat' | 'sharp' | 'missed' | 'delayed';
  descriptionEn: string;
  descriptionAr: string;
}

export interface SongProgressRecord {
  id: string;
  songId: string;
  songTitle: string;
  artist?: string;
  date: string;
  accuracyPercent: number; // 0 - 100
  notesSung: number;
  totalNotes: number;
  pitchScore: number;
  timingScore: number;
  stars: number; // 1 - 5
  errors: SongErrorPoint[];
}

export interface SongProgressSummary {
  songId: string;
  songTitle: string;
  artist?: string;
  bestAccuracy: number;
  attemptsCount: number;
  lastAttemptDate: string;
  history: SongProgressRecord[];
}

const LOCAL_STORAGE_SONG_PROGRESS_KEY = 'vocalmaster_song_progress_v1';

export function loadAllSongProgress(): Record<string, SongProgressSummary> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SONG_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Failed to load song progress records:', err);
    return {};
  }
}

export function loadSongProgress(songId: string): SongProgressSummary | null {
  const all = loadAllSongProgress();
  return all[songId] || null;
}

export function saveSongProgressRecord(record: SongProgressRecord): SongProgressSummary {
  const all = loadAllSongProgress();
  const existing = all[record.songId] || {
    songId: record.songId,
    songTitle: record.songTitle,
    artist: record.artist,
    bestAccuracy: 0,
    attemptsCount: 0,
    lastAttemptDate: record.date,
    history: [],
  };

  existing.history.unshift(record);
  // Keep up to 20 attempts per song
  if (existing.history.length > 20) {
    existing.history = existing.history.slice(0, 20);
  }
  existing.attemptsCount += 1;
  existing.lastAttemptDate = record.date;
  existing.bestAccuracy = Math.max(existing.bestAccuracy, record.accuracyPercent);

  all[record.songId] = existing;
  try {
    localStorage.setItem(LOCAL_STORAGE_SONG_PROGRESS_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save song progress:', err);
  }
  return existing;
}

/**
 * Progressive Training Curriculum Levels Storage
 */
const LOCAL_STORAGE_LEVELS_PROGRESS_KEY = 'vocalmaster_levels_progress_v1';

export function getDefaultLevelsProgress(): Record<number, LevelProgressRecord> {
  const initial: Record<number, LevelProgressRecord> = {};
  for (let id = 1; id <= 20; id++) {
    initial[id] = {
      levelId: id,
      unlocked: id === 1, // Level 1 is always unlocked by default
      completed: false,
      bestAccuracy: 0,
      stars: 0,
      attemptsCount: 0,
    };
  }
  return initial;
}

export function loadLevelsProgress(): Record<number, LevelProgressRecord> {
  const defaults = getDefaultLevelsProgress();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LEVELS_PROGRESS_KEY);
    if (!raw) return defaults;
    const parsed: Record<number, LevelProgressRecord> = JSON.parse(raw);
    // Merge with defaults to ensure any new levels exist and Level 1 is at least unlocked
    const merged = { ...defaults, ...parsed };
    if (!merged[1]) {
      merged[1] = defaults[1];
    } else {
      merged[1].unlocked = true;
    }
    return merged;
  } catch (err) {
    console.error('Failed to load levels progress:', err);
    return defaults;
  }
}

export function saveAllLevelsProgress(progress: Record<number, LevelProgressRecord>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_LEVELS_PROGRESS_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save all levels progress:', err);
  }
}

export function saveLevelProgress(
  levelId: number,
  accuracy: number,
  stars: number,
  mode: ExerciseExecutionMode
): Record<number, LevelProgressRecord> {
  const all = loadLevelsProgress();
  const current = all[levelId] || {
    levelId,
    unlocked: true,
    completed: false,
    bestAccuracy: 0,
    stars: 0,
    attemptsCount: 0,
  };

  const isCompleted = accuracy >= 80;
  const newBestAcc = Math.max(current.bestAccuracy, Math.round(accuracy));
  const newStars = Math.max(current.stars, stars);

  all[levelId] = {
    ...current,
    unlocked: true,
    completed: current.completed || isCompleted,
    bestAccuracy: newBestAcc,
    stars: newStars,
    bestMode: mode,
    lastPlayedDate: new Date().toISOString(),
    attemptsCount: current.attemptsCount + 1,
  };

  // If passed with >= 80%, unlock the next level
  if (isCompleted && levelId < 20) {
    const nextLevelId = levelId + 1;
    if (!all[nextLevelId]) {
      all[nextLevelId] = {
        levelId: nextLevelId,
        unlocked: true,
        completed: false,
        bestAccuracy: 0,
        stars: 0,
        attemptsCount: 0,
      };
    } else {
      all[nextLevelId].unlocked = true;
    }
  }

  saveAllLevelsProgress(all);
  return all;
}

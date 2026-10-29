/**
 * VocalMaster Pro - Type Definitions
 */

export type VoiceClassification = 
  | 'Bass'
  | 'Baritone'
  | 'Tenor'
  | 'Countertenor'
  | 'Contralto'
  | 'Mezzo-Soprano'
  | 'Soprano'
  | 'Custom';

export type NotationSystem = 'english' | 'solfege' | 'arabic';
export type InstrumentType = 'piano' | 'guitar' | 'oud' | 'vocal' | 'strings';
export type VocalSampleVowel = 'aah' | 'ooh' | 'mmm';
export type NoteDurationBeat = 1 | 2 | 4;
export type AppLanguage = 'en' | 'ar';
export type AppTheme = 'classic-piano' | 'dark-studio' | 'oriental-oud' | 'midnight-stage';

export interface NoteInfo {
  name: string;        // e.g. "C", "F#"
  octave: number;      // e.g. 4
  fullName: string;    // e.g. "C4"
  midi: number;        // e.g. 60
  frequency: number;   // e.g. 261.63
  solfege: string;     // e.g. "Do4"
  arabic: string;      // e.g. "دو4"
}

export interface PitchDetectionResult {
  frequency: number | null;
  note: NoteInfo | null;
  cents: number;        // -50 to +50 cents deviation
  clarity: number;      // 0 to 1 confidence
  rms: number;          // volume / root-mean-square energy
  spectralCentroid: number; // timbre brightness in Hz
  isInTune: boolean;    // within acceptable cents threshold (e.g. +/- 10 cents)
  stability: number;    // pitch variance / stability score 0-1
}

export interface VocalRangeProfile {
  id: string;
  voiceType: VoiceClassification;
  lowestNote: NoteInfo;
  highestNote: NoteInfo;
  middleRegisterNote: NoteInfo;
  totalSemitones: number;
  octavesSpan: number;
  measuredDate: string;
  notes: string; // optional notes
}

export interface ExerciseStep {
  note: NoteInfo;
  durationMs: number;
  vowel?: string; // e.g. "Ah", "Oo", "Trill", "Zzz"
}

export interface WarmupExercise {
  id: string;
  title: string;
  category: 'lip_trill' | 'scale' | 'arpeggio' | 'siren' | 'intervals' | 'staccato';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  instructions: string[];
  vowelSuggestion: string;
  defaultBpm: number;
  basePatternSemitones: number[]; // e.g. [0, 2, 4, 5, 7, 5, 4, 2, 0] for 5-tone scale
  repetitionsCount: number;
}

export interface PracticeSessionRecord {
  id: string;
  timestamp: number;
  exerciseId?: string;
  exerciseTitle: string;
  durationSeconds: number;
  notesAttempted: number;
  notesHitInTune: number;
  accuracyPercentage: number;
  averageCentsError: number;
  dateString: string;
}

export interface PitchGameRecord {
  id: string;
  gameType: 'pitch_hero' | 'match_note' | 'interval_challenge' | 'ear_trainer' | 'siren_glide' | 'vocal_agility' | 'pitch_recognition' | 'ear_progression';
  score: number;
  highestStreak: number;
  accuracyPercentage: number;
  totalNotes: number;
  notesHit: number;
  date: string;
  timestamp: number;
}

export interface UserStats {
  totalPracticeTimeMinutes: number;
  streakDays: number;
  lastPracticeDate: string;
  totalSessionsCompleted: number;
  overallAccuracyPct: number;
  highScorePitchHero: number;
  highScoreMatchNote: number;
  highScoreInterval: number;
  highScorePitchRecognition?: number;
  highScoreEarProgression?: number;
  earProgressionTierUnlocked?: number;
  earProgressionStars?: Record<number, number>;
  earProgressionXP?: number;
  sessions: PracticeSessionRecord[];
  gameRecords: PitchGameRecord[];
}

export interface DriveSyncStatus {
  isSignedIn: boolean;
  userEmail: string | null;
  lastSyncedTimestamp: number | null;
  isSyncing: boolean;
  driveFileId?: string | null;
  error?: string | null;
}

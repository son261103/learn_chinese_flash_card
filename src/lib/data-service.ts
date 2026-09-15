import { Lesson, LevelInfo, UserProgress } from "./types";
import hsk1Data from "@/data/hsk1.json";
import hsk2Data from "@/data/hsk2.json";
import hsk3Data from "@/data/hsk3.json";
import levelsMeta from "@/data/levels.json";

export const LOCAL_LEVELS: LevelInfo[] = levelsMeta as LevelInfo[];

export const LOCAL_DATA: Record<string, Lesson[]> = {
  hsk1: hsk1Data as unknown as Lesson[],
  hsk2: hsk2Data as unknown as Lesson[],
  hsk3: hsk3Data as unknown as Lesson[],
};

export const STORAGE_KEYS = {
  APP_STATE: "hsk_app_state_v4",
  PROGRESS: "hsk_study_progress_v4",
  STATS: "hsk_practice_stats_v4",
};

export interface UserAppState {
  currentLevelId: string;
  currentLessonIdx: number;
  activeMode: "typing" | "flashcards" | "lessons" | "garden";
}

export interface PracticeStatsRecord {
  completedCount: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
}

export function getDefaultAppState(): UserAppState {
  return {
    currentLevelId: "hsk1",
    currentLessonIdx: 0,
    activeMode: "typing",
  };
}

export function loadAppState(): UserAppState {
  if (typeof window === "undefined") return getDefaultAppState();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        currentLevelId: parsed.currentLevelId || "hsk1",
        currentLessonIdx: Number.isInteger(parsed.currentLessonIdx) ? parsed.currentLessonIdx : 0,
        activeMode: parsed.activeMode || "typing",
      };
    }
  } catch {}
  return getDefaultAppState();
}

export function saveAppState(partialState: Partial<UserAppState>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadAppState();
    const updated = { ...current, ...partialState };
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(updated));
  } catch {}
}

export function getDefaultPracticeStats(): PracticeStatsRecord {
  return {
    completedCount: 0,
    correctCount: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

export function loadPracticeStats(): PracticeStatsRecord {
  if (typeof window === "undefined") return getDefaultPracticeStats();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (raw) {
      return { ...getDefaultPracticeStats(), ...JSON.parse(raw) };
    }
  } catch {}
  return getDefaultPracticeStats();
}

export function savePracticeStats(stats: PracticeStatsRecord): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch {}
}

export function getInitialProgress(): UserProgress {
  return {
    learnedWords: {},
    masteredCards: {},
    typingHistory: {},
    favoriteWords: {},
  };
}

export function loadUserProgress(): UserProgress {
  if (typeof window === "undefined") return getInitialProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (raw) {
      return { ...getInitialProgress(), ...JSON.parse(raw) };
    }
  } catch {}
  return getInitialProgress();
}

export function saveUserProgress(progress: UserProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch {}
}

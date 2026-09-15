import { Lesson, LevelInfo, UserProgress, CardMemoryRecord } from "./types";
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
  PROGRESS: "hsk_study_progress_v5",
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
    needsReviewCards: {},
    cardMemory: {},
    typingHistory: {},
    favoriteWords: {},
  };
}

export function loadUserProgress(): UserProgress {
  if (typeof window === "undefined") return getInitialProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...getInitialProgress(),
        ...parsed,
        needsReviewCards: parsed.needsReviewCards || {},
        cardMemory: parsed.cardMemory || {},
      };
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

// SM-2 / Leitner Spaced Repetition Scheduler
export const DAY_MS = 24 * 60 * 60 * 1000;

export function scheduleNextReview(
  existing: CardMemoryRecord | undefined,
  remembered: boolean,
  now: number = Date.now()
): CardMemoryRecord {
  const prev = existing || {
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    lastReviewed: null,
    nextReview: null,
  };

  if (remembered) {
    const newRepetitions = prev.repetitions + 1;
    let newInterval: number;

    if (newRepetitions === 1) {
      newInterval = 1; // First success review tomorrow
    } else if (newRepetitions === 2) {
      newInterval = 3; // 3 days later
    } else if (newRepetitions === 3) {
      newInterval = 7; // 1 week later
    } else if (newRepetitions === 4) {
      newInterval = 14; // 2 weeks later
    } else {
      newInterval = Math.round(prev.intervalDays * prev.easeFactor);
      newInterval = Math.min(newInterval, 90); // Max 90 days
    }

    return {
      repetitions: newRepetitions,
      intervalDays: newInterval,
      easeFactor: Math.max(1.3, prev.easeFactor + 0.05),
      lastReviewed: now,
      nextReview: now + newInterval * DAY_MS,
    };
  }

  // Forgot: reset repetitions, schedule retry in 10 minutes and due today
  return {
    repetitions: 0,
    intervalDays: 0,
    easeFactor: Math.max(1.3, prev.easeFactor - 0.15),
    lastReviewed: now,
    nextReview: now + 10 * 60 * 1000,
  };
}

export function isCardDue(record: CardMemoryRecord | undefined, now: number = Date.now()): boolean {
  if (!record || !record.nextReview) return false;
  return record.nextReview <= now;
}

export function formatNextReview(record: CardMemoryRecord | undefined): string {
  if (!record || !record.nextReview) return "Chưa lên lịch";
  const now = Date.now();
  const diff = record.nextReview - now;

  if (diff <= 0) {
    return "Đã đến hạn ôn lại!";
  }

  const days = Math.ceil(diff / DAY_MS);
  if (days === 1) return "Nhắc lại sau 1 ngày";
  if (days < 30) return `Nhắc lại sau ${days} ngày`;

  const months = Math.round(days / 30);
  return `Nhắc lại sau ${months} tháng`;
}

export function getDueCardsCount(progress: UserProgress, now: number = Date.now()): number {
  let count = 0;
  for (const key of Object.keys(progress.cardMemory)) {
    const rec = progress.cardMemory[key];
    if (rec && rec.nextReview && rec.nextReview <= now) {
      count++;
    }
  }
  return count;
}

export function getDueCardKeys(progress: UserProgress, now: number = Date.now()): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(progress.cardMemory)) {
    const rec = progress.cardMemory[key];
    if (rec && rec.nextReview && rec.nextReview <= now) {
      keys.push(key);
    }
  }
  return keys;
}

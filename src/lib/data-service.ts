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
  PROGRESS: "hsk_study_progress_v2",
};

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

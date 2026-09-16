export type WordTuple = [string, string, string, string, string];

export interface Word {
  zh: string;
  py: string;
  hv: string;
  vi: string;
  pos: string;
  lessonNo?: number;
}

export interface DialogueLine {
  who: string;
  zh: string;
  py: string;
  vi: string;
}

export interface LessonText {
  label: string;
  situation?: string;
  dialogue: DialogueLine[];
}

export interface GrammarPoint {
  title_zh: string;
  title_vi: string;
  explain_zh: string;
  explain_vi: string;
  examples?: { zh: string; py: string; vi: string }[];
}

export interface ReadingPassage {
  zh: string[];
  vi: string[];
}

export type TypingSubMode = "words" | "passages";

export interface PassageSentence {
  who?: string;
  zh: string;
  py: string;
  vi: string;
}

export interface PassageItem {
  id: string;
  title: string;
  situation?: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  sentences: PassageSentence[];
  source?: "reading" | "text";
}

export interface Lesson {
  t: string;
  vi_t: string;
  real?: boolean;
  objectives?: string[];
  texts?: LessonText[];
  grammarPoints?: GrammarPoint[];
  readingPassages?: ReadingPassage[];
  w: WordTuple[];
}

export interface LevelInfo {
  id: string;
  name: string;
  description: string;
  lessonsCount: number;
  totalWords: number;
}

export interface TypingRecord {
  lessonId: string;
  levelId: string;
  lessonIdx: number;
  accuracy: number;
  correctWords: number;
  totalWords: number;
  timeSpentSec: number;
  timestamp: number;
}

// Spaced Repetition Memory Tracking (SM-2 / Leitner based)
export interface CardMemoryRecord {
  repetitions: number; // Consecutive successful recalls
  intervalDays: number; // Current review interval in days
  easeFactor: number; // Ease factor, starts at 2.5 (SM-2)
  lastReviewed: number | null; // Timestamp of last review
  nextReview: number | null; // Timestamp for due date
}

export interface UserProgress {
  learnedWords: Record<string, boolean>;
  masteredCards: Record<string, boolean>;
  needsReviewCards: Record<string, boolean>;
  cardMemory: Record<string, CardMemoryRecord>;
  typingHistory: Record<string, TypingRecord>;
  favoriteWords: Record<string, boolean>;
}

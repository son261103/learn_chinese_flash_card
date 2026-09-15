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

export interface UserProgress {
  learnedWords: Record<string, boolean>;
  masteredCards: Record<string, boolean>;
  typingHistory: Record<string, TypingRecord>;
  favoriteWords: Record<string, boolean>;
}

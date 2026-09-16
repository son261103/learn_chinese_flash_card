import { Lesson, PassageItem, PassageSentence } from "./types";
import { pinyin } from "pinyin-pro";
import hsk1Data from "@/data/hsk1.json";
import hsk2Data from "@/data/hsk2.json";
import hsk3Data from "@/data/hsk3.json";

interface DictEntry {
  py: string;
  hv: string;
  vi: string;
  pos: string;
}

// Global vocabulary dictionary across all levels (HSK 1-3)
let globalDict: Record<string, DictEntry> | null = null;

export function getGlobalDict(): Record<string, DictEntry> {
  if (globalDict) return globalDict;

  const dict: Record<string, DictEntry> = {};
  const allLevels = [
    hsk1Data as unknown as Lesson[],
    hsk2Data as unknown as Lesson[],
    hsk3Data as unknown as Lesson[],
  ];

  for (const level of allLevels) {
    for (const lesson of level) {
      if (lesson.w) {
        for (const [zh, py, hv, vi, pos] of lesson.w) {
          if (!dict[zh]) {
            dict[zh] = { py, hv, vi, pos };
          }
        }
      }
    }
  }

  globalDict = dict;
  return globalDict;
}

export function findWordInDict(word: string): DictEntry | null {
  if (!word) return null;
  const dict = getGlobalDict();
  return dict[word] || null;
}

/**
 * Extract all practice passages for a given lesson from existing curriculum:
 * 1. Native Reading Passages (bài đọc hiểu)
 * 2. Native Lesson Texts (bài khoá hội thoại)
 * All passages are curated by textbook authors specifically using that lesson's vocabulary.
 */
export function getLessonPassages(
  lesson: Lesson,
  lessonIdx: number,
  levelId: string = "hsk1"
): PassageItem[] {
  if (!lesson) return [];

  const passages: PassageItem[] = [];

  // 1. Native reading passages
  if (lesson.readingPassages && lesson.readingPassages.length > 0) {
    lesson.readingPassages.forEach((rp, idx) => {
      const zhLines = (rp.zh || []).filter((line) => line.trim().length > 0);
      if (zhLines.length === 0) return;

      const sentences: PassageSentence[] = zhLines.map((zhLine, sIdx) => ({
        zh: zhLine,
        py: pinyin(zhLine, { toneType: "symbol" }),
        vi: rp.vi?.[sIdx] || "",
      }));

      const hanzi = sentences.map((s) => s.zh).join("");
      const py = sentences.map((s) => s.py).join(" ");
      const meaning = sentences.map((s) => s.vi).filter(Boolean).join(" ");

      passages.push({
        id: `reading-${levelId}-${lessonIdx + 1}-${idx + 1}`,
        title: `Đoạn văn đọc hiểu #${idx + 1}`,
        hanzi,
        pinyin: py,
        meaning,
        sentences,
        source: "reading",
      });
    });
  }

  // 2. Native texts dialogues
  if (lesson.texts && lesson.texts.length > 0) {
    lesson.texts.forEach((text, idx) => {
      if (!text.dialogue || text.dialogue.length === 0) return;

      const validLines = text.dialogue.filter((d) => d.zh && d.zh.trim().length > 0);
      if (validLines.length === 0) return;

      const sentences: PassageSentence[] = validLines.map((d) => ({
        zh: d.zh,
        py: d.py || pinyin(d.zh, { toneType: "symbol" }),
        vi: d.who ? `${d.who}: ${d.vi}` : d.vi,
      }));

      const hanzi = sentences.map((s) => s.zh).join("");
      const py = sentences.map((s) => s.py).join(" ");
      const meaning = sentences.map((s) => s.vi).filter(Boolean).join(" ");

      passages.push({
        id: `text-${levelId}-${lessonIdx + 1}-${idx + 1}`,
        title: text.label || `Bài khoá #${idx + 1}`,
        hanzi,
        pinyin: py,
        meaning,
        sentences,
        source: "text",
      });
    });
  }

  return passages;
}

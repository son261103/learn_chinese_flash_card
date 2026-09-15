import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Word, WordTuple } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function tupleToWord(w: WordTuple, lessonNo?: number): Word {
  return {
    zh: w[0] || "",
    py: w[1] || "",
    hv: w[2] || "",
    vi: w[3] || "",
    pos: w[4] || "",
    lessonNo,
  };
}

export const ZH_SYNONYMS: string[][] = [
  ["你好", "您好"],
  ["再见", "拜拜"],
  ["谢谢", "多谢"],
  ["不客气", "不用谢"],
  ["因为", "由于"],
  ["所以", "因此"],
  ["但是", "不过"],
  ["妈妈", "母亲"],
  ["爸爸", "父亲"],
  ["老师", "教师"],
  ["现在", "目前"],
  ["为什么", "为何"],
  ["怎么样", "怎样"],
  ["一起", "一块儿"],
  ["电脑", "计算机"],
  ["什么时候", "何时"],
];

export function isAcceptableTypedAnswer(typed: string, target: string): boolean {
  const cleanTyped = String(typed || "").replace(/[，。！？、\s,.!?]/g, "").trim();
  const cleanTarget = String(target || "").replace(/[，。！？、\s,.!?]/g, "").trim();
  if (!cleanTyped || !cleanTarget) return false;
  if (cleanTyped === cleanTarget) return true;
  const group = ZH_SYNONYMS.find((g) => g.includes(cleanTarget));
  return !!group && group.includes(cleanTyped);
}

// Text-to-speech helper with Chinese voice priority using Promise.withResolvers()
export function playChineseAudio(text: string, rate: number = 0.85): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    resolve();
    return promise;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = rate;

    const voices = window.speechSynthesis.getVoices();
    const zhVoices = voices.filter(
      (v) => v.lang && v.lang.toLowerCase().startsWith("zh")
    );
    if (zhVoices.length > 0) {
      const femaleHints = [
        "female",
        "女",
        "ting",
        "mei",
        "yao",
        "xiaoxiao",
        "xiaoyi",
        "huihui",
        "yaoyao",
      ];
      const preferred = zhVoices.find((v) =>
        femaleHints.some((h) => (v.name || "").toLowerCase().includes(h))
      );
      utterance.voice = preferred || zhVoices[0];
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  } catch {
    resolve();
  }

  return promise;
}

import { pinyin } from 'pinyin-pro';

export const CHINESE_PUNCTUATION: Record<string, true> = {
  '。': true, '，': true, '、': true, '！': true, '？': true, '：': true, '；': true,
  '“': true, '”': true, '‘': true, '’': true, '（': true, '）': true, '《': true, '》': true,
  '—': true, '…': true, '·': true, '.': true, ',': true, '!': true, '?': true,
  ':': true, ';': true, '"': true, '\'': true, '(': true, ')': true, '[': true, ']': true,
  '-': true, ' ': true,
};

export function isChineseChar(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2a6df)
  );
}

export interface CharRubyToken {
  id: string;
  char: string;
  pinyin: string;
  isPunctuation: boolean;
  isZh: boolean;
  index: number;
}

/**
 * Fast client-side word boundary detector using Intl.Segmenter.
 * Detects if a clicked character is part of a multi-character word.
 */
export function getInitialWordRange(
  sentence: string,
  charIndex: number
): { start: number; end: number; word: string } {
  if (!sentence || charIndex < 0) {
    return { start: charIndex, end: charIndex, word: sentence?.[charIndex] || '' };
  }

  const clean = sentence.trim();
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter('zh-Hans', { granularity: 'word' });
      const segments = Array.from(segmenter.segment(clean));
      for (const seg of segments) {
        const start = seg.index;
        const end = seg.index + seg.segment.length - 1;
        if (charIndex >= start && charIndex <= end) {
          return { start, end, word: seg.segment };
        }
      }
    } catch {
      // Fallback
    }
  }

  return { start: charIndex, end: charIndex, word: clean[charIndex] || '' };
}

/**
 * Accurately aligns each Chinese character with its exact Pinyin syllable using pinyin-pro.
 * Guaranteed 1-to-1 match for every character in hanzi string.
 */
export function alignHanziAndPinyin(hanzi: string): CharRubyToken[] {
  if (!hanzi || !hanzi.trim()) return [];

  const text = hanzi.trim();
  const pinyinItems = pinyin(text, { type: 'all' });

  return pinyinItems.map((item, index) => {
    const char = item.origin;
    const isZh = Boolean(item.isZh && isChineseChar(char));
    const isPunc = Boolean(CHINESE_PUNCTUATION[char]) || (!isZh && /^[^\w\s]$/.test(char));
    const py = isZh ? (item.pinyin || '') : '';

    return {
      id: `ruby-${index}-${char}`,
      char,
      pinyin: py,
      isPunctuation: isPunc,
      isZh,
      index,
    };
  });
}

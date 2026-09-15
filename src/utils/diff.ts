export type DiffType = 'correct' | 'incorrect' | 'missing' | 'extra';

export interface DiffToken {
  type: DiffType;
  char: string;
  expected?: string;
}

export interface EvaluationResult {
  isPerfect: boolean;
  accuracy: number; // 0 to 100
  correctCount: number;
  totalTargetChars: number;
  userCharCount: number;
  diffTokens: DiffToken[];
  normalizedMatch: boolean;
}

export function normalizePunctuation(str: string): string {
  return str
    .replace(/。/g, '.')
    .replace(/，/g, ',')
    .replace(/！/g, '!')
    .replace(/？/g, '?')
    .replace(/：/g, ':')
    .replace(/；/g, ';')
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'")
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Align user input against target Hanzi using Levenshtein distance matrix with optimal backtracking.
 */
export function evaluateInput(
  userInput: string,
  targetHanzi: string,
  allowNormalizedPunctuation: boolean = true
): EvaluationResult {
  const cleanInput = userInput.trim();
  const cleanTarget = targetHanzi.trim();

  const isLiteralExact = cleanInput === cleanTarget;
  const isNormalizedExact =
    normalizePunctuation(cleanInput) === normalizePunctuation(cleanTarget);

  const isPerfect = allowNormalizedPunctuation ? isNormalizedExact : isLiteralExact;

  const userChars = Array.from(cleanInput);
  const targetChars = Array.from(cleanTarget);

  const m = userChars.length;
  const n = targetChars.length;

  if (m === 0) {
    const tokens: DiffToken[] = targetChars.map((char) => ({
      type: 'missing',
      char: '',
      expected: char,
    }));
    return {
      isPerfect: false,
      accuracy: 0,
      correctCount: 0,
      totalTargetChars: n,
      userCharCount: 0,
      diffTokens: tokens,
      normalizedMatch: false,
    };
  }

  // Cost matrix
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const uChar = userChars[i - 1];
      const tChar = targetChars[j - 1];

      const isMatch =
        uChar === tChar ||
        (allowNormalizedPunctuation &&
          normalizePunctuation(uChar) === normalizePunctuation(tChar));

      if (isMatch) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        const substitution = dp[i - 1][j - 1] + 1;
        const deletion = dp[i][j - 1] + 1;
        const insertion = dp[i - 1][j] + 1;
        dp[i][j] = Math.min(substitution, deletion, insertion);
      }
    }
  }

  // Backtrack to build diff tokens
  const reversedTokens: DiffToken[] = [];
  let i = m;
  let j = n;
  let correctCount = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const uChar = userChars[i - 1];
      const tChar = targetChars[j - 1];
      const isMatch =
        uChar === tChar ||
        (allowNormalizedPunctuation &&
          normalizePunctuation(uChar) === normalizePunctuation(tChar));

      if (isMatch && dp[i][j] === dp[i - 1][j - 1]) {
        reversedTokens.push({
          type: 'correct',
          char: uChar,
          expected: tChar,
        });
        correctCount++;
        i--;
        j--;
        continue;
      }

      // Check substitution
      if (dp[i][j] === dp[i - 1][j - 1] + 1) {
        reversedTokens.push({
          type: 'incorrect',
          char: uChar,
          expected: tChar,
        });
        i--;
        j--;
        continue;
      }
    }

    // Check missing character
    if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1] + 1)) {
      reversedTokens.push({
        type: 'missing',
        char: '',
        expected: targetChars[j - 1],
      });
      j--;
      continue;
    }

    // Check extra character
    if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + 1)) {
      reversedTokens.push({
        type: 'extra',
        char: userChars[i - 1],
      });
      i--;
      continue;
    }

    if (i > 0) i--;
    if (j > 0) j--;
  }

  const diffTokens = reversedTokens.reverse();
  const editDist = dp[m][n];
  const maxLen = Math.max(m, n);
  const accuracy = Math.max(
    0,
    Math.round(((maxLen - editDist) / maxLen) * 100)
  );

  return {
    isPerfect,
    accuracy,
    correctCount,
    totalTargetChars: n,
    userCharCount: m,
    diffTokens,
    normalizedMatch: isNormalizedExact,
  };
}

/**
 * Web Speech API speech synthesis helper for Chinese using Promise.withResolvers()
 */
export function speakChinese(text: string, rate: number = 0.9): Promise<boolean> {
  const { promise, resolve } = Promise.withResolvers<boolean>();

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    resolve(false);
    return promise;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate;

    const voices = window.speechSynthesis.getVoices();
    const zhVoices = voices.filter(
      (v) => v.lang && v.lang.toLowerCase().startsWith('zh')
    );
    if (zhVoices.length > 0) {
      const femaleHints = ['female', '女', 'ting', 'mei', 'yao', 'xiaoxiao', 'xiaoyi', 'huihui', 'yaoyao'];
      const preferred = zhVoices.find((v) =>
        femaleHints.some((h) => (v.name || '').toLowerCase().includes(h))
      );
      utterance.voice = preferred || zhVoices[0];
    }

    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);

    window.speechSynthesis.speak(utterance);
  } catch {
    resolve(false);
  }

  return promise;
}

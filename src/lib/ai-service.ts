import { PassageSentence, ShadowingPassage, Word } from "./types";
import { LOCAL_DATA } from "./data-service";
import { tupleToWord } from "./utils";
import { pinyin } from "pinyin-pro";

export const AI_CHAT_ENDPOINT = "/api/ai/chat";
export const SHADOWING_CACHE_KEY = "xuehanyu_ai_shadowing_v1";

/** Số đoạn văn người dùng có thể chọn (1–3 đoạn hoàn chỉnh) */
export const PARAGRAPH_COUNT_OPTIONS = [1, 2, 3] as const;

/** Giữ tối đa bao nhiêu đoạn văn AI trong localStorage để không phình dung lượng */
const MAX_CACHED_PASSAGES = 40;
/** Số từ ôn tập tối đa gửi cho một lần "bổ sung từ thiếu" */
const MAX_REVIEW_TOPUP_WORDS = 40;

export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiError";
  }
}

/* ------------------------------------------------------------------ */
/* Trạng thái cấu hình AI (đọc từ biến môi trường ở server)            */
/* ------------------------------------------------------------------ */

export interface AiStatus {
  configured: boolean;
  model: string | null;
}

export async function fetchAiStatus(): Promise<AiStatus> {
  try {
    const res = await fetch(AI_CHAT_ENDPOINT, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    return {
      configured: !!data?.configured,
      model: typeof data?.model === "string" ? data.model : null,
    };
  } catch {
    return { configured: false, model: null };
  }
}

/* ------------------------------------------------------------------ */
/* Từ vựng tích luỹ: bài hiện tại + toàn bộ bài trước đó               */
/* ------------------------------------------------------------------ */

export function getLessonWords(levelId: string, lessonIdx: number): Word[] {
  const lessons = LOCAL_DATA[levelId] || [];
  const lesson = lessons[lessonIdx];
  if (!lesson?.w) return [];
  return lesson.w.map((tuple) => tupleToWord(tuple, lessonIdx + 1)).filter((w) => w.zh);
}

/**
 * Từ vựng cho đoạn văn shadowing của bài N:
 * - `required`: toàn bộ từ của bài N (bắt buộc phải xuất hiện)
 * - `review`: toàn bộ từ của các bài 1..N-1 (ưu tiên lồng ghép, bài gần nhất đứng trước)
 */
export function getCumulativeWordPool(
  levelId: string,
  lessonIdx: number
): { required: Word[]; review: Word[] } {
  const required = getLessonWords(levelId, lessonIdx);
  const requiredSet = new Set(required.map((w) => w.zh));

  const review: Word[] = [];
  const seen = new Set<string>();
  for (let i = lessonIdx - 1; i >= 0; i--) {
    for (const word of getLessonWords(levelId, i)) {
      if (seen.has(word.zh) || requiredSet.has(word.zh)) continue;
      seen.add(word.zh);
      review.push(word);
    }
  }

  return { required, review };
}

export interface CoverageReport {
  total: number;
  usedCount: number;
  percent: number;
  used: Word[];
  missing: Word[];
}

/** Kiểm tra độ phủ từ vựng của đoạn văn (khớp theo chuỗi chữ Hán) */
export function analyzeCoverage(text: string, words: Word[]): CoverageReport {
  const used: Word[] = [];
  const missing: Word[] = [];
  for (const word of words) {
    if (text.includes(word.zh)) used.push(word);
    else missing.push(word);
  }
  const total = words.length;
  return {
    total,
    usedCount: used.length,
    percent: total > 0 ? Math.round((used.length / total) * 100) : 100,
    used,
    missing,
  };
}

/* ------------------------------------------------------------------ */
/* Gọi model qua proxy nội bộ (proxy dùng OpenAI SDK + env)            */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const REQUEST_TIMEOUT_MS = 180_000;

async function callAiChat(
  messages: ChatMessage[],
  signal?: AbortSignal,
  temperature?: number
): Promise<{ content: string; model: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortOuter = () => controller.abort();
  signal?.addEventListener("abort", abortOuter);

  try {
    const res = await fetch(AI_CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, temperature }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new AiError(data?.error || `HTTP ${res.status} ${res.statusText}`);
    }

    const content = typeof data?.content === "string" ? data.content : "";
    if (!content.trim()) throw new AiError("Model không trả về nội dung nào.");

    return { content, model: typeof data?.model === "string" ? data.model : "" };
  } catch (err) {
    if (err instanceof AiError) throw err;
    if ((err as Error)?.name === "AbortError") {
      throw new AiError("Model phản hồi quá lâu (quá 3 phút). Hãy thử lại hoặc đổi model.");
    }
    throw new AiError(`Không gọi được model: ${(err as Error)?.message || "lỗi không xác định"}`);
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortOuter);
  }
}

/* ------------------------------------------------------------------ */
/* Sinh đoạn văn shadowing                                             */
/* ------------------------------------------------------------------ */

export function toPinyin(zh: string): string {
  return pinyin(zh, { toneType: "symbol" }).replace(/\s+([，。！？、；：])/g, "$1");
}

function formatRequiredWords(words: Word[]): string {
  return words.map((w) => `${w.zh} (${w.py} – ${w.vi})`).join("; ");
}

function formatReviewWords(words: Word[]): string {
  return words.map((w) => w.zh).join("、");
}

function levelLabel(levelId: string): string {
  return levelId.toUpperCase().replace(/^HSK(\d)$/, "HSK $1");
}

function buildSystemPrompt(): string {
  return [
    "Bạn là giáo viên tiếng Trung soạn bài đọc cho học viên người Việt luyện shadowing (nghe và nhại lại).",
    "Bạn LUÔN trả về duy nhất một đối tượng JSON hợp lệ, không bọc markdown, không thêm chữ nào ngoài JSON.",
  ].join("\n");
}

function buildGenerationPrompt(opts: {
  levelId: string;
  lessonIdx: number;
  lessonTitle: string;
  lessonTitleVi: string;
  paragraphCount: number;
  required: Word[];
  review: Word[];
}): string {
  const { levelId, lessonIdx, lessonTitle, lessonTitleVi, paragraphCount, required, review } = opts;

  const lines: string[] = [];
  lines.push(
    `Viết ${paragraphCount} đoạn văn tiếng Trung hoàn chỉnh, liền mạch, dùng để luyện shadowing.`
  );
  lines.push(`Chủ đề gợi ý (bài ${lessonIdx + 1}): ${lessonTitle} — ${lessonTitleVi}.`);
  lines.push(`Trình độ người học: ${levelLabel(levelId)} (người Việt).`);
  lines.push("");
  lines.push("QUY TẮC BẮT BUỘC:");
  lines.push(
    "1. Mỗi đoạn 3–5 câu, các câu liên kết thành một mạch truyện/miêu tả tự nhiên, dễ đọc to. Câu dài 8–18 chữ."
  );
  lines.push(
    `2. PHẢI dùng đủ ${required.length} từ khoá sau, mỗi từ xuất hiện ít nhất 1 lần và rải đều ra các đoạn:`
  );
  lines.push(`   ${formatRequiredWords(required)}`);
  if (review.length > 0) {
    lines.push(
      "3. Nên tái sử dụng thêm các từ đã học ở bài trước (ưu tiên từ gần đây, càng nhiều càng tốt) miễn câu vẫn tự nhiên:"
    );
    lines.push(`   ${formatReviewWords(review)}`);
  }
  lines.push(
    `${review.length > 0 ? "4" : "3"}. Ngoài danh sách trên chỉ dùng thêm hư từ/trợ từ cơ bản (的, 了, 吗, 呢, 很, 都, 也, 在, 有, 个, 和, 但是, 因为, 所以, 然后...) và số đếm/đơn vị cần thiết. Không dùng từ vựng khó vượt trình độ.`
  );
  lines.push(
    `${review.length > 0 ? "5" : "4"}. Mỗi câu phải có bản dịch tiếng Việt tự nhiên, sát nghĩa, không phiên âm, không giải thích.`
  );
  lines.push(`${review.length > 0 ? "6" : "5"}. KHÔNG viết pinyin.`);
  lines.push("");
  lines.push("Khuôn JSON trả về (đúng như sau, không thêm khoá khác):");
  lines.push(`{"title":"我的家人","paragraphs":[{"sentences":[{"zh":"...","vi":"..."}]}]}`);
  return lines.join("\n");
}

function buildRepairPrompt(opts: {
  previousJson: string;
  missingRequired: Word[];
  missingReview: Word[];
  paragraphCount: number;
}): string {
  const { previousJson, missingRequired, missingReview, paragraphCount } = opts;
  const lines: string[] = [];

  if (missingRequired.length > 0) {
    lines.push(
      `Đoạn văn dưới đây còn thiếu ${missingRequired.length} từ khoá BẮT BUỘC. Hãy viết lại TOÀN BỘ đoạn văn (giữ ${paragraphCount} đoạn, giữ phong cách, được phép thêm/đổi câu) sao cho các từ sau xuất hiện tự nhiên:`
    );
    lines.push(formatRequiredWords(missingRequired));
  } else {
    lines.push(
      `Hãy viết lại TOÀN BỘ đoạn văn dưới đây (giữ ${paragraphCount} đoạn, giữ phong cách) và lồng ghép thêm các từ đã học sau vào câu cho thật tự nhiên:`
    );
    lines.push(formatReviewWords(missingReview));
  }

  lines.push("");
  lines.push('Vẫn giữ nguyên khuôn JSON: {"title":"...","paragraphs":[{"sentences":[{"zh":"...","vi":"..."}]}]}');
  lines.push("KHÔNG viết pinyin. Bản dịch tiếng Việt cho từng câu.");
  lines.push("");
  lines.push("Đoạn văn hiện tại:");
  lines.push(previousJson);
  return lines.join("\n");
}

interface ParsedPassage {
  title: string;
  paragraphs: PassageSentence[][];
}

function extractJsonObject(raw: string): unknown {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new AiError("Model không trả về JSON hợp lệ. Hãy thử tạo lại.");
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new AiError("JSON của model bị lỗi cú pháp. Hãy thử tạo lại.");
  }
}

/** Chuẩn hoá JSON của model thành các đoạn văn: pinyin luôn tính cục bộ bằng pinyin-pro */
export function parseShadowingJson(raw: string): ParsedPassage {
  const data = extractJsonObject(raw) as {
    title?: unknown;
    paragraphs?: unknown;
    sentences?: unknown;
  };

  // Chấp nhận cả trường hợp model trả về mảng câu phẳng thay vì chia đoạn
  let rawParagraphs: unknown[] = [];
  if (Array.isArray(data.paragraphs)) {
    rawParagraphs = data.paragraphs;
  } else if (Array.isArray(data.sentences)) {
    rawParagraphs = [{ sentences: data.sentences }];
  }

  const paragraphs: PassageSentence[][] = [];
  for (const rawParagraph of rawParagraphs) {
    const sentences = Array.isArray(rawParagraph)
      ? rawParagraph
      : ((rawParagraph as { sentences?: unknown })?.sentences as unknown[] | undefined);
    if (!Array.isArray(sentences)) continue;

    const parsedSentences: PassageSentence[] = [];
    for (const rawSentence of sentences) {
      const zh = String((rawSentence as { zh?: unknown })?.zh ?? "").trim();
      if (!zh) continue;
      const vi = String((rawSentence as { vi?: unknown })?.vi ?? "").trim();
      parsedSentences.push({ zh, py: toPinyin(zh), vi });
    }
    if (parsedSentences.length > 0) paragraphs.push(parsedSentences);
  }

  if (paragraphs.length === 0) {
    throw new AiError("Model không trả về câu tiếng Trung nào. Hãy thử tạo lại.");
  }

  const title = String(data.title ?? "").trim();
  return { title: title || "Đoạn văn AI", paragraphs };
}

function passageToJson(paragraphs: PassageSentence[][], title: string): string {
  return JSON.stringify({
    title,
    paragraphs: paragraphs.map((p) => ({
      sentences: p.map((s) => ({ zh: s.zh, vi: s.vi })),
    })),
  });
}

function passageText(paragraphs: PassageSentence[][]): string {
  return paragraphs.map((p) => p.map((s) => s.zh).join("")).join("");
}

function buildPassage(
  parsed: ParsedPassage,
  opts: { levelId: string; lessonIdx: number; model: string }
): ShadowingPassage {
  const sentences = parsed.paragraphs.flat();
  const text = passageText(parsed.paragraphs);
  return {
    id: `${opts.levelId}-${opts.lessonIdx + 1}-${parsed.paragraphs.length}-${Date.now()}`,
    levelId: opts.levelId,
    lessonIdx: opts.lessonIdx,
    paragraphCount: parsed.paragraphs.length,
    title: parsed.title,
    paragraphs: parsed.paragraphs,
    sentences,
    charCount: Array.from(text).length,
    createdAt: Date.now(),
    model: opts.model,
  };
}

export interface GenerateShadowingOptions {
  levelId: string;
  lessonIdx: number;
  paragraphCount: number;
  signal?: AbortSignal;
}

/**
 * Sinh đoạn văn shadowing cho bài hiện tại:
 * 1. Gọi model với toàn bộ từ của bài + từ tích luỹ các bài trước
 * 2. Nếu còn thiếu từ khoá bắt buộc thì tự động gọi thêm 1 lần "viết lại" để phủ đủ
 */
export async function generateShadowingPassage(
  options: GenerateShadowingOptions
): Promise<ShadowingPassage> {
  const { levelId, lessonIdx, paragraphCount, signal } = options;
  const lessons = LOCAL_DATA[levelId] || [];
  const lesson = lessons[lessonIdx];
  if (!lesson) {
    throw new AiError("Không tìm thấy dữ liệu bài học để tạo đoạn văn.");
  }

  const { required, review } = getCumulativeWordPool(levelId, lessonIdx);
  const first = await callAiChat(
    [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: buildGenerationPrompt({
          levelId,
          lessonIdx,
          lessonTitle: lesson.t,
          lessonTitleVi: lesson.vi_t,
          paragraphCount,
          required,
          review,
        }),
      },
    ],
    signal
  );

  let parsed = parseShadowingJson(first.content);
  let usedModel = first.model;

  // Vòng sửa lỗi: bắt buộc phủ đủ từ vựng của bài hiện tại
  const missingRequired = analyzeCoverage(passageText(parsed.paragraphs), required).missing;
  if (missingRequired.length > 0) {
    try {
      const repaired = await callAiChat(
        [
          { role: "system", content: buildSystemPrompt() },
          {
            role: "user",
            content: buildRepairPrompt({
              previousJson: passageToJson(parsed.paragraphs, parsed.title),
              missingRequired,
              missingReview: [],
              paragraphCount,
            }),
          },
        ],
        signal,
        0.7
      );
      const repairedParsed = parseShadowingJson(repaired.content);
      const repairedMissing = analyzeCoverage(
        passageText(repairedParsed.paragraphs),
        required
      ).missing.length;
      // Chỉ nhận bản viết lại nếu nó phủ được nhiều từ khoá hơn
      if (repairedMissing < missingRequired.length) {
        parsed = repairedParsed;
        usedModel = repaired.model;
      }
    } catch {
      // Bỏ qua lỗi vòng sửa: vẫn trả về bản đầu tiên để người dùng còn dùng được
    }
  }

  return buildPassage(parsed, { levelId, lessonIdx, model: usedModel });
}

/** Bổ sung các từ ôn tập còn thiếu (người dùng bấm mới gọi để tiết kiệm token) */
export async function expandWithReviewWords(
  passage: ShadowingPassage,
  words: Word[],
  signal?: AbortSignal
): Promise<ShadowingPassage> {
  if (words.length === 0) return passage;

  const repaired = await callAiChat(
    [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: buildRepairPrompt({
          previousJson: passageToJson(passage.paragraphs, passage.title),
          missingRequired: [],
          missingReview: words.slice(0, MAX_REVIEW_TOPUP_WORDS),
          paragraphCount: passage.paragraphs.length,
        }),
      },
    ],
    signal,
    0.75
  );

  const parsed = parseShadowingJson(repaired.content);
  const before = analyzeCoverage(passageText(passage.paragraphs), words).usedCount;
  const after = analyzeCoverage(passageText(parsed.paragraphs), words).usedCount;
  if (after <= before) {
    throw new AiError("Model chưa lồng được thêm từ nào. Hãy thử lại.");
  }

  const updated = buildPassage(parsed, {
    levelId: passage.levelId,
    lessonIdx: passage.lessonIdx,
    model: passage.model,
  });
  return { ...updated, id: passage.id, createdAt: passage.createdAt };
}

/* ------------------------------------------------------------------ */
/* Cache localStorage theo (cấp độ, bài, số đoạn)                      */
/* ------------------------------------------------------------------ */

type ShadowingCache = Record<string, ShadowingPassage>;

function shadowingCacheKey(levelId: string, lessonIdx: number, paragraphCount: number): string {
  return `${levelId}:${lessonIdx}:${paragraphCount}`;
}

function readCache(): ShadowingCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SHADOWING_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ShadowingCache) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: ShadowingCache): void {
  if (typeof window === "undefined") return;
  try {
    const entries = Object.entries(cache).sort((a, b) => b[1].createdAt - a[1].createdAt);
    const trimmed = Object.fromEntries(entries.slice(0, MAX_CACHED_PASSAGES));
    localStorage.setItem(SHADOWING_CACHE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function loadCachedShadowing(
  levelId: string,
  lessonIdx: number,
  paragraphCount: number
): ShadowingPassage | null {
  const cached = readCache()[shadowingCacheKey(levelId, lessonIdx, paragraphCount)];
  if (!cached || !Array.isArray(cached.paragraphs) || cached.paragraphs.length === 0) return null;
  return cached;
}

export function saveCachedShadowing(passage: ShadowingPassage): void {
  const cache = readCache();
  cache[shadowingCacheKey(passage.levelId, passage.lessonIdx, passage.paragraphCount)] = passage;
  writeCache(cache);
}

export function clearCachedShadowing(
  levelId: string,
  lessonIdx: number,
  paragraphCount?: number
): void {
  const cache = readCache();
  if (paragraphCount !== undefined) {
    delete cache[shadowingCacheKey(levelId, lessonIdx, paragraphCount)];
  } else {
    for (const key of Object.keys(cache)) {
      if (key.startsWith(`${levelId}:${lessonIdx}:`)) delete cache[key];
    }
  }
  writeCache(cache);
}

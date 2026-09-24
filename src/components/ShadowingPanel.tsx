"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Keyboard,
  Loader2,
  Play,
  RefreshCw,
  Repeat,
  Sparkles,
  Square,
  Volume2,
  Wand2,
} from "lucide-react";
import { Lesson, PassageSentence, ShadowingPassage } from "@/lib/types";
import {
  AiStatus,
  PARAGRAPH_COUNT_OPTIONS,
  analyzeCoverage,
  clearCachedShadowing,
  expandWithReviewWords,
  fetchAiStatus,
  generateShadowingPassage,
  getCumulativeWordPool,
  loadCachedShadowing,
  saveCachedShadowing,
} from "@/lib/ai-service";
import { InputArea } from "@/components/InputArea";
import { ResultDiff } from "@/components/ResultDiff";
import { SentenceItem } from "@/components/SentenceCard";
import { evaluateInput, EvaluationResult, speakChinese } from "@/utils/diff";
import { playErrorBuzz, playSuccessChime } from "@/lib/sound";

interface ShadowingPanelProps {
  lesson: Lesson;
  lessonIdx: number;
  levelId: string;
  showPinyin: boolean;
  showMeaning: boolean;
  onRecordResult: (isCorrect: boolean) => void;
}

type Prefs = {
  paragraphCount: number;
  rate: number;
  gapMs: number;
  hideHanzi: boolean;
  showTyping: boolean;
};

const PREFS_KEY = "xuehanyu_shadowing_prefs_v1";

const DEFAULT_PREFS: Prefs = {
  paragraphCount: 3,
  rate: 0.8,
  gapMs: 2000,
  hideHanzi: false,
  showTyping: false,
};

const RATE_OPTIONS = [
  { label: "0.6×", value: 0.6 },
  { label: "0.8×", value: 0.8 },
  { label: "1.0×", value: 1.0 },
];

const GAP_OPTIONS = [
  { label: "Liền", value: 0 },
  { label: "2s", value: 2000 },
  { label: "4s", value: 4000 },
];

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

/** Ước lượng thời lượng đọc để vòng phát không bị treo khi trình duyệt không báo "end" */
function estimateSpeechMs(zh: string, rate: number): number {
  const chars = Array.from(zh).length;
  const charsPerSecond = 4.2 * Math.max(0.4, rate);
  return Math.round((chars / charsPerSecond) * 1000) + 2500;
}

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      paragraphCount: PARAGRAPH_COUNT_OPTIONS.includes(parsed.paragraphCount)
        ? parsed.paragraphCount
        : DEFAULT_PREFS.paragraphCount,
      rate: typeof parsed.rate === "number" ? parsed.rate : DEFAULT_PREFS.rate,
      gapMs: typeof parsed.gapMs === "number" ? parsed.gapMs : DEFAULT_PREFS.gapMs,
      hideHanzi: !!parsed.hideHanzi,
      showTyping: !!parsed.showTyping,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: Prefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

function selectClass(): string {
  return "h-8 px-2 rounded-xl border border-[#E5E3DF] bg-white text-[11px] font-semibold text-slate-700 outline-none hover:border-slate-400 focus:border-[#24523B] cursor-pointer";
}

export function ShadowingPanel({
  lesson,
  lessonIdx,
  levelId,
  showPinyin,
  showMeaning,
  onRecordResult,
}: ShadowingPanelProps) {
  const [aiStatus, setAiStatus] = useState<AiStatus>({ configured: false, model: null });
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  const [passage, setPassage] = useState<ShadowingPassage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(true);

  const [userInput, setUserInput] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const playTokenRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const { required, review } = useMemo(
    () => getCumulativeWordPool(levelId, lessonIdx),
    [levelId, lessonIdx]
  );

  const sentences: PassageSentence[] = useMemo(() => passage?.sentences ?? [], [passage]);
  const activeSentence = sentences[activeIdx] || sentences[0];

  // Nạp trạng thái cấu hình AI (biến môi trường ở server) + tuỳ chọn hiển thị sau khi mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(loadPrefs());
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const refreshAiStatus = useCallback(async () => {
    setAiStatus(await fetchAiStatus());
  }, []);

  useEffect(() => {
    // Trạng thái cấu hình nằm ở server, lấy một lần khi mở tab shadowing
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshAiStatus();
  }, [refreshAiStatus]);

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  const stopPlayback = useCallback(() => {
    playTokenRef.current += 1;
    setIsPlayingAll(false);
    setPlayingIdx(null);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Dừng phát khi đổi bài hoặc rời màn hình
  useEffect(() => {
    return () => {
      playTokenRef.current += 1;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Nạp đoạn văn đã lưu cho (cấp độ, bài, số đoạn) hiện tại
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    stopPlayback();
    setPassage(loadCachedShadowing(levelId, lessonIdx, prefs.paragraphCount));
    setGenError(null);
    setActiveIdx(0);
    setUserInput("");
    setHasSubmitted(false);
    setEvaluation(null);
  }, [levelId, lessonIdx, prefs.paragraphCount, stopPlayback]);

  const coverage = useMemo(() => {
    if (!passage) return null;
    const text = passage.sentences.map((s) => s.zh).join("");
    return {
      required: analyzeCoverage(text, required),
      review: analyzeCoverage(text, review),
    };
  }, [passage, required, review]);

  /* ----------------------------- Phát audio ----------------------------- */

  const speakOneLine = useCallback(
    async (text: string) => {
      await Promise.race([speakChinese(text, prefs.rate), delay(estimateSpeechMs(text, prefs.rate))]);
    },
    [prefs.rate]
  );

  const playSentence = useCallback(
    async (idx: number) => {
      const target = sentences[idx];
      if (!target) return;
      stopPlayback();
      const token = playTokenRef.current;
      setActiveIdx(idx);
      setPlayingIdx(idx);
      await speakOneLine(target.zh);
      if (playTokenRef.current === token) setPlayingIdx(null);
    },
    [sentences, speakOneLine, stopPlayback]
  );

  const playAll = useCallback(
    async (startIdx: number) => {
      if (sentences.length === 0) return;
      stopPlayback();
      const token = playTokenRef.current;
      setIsPlayingAll(true);

      for (let i = Math.max(0, startIdx); i < sentences.length; i++) {
        if (playTokenRef.current !== token) return;
        setActiveIdx(i);
        setPlayingIdx(i);
        await speakOneLine(sentences[i].zh);
        if (playTokenRef.current !== token) return;
        setPlayingIdx(null);
        if (prefs.gapMs > 0) {
          await delay(prefs.gapMs);
          if (playTokenRef.current !== token) return;
        }
      }

      if (playTokenRef.current === token) {
        setIsPlayingAll(false);
        setPlayingIdx(null);
      }
    },
    [sentences, speakOneLine, stopPlayback, prefs.gapMs]
  );

  const handleTogglePlayAll = () => {
    if (isPlayingAll) stopPlayback();
    else playAll(activeIdx);
  };

  // Cuộn tới câu đang phát
  useEffect(() => {
    const elem = document.getElementById(`shadow-sentence-${activeIdx}`);
    if (elem) elem.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeIdx]);

  /* --------------------------- Sinh đoạn văn --------------------------- */

  const handleGenerate = async (regenerate: boolean) => {
    stopPlayback();
    if (regenerate) clearCachedShadowing(levelId, lessonIdx, prefs.paragraphCount);

    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setGenError(null);

    try {
      const result = await generateShadowingPassage({
        levelId,
        lessonIdx,
        paragraphCount: prefs.paragraphCount,
        signal: controller.signal,
      });
      saveCachedShadowing(result);
      setPassage(result);
      setActiveIdx(0);
      setUserInput("");
      setHasSubmitted(false);
      setEvaluation(null);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setGenError((err as Error)?.message || "Không tạo được đoạn văn.");
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  };

  const handleCancelGenerate = () => {
    abortRef.current?.abort();
    setIsGenerating(false);
  };

  const handleTopUpReview = async () => {
    if (!passage || !coverage) return;
    const missing = coverage.review.missing;
    if (missing.length === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsRepairing(true);
    setGenError(null);
    try {
      const updated = await expandWithReviewWords(passage, missing, controller.signal);
      saveCachedShadowing(updated);
      setPassage(updated);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setGenError((err as Error)?.message || "Không bổ sung được từ.");
      }
    } finally {
      setIsRepairing(false);
      abortRef.current = null;
    }
  };

  /* ----------------------------- Luyện gõ ----------------------------- */

  const handleSubmit = useCallback(() => {
    if (!userInput.trim() || !activeSentence || hasSubmitted) return;
    const result = evaluateInput(userInput, activeSentence.zh, true);
    setEvaluation(result);
    setHasSubmitted(true);
    onRecordResult(result.isPerfect);
    if (result.isPerfect) playSuccessChime();
    else playErrorBuzz();
  }, [userInput, activeSentence, hasSubmitted, onRecordResult]);

  const resetTypingState = () => {
    setUserInput("");
    setHasSubmitted(false);
    setEvaluation(null);
  };

  const goToSentence = (idx: number) => {
    const clamped = Math.min(Math.max(0, idx), sentences.length - 1);
    setActiveIdx(clamped);
    resetTypingState();
  };

  const currentSentenceItem: SentenceItem | null = activeSentence
    ? {
        id: `shadow-${activeIdx}`,
        level: levelId.toUpperCase(),
        hanzi: activeSentence.zh,
        pinyin: activeSentence.py,
        meaning: activeSentence.vi,
        topicTitle: passage?.title,
      }
    : null;

  const missingRequiredCount = coverage?.required.missing.length ?? 0;
  const missingReviewCount = coverage?.review.missing.length ?? 0;
  const activeModel = passage?.model || aiStatus.model;

  /* ------------------------------- Render ------------------------------- */

  return (
    <div className="flex-1 flex flex-col w-full min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 xl:px-8 py-3 sm:py-4 w-full touch-pan-y"
      >
        {/* Thanh điều khiển dính trên cùng */}
        <div className="sticky top-0 z-10 -mx-3 sm:-mx-6 xl:-mx-8 px-3 sm:px-6 xl:px-8 py-2 mb-3 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E5E3DF]/70 space-y-2">
          {/* Hàng 1: phát audio */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleTogglePlayAll}
              disabled={sentences.length === 0}
              className={`h-8 px-3 rounded-xl border font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                isPlayingAll
                  ? "bg-[#24523B] text-white border-[#24523B]"
                  : "bg-white text-slate-700 border-[#E5E3DF] hover:border-slate-400 hover:text-slate-900"
              }`}
              title="Nghe lần lượt từng câu, nghỉ để nhại lại"
            >
              {isPlayingAll ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlayingAll ? "Dừng" : "Nghe liên tục"}</span>
            </button>

            <button
              type="button"
              onClick={() => playSentence(activeIdx)}
              disabled={sentences.length === 0}
              className={selectClass() + " flex items-center gap-1 disabled:opacity-40"}
              title="Nghe lại câu đang chọn"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Câu này</span>
            </button>

            <select
              value={prefs.rate}
              onChange={(e) => updatePrefs({ rate: Number(e.target.value) })}
              className={selectClass()}
              title="Tốc độ đọc"
              aria-label="Tốc độ đọc"
            >
              {RATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={prefs.gapMs}
              onChange={(e) => updatePrefs({ gapMs: Number(e.target.value) })}
              className={selectClass()}
              title="Khoảng nghỉ giữa các câu để nhại lại"
              aria-label="Khoảng nghỉ giữa các câu"
            >
              {GAP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Nghỉ {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => updatePrefs({ hideHanzi: !prefs.hideHanzi })}
              aria-pressed={prefs.hideHanzi}
              className={`h-8 px-2.5 rounded-xl border text-[11px] font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                prefs.hideHanzi
                  ? "bg-[#24523B] text-white border-[#24523B]"
                  : "bg-white text-slate-600 border-[#E5E3DF] hover:border-slate-400 hover:text-slate-900"
              }`}
              title="Ẩn chữ Hán để nghe trước rồi mới nhìn (đúng kiểu shadowing)"
            >
              {prefs.hideHanzi ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{prefs.hideHanzi ? "Đang ẩn chữ" : "Ẩn chữ"}</span>
            </button>

            <div className="inline-flex items-center h-8 rounded-xl border border-[#E5E3DF] bg-white divide-x divide-[#E5E3DF] overflow-hidden shadow-2xs shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => goToSentence(activeIdx - 1)}
                disabled={activeIdx === 0}
                className="h-full px-2 flex items-center justify-center text-slate-600 hover:bg-[#FAF9F6] hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                aria-label="Câu trước"
                title="Câu trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="h-full px-2 flex items-center text-[11px] font-mono font-bold text-slate-700 whitespace-nowrap">
                {sentences.length > 0 ? `${activeIdx + 1}/${sentences.length}` : "0/0"}
              </span>
              <button
                type="button"
                onClick={() => goToSentence(activeIdx + 1)}
                disabled={sentences.length === 0 || activeIdx >= sentences.length - 1}
                className="h-full px-2 flex items-center justify-center text-slate-600 hover:bg-[#FAF9F6] hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                aria-label="Câu tiếp theo"
                title="Câu tiếp theo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hàng 2: số đoạn · độ phủ từ vựng · công cụ AI */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="inline-flex items-center p-0.5 h-8 rounded-xl border border-[#E5E3DF] bg-[#EFECE6]/70 shrink-0">
              {PARAGRAPH_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => updatePrefs({ paragraphCount: count })}
                  aria-pressed={prefs.paragraphCount === count}
                  className={`h-full px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    prefs.paragraphCount === count
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  title={`Đoạn văn gồm ${count} đoạn`}
                >
                  {count} đoạn
                </button>
              ))}
            </div>

            {coverage && (
              <>
                <span
                  className={`h-8 px-2.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1 ${
                    missingRequiredCount === 0
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                  title={`Từ khoá bắt buộc của bài ${lessonIdx + 1}`}
                >
                  {missingRequiredCount === 0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  Bài {lessonIdx + 1}: {coverage.required.usedCount}/{coverage.required.total}
                </span>

                {review.length > 0 && (
                  <span
                    className={`h-8 px-2.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1 ${
                      missingReviewCount === 0
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-white border-[#E5E3DF] text-slate-600"
                    }`}
                    title={`Từ vựng tích luỹ của ${lessonIdx} bài trước`}
                  >
                    Ôn bài 1–{lessonIdx}: {coverage.review.usedCount}/{coverage.review.total} (
                    {coverage.review.percent}%)
                  </span>
                )}

                {missingReviewCount > 0 && (
                  <button
                    type="button"
                    onClick={handleTopUpReview}
                    disabled={isRepairing || isGenerating}
                    className="h-8 px-2.5 rounded-xl border border-[#E5E3DF] bg-white text-[11px] font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:opacity-40 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Nhờ AI viết lại để lồng thêm các từ còn thiếu (tốn thêm 1 lượt gọi model)"
                  >
                    {isRepairing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isRepairing ? "Đang bổ sung..." : "Bổ sung từ thiếu"}</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => handleGenerate(true)}
              disabled={isGenerating || isRepairing}
              className="h-8 px-2.5 rounded-xl border border-[#E5E3DF] bg-white text-[11px] font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:opacity-40 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Nhờ AI viết lại đoạn văn mới cho bài này"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isGenerating ? "Đang viết..." : "Tạo lại"}</span>
            </button>

            <button
              type="button"
              onClick={() => updatePrefs({ showTyping: !prefs.showTyping })}
              aria-pressed={prefs.showTyping}
              className={`h-8 px-2.5 rounded-xl border text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                prefs.showTyping
                  ? "bg-[#24523B] text-white border-[#24523B]"
                  : "bg-white text-slate-600 border-[#E5E3DF] hover:border-slate-400 hover:text-slate-900"
              }`}
              title="Bật ô gõ để vừa nhại vừa gõ lại câu đang nghe"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Luyện gõ</span>
            </button>
          </div>
        </div>

        {/* Nội dung */}
        {!aiStatus.configured ? (
          <div className="w-full max-w-xl mx-auto bg-white border border-[#E5E3DF] rounded-2xl p-5 sm:p-6 text-center space-y-3 shadow-2xs">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-[#24523B] text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Luyện shadowing bằng đoạn văn AI</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              AI sẽ viết 1–3 đoạn văn hoàn chỉnh cho bài {lessonIdx + 1}
              {review.length > 0 && (
                <>
                  {" "}
                  dùng đủ <strong>{required.length} từ của bài này</strong> và lồng thêm tối đa{" "}
                  <strong>{review.length} từ</strong> đã học ở các bài trước
                </>
              )}
              . Bạn nghe từng câu rồi nhại lại theo.
            </p>
            <div className="text-left bg-[#FAF9F6] border border-[#E5E3DF] rounded-xl p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-700">
                Server chưa được cấu hình model. Khai báo trong{" "}
                <span className="font-mono">.env.local</span> rồi khởi động lại:
              </p>
              <pre className="text-[11px] font-mono text-slate-600 leading-relaxed overflow-x-auto">
{`OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
# tuỳ chọn: đổi nhà cung cấp / model chạy local
OPENAI_BASE_URL=https://api.openai.com/v1`}
              </pre>
            </div>
            <button
              type="button"
              onClick={refreshAiStatus}
              className="h-10 px-5 rounded-xl bg-[#24523B] hover:bg-[#1b3d2c] text-white font-bold text-xs shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Kiểm tra lại</span>
            </button>
          </div>
        ) : isGenerating ? (
          <div className="w-full max-w-xl mx-auto bg-white border border-[#E5E3DF] rounded-2xl p-6 text-center space-y-3 shadow-2xs">
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-[#24523B]" />
            <h3 className="text-sm font-bold text-slate-900">AI đang viết đoạn văn...</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Đang dùng {required.length} từ của bài {lessonIdx + 1}
              {review.length > 0 && <> + {review.length} từ các bài trước</>}. Thường mất 20–60 giây.
            </p>
            <button
              type="button"
              onClick={handleCancelGenerate}
              className="h-9 px-4 rounded-xl border border-[#E5E3DF] bg-white text-slate-600 text-xs font-semibold hover:text-slate-900 hover:border-slate-400 transition-all cursor-pointer"
            >
              Huỷ
            </button>
          </div>
        ) : !passage ? (
          <div className="w-full max-w-xl mx-auto bg-white border border-[#E5E3DF] rounded-2xl p-5 sm:p-6 text-center space-y-3 shadow-2xs">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-[#EFECE6] text-[#24523B] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Tạo {prefs.paragraphCount} đoạn văn cho bài {lessonIdx + 1}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Sẽ dùng đủ <strong>{required.length} từ khoá của bài {lesson.t}</strong>
              {review.length > 0 && (
                <>
                  , lồng thêm tối đa <strong>{review.length} từ</strong> của bài 1–{lessonIdx}
                </>
              )}
              . Pinyin được tính ngay trên máy, không phụ thuộc model.
            </p>
            <button
              type="button"
              onClick={() => handleGenerate(false)}
              className="h-10 px-5 rounded-xl bg-[#24523B] hover:bg-[#1b3d2c] text-white font-bold text-xs shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Tạo đoạn văn bằng AI</span>
            </button>
            <p className="text-[11px] text-slate-400">
              Đoạn văn được lưu lại cho lần học sau, không gọi lại model.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-3xl mx-auto space-y-4 pb-6">
            {/* Thông tin đoạn văn */}
            <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#E5E3DF]/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-xl bg-[#24523B] text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold tracking-tight text-[#222B25] truncate">
                    {passage.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    AI{activeModel ? ` · ${activeModel}` : ""} · {passage.paragraphs.length} đoạn ·{" "}
                    {sentences.length} câu ·{" "}
                    {passage.charCount} chữ Hán
                  </p>
                </div>
              </div>
              {missingRequiredCount > 0 && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-2 py-1 shrink-0">
                  Còn thiếu {missingRequiredCount} từ khoá
                </span>
              )}
            </div>

            {/* Lỗi (nếu có) */}
            {genError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="break-words">{genError}</span>
              </div>
            )}

            {/* Danh sách đoạn văn */}
            {passage.paragraphs.map((paragraph, pIdx) => {
              const startOffset = passage.paragraphs
                .slice(0, pIdx)
                .reduce((sum, p) => sum + p.length, 0);

              return (
                <section key={pIdx} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Đoạn {pIdx + 1}
                    </span>
                    <span className="flex-1 h-px bg-[#E5E3DF]/70" />
                  </div>

                  {paragraph.map((sentence, sIdx) => {
                    const globalIdx = startOffset + sIdx;
                    const isActive = globalIdx === activeIdx;
                    const isPlayingThis = playingIdx === globalIdx;
                    const isTypingTarget = prefs.showTyping && isActive;
                    const isWrong = isTypingTarget && hasSubmitted && !evaluation?.isPerfect;

                    return (
                      <div
                        id={`shadow-sentence-${globalIdx}`}
                        key={globalIdx}
                        onClick={() => {
                          goToSentence(globalIdx);
                          playSentence(globalIdx);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            goToSentence(globalIdx);
                            playSentence(globalIdx);
                          }
                        }}
                        className={`w-full text-left p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer scroll-mt-32 ${
                          isActive
                            ? "bg-white border-[#24523B]/50 ring-2 ring-[#24523B]/25 shadow-2xs"
                            : "bg-white/60 border-[#E5E3DF] hover:border-slate-400 hover:bg-white"
                        } ${isWrong ? "border-rose-300" : ""}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                              isPlayingThis
                                ? "bg-[#24523B] text-white border-[#24523B]"
                                : "bg-[#FAF9F6] text-slate-500 border-[#E5E3DF]"
                            }`}
                            title={isPlayingThis ? "Đang đọc" : "Bấm để nghe câu này"}
                          >
                            {isPlayingThis ? (
                              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                            ) : (
                              <Play className="w-3 h-3 h-3" />
                            )}
                          </span>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div
                              className={`hanzi text-lg sm:text-xl md:text-2xl tracking-wide leading-snug text-[#222B25] ${
                                prefs.hideHanzi ? "blur-[7px] select-none" : ""
                              }`}
                            >
                              {sentence.zh}
                            </div>
                            {showPinyin && sentence.py && !prefs.hideHanzi && (
                              <div className="text-xs sm:text-sm font-semibold text-[#24523B] tracking-wide">
                                {sentence.py}
                              </div>
                            )}
                            {showMeaning && sentence.vi && (
                              <div className="text-xs sm:text-[13px] text-slate-600 italic leading-relaxed">
                                {sentence.vi}
                              </div>
                            )}
                            {isTypingTarget && hasSubmitted && (
                              <div className="text-[11px] font-semibold">
                                {evaluation?.isPerfect ? (
                                  <span className="text-emerald-600 inline-flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Gõ chính xác
                                  </span>
                                ) : (
                                  <span className="text-rose-600">
                                    Độ chính xác {evaluation?.accuracy ?? 0}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}

            {/* Danh sách từ còn thiếu */}
            {coverage && (missingRequiredCount > 0 || missingReviewCount > 0) && (
              <details className="bg-white border border-[#E5E3DF] rounded-2xl p-3.5">
                <summary className="text-xs font-semibold text-slate-600 cursor-pointer">
                  Từ chưa xuất hiện trong đoạn văn ({missingRequiredCount + missingReviewCount}) — bấm
                  để xem
                </summary>
                <div className="flex flex-wrap gap-1.5 pt-2.5">
                  {[...coverage.required.missing, ...coverage.review.missing].map((word) => (
                    <button
                      key={word.zh}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        speakChinese(word.zh, 0.8);
                      }}
                      className="px-2 py-1 rounded-lg border border-[#E5E3DF] bg-[#FAF9F6] text-[11px] font-semibold text-slate-700 hover:border-[#24523B]/50 hover:text-[#24523B] transition-colors cursor-pointer"
                      title={`${word.py} · ${word.vi} — bấm để nghe`}
                    >
                      {word.zh}
                    </button>
                  ))}
                </div>
              </details>
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cách luyện: bấm <strong>Nghe liên tục</strong> để nghe từng câu, hết mỗi câu có khoảng
              nghỉ để bạn nhại lại. Bật <strong>Ẩn chữ</strong> nếu muốn nghe trước khi nhìn chữ.
            </p>
          </div>
        )}

        {!ttsSupported && (
          <p className="w-full max-w-3xl mx-auto pt-4 text-[11px] text-amber-700">
            Trình duyệt này không hỗ trợ đọc tiếng Trung (Web Speech API). Hãy dùng Chrome/Edge/Safari
            trên máy có cài giọng tiếng Trung.
          </p>
        )}
      </div>

      {/* Ô gõ tuỳ chọn: vừa nhại vừa gõ lại câu đang nghe */}
      {prefs.showTyping && activeSentence && (
        <div className="shrink-0 border-t border-[#E5E3DF] bg-[#FAF9F6]/95 backdrop-blur-md px-3 sm:px-6 xl:px-8 py-2 sm:py-2.5 pb-safe w-full z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-2">
            <InputArea
              value={userInput}
              onChange={setUserInput}
              onSubmit={handleSubmit}
              onReset={resetTypingState}
              disabled={hasSubmitted && !!evaluation?.isPerfect}
              hasSubmitted={hasSubmitted}
              mode="shadowing"
              targetLength={Array.from(activeSentence.zh).length}
            />
            {hasSubmitted && evaluation && currentSentenceItem && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-150">
                <ResultDiff
                  evaluation={evaluation}
                  targetSentence={currentSentenceItem}
                  userInput={userInput}
                  onContinue={() => goToSentence(activeIdx + 1)}
                  onRetryKeep={() => {
                    setHasSubmitted(false);
                    setEvaluation(null);
                  }}
                  onRetryClear={resetTypingState}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  Check,
  Search,
  Layers,
  ListFilter,
  RotateCcw,
  Award,
  ArrowRight,
  XCircle,
  CheckCircle2,
  BellRing,
  CalendarClock,
} from "lucide-react";
import { StageHeader, stageIconBtnClass } from "@/components/StageHeader";
import { Lesson, Word } from "@/lib/types";
import { tupleToWord } from "@/lib/utils";
import { speakChinese } from "@/utils/diff";
import { playSuccessChime, playErrorBuzz } from "@/lib/sound";
import { formatNextReview, getDueCardKeys } from "@/lib/data-service";
import type { CardMemoryRecord } from "@/lib/types";
import confetti from "canvas-confetti";

interface EditorialFlashcardsProps {
  lesson: Lesson;
  lessonIdx: number;
  levelId: string;
  masteredCards: Record<string, boolean>;
  needsReviewCards: Record<string, boolean>;
  cardMemory: Record<string, CardMemoryRecord>;
  onMarkCard: (key: string, isMastered: boolean) => void;
  onNextLesson?: () => void;
}

const FLASHCARD_AUTOPLAY_KEY = "hsk_flashcard_autoplay_v1";

interface DynamicIslandToast {
  type: "again" | "good";
  text: string;
}

export function EditorialFlashcards({
  lesson,
  lessonIdx,
  levelId,
  masteredCards,
  needsReviewCards,
  cardMemory,
  onMarkCard,
  onNextLesson,
}: EditorialFlashcardsProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isRoundFinished, setIsRoundFinished] = useState(false);

  // Spaced repetition filter mode: 'all' | 'review' | 'mastered' | 'due'
  const [studyFilter, setStudyFilter] = useState<"all" | "review" | "mastered" | "due">("all");

  // Đọc localStorage sau mount để SSR và lần render đầu ở client giống nhau
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const [viewTab, setViewTab] = useState<"card" | "table">("card");
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Clean, modern floating pill toast notification state
  const [islandToast, setIslandToast] = useState<DynamicIslandToast | null>(null);
  const islandTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Chụp timestamp sau mount (client-only) để SSR/client render đầu giống nhau.
  // Trước khi mount giữ null => mọi tính toán "đến hạn" trả về rỗng/không đến hạn.
  const [nowSnapshot, setNowSnapshot] = useState<number | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAutoPlay(localStorage.getItem(FLASHCARD_AUTOPLAY_KEY) === "true");
    } catch {}
    setNowSnapshot(Date.now());
  }, []);

  useEffect(() => {
    return () => {
      if (islandTimerRef.current) clearTimeout(islandTimerRef.current);
    };
  }, []);

  const handleToggleAutoPlay = () => {
    setIsAutoPlay((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(FLASHCARD_AUTOPLAY_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const rawWords: Word[] = useMemo(() => {
    if (!lesson || !lesson.w) return [];
    return lesson.w.map((w) => tupleToWord(w, lessonIdx + 1));
  }, [lesson, lessonIdx]);

  // Pre-compute due card keys for the current lesson from the snapshot time
  const dueKeysInLessonSet = useMemo(() => {
    if (nowSnapshot === null) return {} as Record<string, boolean>;
    const snapshotKeys = getDueCardKeys(
      {
        learnedWords: {},
        masteredCards,
        needsReviewCards,
        cardMemory,
        typingHistory: {},
        favoriteWords: {},
      },
      nowSnapshot
    );
    const lessonKeys: Record<string, boolean> = {};
    for (const key of snapshotKeys) {
      if (rawWords.some((w) => `${levelId}_${w.zh}` === key)) {
        lessonKeys[key] = true;
      }
    }
    return lessonKeys;
  }, [rawWords, masteredCards, needsReviewCards, cardMemory, levelId, nowSnapshot]);

  const dueCountInLesson = Object.keys(dueKeysInLessonSet).length;

  // Filtered pool based on study mode (All / Cần ôn / Đã thuộc / Đến hạn)
  const studyPool: Word[] = useMemo(() => {
    if (studyFilter === "due") {
      const dueWords = rawWords.filter((w) => dueKeysInLessonSet[`${levelId}_${w.zh}`]);
      return dueWords.length > 0 ? dueWords : rawWords;
    }
    if (studyFilter === "review") {
      const reviewWords = rawWords.filter((w) => {
        const key = `${levelId}_${w.zh}`;
        return !!needsReviewCards[key] || !masteredCards[key];
      });
      return reviewWords.length > 0 ? reviewWords : rawWords;
    }
    if (studyFilter === "mastered") {
      const masteredWords = rawWords.filter((w) => !!masteredCards[`${levelId}_${w.zh}`]);
      return masteredWords.length > 0 ? masteredWords : rawWords;
    }
    return rawWords;
  }, [rawWords, studyFilter, levelId, needsReviewCards, masteredCards, dueKeysInLessonSet]);

  const words = useMemo(() => {
    if (!isShuffled || !shuffledIndices || shuffledIndices.length !== studyPool.length) {
      return studyPool;
    }
    return shuffledIndices.map((i) => studyPool[i]);
  }, [studyPool, isShuffled, shuffledIndices]);

  const currentWord = words[currentIdx] || words[0];

  const handleSpeak = useCallback(
    async (text: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!text) return;
      await speakChinese(text, 0.9);
    },
    []
  );

  const handleNext = useCallback(() => {
    if (words.length === 0) return;
    setIsFlipped(false);
    if (currentIdx < words.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      if (isAutoPlay && words[nextIdx]?.zh) {
        speakChinese(words[nextIdx].zh, 0.9);
      }
    } else {
      setIsRoundFinished(true);
      const allMastered = words.every((w) => !!masteredCards[`${levelId}_${w.zh}`]);
      if (allMastered) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  }, [currentIdx, words, isAutoPlay, masteredCards, levelId]);

  const handlePrev = useCallback(() => {
    if (words.length === 0) return;
    setIsFlipped(false);
    if (currentIdx > 0) {
      const prevIdx = currentIdx - 1;
      setCurrentIdx(prevIdx);
      if (isAutoPlay && words[prevIdx]?.zh) {
        speakChinese(words[prevIdx].zh, 0.9);
      }
    }
  }, [currentIdx, words, isAutoPlay]);

  const handleShuffleToggle = useCallback(() => {
    if (!isShuffled) {
      const indices = studyPool.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledIndices(indices);
      setIsShuffled(true);
      setCurrentIdx(0);
      setIsFlipped(false);
      setIsRoundFinished(false);
    } else {
      setIsShuffled(false);
      setShuffledIndices(null);
      setCurrentIdx(0);
      setIsFlipped(false);
      setIsRoundFinished(false);
    }
  }, [isShuffled, studyPool]);

  const currentKey = currentWord ? `${levelId}_${currentWord.zh}` : "";
  const isMastered = !!masteredCards[currentKey];

  const handleRateCard = (remembered: boolean) => {
    if (!currentKey) return;
    onMarkCard(currentKey, remembered);

    if (islandTimerRef.current) {
      clearTimeout(islandTimerRef.current);
    }
    if (remembered) {
      playSuccessChime();
      const prevRec = cardMemory[currentKey];
      const repetitions = (prevRec?.repetitions || 0) + 1;
      let text = "Đã nhớ · Nhắc lại sau 1 ngày";
      if (repetitions === 2) text = "Đã nhớ · Nhắc lại sau 3 ngày";
      else if (repetitions === 3) text = "Đã nhớ · Nhắc lại sau 7 ngày";
      else if (repetitions === 4) text = "Đã nhớ · Nhắc lại sau 14 ngày";
      else if (repetitions > 4) text = "Đã nhớ · Nhắc lại sau 1-3 tháng";
      setIslandToast({ type: "good", text });
    } else {
      playErrorBuzz();
      setIslandToast({ type: "again", text: "Chưa nhớ · Sẽ nhắc lại sau 10 phút" });
    }

    islandTimerRef.current = setTimeout(() => {
      setIslandToast(null);
    }, 2200);

    handleNext();
  };

  const handleResetRound = (newFilter: "all" | "review" | "mastered" | "due" = studyFilter) => {
    setStudyFilter(newFilter);
    setCurrentIdx(0);
    setIsFlipped(false);
    setIsRoundFinished(false);
    setIsShuffled(false);
    setShuffledIndices(null);
    setIslandToast(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === "1") {
        e.preventDefault();
        handleRateCard(false);
      } else if (e.key === "2" || e.key === "m" || e.key === "M") {
        e.preventDefault();
        handleRateCard(true);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleShuffleToggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleNext, handlePrev, handleShuffleToggle, currentKey, isMastered]);

  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rawWords;
    return rawWords.filter(
      (w) =>
        w.zh.includes(q) ||
        w.py.toLowerCase().includes(q) ||
        w.vi.toLowerCase().includes(q) ||
        w.hv.toLowerCase().includes(q)
    );
  }, [rawWords, searchQuery]);

  const masteredCount = rawWords.filter((w) => !!masteredCards[`${levelId}_${w.zh}`]).length;
  const unmasteredWords = rawWords.filter((w) => {
    const key = `${levelId}_${w.zh}`;
    return !!needsReviewCards[key] || !masteredCards[key];
  });
  const unmasteredCount = unmasteredWords.length;

  if (!lesson || rawWords.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white border border-[#E5E3DF] rounded-2xl p-8 text-center text-slate-500">
          Chưa có dữ liệu từ vựng cho bài học này.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 lg:h-full lg:overflow-hidden select-none relative">
      {/* Clean, Elegant Floating Pill Notification - Unified 3-Color Palette */}
      {islandToast && (
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-[80] pointer-events-none select-none animate-island-drop">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/95 text-[#222B25] text-xs font-semibold rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-[#E5E3DF] backdrop-blur-md">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                islandToast.type === "good"
                  ? "bg-[#24523B] shadow-[0_0_8px_rgba(36,82,59,0.5)]"
                  : "bg-slate-400 shadow-[0_0_8px_rgba(100,116,139,0.5)]"
              }`}
            />
            {islandToast.type === "good" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#24523B] shrink-0" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className="tracking-tight font-medium text-[#222B25]">
              {islandToast.text}
            </span>
          </div>
        </div>
      )}

      <StageHeader
        currentIndex={viewTab === "card" ? currentIdx : 0}
        totalCount={viewTab === "card" ? words.length : 0}
      >
        <div className="w-full flex items-center justify-between gap-2 py-0.5">
          {/* Left: filter pills (scrollable on mobile) */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar">
            {/* Spaced Repetition Filter Pill */}
            <div className="inline-flex items-center h-8 rounded-xl border border-[#E5E3DF] bg-white p-0.5 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => handleResetRound("all")}
                className={`h-full px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                  studyFilter === "all"
                    ? "bg-[#24523B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Học tất cả từ vựng trong bài"
              >
                Tất cả ({rawWords.length})
              </button>
              {dueCountInLesson > 0 && (
                <button
                  type="button"
                  onClick={() => handleResetRound("due")}
                  className={`h-full px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                    studyFilter === "due"
                      ? "bg-[#24523B] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Chỉ ôn các từ đã đến lịch nhắc lại"
                >
                  <BellRing className="w-3 h-3" />
                  <span className="hidden sm:inline">Đến hạn ({dueCountInLesson})</span>
                  <span className="sm:hidden">Hạn ({dueCountInLesson})</span>
                </button>
              )}
              {unmasteredCount > 0 && (
                <button
                  type="button"
                  onClick={() => handleResetRound("review")}
                  className={`h-full px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                    studyFilter === "review"
                      ? "bg-[#24523B] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Chỉ ôn lại các từ chưa nhớ"
                >
                  <span className="hidden sm:inline">Cần nhắc lại ({unmasteredCount})</span>
                  <span className="sm:hidden">Nhắc ({unmasteredCount})</span>
                </button>
              )}
            </div>
            {/* View mode toggle pill */}
            <div className="inline-flex items-center h-8 rounded-xl border border-[#E5E3DF] bg-white p-0.5 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setViewTab("card")}
                className={`h-full px-2 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                  viewTab === "card"
                    ? "bg-[#24523B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden min-[380px]:inline">Thẻ</span>
              </button>
              <button
                type="button"
                onClick={() => setViewTab("table")}
                className={`h-full px-2 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                  viewTab === "table"
                    ? "bg-[#24523B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ListFilter className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden min-[380px]:inline">Bảng</span>
              </button>
            </div>
          </div>
          {/* Right: icon-only tools */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={handleToggleAutoPlay}
              aria-pressed={isAutoPlay}
              aria-label={isAutoPlay ? "Tắt tự động đọc" : "Bật tự động đọc"}
              className={stageIconBtnClass(isAutoPlay)}
              title={isAutoPlay ? "Đang bật tự động đọc (Bấm để tắt)" : "Đang tắt tự động đọc (Bấm để bật)"}
            >
              {isAutoPlay ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleShuffleToggle}
              aria-pressed={isShuffled}
              aria-label="Trộn ngẫu nhiên thẻ"
              className={stageIconBtnClass(isShuffled)}
              title="Trộn ngẫu nhiên thẻ [Phím S]"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </StageHeader>

      {/* VIEW 1: Spaced Repetition 3D Flashcard Stage (ZERO BANNERS ON CARD) */}
      {viewTab === "card" ? (
        <div className="flex-1 min-h-0 overflow-y-auto sm:overflow-hidden flex flex-col items-center justify-center px-3 sm:px-6 xl:px-8 py-2 sm:py-4 relative touch-scroll">
          {!isRoundFinished ? (
            <div className="w-full max-w-lg sm:max-w-xl flex flex-col items-center justify-center space-y-3 sm:space-y-4 my-auto">
              {/* 3D Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="perspective-1000 w-full h-[240px] xs:h-[270px] sm:h-[320px] cursor-pointer select-none"
              >
                <div
                  className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
                    isFlipped ? "rotate-y-180" : ""
                  }`}
                >
                  {/* FRONT FACE */}
                  <div className="absolute inset-0 backface-hidden w-full h-full bg-white rounded-3xl p-6 sm:p-7 border border-[#E5E3DF] shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col items-center justify-center text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRateCard(!isMastered);
                      }}
                      className={`absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl border transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                        isMastered
                          ? "bg-[#24523B] text-white border-[#24523B] shadow-2xs"
                          : "text-slate-300 hover:text-[#24523B] border-[#E5E3DF] hover:bg-[#FAF9F6]"
                      }`}
                      title={isMastered ? "Đã thuộc" : "Đánh dấu đã thuộc [Phím 2]"}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    {/* Character Calligraphy */}
                    <div className="space-y-3">
                      <div
                        className={`hanzi font-normal text-slate-900 tracking-wide ${
                          (currentWord?.zh?.length || 0) <= 2
                            ? "text-5xl xs:text-6xl sm:text-7xl md:text-8xl"
                            : "text-3xl xs:text-4xl sm:text-5xl md:text-6xl"
                        }`}
                      >
                        {currentWord?.zh}
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleSpeak(currentWord.zh, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF9F6] text-slate-700 hover:bg-[#24523B] hover:text-white border border-[#E5E3DF] text-xs font-semibold transition-all cursor-pointer shadow-2xs outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Phát âm</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* BACK FACE */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full bg-[#24523B] text-white rounded-3xl p-5 sm:p-6 border border-[#24523B] shadow-xl overflow-hidden flex flex-col items-center justify-center text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRateCard(!isMastered);
                      }}
                      className={`absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl border transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                        isMastered
                          ? "bg-white/25 text-white border-white/30"
                          : "text-white/40 hover:text-white border-white/20 hover:bg-white/10"
                      }`}
                      title={isMastered ? "Đã thuộc" : "Đánh dấu đã thuộc [Phím 2]"}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    <div className="space-y-2 max-w-md">
                      <div className="hanzi text-3xl sm:text-4xl text-white/95 font-normal leading-tight">
                        {currentWord?.zh}
                      </div>

                      <div className="text-xl sm:text-2xl font-bold text-[#D1E7DD] tracking-wider">
                        {currentWord?.py}
                      </div>

                      {currentWord?.hv && (
                        <div className="text-xs text-slate-300 italic">
                          Hán Việt: {currentWord.hv}
                        </div>
                      )}

                      <div className="text-base sm:text-lg font-editorial-serif text-white pt-2 border-t border-white/15 leading-snug">
                        &ldquo;{currentWord?.vi}&rdquo;
                      </div>

                      <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                        {currentWord?.pos && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                            {currentWord.pos}
                          </span>
                        )}
                        {cardMemory[currentKey]?.nextReview && nowSnapshot !== null && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] text-slate-300">
                            <CalendarClock className="w-3 h-3 text-[#D1E7DD]" />
                            <span>{formatNextReview(cardMemory[currentKey], nowSnapshot)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons with Spaced Repetition Rating - Unified 3-Color Palette */}
              {/* Desktop view (sm+) */}
              <div className="hidden sm:flex items-center justify-between gap-2.5 w-full pt-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className="h-11 px-3.5 rounded-2xl bg-white border border-[#E5E3DF] text-[#222B25] hover:border-[#24523B] flex items-center justify-center shadow-2xs transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  title="Thẻ trước [Phím ←]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleRateCard(false)}
                  className="flex-1 h-11 px-3.5 rounded-2xl bg-white border border-[#E5E3DF] hover:border-[#24523B] hover:bg-[#FAF9F6] text-[#222B25] font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  title="Nhắc lại từ này sau 10 phút [Phím 1]"
                >
                  <XCircle className="w-4 h-4 text-slate-400" />
                  <span>Chưa nhớ [1]</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="px-6 h-11 rounded-2xl bg-[#24523B] hover:bg-[#2D6448] text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                  title="Lật thẻ [Phím Space]"
                >
                  <RotateCw className="w-3.5 h-3.5 text-white/80" />
                  <span>Lật thẻ [Space]</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRateCard(true)}
                  className="flex-1 h-11 px-3.5 rounded-2xl bg-white border border-[#24523B] text-[#24523B] hover:bg-[#24523B] hover:text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  title="Đã thuộc [Phím 2]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đã nhớ [2]</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="h-11 px-3.5 rounded-2xl bg-white border border-[#E5E3DF] text-[#222B25] hover:border-[#24523B] flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                  title="Thẻ sau [Phím →]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile view (< sm): Ergonomic 2-row layout */}
              <div className="flex sm:hidden flex-col gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="w-full h-11 rounded-2xl bg-[#24523B] hover:bg-[#2D6448] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <RotateCw className="w-4 h-4 text-white/80" />
                  <span>{isFlipped ? "Xem chữ Hán" : "Lật xem nghĩa"}</span>
                </button>

                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentIdx === 0}
                    className="h-10.5 w-11 rounded-2xl bg-white border border-[#E5E3DF] text-[#222B25] flex items-center justify-center shadow-2xs transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0 active:scale-95"
                    title="Thẻ trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRateCard(false)}
                    className="flex-1 h-10.5 px-2 rounded-2xl bg-white border border-[#E5E3DF] hover:bg-[#FAF9F6] text-[#222B25] font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Chưa nhớ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRateCard(true)}
                    className="flex-1 h-10.5 px-2 rounded-2xl bg-[#24523B]/10 border border-[#24523B] text-[#24523B] font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#24523B] shrink-0" />
                    <span>Đã nhớ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="h-10.5 w-11 rounded-2xl bg-white border border-[#E5E3DF] text-[#222B25] flex items-center justify-center shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95"
                    title="Thẻ sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Round Completion Summary Screen */
            <div className="w-full max-w-md bg-white border border-[#E5E3DF] rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 my-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF9F6] border border-[#E5E3DF] text-[#24523B] flex items-center justify-center mx-auto shadow-2xs">
                {unmasteredCount === 0 ? (
                  <Award className="w-7 h-7 text-[#24523B]" />
                ) : (
                  <RotateCcw className="w-7 h-7 text-slate-700" />
                )}
              </div>

              <div>
                <span className="micro-caps text-slate-400">
                  Hoàn thành vòng học {studyFilter === "review" ? "nhắc lại" : studyFilter === "due" ? "từ đến hạn" : `bài ${lessonIdx + 1}`}
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {unmasteredCount === 0 ? "Tuyệt vời! Đã thuộc toàn bộ" : "Tổng kết vòng học"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {unmasteredCount === 0
                    ? `Bạn đã thuộc trọn vẹn ${rawWords.length} từ của bài học này. Hệ thống sẽ tự động nhắc lại sau 1 / 3 / 7 / 14 ngày!`
                    : `Bạn đã thuộc ${masteredCount}/${rawWords.length} từ. Còn ${unmasteredCount} từ cần nhắc lại để nhớ lâu.`}
                </p>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-[#FAF9F6] rounded-2xl border border-[#E5E3DF]">
                <div className="p-2 text-center">
                  <div className="text-2xl font-bold text-[#24523B]">{masteredCount}</div>
                  <div className="text-[11px] text-slate-500">Từ đã thuộc</div>
                </div>
                <div className="p-2 text-center border-l border-[#E5E3DF]">
                  <div className="text-2xl font-bold text-slate-700">{unmasteredCount}</div>
                  <div className="text-[11px] text-slate-500">Cần nhắc lại</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {unmasteredCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleResetRound("review")}
                    className="w-full py-3 px-4 bg-[#24523B] hover:bg-[#2D6448] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ôn lại ngay {unmasteredCount} từ chưa nhớ</span>
                  </button>
                ) : (
                  onNextLesson && (
                    <button
                      type="button"
                      onClick={onNextLesson}
                      className="w-full py-3 px-4 bg-[#24523B] hover:bg-[#2D6448] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
                    >
                      <span>Sang bài tiếp theo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => handleResetRound("all")}
                  className="w-full py-2.5 px-4 bg-white hover:bg-[#FAF9F6] text-slate-700 font-semibold text-xs rounded-xl border border-[#E5E3DF] transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
                >
                  <span>Học lại tất cả {rawWords.length} từ</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: Full Vocabulary Table with Review Schedule Column */
        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 xl:px-8 py-4 sm:py-6 touch-scroll">
          <div className="w-full bg-white rounded-2xl border border-[#E5E3DF] shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#E5E3DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="micro-caps text-slate-400">Danh mục từ vựng</span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">
                  Bài {lessonIdx + 1}: {lesson.t} ({rawWords.length} từ)
                </h4>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo chữ, pinyin, nghĩa..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E3DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#24523B]"
                />
              </div>
            </div>

            {/* Mobile: card list (no horizontal scroll) */}
            <div className="md:hidden divide-y divide-[#E5E3DF]">
              {filteredWords.map((w, idx) => {
                const key = `${levelId}_${w.zh}`;
                const isWordMastered = !!masteredCards[key];
                const isWordNeedsReview = !!needsReviewCards[key];
                const isCardActive = words[currentIdx]?.zh === w.zh;
                const rec = cardMemory[key];
                const reviewLabel =
                  !rec || !rec.nextReview || nowSnapshot === null
                    ? null
                    : formatNextReview(rec, nowSnapshot);
                const isDue =
                  !!rec?.nextReview && nowSnapshot !== null && rec.nextReview <= nowSnapshot;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      const newIdx = words.findIndex((item) => item.zh === w.zh);
                      if (newIdx !== -1) {
                        setCurrentIdx(newIdx);
                        setIsFlipped(false);
                        setViewTab("card");
                        setIsRoundFinished(false);
                      }
                    }}
                    className={`w-full flex items-start gap-2.5 p-3.5 text-left cursor-pointer transition-colors active:bg-[#FAF9F6] ${
                      isCardActive ? "bg-[#FAF9F6]/70" : ""
                    }`}
                  >
                    <span className="w-5 shrink-0 pt-1 text-center text-[11px] font-mono text-slate-400">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="hanzi text-xl font-bold text-slate-900 whitespace-nowrap shrink-0">
                          {w.zh}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleSpeak(w.zh, e)}
                          aria-label={`Nghe ${w.zh}`}
                          className="p-1 -m-1 text-slate-400 hover:text-slate-800 active:scale-95 transition-all shrink-0 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-semibold text-[#24523B] min-w-0 break-words">
                          {w.py}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[13px] leading-snug text-slate-700 line-clamp-2">
                        {w.vi}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-slate-400 truncate">
                        {w.hv ? `${w.hv}` : ""}
                        {w.hv && (reviewLabel || !rec) ? " · " : ""}
                        {reviewLabel ? (
                          <span className={`font-semibold ${isDue ? "text-[#24523B]" : "text-slate-500"}`}>
                            {reviewLabel}
                          </span>
                        ) : !rec ? (
                          "Chưa học"
                        ) : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkCard(key, !isWordMastered);
                      }}
                      className={`mt-0.5 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all shrink-0 cursor-pointer ${
                        isWordMastered
                          ? "bg-[#24523B] text-white border-[#24523B]"
                          : isWordNeedsReview
                          ? "bg-[#FAF9F6] text-[#222B25] border-[#E5E3DF]"
                          : "text-slate-400 border-[#E5E3DF]"
                      }`}
                    >
                      {isWordMastered ? "Đã thuộc" : isWordNeedsReview ? "Cần ôn" : "Học"}
                    </button>
                  </div>
                );
              })}
              {filteredWords.length === 0 && (
                <p className="p-6 text-center text-xs text-slate-400">
                  Không tìm thấy từ nào khớp “{searchQuery}”.
                </p>
              )}
            </div>
            {/* Desktop: full table */}
            <div className="hidden md:block overflow-x-auto touch-scroll">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] text-xs text-slate-500 font-semibold border-b border-[#E5E3DF]">
                    <th className="py-2.5 px-3 sm:px-4 w-10 text-center whitespace-nowrap">STT</th>
                    <th className="py-2.5 px-3 sm:px-4 w-10 whitespace-nowrap">Nghe</th>
                    <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Chữ Hán</th>
                    <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Pinyin</th>
                    <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Hán Việt</th>
                    <th className="py-2.5 px-3 sm:px-4 min-w-[140px]">Nghĩa tiếng Việt</th>
                    <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Lịch nhắc lại</th>
                    <th className="py-2.5 px-3 sm:px-4 text-center whitespace-nowrap">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DF]">
                  {filteredWords.map((w, idx) => {
                    const key = `${levelId}_${w.zh}`;
                    const isWordMastered = !!masteredCards[key];
                    const isWordNeedsReview = !!needsReviewCards[key];
                    const isCardActive = words[currentIdx]?.zh === w.zh;
                    return (
                      <tr
                        key={idx}
                        onClick={() => {
                          const newIdx = words.findIndex((item) => item.zh === w.zh);
                          if (newIdx !== -1) {
                            setCurrentIdx(newIdx);
                            setIsFlipped(false);
                            setViewTab("card");
                            setIsRoundFinished(false);
                          }
                        }}
                        className={`cursor-pointer transition-colors ${
                          isCardActive ? "bg-[#FAF9F6] font-medium" : "hover:bg-[#FAF9F6]/50"
                        }`}
                      >
                        <td className="py-2.5 px-4 text-xs text-slate-400 text-center">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <button
                            type="button"
                            onClick={(e) => handleSpeak(w.zh, e)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-2.5 px-4 hanzi text-xl font-bold text-slate-900">
                          {w.zh}
                        </td>
                        <td className="py-2.5 px-4 text-[#24523B] font-semibold text-xs">
                          {w.py}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 italic text-xs">
                          {w.hv || "—"}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 text-xs">
                          {w.vi}
                        </td>
                        <td className="py-2.5 px-4 text-xs">
                          {(() => {
                            const rec = cardMemory[key];
                            if (!rec || !rec.nextReview) return <span className="text-slate-400">—</span>;
                            if (nowSnapshot === null) return <span className="text-slate-400">—</span>;
                            const isDue = rec.nextReview <= nowSnapshot;
                            return (
                              <span className={`font-semibold ${isDue ? "text-[#24523B]" : "text-slate-600"}`}>
                                {formatNextReview(rec, nowSnapshot)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkCard(key, !isWordMastered);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              isWordMastered
                                ? "bg-[#24523B] text-white border-[#24523B]"
                                : isWordNeedsReview
                                ? "bg-[#FAF9F6] text-[#222B25] border-[#E5E3DF]"
                                : "text-slate-400 border-[#E5E3DF] hover:bg-slate-100"
                            }`}
                          >
                            {isWordMastered ? "Đã thuộc" : isWordNeedsReview ? "Cần nhắc lại" : "Chưa học"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

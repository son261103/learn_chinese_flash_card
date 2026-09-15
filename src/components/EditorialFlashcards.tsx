"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  Check,
  Search,
  BookOpen,
  ChevronDown,
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
  onOpenTopicModal: () => void;
  masteredCards: Record<string, boolean>;
  needsReviewCards: Record<string, boolean>;
  cardMemory: Record<string, CardMemoryRecord>;
  onMarkCard: (key: string, isMastered: boolean) => void;
  onNextLesson?: () => void;
}

const FLASHCARD_AUTOPLAY_KEY = "hsk_flashcard_autoplay_v1";

export function EditorialFlashcards({
  lesson,
  lessonIdx,
  levelId,
  onOpenTopicModal,
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

  // Persist autoplay preference in localStorage
  const [isAutoPlay, setIsAutoPlay] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(FLASHCARD_AUTOPLAY_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [viewTab, setViewTab] = useState<"card" | "table">("card");
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastScheduleMsg, setLastScheduleMsg] = useState<string | null>(null);

  // Snapshot timestamp once at mount to keep render pure
  const [nowSnapshot] = useState(() => Date.now());

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
      // Completed round
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

    // Show immediate scheduling feedback: when this word will be reminded again
    if (remembered) {
      playSuccessChime();
      const prevRec = cardMemory[currentKey];
      const repetitions = (prevRec?.repetitions || 0) + 1;
      if (repetitions === 1) {
        setLastScheduleMsg("Nhắc lại từ này sau 1 ngày");
      } else if (repetitions === 2) {
        setLastScheduleMsg("Nhắc lại từ này sau 3 ngày");
      } else if (repetitions === 3) {
        setLastScheduleMsg("Nhắc lại từ này sau 7 ngày");
      } else if (repetitions === 4) {
        setLastScheduleMsg("Nhắc lại từ này sau 14 ngày");
      } else {
        setLastScheduleMsg("Nhắc lại từ này sau 1-3 tháng");
      }
    } else {
      playErrorBuzz();
      setLastScheduleMsg("Sẽ nhắc lại từ này sau 10 phút");
    }

    handleNext();
  };

  const handleResetRound = (newFilter: "all" | "review" | "mastered" | "due" = studyFilter) => {
    setStudyFilter(newFilter);
    setCurrentIdx(0);
    setIsFlipped(false);
    setIsRoundFinished(false);
    setIsShuffled(false);
    setShuffledIndices(null);
    setLastScheduleMsg(null);
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
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden select-none">
      {/* Top Bar Header */}
      <div className="h-14 px-4 sm:px-6 xl:px-8 border-b border-[#E5E3DF] flex items-center justify-between bg-[#FAF9F6] sticky top-0 z-10 shrink-0">
        {/* Left: Level + Lesson */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-9 px-3 inline-flex items-center justify-center text-xs font-bold tracking-tight rounded-xl bg-[#1C1C1C] text-white shadow-xs shrink-0">
            {levelId.toUpperCase()}
          </span>

          <button
            type="button"
            onClick={onOpenTopicModal}
            className="h-9 px-3.5 inline-flex items-center gap-2 text-xs sm:text-sm font-semibold rounded-xl border border-[#E5E3DF] bg-white text-slate-800 hover:border-slate-400 hover:bg-[#FAF9F6] transition-all shadow-2xs group cursor-pointer truncate"
            title="Đổi bài học"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-[260px]">
              Bài {lessonIdx + 1}: {lesson.t}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 ml-0.5" />
          </button>
        </div>

        {/* Right: Spaced Repetition Filter, View Toggle, Audio Toggle, Shuffle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Spaced Repetition Filter Pill */}
          <div className="inline-flex items-center h-9 rounded-xl border border-[#E5E3DF] bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleResetRound("all")}
              className={`h-full px-2.5 sm:px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                studyFilter === "all"
                  ? "bg-[#1C1C1C] text-white shadow-xs"
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
                className={`h-full px-2.5 sm:px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  studyFilter === "due"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
                title="Chỉ ôn các từ đã đến lịch nhắc lại"
              >
                <BellRing className="w-3 h-3" />
                <span>Đến hạn ({dueCountInLesson})</span>
              </button>
            )}

            {unmasteredCount > 0 && (
              <button
                type="button"
                onClick={() => handleResetRound("review")}
                className={`h-full px-2.5 sm:px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  studyFilter === "review"
                    ? "bg-amber-800 text-white shadow-xs"
                    : "text-amber-800 hover:bg-amber-50"
                }`}
                title="Chỉ ôn lại các từ chưa nhớ"
              >
                <span>Cần nhắc lại ({unmasteredCount})</span>
              </button>
            )}
          </div>

          {/* View mode toggle pill */}
          <div className="inline-flex items-center h-9 rounded-xl border border-[#E5E3DF] bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewTab("card")}
              className={`h-full px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewTab === "card"
                  ? "bg-[#1C1C1C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Thẻ học</span>
            </button>
            <button
              type="button"
              onClick={() => setViewTab("table")}
              className={`h-full px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewTab === "table"
                  ? "bg-[#1C1C1C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Bảng từ</span>
            </button>
          </div>

          {/* Sound Mute/Unmute Toggle Button */}
          <button
            type="button"
            onClick={handleToggleAutoPlay}
            className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isAutoPlay
                ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                : "bg-white text-slate-500 border-[#E5E3DF] hover:border-slate-400"
            }`}
            title={isAutoPlay ? "Đang bật tự động đọc (Bấm để tắt)" : "Đang tắt tự động đọc (Bấm để bật)"}
          >
            {isAutoPlay ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">
              {isAutoPlay ? "Âm thanh" : "Tắt âm"}
            </span>
          </button>

          {/* Shuffle button */}
          <button
            type="button"
            onClick={handleShuffleToggle}
            className={`h-9 w-9 rounded-xl border transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
              isShuffled
                ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                : "bg-white text-slate-600 border-[#E5E3DF] hover:border-slate-400"
            }`}
            title="Trộn ngẫu nhiên thẻ [Phím S]"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* VIEW 1: Spaced Repetition 3D Flashcard Stage */}
      {viewTab === "card" ? (
        <div className="flex-1 overflow-hidden flex flex-col items-center justify-center px-4 sm:px-6 xl:px-8 py-2 relative">
          {!isRoundFinished ? (
            <div className="w-full max-w-lg sm:max-w-xl flex flex-col items-center justify-center space-y-4 my-auto">
              {/* Top Indicator & Progress Line */}
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span className="font-mono font-bold text-slate-800">
                    Thẻ {currentIdx + 1} / {words.length}
                  </span>
                  <div className="flex items-center gap-2">
                    {studyFilter === "review" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                        Chế độ nhắc lại
                      </span>
                    )}
                    {studyFilter === "due" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold">
                        Ôn từ đến hạn
                      </span>
                    )}
                    <span className="text-emerald-700 font-medium">
                      Đã thuộc: <strong>{masteredCount}</strong>/{rawWords.length}
                    </span>
                  </div>
                </div>

                {/* Smooth Progress Bar */}
                <div className="h-1.5 bg-[#E5E3DF] w-full rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1C1C1C] rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentIdx + 1) / words.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Daily Review Banner for current lesson */}
                {dueCountInLesson > 0 && studyFilter !== "due" && (
                  <button
                    type="button"
                    onClick={() => handleResetRound("due")}
                    className="w-full py-1.5 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-rose-100 transition-colors"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Bài này có {dueCountInLesson} từ đến hạn ôn lại hôm nay. Bấm để ôn ngay!</span>
                  </button>
                )}
              </div>

              {/* 3D Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="perspective-1000 w-full h-[270px] sm:h-[310px] cursor-pointer select-none"
              >
                <div
                  className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
                    isFlipped ? "rotate-y-180" : ""
                  }`}
                >
                  {/* FRONT FACE */}
                  <div className="absolute inset-0 backface-hidden w-full h-full bg-white rounded-3xl p-6 sm:p-7 border border-[#E5E3DF] shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between items-center text-center">
                    <div className="w-full flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRateCard(!isMastered);
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isMastered
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-2xs"
                            : "text-slate-300 hover:text-emerald-600 border-[#E5E3DF] hover:bg-emerald-50"
                        }`}
                        title={isMastered ? "Đã thuộc" : "Đánh dấu đã thuộc [Phím 2]"}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Character Calligraphy */}
                    <div className="my-auto space-y-3">
                      <div className="hanzi text-6xl sm:text-7xl md:text-8xl font-normal text-[#1C1C1C] tracking-wide">
                        {currentWord?.zh}
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleSpeak(currentWord.zh, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF9F6] text-slate-700 hover:bg-[#1C1C1C] hover:text-white border border-[#E5E3DF] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Phát âm</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Bấm thẻ hoặc nhấn Space để lật</span>
                    </div>
                  </div>

                  {/* BACK FACE */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full bg-[#1C1C1C] text-white rounded-3xl p-6 sm:p-7 border border-[#1C1C1C] shadow-2xl flex flex-col justify-between items-center text-center">
                    <div className="w-full flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRateCard(!isMastered);
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isMastered
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "text-white/40 hover:text-white border-white/20 hover:bg-white/10"
                        }`}
                        title={isMastered ? "Đã thuộc" : "Đánh dấu đã thuộc [Phím 2]"}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="my-auto space-y-3 max-w-md">
                      <div className="hanzi text-3xl sm:text-4xl text-white/95 font-normal">
                        {currentWord?.zh}
                      </div>

                      <div className="text-2xl sm:text-3xl font-bold text-amber-300 tracking-wider">
                        {currentWord?.py}
                      </div>

                      {currentWord?.hv && (
                        <div className="text-xs sm:text-sm text-slate-400 italic">
                          Hán Việt: {currentWord.hv}
                        </div>
                      )}

                      <div className="text-lg sm:text-xl font-editorial-serif text-white pt-2 border-t border-white/15 leading-snug">
                        &ldquo;{currentWord?.vi}&rdquo;
                      </div>

                      {currentWord?.pos && (
                        <div className="pt-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                            {currentWord.pos}
                          </span>
                        </div>
                      )}

                      {/* Next scheduled review display */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] text-slate-300">
                        <CalendarClock className="w-3 h-3 text-amber-300" />
                        <span>{formatNextReview(cardMemory[currentKey])}</span>
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-between text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={(e) => handleSpeak(currentWord.zh, e)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-medium cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Nghe lại</span>
                      </button>

                      <span>Bấm để quay lại chữ Hán</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Last schedule feedback message */}
              {lastScheduleMsg && (
                <div className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center">
                  ✓ {lastScheduleMsg}
                </div>
              )}

              {/* Action Buttons with Spaced Repetition Rating */}
              <div className="flex items-center justify-between gap-2.5 w-full pt-1">
                {/* Previous */}
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className="h-11 px-3 rounded-2xl bg-white border border-[#E5E3DF] text-slate-600 hover:border-slate-400 flex items-center justify-center shadow-2xs transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  title="Thẻ trước [Phím ←]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Chưa nhớ (Again) */}
                <button
                  type="button"
                  onClick={() => handleRateCard(false)}
                  className="flex-1 h-11 px-3 rounded-2xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-800 font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  title="Nhắc lại từ này sau 10 phút [Phím 1]"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Chưa nhớ [1]</span>
                </button>

                {/* Flip Space */}
                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="h-11 px-4 rounded-2xl bg-white border border-[#E5E3DF] text-slate-800 font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all hover:bg-[#FAF9F6] cursor-pointer"
                  title="Lật thẻ [Phím Space]"
                >
                  <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Lật</span>
                </button>

                {/* Đã nhớ (Good) */}
                <button
                  type="button"
                  onClick={() => handleRateCard(true)}
                  className="flex-1 h-11 px-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  title="Đã thuộc, tự động nhắc lại sau vài ngày [Phím 2]"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã nhớ [2]</span>
                </button>

                {/* Next */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="h-11 px-3 rounded-2xl bg-white border border-[#E5E3DF] text-slate-600 hover:border-slate-400 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                  title="Bỏ qua / Thẻ sau [Phím →]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Keyboard Shortcuts Helper */}
              <div className="text-center text-[11px] text-slate-400">
                Phím tắt: <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E3DF] rounded font-mono">1</kbd> Chưa nhớ ·{" "}
                <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E3DF] rounded font-mono">2</kbd> Đã nhớ ·{" "}
                <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E3DF] rounded font-mono">Space</kbd> Lật ·{" "}
                <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E3DF] rounded font-mono">←</kbd> Trước ·{" "}
                <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E3DF] rounded font-mono">→</kbd> Tiếp
              </div>
            </div>
          ) : (
            /* Round Completion Summary Screen */
            <div className="w-full max-w-md bg-white border border-[#E5E3DF] rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 my-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                {unmasteredCount === 0 ? (
                  <Award className="w-7 h-7 text-amber-600" />
                ) : (
                  <RotateCcw className="w-7 h-7 text-amber-700" />
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
                  <div className="text-2xl font-bold text-emerald-600">{masteredCount}</div>
                  <div className="text-[11px] text-slate-500">Từ đã thuộc</div>
                </div>
                <div className="p-2 text-center border-l border-[#E5E3DF]">
                  <div className="text-2xl font-bold text-amber-700">{unmasteredCount}</div>
                  <div className="text-[11px] text-slate-500">Cần nhắc lại</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {unmasteredCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleResetRound("review")}
                    className="w-full py-3 px-4 bg-[#1C1C1C] hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ôn lại ngay {unmasteredCount} từ chưa nhớ</span>
                  </button>
                ) : (
                  onNextLesson && (
                    <button
                      type="button"
                      onClick={onNextLesson}
                      className="w-full py-3 px-4 bg-[#1C1C1C] hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Sang bài tiếp theo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => handleResetRound("all")}
                  className="w-full py-2.5 px-4 bg-white hover:bg-[#FAF9F6] text-slate-700 font-semibold text-xs rounded-xl border border-[#E5E3DF] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Học lại tất cả {rawWords.length} từ</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: Full Vocabulary Table with Review Schedule Column */
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 xl:px-8 py-6">
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
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E3DF] rounded-xl focus:outline-hidden focus:border-[#1C1C1C]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] text-xs text-slate-500 font-semibold border-b border-[#E5E3DF]">
                    <th className="py-2.5 px-4 w-12 text-center">STT</th>
                    <th className="py-2.5 px-4 w-12">Nghe</th>
                    <th className="py-2.5 px-4">Chữ Hán</th>
                    <th className="py-2.5 px-4">Pinyin</th>
                    <th className="py-2.5 px-4">Hán Việt</th>
                    <th className="py-2.5 px-4">Nghĩa tiếng Việt</th>
                    <th className="py-2.5 px-4">Lịch nhắc lại</th>
                    <th className="py-2.5 px-4 text-center">Trạng thái</th>
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
                        <td className="py-2.5 px-4 text-amber-700 font-semibold text-xs">
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
                            const isDue = rec.nextReview <= nowSnapshot;
                            return (
                              <span className={`font-semibold ${isDue ? "text-rose-600" : "text-sky-700"}`}>
                                {formatNextReview(rec)}
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
                                ? "bg-emerald-500 text-white border-emerald-500"
                                : isWordNeedsReview
                                ? "bg-rose-50 text-rose-700 border-rose-200"
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

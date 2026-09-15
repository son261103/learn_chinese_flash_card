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
} from "lucide-react";
import { Lesson, Word } from "@/lib/types";
import { tupleToWord } from "@/lib/utils";
import { speakChinese } from "@/utils/diff";
import { playSuccessChime } from "@/lib/sound";

interface EditorialFlashcardsProps {
  lesson: Lesson;
  lessonIdx: number;
  levelId: string;
  onOpenTopicModal: () => void;
  masteredCards: Record<string, boolean>;
  onToggleMastered: (key: string) => void;
}

const FLASHCARD_AUTOPLAY_KEY = "hsk_flashcard_autoplay_v1";
const FLASHCARD_TAB_KEY = "hsk_flashcard_tab_v1";

export function EditorialFlashcards({
  lesson,
  lessonIdx,
  levelId,
  onOpenTopicModal,
  masteredCards,
  onToggleMastered,
}: EditorialFlashcardsProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Persist autoplay preference in localStorage
  const [isAutoPlay, setIsAutoPlay] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(FLASHCARD_AUTOPLAY_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Persist viewTab in localStorage
  const [viewTab, setViewTab] = useState<"card" | "table">(() => {
    if (typeof window === "undefined") return "card";
    try {
      const saved = localStorage.getItem(FLASHCARD_TAB_KEY);
      return saved === "table" ? "table" : "card";
    } catch {
      return "card";
    }
  });

  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleToggleAutoPlay = () => {
    setIsAutoPlay((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(FLASHCARD_AUTOPLAY_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const handleSetViewTab = (tab: "card" | "table") => {
    setViewTab(tab);
    try {
      localStorage.setItem(FLASHCARD_TAB_KEY, tab);
    } catch {}
  };

  const rawWords: Word[] = useMemo(() => {
    if (!lesson || !lesson.w) return [];
    return lesson.w.map((w) => tupleToWord(w, lessonIdx + 1));
  }, [lesson, lessonIdx]);

  const words = useMemo(() => {
    if (!isShuffled || !shuffledIndices || shuffledIndices.length !== rawWords.length) {
      return rawWords;
    }
    return shuffledIndices.map((i) => rawWords[i]);
  }, [rawWords, isShuffled, shuffledIndices]);

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
    const nextIdx = (currentIdx + 1) % words.length;
    setCurrentIdx(nextIdx);
    if (isAutoPlay && words[nextIdx]?.zh) {
      speakChinese(words[nextIdx].zh, 0.9);
    }
  }, [currentIdx, words, isAutoPlay]);

  const handlePrev = useCallback(() => {
    if (words.length === 0) return;
    setIsFlipped(false);
    const prevIdx = (currentIdx - 1 + words.length) % words.length;
    setCurrentIdx(prevIdx);
    if (isAutoPlay && words[prevIdx]?.zh) {
      speakChinese(words[prevIdx].zh, 0.9);
    }
  }, [currentIdx, words, isAutoPlay]);

  const handleShuffleToggle = useCallback(() => {
    if (!isShuffled) {
      const indices = rawWords.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledIndices(indices);
      setIsShuffled(true);
      setCurrentIdx(0);
      setIsFlipped(false);
    } else {
      setIsShuffled(false);
      setShuffledIndices(null);
      setCurrentIdx(0);
      setIsFlipped(false);
    }
  }, [isShuffled, rawWords]);

  const currentKey = currentWord ? `${levelId}_${currentWord.zh}` : "";
  const isMastered = !!masteredCards[currentKey];

  const handleMasterCurrent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentKey) return;
    onToggleMastered(currentKey);
    if (!isMastered) {
      playSuccessChime();
    }
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
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleShuffleToggle();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        if (currentKey) {
          onToggleMastered(currentKey);
          if (!isMastered) playSuccessChime();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, handleShuffleToggle, currentKey, isMastered, onToggleMastered]);

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
      {/* Top Bar Header (Synchronized padding: px-4 sm:px-6 xl:px-8) */}
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

        {/* Right: Counter, View Toggle, Audio Toggle, Shuffle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Card counter */}
          <span className="text-xs font-bold text-slate-700 tracking-tight font-mono px-2 hidden sm:inline">
            {String(currentIdx + 1).padStart(2, "0")}{" "}
            <span className="text-slate-400 font-normal">
              / {String(words.length).padStart(2, "0")}
            </span>
          </span>

          {/* View mode toggle pill */}
          <div className="inline-flex items-center h-9 rounded-xl border border-[#E5E3DF] bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSetViewTab("card")}
              className={`h-full px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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
              onClick={() => handleSetViewTab("table")}
              className={`h-full px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewTab === "table"
                  ? "bg-[#1C1C1C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Bảng từ ({rawWords.length})</span>
            </button>
          </div>

          {/* Sound Mute/Unmute Toggle Button */}
          <button
            type="button"
            onClick={handleToggleAutoPlay}
            className={`h-9 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isAutoPlay
                ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                : "bg-white text-slate-500 border-[#E5E3DF] hover:border-slate-400"
            }`}
            title={isAutoPlay ? "Đang bật tự động đọc (Bấm để tắt)" : "Đang tắt tự động đọc (Bấm để bật)"}
          >
            {isAutoPlay ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
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

      {/* VIEW 1: Standalone 100% Fit-in-One-Screen 3D Flashcard Stage */}
      {viewTab === "card" ? (
        <div className="flex-1 overflow-hidden flex flex-col items-center justify-center px-4 sm:px-6 xl:px-8 py-2 relative">
          <div className="w-full max-w-lg sm:max-w-xl flex flex-col items-center justify-center space-y-4 my-auto">
            {/* Top Indicator */}
            <div className="w-full flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="font-mono font-bold text-slate-800">
                Thẻ {currentIdx + 1} / {words.length}
              </span>
              <div className="flex items-center gap-2">
                {isShuffled && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">
                    Đã trộn
                  </span>
                )}
                <span className="text-emerald-700 font-medium">
                  Đã thuộc: <strong>{masteredCount}</strong>/{rawWords.length}
                </span>
              </div>
            </div>

            {/* 3D Flip Card Container */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="perspective-1000 w-full h-[280px] sm:h-[320px] cursor-pointer select-none"
            >
              <div
                className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
                  isFlipped ? "rotate-y-180" : ""
                }`}
              >
                {/* FRONT FACE (Clean, Uncluttered) */}
                <div className="absolute inset-0 backface-hidden w-full h-full bg-white rounded-3xl p-6 sm:p-7 border border-[#E5E3DF] shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between items-center text-center">
                  <div className="w-full flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleMasterCurrent}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isMastered
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-2xs"
                          : "text-slate-300 hover:text-emerald-600 border-[#E5E3DF] hover:bg-emerald-50"
                      }`}
                      title={isMastered ? "Đã thuộc" : "Đánh dấu đã thuộc [Phím M]"}
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

                {/* BACK FACE (Clean, Charcoal Editorial Back) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full bg-[#1C1C1C] text-white rounded-3xl p-6 sm:p-7 border border-[#1C1C1C] shadow-2xl flex flex-col justify-between items-center text-center">
                  <div className="w-full flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleMasterCurrent}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isMastered
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "text-white/40 hover:text-white border-white/20 hover:bg-white/10"
                      }`}
                      title={isMastered ? "Đã thuộc" : "Đánh dấu đã thuộc [Phím M]"}
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

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={handlePrev}
                className="w-11 h-11 rounded-2xl bg-white border border-[#E5E3DF] text-slate-700 hover:border-slate-400 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                title="Thẻ trước [Phím ←]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="px-6 h-11 rounded-2xl bg-[#1C1C1C] hover:bg-black text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                title="Lật thẻ [Phím Space]"
              >
                <RotateCw className="w-4 h-4" />
                <span>Lật thẻ [Space]</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="w-11 h-11 rounded-2xl bg-white border border-[#E5E3DF] text-slate-700 hover:border-slate-400 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                title="Thẻ tiếp theo [Phím →]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Keyboard Shortcuts Helper Line */}
            <div className="text-center text-[11px] text-slate-400">
              Phím tắt: <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E3DF] rounded font-mono">Space</kbd> Lật ·{" "}
              <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E3DF] rounded font-mono">←</kbd> Trước ·{" "}
              <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E3DF] rounded font-mono">→</kbd> Sau ·{" "}
              <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E3DF] rounded font-mono">S</kbd> Trộn ·{" "}
              <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E3DF] rounded font-mono">M</kbd> Thuộc
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: Full Vocabulary Table (Synchronized padding) */
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
                    <th className="py-2.5 px-4 text-center">Thuộc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DF]">
                  {filteredWords.map((w, idx) => {
                    const isWordMastered = !!masteredCards[`${levelId}_${w.zh}`];
                    const isCardActive = words[currentIdx]?.zh === w.zh;

                    return (
                      <tr
                        key={idx}
                        onClick={() => {
                          const newIdx = words.findIndex((item) => item.zh === w.zh);
                          if (newIdx !== -1) {
                            setCurrentIdx(newIdx);
                            setIsFlipped(false);
                            handleSetViewTab("card");
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
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleMastered(`${levelId}_${w.zh}`);
                            }}
                            className={`p-1 rounded border transition-all cursor-pointer ${
                              isWordMastered
                                ? "bg-emerald-500 text-white border-emerald-500"
                                : "text-slate-300 hover:text-slate-600 border-transparent"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
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

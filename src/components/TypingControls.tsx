"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  Play,
  BookOpen,
  ChevronDown,
  Shuffle,
  MessageSquare,
  Type,
} from "lucide-react";

interface TopControlBarProps {
  currentLevelId: string;
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
  isShuffle?: boolean;
  onToggleShuffle?: () => void;
  showPinyin?: boolean;
  onTogglePinyin?: () => void;
  showMeaning?: boolean;
  onToggleMeaning?: () => void;
  onSpeak?: () => void;
  topicTitle?: string;
  onOpenTopicModal?: () => void;
  typingMode?: "words" | "passages";
  onToggleTypingMode?: (mode: "words" | "passages") => void;
}

export function TopControlBar({
  currentLevelId,
  currentIndex,
  totalCount,
  onPrev,
  onNext,
  isShuffle = false,
  onToggleShuffle,
  showPinyin = true,
  onTogglePinyin,
  showMeaning = true,
  onToggleMeaning,
  onSpeak,
  topicTitle,
  onOpenTopicModal,
  typingMode = "words",
  onToggleTypingMode,
}: TopControlBarProps) {
  return (
    <div
      id="stage-top-controls"
      className="w-full flex items-center justify-between gap-1 select-none py-0.5 whitespace-nowrap overflow-x-auto no-scrollbar touch-scroll"
    >
      {/* Left: Level badge + Lesson selector + Typing Submode Toggle */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <span className="hidden lg:inline-flex h-9 px-3 items-center justify-center text-xs font-bold tracking-tight rounded-xl bg-[#24523B] text-white shadow-xs shrink-0">
          {currentLevelId.toUpperCase()}
        </span>

        {onOpenTopicModal && (
          <button
            type="button"
            onClick={onOpenTopicModal}
            className="hidden lg:inline-flex h-9 px-3 sm:px-3.5 items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold rounded-xl border border-[#E5E3DF] bg-white text-slate-800 hover:border-slate-400 hover:bg-[#FAF9F6] transition-all shadow-2xs group cursor-pointer truncate max-w-[110px] sm:max-w-[240px]"
            title="Chọn bài học khác"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 shrink-0" />
            <span className="truncate">
              {topicTitle || "Chọn bài học"}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0 ml-0.5" />
          </button>
        )}

        {/* Sub-mode Switcher: Từ mới vs Hội thoại */}
        {onToggleTypingMode && (
          <div className="inline-flex p-0.5 rounded-lg sm:rounded-xl border border-[#E5E3DF] bg-[#EFECE6]/70 shrink-0">
            <button
              type="button"
              onClick={() => onToggleTypingMode("words")}
              className={`h-7 sm:h-8 px-1.5 sm:px-3 inline-flex items-center gap-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold transition-all cursor-pointer ${
                typingMode === "words"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Chế độ gõ từng từ mới"
            >
              <Type className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden min-[380px]:inline">Từ mới</span>
              <span className="min-[380px]:hidden">Từ</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleTypingMode("passages")}
              className={`h-7 sm:h-8 px-1.5 sm:px-3 inline-flex items-center gap-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold transition-all cursor-pointer ${
                typingMode === "passages"
                  ? "bg-white text-[#24523B] shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Chế độ gõ bài hội thoại"
            >
              <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden min-[380px]:inline">Hội thoại</span>
              <span className="min-[380px]:hidden">Thoại</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: Unified Toolbar */}
      <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0 ml-auto">
        {/* Progress Counter */}
        {totalCount > 0 && (
          <span className="text-[10px] sm:text-xs font-bold text-slate-700 tracking-tight font-mono px-0.5 sm:px-1.5 inline-flex items-center shrink-0">
            {String(currentIndex + 1).padStart(2, "0")}
            <span className="text-slate-400 font-normal ml-0.5">
              /{String(totalCount).padStart(2, "0")}
            </span>
          </span>
        )}
        {/* Pinyin Toggle Pill */}
        {onTogglePinyin && (
          <button
            type="button"
            onClick={onTogglePinyin}
            className={`h-7 sm:h-8 px-1.5 sm:px-2.5 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0 ${
              showPinyin
                ? "bg-[#24523B] text-white border-[#24523B]"
                : "bg-white text-slate-600 border-[#E5E3DF] hover:border-slate-400"
            }`}
            title="Bật / Tắt Pinyin"
          >
            <span className="hidden sm:inline">Pinyin</span>
            <span className="sm:hidden">Py</span>
          </button>
        )}

        {/* Nghĩa Toggle Pill */}
        {onToggleMeaning && (
          <button
            type="button"
            onClick={onToggleMeaning}
            className={`h-7 sm:h-8 px-1.5 sm:px-2.5 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0 ${
              showMeaning
                ? "bg-[#24523B] text-white border-[#24523B]"
                : "bg-white text-slate-600 border-[#E5E3DF] hover:border-slate-400"
            }`}
            title="Bật / Tắt Nghĩa tiếng Việt"
          >
            Nghĩa
          </button>
        )}

        {/* Audio Speaker / Play Button */}
        {onSpeak && (
          <button
            type="button"
            onClick={onSpeak}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl border border-[#E5E3DF] bg-white text-slate-700 hover:text-slate-900 hover:border-slate-400 transition-all flex items-center justify-center shadow-2xs cursor-pointer shrink-0"
            title={typingMode === "passages" ? "Nghe cả đoạn" : "Phát âm từ này"}
          >
            {typingMode === "words" ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 text-[#24523B] fill-[#24523B]" />
            )}
          </button>
        )}

        {/* Shuffle Button */}
        {onToggleShuffle && (
          <button
            type="button"
            onClick={onToggleShuffle}
            className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl border transition-all flex items-center justify-center cursor-pointer shadow-2xs shrink-0 ${
              isShuffle
                ? "bg-[#24523B] text-white border-[#24523B]"
                : "bg-white text-slate-600 border-[#E5E3DF] hover:border-slate-400"
            }`}
            title="Trộn ngẫu nhiên [Phím S]"
          >
            <Shuffle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        )}

        {/* Prev & Next Arrow Navigation */}
        <div className="inline-flex items-center h-7 sm:h-8 rounded-lg sm:rounded-xl border border-[#E5E3DF] bg-white divide-x divide-[#E5E3DF] overflow-hidden shadow-2xs shrink-0">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="h-full px-1.5 sm:px-2.5 flex items-center justify-center text-slate-700 hover:bg-[#FAF9F6] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Trước đó [Phím ←]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            title="Tiếp theo [Phím →]"
            className="h-full px-1.5 sm:px-2.5 flex items-center justify-center text-slate-700 hover:bg-[#FAF9F6] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

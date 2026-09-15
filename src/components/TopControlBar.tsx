"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  BookOpen,
  ChevronDown,
  Shuffle,
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
}: TopControlBarProps) {
  return (
    <div
      id="stage-top-controls"
      className="w-full flex items-center justify-between gap-3 select-none"
    >
      {/* Left: Level badge + Lesson selector button */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="h-9 px-3 inline-flex items-center justify-center text-xs font-bold tracking-tight rounded-xl bg-[#24523B] text-white shadow-xs shrink-0">
          {currentLevelId.toUpperCase()}
        </span>

        {onOpenTopicModal && (
          <button
            type="button"
            onClick={onOpenTopicModal}
            className="h-9 px-3.5 inline-flex items-center gap-2 text-xs sm:text-sm font-semibold rounded-xl border border-[#E5E3DF] bg-white text-slate-800 hover:border-slate-400 hover:bg-[#FAF9F6] transition-all shadow-2xs group cursor-pointer truncate"
            title="Chọn bài học khác"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 shrink-0" />
            <span className="truncate max-w-[160px] sm:max-w-[280px]">
              {topicTitle || "Chọn bài học"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 ml-0.5" />
          </button>
        )}
      </div>

      {/* Right: Unified, Clean, Minimalist Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Progress Counter */}
        {totalCount > 0 && (
          <span className="text-xs font-bold text-slate-700 tracking-tight font-mono px-2 hidden sm:inline">
            {String(currentIndex + 1).padStart(2, "0")}{" "}
            <span className="text-slate-400 font-normal">
              / {String(totalCount).padStart(2, "0")}
            </span>
          </span>
        )}

        {/* Pinyin Toggle Pill */}
        {onTogglePinyin && (
          <button
            type="button"
            onClick={onTogglePinyin}
            className={`h-9 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              showPinyin
                ? "bg-[#24523B] text-white border-[#24523B]"
                : "bg-white text-slate-600 border-[#E5E3DF] hover:border-slate-400"
            }`}
            title="Bật / Tắt Pinyin"
          >
            Pinyin
          </button>
        )}

        {/* Nghĩa Toggle Pill */}
        {onToggleMeaning && (
          <button
            type="button"
            onClick={onToggleMeaning}
            className={`h-9 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              showMeaning
                ? "bg-[#24523B] text-white border-[#24523B]"
                : "bg-white text-slate-600 border-[#E5E3DF] hover:border-slate-400"
            }`}
            title="Bật / Tắt Nghĩa tiếng Việt"
          >
            Nghĩa
          </button>
        )}

        {/* Audio Speaker Button */}
        {onSpeak && (
          <button
            type="button"
            onClick={onSpeak}
            className="h-9 w-9 rounded-xl border border-[#E5E3DF] bg-white text-slate-700 hover:text-slate-900 hover:border-slate-400 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
            title="Phát âm câu / từ này"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        )}

        {/* Shuffle Button */}
        {onToggleShuffle && (
          <button
            type="button"
            onClick={onToggleShuffle}
            className={`h-9 w-9 rounded-xl border transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
              isShuffle
                ? "bg-[#24523B] text-white border-[#24523B]"
                : "bg-white text-slate-600 border-[#E5E3DF] hover:border-slate-400"
            }`}
            title="Trộn ngẫu nhiên [Phím S]"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Prev & Next Arrow Navigation */}
        <div className="inline-flex items-center h-9 rounded-xl border border-[#E5E3DF] bg-white divide-x divide-[#E5E3DF] overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="h-full px-2.5 sm:px-3 flex items-center justify-center text-slate-700 hover:bg-[#FAF9F6] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Câu trước [Phím ←]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            title="Câu tiếp theo [Phím →]"
            className="h-full px-2.5 sm:px-3 flex items-center justify-center text-slate-700 hover:bg-[#FAF9F6] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

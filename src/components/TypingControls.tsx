"use client";

import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  Play,
  Shuffle,
  MessageSquare,
  Type,
  Languages,
  BookOpenText,
} from "lucide-react";
import { stageIconBtnClass } from "@/components/StageHeader";

export interface TypingControlsProps {
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  isShuffle?: boolean;
  onToggleShuffle?: () => void;
  showPinyin?: boolean;
  onTogglePinyin?: () => void;
  showMeaning?: boolean;
  onToggleMeaning?: () => void;
  onSpeak?: () => void;
  typingMode?: "words" | "passages";
  onToggleTypingMode?: (mode: "words" | "passages") => void;
}

export function TypingControls({
  currentIndex,
  onPrev,
  onNext,
  isShuffle = false,
  onToggleShuffle,
  showPinyin = true,
  onTogglePinyin,
  showMeaning = true,
  onToggleMeaning,
  onSpeak,
  typingMode = "words",
  onToggleTypingMode,
}: TypingControlsProps) {
  return (
    <div className="w-full flex items-center justify-between gap-2 py-0.5">
      {/* Left: Typing sub-mode switcher */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar">
        {onToggleTypingMode && (
          <div className="inline-flex p-0.5 rounded-xl border border-[#E5E3DF] bg-[#EFECE6]/70 shrink-0">
            <button
              type="button"
              onClick={() => onToggleTypingMode("words")}
              aria-pressed={typingMode === "words"}
              className={`h-8 px-2.5 sm:px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                typingMode === "words"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Chế độ gõ từng từ mới"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden min-[380px]:inline">Từ mới</span>
              <span className="min-[380px]:hidden">Từ</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleTypingMode("passages")}
              aria-pressed={typingMode === "passages"}
              className={`h-8 px-2.5 sm:px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                typingMode === "passages"
                  ? "bg-white text-[#24523B] shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Chế độ gõ bài hội thoại"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden min-[380px]:inline">Hội thoại</span>
              <span className="min-[380px]:hidden">Thoại</span>
            </button>
          </div>
        )}
      </div>
      {/* Right: icon-only unified toolbar */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
        {onTogglePinyin && (
          <button
            type="button"
            onClick={onTogglePinyin}
            aria-pressed={showPinyin}
            aria-label="Bật / tắt Pinyin"
            title="Bật / Tắt Pinyin"
            className={stageIconBtnClass(showPinyin)}
          >
            <Languages className="w-4 h-4" />
          </button>
        )}
        {onToggleMeaning && (
          <button
            type="button"
            onClick={onToggleMeaning}
            aria-pressed={showMeaning}
            aria-label="Bật / tắt nghĩa tiếng Việt"
            title="Bật / Tắt Nghĩa tiếng Việt"
            className={stageIconBtnClass(showMeaning)}
          >
            <BookOpenText className="w-4 h-4" />
          </button>
        )}
        {onSpeak && (
          <button
            type="button"
            onClick={onSpeak}
            aria-label={typingMode === "passages" ? "Nghe cả đoạn" : "Phát âm từ này"}
            title={typingMode === "passages" ? "Nghe cả đoạn" : "Phát âm từ này"}
            className={stageIconBtnClass(false)}
          >
            {typingMode === "words" ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 text-[#24523B] fill-[#24523B]" />
            )}
          </button>
        )}
        {onToggleShuffle && (
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-pressed={isShuffle}
            aria-label="Trộn ngẫu nhiên"
            title="Trộn ngẫu nhiên [Phím S]"
            className={stageIconBtnClass(isShuffle)}
          >
            <Shuffle className="w-4 h-4" />
          </button>
        )}
        <div className="inline-flex items-center h-8 rounded-xl border border-[#E5E3DF] bg-white divide-x divide-[#E5E3DF] overflow-hidden shadow-2xs shrink-0">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex === 0}
            aria-label="Từ trước đó"
            title="Trước đó [Phím ←]"
            className="h-full px-2 sm:px-2.5 flex items-center justify-center text-slate-600 hover:bg-[#FAF9F6] hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Từ tiếp theo"
            title="Tiếp theo [Phím →]"
            className="h-full px-2 sm:px-2.5 flex items-center justify-center text-slate-600 hover:bg-[#FAF9F6] hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

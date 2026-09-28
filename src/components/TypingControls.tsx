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
  Sparkles,
} from "lucide-react";
import { stageIconBtnClass } from "@/components/StageHeader";
import { TypingSubMode } from "@/lib/types";

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
  typingMode?: TypingSubMode;
  onToggleTypingMode?: (mode: TypingSubMode) => void;
  /** Ẩn nhóm nút điều hướng khi màn hình đã có thanh điều hướng riêng (chế độ shadowing) */
  showNavigation?: boolean;
}

const SUB_MODES: {
  mode: TypingSubMode;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortLabel: string;
  title: string;
}[] = [
  {
    mode: "words",
    icon: Type,
    label: "Từ mới",
    shortLabel: "Từ",
    title: "Chế độ gõ từng từ mới",
  },
  {
    mode: "passages",
    icon: MessageSquare,
    label: "Hội thoại",
    shortLabel: "Thoại",
    title: "Chế độ gõ bài hội thoại",
  },
  {
    mode: "shadowing",
    icon: Sparkles,
    label: "Shadowing",
    shortLabel: "Nói",
    title: "Đoạn văn do AI viết từ toàn bộ từ vựng đã học — nghe rồi nhại lại",
  },
];

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
  showNavigation = true,
}: TypingControlsProps) {
  return (
    <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 py-0.5">
      {/* Typing sub-mode switcher — mobile: nhãn ngắn không icon để gọn một hàng;
          sm+: icon + nhãn đầy đủ. Nhãn luôn giữ font-semibold để tab không giật width khi đổi */}
      {onToggleTypingMode && (
        <div className="flex items-center min-w-0 overflow-x-auto no-scrollbar">
          <div className="inline-flex items-center p-0.5 h-8 rounded-xl border border-[#E5E3DF] bg-[#EFECE6]/70 shrink-0">
            {SUB_MODES.map(({ mode, icon: Icon, label, shortLabel, title }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onToggleTypingMode(mode)}
                aria-pressed={typingMode === mode}
                className={`h-full px-2 sm:px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  typingMode === mode
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title={title}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Right: icon-only unified toolbar — cụm sát nhau, neo phải */}
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
        {showNavigation && (
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
        )}
      </div>
    </div>
  );
}

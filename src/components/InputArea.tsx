"use client";

import React, { useRef, useState, useEffect } from "react";
import { CornerDownLeft, RotateCcw, X, Check } from "lucide-react";

interface InputAreaProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onSkip?: () => void;
  disabled?: boolean;
  hasSubmitted?: boolean;
  onReset: () => void;
  mode?: "words" | "passages";
  targetLength?: number;
}

export function InputArea({
  value,
  onChange,
  onSubmit,
  onSkip,
  disabled = false,
  hasSubmitted = false,
  onReset,
  mode = "words",
  targetLength,
}: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled, hasSubmitted]);

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposingRef.current || e.nativeEvent.isComposing || e.keyCode === 229) {
      return;
    }

    if (mode === "passages") {
      // In passages mode: Ctrl+Enter or Cmd+Enter submits
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (value.trim().length > 0 && !disabled) {
          onSubmit();
        }
      }
      // Regular Enter inserts a newline naturally
    } else {
      // In words mode: Regular Enter without Shift submits
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (value.trim().length > 0 && !disabled) {
          onSubmit();
        }
      }
    }
  };

  const currentCount = Array.from(value.replace(/[\r\n\s]+/g, "")).length;
  const progressPercent =
    targetLength && targetLength > 0
      ? Math.min(100, Math.round((currentCount / targetLength) * 100))
      : null;

  return (
    <div id="input-validation-system" className="w-full">
      {/* Main Typing Input Canvas */}
      <div
        className={`w-full bg-white border border-[#E5E3DF] rounded-2xl shadow-xs p-3 sm:p-4 relative transition-all duration-200 overflow-hidden ${
          isFocused
            ? "border-[#24523B] ring-2 ring-[#24523B]/15 shadow-sm"
            : "hover:border-slate-300"
        } ${disabled ? "bg-[#FAF9F6]/60" : ""}`}
      >
        <textarea
          id="chinese-typing-input"
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            mode === "passages"
              ? "Bắt đầu gõ hội thoại tại đây (dùng bộ gõ Pinyin)..."
              : "Nhập chữ Hán tại đây (dùng bộ gõ Pinyin)..."
          }
          spellCheck={false}
          rows={mode === "passages" ? 3 : 1}
          className={`hanzi w-full text-lg sm:text-xl md:text-2xl text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-300 placeholder:font-sans placeholder:text-sm tracking-wide leading-relaxed px-1 resize-none ${
            mode === "passages" ? "min-h-[72px] sm:min-h-[84px]" : "min-h-[42px]"
          }`}
        />

        {/* Bottom Bar: Clean 1-line Action & Status Row */}
        <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-[#E5E3DF]/70">
          {/* Left: Progress counter & keyboard shortcut */}
          <div className="flex items-center gap-2.5 pl-0.5 text-xs text-slate-500 font-sans">
            {targetLength !== undefined && targetLength > 0 && (
              <span className="font-mono font-bold text-slate-800">
                {currentCount} <span className="text-slate-400 font-normal">/ {targetLength} chữ</span>
                {progressPercent !== null && (
                  <span className="ml-1.5 text-[11px] font-semibold text-[#24523B] font-mono">
                    ({progressPercent}%)
                  </span>
                )}
              </span>
            )}

            {mode === "passages" ? (
              <span className="hidden md:inline-flex items-center gap-1.5 text-slate-400 text-[11px] border-l border-[#E5E3DF] pl-2.5">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[10px] font-mono text-slate-600 font-semibold shadow-2xs">
                  Enter
                </kbd>
                <span>xuống dòng</span>
                <span className="text-slate-300">·</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[10px] font-mono text-slate-600 font-semibold shadow-2xs">
                  Ctrl + Enter
                </kbd>
                <span>nộp</span>
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 text-slate-400 text-[11px] border-l border-[#E5E3DF] pl-2">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[10px] font-mono text-slate-600 font-semibold shadow-2xs">
                  Enter
                </kbd>
                <span>để nộp</span>
              </span>
            )}

            {value.length > 0 && !disabled && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5 transition-colors py-0.5 px-1.5 rounded cursor-pointer"
                title="Xóa nội dung vừa gõ"
              >
                <X className="w-3 h-3" />
                <span>Xóa</span>
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {hasSubmitted ? (
              <button
                id="btn-retry-reset"
                type="button"
                onClick={onReset}
                className="h-8.5 px-3.5 rounded-xl border border-[#E5E3DF] bg-white text-slate-700 font-bold text-xs hover:bg-[#FAF9F6] transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Gõ lại</span>
              </button>
            ) : onSkip ? (
              <button
                type="button"
                onClick={onSkip}
                className="h-8.5 px-3 rounded-xl border border-transparent text-slate-500 hover:text-slate-800 hover:bg-[#FAF9F6] font-semibold text-xs transition-all active:scale-95 cursor-pointer"
              >
                Bỏ qua
              </button>
            ) : null}

            {/* Primary Check Button */}
            <button
              id="btn-check-answer"
              type="button"
              onClick={onSubmit}
              disabled={disabled || value.trim().length === 0}
              className="h-8.5 px-5 rounded-xl bg-[#24523B] hover:bg-[#1b3d2c] text-white font-bold text-xs shadow-xs hover:shadow-sm active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Kiểm tra</span>
              <CornerDownLeft className="w-3 h-3 opacity-60 hidden sm:inline" />
            </button>
          </div>
        </div>

        {/* Subtle active progress bar embedded at bottom edge of card */}
        {targetLength !== undefined && targetLength > 0 && progressPercent !== null && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#24523B]/15">
            <div
              className="h-full bg-[#24523B] transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

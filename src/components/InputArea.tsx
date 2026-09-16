"use client";

import React, { useRef, useState, useEffect } from "react";
import { CornerDownLeft, RotateCcw, X, Check, AlertTriangle } from "lucide-react";

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
    if (disabled || !textareaRef.current) return;

    const isTouch =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(pointer: coarse)").matches;

    // Auto-focus immediately on desktop; on touch devices, preserve focus only if user is already typing
    if (!isTouch || document.activeElement === textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled, hasSubmitted]);

  // Guard: detect if user typed only Latin/ASCII characters without selecting Chinese Hanzi
  const trimmed = value.trim();
  const hasLatin = /[a-zA-Z]/.test(trimmed);
  const hasChinese = /[\u4e00-\u9fff]/.test(trimmed);
  const isPinyinOnly = trimmed.length > 0 && hasLatin && !hasChinese;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposingRef.current || e.nativeEvent.isComposing || e.keyCode === 229) {
      return;
    }

    if (mode === "passages") {
      // In passages mode: Ctrl+Enter or Cmd+Enter submits
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (value.trim().length > 0 && !disabled && !isPinyinOnly) {
          onSubmit();
        }
      }
    } else {
      // In words mode: Regular Enter without Shift submits
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (value.trim().length > 0 && !disabled && !isPinyinOnly) {
          onSubmit();
        }
      }
    }
  };

  const handleCheckClick = () => {
    if (value.trim().length > 0 && !disabled && !isPinyinOnly) {
      onSubmit();
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
        className={`w-full bg-white border border-[#E5E3DF] rounded-2xl shadow-xs p-2 sm:p-3 relative transition-all duration-200 overflow-hidden ${
          isFocused
            ? isPinyinOnly
              ? "border-amber-400 ring-2 ring-amber-400/20 shadow-sm"
              : "border-[#24523B] ring-2 ring-[#24523B]/15 shadow-sm"
            : isPinyinOnly
            ? "border-amber-300"
            : "hover:border-slate-300"
        } ${disabled ? "bg-[#FAF9F6]/60" : ""}`}
      >
        <textarea
          id="chinese-typing-input"
          ref={textareaRef}
          lang="zh-CN"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setTimeout(() => {
              textareaRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }, 100);
          }}
          onBlur={() => setIsFocused(false)}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          enterKeyHint={mode === "passages" ? "enter" : "send"}
          placeholder={
            mode === "passages"
              ? "Gõ chữ Hán của đoạn hội thoại tại đây..."
              : "Gõ chữ Hán tại đây..."
          }
          spellCheck={false}
          rows={mode === "passages" ? 2 : 1}
          className={`hanzi w-full text-base sm:text-xl md:text-2xl text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-400 placeholder:font-sans placeholder:text-xs sm:placeholder:text-sm tracking-wide leading-relaxed px-1 resize-none ${
            mode === "passages" ? "min-h-[50px] sm:min-h-[76px]" : "min-h-[38px] sm:min-h-[42px]"
          }`}
        />

        {/* Warning banner if user typed only Latin/Pinyin letters without choosing Hanzi */}
        {isPinyinOnly && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-medium mt-1 mb-0.5 animate-in fade-in duration-150 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>
              Đang nhập chữ Latin. Hãy dùng bộ gõ tiếng Trung để chọn <strong>chữ Hán</strong> trước khi nộp!
            </span>
          </div>
        )}

        {/* Bottom Bar: Clean 1-line Action & Status Row */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-3 mt-1 sm:mt-1.5 pt-1 sm:pt-1.5 border-t border-[#E5E3DF]/70">
          {/* Left: Progress counter & keyboard shortcut */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 pl-0.5 text-xs text-slate-500 font-sans min-w-0 truncate">
            {targetLength !== undefined && targetLength > 0 && (
              <span className="font-mono font-bold text-slate-800 text-[11px] sm:text-xs">
                {currentCount} <span className="text-slate-400 font-normal">/ {targetLength} chữ</span>
                {progressPercent !== null && (
                  <span className="ml-1 text-[11px] font-semibold text-[#24523B] font-mono">
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
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {hasSubmitted ? (
              <button
                id="btn-retry-reset"
                type="button"
                onClick={onReset}
                className="h-8 px-3 rounded-xl border border-[#E5E3DF] bg-white text-slate-700 font-bold text-xs hover:bg-[#FAF9F6] transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Gõ lại</span>
              </button>
            ) : onSkip ? (
              <button
                type="button"
                onClick={onSkip}
                className="h-8 px-2.5 rounded-xl border border-transparent text-slate-500 hover:text-slate-800 hover:bg-[#FAF9F6] font-semibold text-xs transition-all active:scale-95 cursor-pointer"
              >
                Bỏ qua
              </button>
            ) : null}

            {/* Primary Check Button */}
            <button
              id="btn-check-answer"
              type="button"
              onClick={handleCheckClick}
              disabled={disabled || value.trim().length === 0 || isPinyinOnly}
              className="h-8 px-3 sm:px-4 rounded-xl bg-[#24523B] hover:bg-[#1b3d2c] text-white font-bold text-xs shadow-xs hover:shadow-sm active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title={isPinyinOnly ? "Vui lòng chọn chữ Hán từ bộ gõ trước khi kiểm tra" : "Kiểm tra kết quả"}
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

"use client";

import React, { useRef, useState, useEffect } from "react";
import { CornerDownLeft, RotateCcw, X } from "lucide-react";

interface InputAreaProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onSkip?: () => void;
  disabled?: boolean;
  hasSubmitted?: boolean;
  onReset: () => void;
}

export function InputArea({
  value,
  onChange,
  onSubmit,
  onSkip,
  disabled = false,
  hasSubmitted = false,
  onReset,
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

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim().length > 0 && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <div id="input-validation-system" className="w-full">
      <div
        className={`w-full bg-white border border-[#E5E3DF] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-2.5 sm:p-3 relative transition-all duration-200 ${
          isFocused
            ? "border-[#24523B] ring-2 ring-[#24523B]/15"
            : "hover:border-slate-300"
        } ${disabled ? "bg-[#FAF9F6]/50" : ""}`}
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
          placeholder="Nhập chữ Hán tại đây (dùng bộ gõ Pinyin)..."
          spellCheck={false}
          rows={1}
          className="hanzi w-full text-lg sm:text-xl md:text-2xl text-slate-900 bg-transparent border-none outline-none resize-none placeholder:text-slate-300 placeholder:font-sans placeholder:text-sm tracking-wide leading-relaxed min-h-[42px] px-1"
        />

        {/* Bottom Bar with Character Counter and Action Buttons */}
        <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-[#E5E3DF]/60">
          <div className="flex items-center gap-2 pl-1">
            <span className="text-[11px] font-mono text-slate-400">
              {Array.from(value).length} ký tự
            </span>
            {value.length > 0 && !disabled && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors py-0.5 px-1.5 rounded cursor-pointer"
                title="Xóa nội dung"
              >
                <X className="w-3 h-3" />
                <span>Xóa</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {hasSubmitted ? (
              <button
                id="btn-retry-reset"
                type="button"
                onClick={onReset}
                className="h-8 sm:h-8.5 px-3 sm:px-3.5 rounded-lg border border-[#E5E3DF] bg-white text-slate-700 font-bold text-xs hover:bg-[#FAF9F6] transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Gõ lại</span>
              </button>
            ) : onSkip ? (
              <button
                type="button"
                onClick={onSkip}
                className="h-8 sm:h-8.5 px-3 rounded-lg border border-transparent text-slate-500 hover:text-slate-800 hover:bg-[#FAF9F6] font-semibold text-xs transition-all active:scale-95 cursor-pointer"
              >
                Bỏ qua
              </button>
            ) : null}

            {/* Check Button */}
            <button
              id="btn-check-answer"
              type="button"
              onClick={onSubmit}
              disabled={disabled || value.trim().length === 0}
              className="h-8 sm:h-8.5 px-4 sm:px-5 rounded-lg bg-[#24523B] text-white font-bold text-xs hover:bg-[#2D6448] active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Kiểm tra</span>
              <span className="opacity-60 text-[10px] font-mono hidden xs:flex items-center gap-0.5">
                <CornerDownLeft className="w-2.5 h-2.5" />
                Enter
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

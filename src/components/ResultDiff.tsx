"use client";

import React, { useEffect } from "react";
import { EvaluationResult, DiffToken } from "@/utils/diff";
import { SentenceItem } from "@/components/SentenceCard";
import { CheckCircle2, AlertCircle, ArrowRight, RotateCcw, Edit3 } from "lucide-react";

interface ResultDiffProps {
  evaluation: EvaluationResult;
  targetSentence: SentenceItem;
  userInput: string;
  onContinue: () => void;
  onRetryKeep: () => void;
  onRetryClear: () => void;
}

export function ResultDiff({
  evaluation,
  targetSentence,
  userInput,
  onContinue,
  onRetryKeep,
  onRetryClear,
}: ResultDiffProps) {
  const { isPerfect, accuracy, diffTokens, normalizedMatch } = evaluation;

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && isPerfect) {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isPerfect, onContinue]);

  return (
    <div id="evaluation-result-card" className="w-full space-y-2.5 sm:space-y-3">
      {/* Banner matching Editorial Style */}
      <div
        className={`w-full p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3.5 transition-all duration-200 ${
          isPerfect
            ? "bg-[#ECFDF5] border border-[#A7F3D0]"
            : "bg-[#FEF2F2] border border-[#FEE2E2]"
        }`}
      >
        <div className="flex gap-2.5 sm:gap-3.5 items-start sm:items-center">
          <div
            className={`p-1.5 sm:p-2 rounded-lg bg-white shadow-2xs shrink-0 ${
              isPerfect ? "text-[#059669]" : "text-[#DC2626]"
            }`}
          >
            {isPerfect ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4
                className={`text-xs font-bold uppercase tracking-wider ${
                  isPerfect ? "text-[#059669]" : "text-[#DC2626]"
                }`}
              >
                {isPerfect ? "Chính xác 100%" : "Chưa hoàn toàn chính xác"}
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isPerfect
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                Độ chính xác: {accuracy}%
              </span>
            </div>
            <p className="text-xs text-slate-600 font-editorial-serif italic mt-0.5">
              {isPerfect
                ? normalizedMatch && userInput.trim() !== targetSentence.hanzi.trim()
                  ? "Đúng hoàn hảo (đã tự động chuẩn hóa dấu câu tiếng Trung)."
                  : "Bạn đã gõ chính xác toàn bộ từng chữ Hán."
                : "Quan sát các ký tự được đánh dấu màu dưới đây để sửa lại."}
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isPerfect ? (
            <button
              id="btn-next-perfect"
              type="button"
              onClick={onContinue}
              className="w-full sm:w-auto px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Tiếp tục</span>
              <span className="text-[10px] bg-emerald-800/60 px-1.5 py-0.5 rounded font-mono hidden xs:inline">
                Enter
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onRetryKeep}
                className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 bg-white border border-rose-200 text-rose-700 font-bold text-xs rounded-xl hover:bg-rose-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Sửa tiếp</span>
              </button>
              <button
                type="button"
                onClick={onRetryClear}
                className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Gõ lại</span>
              </button>
              <button
                type="button"
                onClick={onContinue}
                className="px-2.5 sm:px-3 py-1.5 bg-[#24523B] text-white font-bold text-xs rounded-xl hover:bg-[#2D6448] transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Bỏ qua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Visual Character Alignment Diff */}
      <div className="bg-white border border-[#E5E3DF] rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5E3DF]/60 pb-2">
          <span className="micro-caps text-slate-400">So sánh kết quả từng ký tự</span>
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#059669]" /> Đúng
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> Sai
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#94A3B8]" /> Thiếu
            </span>
          </div>
        </div>

        {/* Diff Tokens Output */}
        <div className="py-2 flex flex-wrap items-baseline gap-1.5">
          {diffTokens.map((tok: DiffToken, idx: number) => {
            if (tok.type === "correct") {
              return (
                <span
                  key={idx}
                  className="hanzi text-xl sm:text-2xl md:text-3xl font-bold diff-correct bg-emerald-50 px-1.5 py-0.5 rounded"
                  title="Chính xác"
                >
                  {tok.char}
                </span>
              );
            }
            if (tok.type === "incorrect") {
              return (
                <span
                  key={idx}
                  className="inline-flex flex-col items-center bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"
                  title={`Bạn gõ: ${tok.char} — Cần gõ: ${tok.expected}`}
                >
                  <span className="hanzi text-xl sm:text-2xl md:text-3xl font-bold diff-wrong">
                    {tok.char}
                  </span>
                  <span className="hanzi text-xs font-semibold text-emerald-700">
                    {tok.expected}
                  </span>
                </span>
              );
            }
            if (tok.type === "missing") {
              return (
                <span
                  key={idx}
                  className="inline-flex flex-col items-center bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                  title={`Thiếu ký tự: ${tok.expected}`}
                >
                  <span className="hanzi text-xl sm:text-2xl md:text-3xl font-bold diff-missing">
                    {tok.expected}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">
                    Thiếu
                  </span>
                </span>
              );
            }
            // extra
            return (
              <span
                key={idx}
                className="hanzi text-xl sm:text-2xl md:text-3xl font-bold diff-wrong bg-rose-100 px-1.5 py-0.5 rounded"
                title={`Ký tự thừa: ${tok.char}`}
              >
                {tok.char}
              </span>
            );
          })}
        </div>

        {/* Target string reference */}
        <div className="pt-2 border-t border-[#E5E3DF]/60 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span>Câu mẫu chuẩn: <strong className="hanzi text-slate-800 font-bold">{targetSentence.hanzi}</strong></span>
          <span className="font-editorial-serif italic text-slate-600">&ldquo;{targetSentence.meaning}&rdquo;</span>
        </div>
      </div>
    </div>
  );
}

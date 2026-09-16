"use client";

import React, { useState, useEffect } from "react";
import {
  Keyboard,
  Layers,
  BookOpen,
  Library,
  Flame,
  RotateCcw,
} from "lucide-react";
import { LevelInfo, Lesson, UserProgress } from "@/lib/types";
import { getDueCardsCount } from "@/lib/data-service";

export interface EditorialStats {
  completedCount: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
}

interface EditorialSidebarProps {
  levels: LevelInfo[];
  currentLevelId: string;
  onSelectLevel: (levelId: string) => void;
  activeMode: "typing" | "flashcards" | "lessons" | "garden";
  onSelectMode: (mode: "typing" | "flashcards" | "lessons" | "garden") => void;
  currentLesson: Lesson;
  currentLessonIdx: number;
  onOpenTopicModal: () => void;
  stats: EditorialStats;
  onResetStats: () => void;
  progress: UserProgress;
}

export function EditorialSidebar({
  levels,
  currentLevelId,
  onSelectLevel,
  activeMode,
  onSelectMode,
  currentLesson,
  currentLessonIdx,
  onOpenTopicModal,
  stats,
  onResetStats,
  progress,
}: EditorialSidebarProps) {
  const accuracyAvg =
    stats.completedCount > 0
      ? Math.round((stats.correctCount / stats.completedCount) * 100)
      : 100;

  // Tính sau mount để SSR và lần render đầu ở client đều là 0 (khớp nhau).
  const [dueCount, setDueCount] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDueCount(getDueCardsCount(progress));
  }, [progress]);

  return (
    <aside className="w-72 xl:w-80 border-r border-[#E5E3DF] hidden lg:flex flex-col shrink-0 bg-[#FAF9F6] h-full overflow-hidden select-none">
      {/* Brand Header */}
      <div className="h-14 px-6 xl:px-8 border-b border-[#E5E3DF] flex items-center shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-tighter text-[#222B25] leading-none">
            HANZI.
          </h1>
          <p className="micro-caps mt-1 text-[10px]">Học Tiếng Trung & Luyện Gõ</p>
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="p-4 xl:p-5 flex-1 flex flex-col justify-between overflow-y-auto space-y-4">
        <div className="space-y-4">
          {/* Level Selection */}
          <div>
            <p className="micro-caps mb-2 text-slate-400">Cấp độ HSK</p>
            <div className="grid grid-cols-3 gap-1.5 bg-[#E5E3DF]/50 p-1 rounded-xl border border-[#E5E3DF]">
              {levels.map((lvl) => {
                const isActive = lvl.id === currentLevelId;

                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => onSelectLevel(lvl.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      isActive
                        ? "bg-[#24523B] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <span>{lvl.id.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Learning Mode Switcher */}
          <div>
            <p className="micro-caps mb-2 text-slate-400">Chế độ học tập</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onSelectMode("typing")}
                className={`h-10 px-3 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  activeMode === "typing"
                    ? "bg-[#24523B] text-white border-[#24523B] shadow-xs"
                    : "bg-white text-slate-700 border-[#E5E3DF] hover:border-slate-400"
                }`}
              >
                <Keyboard className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold leading-tight truncate">Luyện gõ</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode("flashcards")}
                className={`h-10 px-3 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer relative ${
                  activeMode === "flashcards"
                    ? "bg-[#24523B] text-white border-[#24523B] shadow-xs"
                    : "bg-white text-slate-700 border-[#E5E3DF] hover:border-slate-400"
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold leading-tight truncate">Flashcard</span>

                {/* Due review badge */}
                {dueCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-[#24523B] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {dueCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onSelectMode("lessons")}
                className={`h-10 px-3 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  activeMode === "lessons"
                    ? "bg-[#24523B] text-white border-[#24523B] shadow-xs"
                    : "bg-white text-slate-700 border-[#E5E3DF] hover:border-slate-400"
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold leading-tight truncate">Bài khoá</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode("garden")}
                className={`h-10 px-3 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  activeMode === "garden"
                    ? "bg-[#24523B] text-white border-[#24523B] shadow-xs"
                    : "bg-white text-slate-700 border-[#E5E3DF] hover:border-slate-400"
                }`}
              >
                <Library className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold leading-tight truncate">Vườn từ</span>
              </button>
            </div>
          </div>

          {/* Topic / Current Lesson Card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="micro-caps text-slate-400">Bài học đang chọn</p>
              <button
                type="button"
                onClick={onOpenTopicModal}
                className="text-xs text-slate-700 hover:text-slate-900 font-semibold underline underline-offset-2 cursor-pointer"
              >
                Đổi bài
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenTopicModal}
              className="w-full text-left p-3.5 rounded-2xl border border-[#E5E3DF] bg-white hover:border-slate-400 hover:bg-[#FAF9F6] transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-[#E5E3DF] flex items-center justify-center text-slate-700 shrink-0 group-hover:bg-white transition-colors text-xs font-bold">
                  {currentLessonIdx + 1}
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate hanzi">
                    {currentLesson?.t || "Bài học"}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {currentLesson?.vi_t || "Tiếng Trung"}
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">
                  {currentLesson?.w?.length || 0} từ
                </span>
              </div>
            </button>
          </div>

          {/* Progress Metrics Card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="micro-caps text-slate-400">Thống kê phiên học</p>
              {stats.completedCount > 0 && (
                <button
                  type="button"
                  onClick={onResetStats}
                  title="Làm mới thống kê phiên này"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-[#24523B] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Làm mới</span>
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-[#E5E3DF] bg-white p-3.5 space-y-2.5 shadow-2xs">
              <div className="grid grid-cols-2 gap-2 pb-1">
                <div className="bg-[#FAF9F6] rounded-xl p-2.5 border border-[#E5E3DF]/70">
                  <div className="text-[11px] font-medium text-slate-500">
                    Đã luyện tập
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {stats.completedCount}{" "}
                    <span className="text-xs font-normal text-slate-500">từ</span>
                  </div>
                </div>
                <div className="bg-[#FAF9F6] rounded-xl p-2.5 border border-[#E5E3DF]/70">
                  <div className="text-[11px] font-medium text-slate-500">
                    Chuẩn 100%
                  </div>
                  <div className="text-base font-bold text-[#24523B] mt-0.5">
                    {stats.correctCount}{" "}
                    <span className="text-xs font-normal text-slate-500">từ</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                  <span>Độ chính xác</span>
                  <span className="font-bold text-slate-900">
                    {stats.completedCount > 0 ? `${accuracyAvg}%` : "—"}
                  </span>
                </div>
                <div className="h-2 bg-[#EFECE6] w-full rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      stats.completedCount === 0
                        ? "w-0"
                        : accuracyAvg >= 80
                        ? "bg-[#24523B]"
                        : "bg-[#24523B]/60"
                    }`}
                    style={{
                      width: stats.completedCount > 0 ? `${accuracyAvg}%` : "0%",
                    }}
                  />
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#E5E3DF]/80 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                  Chuỗi liên tiếp
                </span>
                <span className="font-bold text-slate-900">
                  {stats.currentStreak}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Kỷ lục: {stats.bestStreak})
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Proverb */}
        <div className="pt-2">
          <div className="rounded-2xl border border-[#E5E3DF] bg-white p-3.5 shadow-2xs space-y-1">
            <p className="font-editorial-serif text-sm font-semibold text-slate-800 tracking-wide">
              千里之行，始于足下。
            </p>
            <p className="text-[11px] font-mono text-slate-400">
              Qiān lǐ zhī xíng, shǐ yú zú xià.
            </p>
            <p className="text-[11px] text-slate-600 italic leading-relaxed pt-1 border-t border-[#E5E3DF]/60">
              &ldquo;Đường đi ngàn dặm bắt đầu từ một bước chân.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import { BookOpen, Search, X, Check } from "lucide-react";
import { Lesson, LevelInfo } from "@/lib/types";

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessons: Lesson[];
  currentLessonIdx: number;
  onSelectLesson: (lessonIdx: number) => void;
  levelId: string;
  levelName: string;
  levels?: LevelInfo[];
  onSelectLevel?: (levelId: string) => void;
}

export function TopicModal({
  isOpen,
  onClose,
  lessons,
  currentLessonIdx,
  onSelectLesson,
  levelId,
  levelName,
  levels,
  onSelectLevel,
}: TopicModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLessons = useMemo(() => {
    if (!searchQuery.trim()) return lessons.map((l, i) => ({ lesson: l, index: i }));
    const q = searchQuery.toLowerCase().trim();
    return lessons
      .map((l, i) => ({ lesson: l, index: i }))
      .filter(
        ({ lesson: l, index: i }) =>
          `bài ${i + 1}`.includes(q) ||
          l.t.toLowerCase().includes(q) ||
          l.vi_t.toLowerCase().includes(q) ||
          (l.w && l.w.some((w) => w[0].includes(q) || w[1].toLowerCase().includes(q) || w[3].toLowerCase().includes(q)))
      );
  }, [lessons, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-[#24523B]/40 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF9F6] border border-[#E5E3DF] rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 md:p-7 shadow-2xl space-y-3 sm:space-y-4 max-h-[88vh] sm:max-h-[85vh] flex flex-col text-[#222B25] animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DF]">
          <div>
            <span className="micro-caps text-slate-400">Chọn bài học / Chủ đề</span>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-slate-800" />
              <span>{levelName}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E5E3DF]/70 text-slate-600">
                {lessons.length} bài học
              </span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-900 rounded-xl hover:bg-[#E5E3DF]/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Level switch tabs */}
        {levels && onSelectLevel && (
          <div className="grid grid-cols-3 gap-1 bg-[#E5E3DF]/50 p-1 rounded-xl border border-[#E5E3DF]">
            {levels.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => onSelectLevel(lvl.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                  levelId === lvl.id
                    ? "bg-[#24523B] text-white shadow-xs"
                    : "text-slate-600 hover:bg-white/60"
                }`}
              >
                {lvl.id.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bài, chữ Hán, từ vựng..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E5E3DF] rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#24523B] focus:ring-1 focus:ring-[#24523B]"
          />
        </div>

        {/* Lessons List */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-2 max-h-[60vh] sm:max-h-[55vh] touch-scroll">
          {filteredLessons.map(({ lesson, index }) => {
            const isSelected = index === currentLessonIdx;

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  onSelectLesson(index);
                  onClose();
                }}
                className={`w-full text-left p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all flex items-center justify-between gap-2 sm:gap-3 cursor-pointer active:scale-98 ${
                  isSelected
                    ? "bg-[#24523B] text-white border-[#24523B] shadow-sm"
                    : "bg-white text-slate-800 border-[#E5E3DF] hover:border-slate-400 hover:bg-[#FAF9F6]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected
                        ? "bg-white/15 text-white"
                        : "bg-[#FAF9F6] border border-[#E5E3DF] text-slate-700"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="hanzi font-bold text-base truncate">
                        {lesson.t}
                      </span>
                    </div>
                    <div
                      className={`text-xs truncate mt-0.5 ${
                        isSelected ? "text-white/70" : "text-slate-500"
                      }`}
                    >
                      {lesson.vi_t}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      isSelected
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {lesson.w?.length || 0} từ
                  </span>

                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </button>
            );
          })}

          {filteredLessons.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              Không tìm thấy bài học nào phù hợp với &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

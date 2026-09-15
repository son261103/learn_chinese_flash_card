"use client";

import React, { useState, useMemo } from "react";
import { BookOpen, Search, X, Check } from "lucide-react";
import { Lesson } from "@/lib/types";

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessons: Lesson[];
  currentLessonIdx: number;
  onSelectLesson: (lessonIdx: number) => void;
  levelId: string;
  levelName: string;
}

export function TopicModal({
  isOpen,
  onClose,
  lessons,
  currentLessonIdx,
  onSelectLesson,
  levelName,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-[#1C1C1C]/40 backdrop-blur-xs select-none">
      <div
        className="bg-[#FAF9F6] border border-[#E5E3DF] rounded-3xl max-w-2xl w-full p-5 sm:p-6 md:p-7 shadow-2xl space-y-4 max-h-[85vh] flex flex-col text-[#1C1C1C]"
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
            className="p-2 text-slate-400 hover:text-black rounded-xl hover:bg-[#E5E3DF]/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bài, chữ Hán, từ vựng..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E5E3DF] rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#1C1C1C] focus:ring-1 focus:ring-[#1C1C1C]"
          />
        </div>

        {/* Lessons List */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-2 max-h-[55vh]">
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
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? "bg-[#1C1C1C] text-white border-[#1C1C1C] shadow-sm"
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

                  {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
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

"use client";

import React, { useState, useCallback, useEffect } from "react";
import { EditorialSidebar, EditorialStats } from "@/components/EditorialSidebar";
import { EditorialTyping } from "@/components/EditorialTyping";
import { EditorialFlashcards } from "@/components/EditorialFlashcards";
import { EditorialLessons } from "@/components/EditorialLessons";
import { EditorialGarden } from "@/components/EditorialGarden";
import { TopicModal } from "@/components/TopicModal";
import {
  LOCAL_LEVELS,
  LOCAL_DATA,
  loadAppState,
  saveAppState,
  loadPracticeStats,
  savePracticeStats,
  getDefaultAppState,
  getDefaultPracticeStats,
  getInitialProgress,
  loadUserProgress,
  saveUserProgress,
  scheduleNextReview,
  getDueCardsCount,
} from "@/lib/data-service";
import { LevelInfo, Lesson, UserProgress } from "@/lib/types";
import { BookOpen, ChevronDown, Flame, Keyboard, Layers, Library, RotateCcw, X } from "lucide-react";

export default function HomePage() {
  const [levels] = useState<LevelInfo[]>(LOCAL_LEVELS);

  // Khởi tạo bằng defaults để SSR và lần render đầu ở client giống nhau,
  // sau đó mới nạp giá trị từ localStorage trong useEffect (client-only).
  // Điều này tránh hydration mismatch khi localStorage có giá trị khác default.
  const [currentLevelId, setCurrentLevelId] = useState<string>(
    () => getDefaultAppState().currentLevelId
  );
  const [currentLessonIdx, setCurrentLessonIdx] = useState<number>(
    () => getDefaultAppState().currentLessonIdx
  );
  const [activeMode, setActiveMode] = useState<
    "typing" | "flashcards" | "lessons" | "garden"
  >(() => getDefaultAppState().activeMode);

  const [progress, setProgress] = useState<UserProgress>(() =>
    getInitialProgress()
  );

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);
  const [dueCount, setDueCount] = useState(0);

  // Practice stats tracking with localStorage persistence
  const [stats, setStats] = useState<EditorialStats>(() =>
    getDefaultPracticeStats()
  );

  // Nạp state đã lưu sau khi mount (chỉ chạy ở client) để khớp SSR
  useEffect(() => {
    const appState = loadAppState();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentLevelId(appState.currentLevelId);
    setCurrentLessonIdx(appState.currentLessonIdx);
    setActiveMode(appState.activeMode);
    setProgress(loadUserProgress());
    setStats(loadPracticeStats());
  }, []);

  // Đồng bộ dueCount từ progress khi mount và khi progress thay đổi
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDueCount(getDueCardsCount(progress));
  }, [progress]);

  const handleToggleMastered = (key: string) => {
    setProgress((prev) => {
      const updated = {
        ...prev,
        masteredCards: {
          ...prev.masteredCards,
          [key]: !prev.masteredCards[key],
        },
      };
      saveUserProgress(updated);
      return updated;
    });
  };

  // Spaced Repetition Mark with SM-2 scheduling
  const handleMarkCard = (key: string, isMastered: boolean) => {
    setProgress((prev) => {
      const needsReviewCards = { ...prev.needsReviewCards };
      const masteredCards = { ...prev.masteredCards };
      const cardMemory = { ...prev.cardMemory };
      const now = Date.now();

      // Update mastered / review state
      if (isMastered) {
        masteredCards[key] = true;
        needsReviewCards[key] = false;
      } else {
        masteredCards[key] = false;
        needsReviewCards[key] = true;
      }

      // SM-2 scheduled next review date
      cardMemory[key] = scheduleNextReview(cardMemory[key], isMastered, now);
      const updated = { ...prev, masteredCards, needsReviewCards, cardMemory };
      saveUserProgress(updated);
      return updated;
    });
  };

  const handleRecordResult = useCallback((isCorrect: boolean) => {
    setStats((prev) => {
      const newStreak = isCorrect ? prev.currentStreak + 1 : 0;
      const newBest = Math.max(prev.bestStreak, newStreak);
      const updatedStats = {
        completedCount: prev.completedCount + 1,
        correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
        currentStreak: newStreak,
        bestStreak: newBest,
      };
      savePracticeStats(updatedStats);
      return updatedStats;
    });
  }, []);

  const handleResetStats = () => {
    const defaultStats = getDefaultPracticeStats();
    setStats(defaultStats);
    savePracticeStats(defaultStats);
  };

  const currentLevel =
    levels.find((l) => l.id === currentLevelId) || levels[0];
  const currentLessons: Lesson[] = LOCAL_DATA[currentLevelId] || [];

  // Safe clamping to avoid out-of-bounds when switching levels
  const safeLessonIdx =
    currentLessons.length > 0
      ? Math.min(Math.max(0, currentLessonIdx), currentLessons.length - 1)
      : 0;

  const currentLesson =
    currentLessons[safeLessonIdx] || currentLessons[0];

  // Selecting level updates state and saves to localStorage
  const handleSelectLevel = (lvlId: string) => {
    setCurrentLevelId(lvlId);
    setCurrentLessonIdx(0);
    saveAppState({
      currentLevelId: lvlId,
      currentLessonIdx: 0,
    });
  };

  // Selecting mode updates state and saves to localStorage
  const handleSelectMode = (mode: "typing" | "flashcards" | "lessons" | "garden") => {
    setActiveMode(mode);
    saveAppState({ activeMode: mode });
  };

  // Selecting lesson updates state across all modes and saves to localStorage
  const handleSelectLesson = (idx: number) => {
    setCurrentLessonIdx(idx);
    saveAppState({ currentLessonIdx: idx });
  };

  const handleNextLesson = () => {
    const nextIdx = Math.min(safeLessonIdx + 1, currentLessons.length - 1);
    setCurrentLessonIdx(nextIdx);
    saveAppState({ currentLessonIdx: nextIdx });
  };
  return (
    <div className="flex flex-col lg:flex-row h-dvh min-h-dvh lg:h-screen lg:overflow-hidden w-full bg-[#FAF9F6] text-[#222B25] font-sans antialiased selection:bg-[#E5E3DF] overflow-hidden">
      {/* Mobile Top Header (< lg) matching --main */}
      <header className="lg:hidden w-full border-b border-[#E5E3DF] bg-[#FAF9F6]/95 backdrop-blur-md shrink-0 z-30 px-3 py-1">
        {/* Top Row: Brand + Unified Level & Lesson Selector + Streak */}
        <div className="flex items-center justify-between gap-1.5 h-7 min-h-[26px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base font-black tracking-tighter text-[#222B25] shrink-0 leading-none">
              HANZI.
            </span>

            {/* Unified Level & Lesson Pill */}
            <button
              type="button"
              onClick={() => setIsTopicModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-[#E5E3DF] text-[11px] font-semibold text-slate-800 shadow-2xs hover:border-slate-400 active:scale-95 transition-all truncate h-6"
              title="Đổi bài học hoặc cấp độ HSK"
            >
              <span className="text-[#24523B] font-extrabold shrink-0">{currentLevelId.toUpperCase()}</span>
              <span className="text-slate-300 shrink-0">·</span>
              <span className="truncate max-w-[120px] font-medium">Bài {safeLessonIdx + 1}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
            </button>
          </div>

          {/* Right: Streak & Session Stats trigger */}
          <button
            type="button"
            onClick={() => setIsMobileStatsOpen(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-orange-600 px-2 py-0.5 bg-orange-50 hover:bg-orange-100/80 rounded-lg border border-orange-200 shadow-2xs shrink-0 cursor-pointer transition-colors active:scale-95 h-6"
            title="Bấm để xem thống kê phiên học"
          >
            <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
            <span>{stats.currentStreak}</span>
          </button>
        </div>

        {/* Bottom Row: Sleek Segmented Control for Modes */}
        <div className="p-0.5 rounded-lg bg-[#EFECE6]/80 flex items-center justify-between gap-0.5 mt-1 border border-[#E5E3DF]/50 h-7">
          <button
            type="button"
            onClick={() => handleSelectMode("typing")}
            className={`flex-1 h-6 px-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeMode === "typing"
                ? "bg-[#24523B] text-white shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Keyboard className="w-3 h-3 shrink-0" />
            <span>Gõ</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode("flashcards")}
            className={`flex-1 h-6 px-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 relative ${
              activeMode === "flashcards"
                ? "bg-[#24523B] text-white shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3 h-3 shrink-0" />
            <span>Thẻ</span>
            {dueCount > 0 && (
              <span className="absolute -top-1 -right-0.5 min-w-[14px] h-3 px-0.5 rounded-full bg-[#24523B] text-white text-[7.5px] font-bold flex items-center justify-center border border-white">
                {dueCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode("lessons")}
            className={`flex-1 h-6 px-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeMode === "lessons"
                ? "bg-[#24523B] text-white shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3 h-3 shrink-0" />
            <span>Bài khoá</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode("garden")}
            className={`flex-1 h-6 px-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeMode === "garden"
                ? "bg-[#24523B] text-white shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Library className="w-3 h-3 shrink-0" />
            <span>Vườn từ</span>
          </button>
        </div>
      </header>

      {/* Left Column: Editorial Sidebar (Desktop lg+) */}
      <EditorialSidebar
        levels={levels}
        currentLevelId={currentLevelId}
        onSelectLevel={handleSelectLevel}
        activeMode={activeMode}
        onSelectMode={handleSelectMode}
        currentLesson={currentLesson}
        currentLessonIdx={safeLessonIdx}
        onOpenTopicModal={() => setIsTopicModalOpen(true)}
        stats={stats}
        onResetStats={handleResetStats}
        progress={progress}
      />

      {/* Right Column: Full-width, Full-height Workspace Stage */}
      <main className="flex-1 min-h-0 flex flex-col w-full min-w-0 bg-[#FAF9F6] overflow-hidden lg:h-full lg:overflow-hidden">
        {activeMode === "typing" && (
          <EditorialTyping
            key={`typing-${currentLevelId}-${safeLessonIdx}`}
            lesson={currentLesson}
            lessonIdx={safeLessonIdx}
            levelId={currentLevelId}
            onOpenTopicModal={() => setIsTopicModalOpen(true)}
            onRecordResult={handleRecordResult}
          />
        )}

        {activeMode === "flashcards" && (
          <EditorialFlashcards
            key={`flashcards-${currentLevelId}-${safeLessonIdx}`}
            lesson={currentLesson}
            lessonIdx={safeLessonIdx}
            levelId={currentLevelId}
            onOpenTopicModal={() => setIsTopicModalOpen(true)}
            masteredCards={progress.masteredCards}
            needsReviewCards={progress.needsReviewCards}
            cardMemory={progress.cardMemory}
            onMarkCard={handleMarkCard}
            onNextLesson={handleNextLesson}
          />
        )}

        {activeMode === "lessons" && (
          <EditorialLessons
            key={`lessons-${currentLevelId}-${safeLessonIdx}`}
            lesson={currentLesson}
            lessonIdx={safeLessonIdx}
            levelId={currentLevelId}
            onOpenTopicModal={() => setIsTopicModalOpen(true)}
            onSelectMode={handleSelectMode}
          />
        )}

        {activeMode === "garden" && (
          <EditorialGarden
            key={`garden-${currentLevelId}`}
            initialLevelId={currentLevelId}
            masteredCards={progress.masteredCards}
            onToggleMastered={handleToggleMastered}
          />
        )}
      </main>

      {/* Topic / Lesson Selection Modal */}
      <TopicModal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        lessons={currentLessons}
        currentLessonIdx={safeLessonIdx}
        onSelectLesson={handleSelectLesson}
        levelId={currentLevelId}
        levelName={currentLevel.name}
        levels={levels}
        onSelectLevel={handleSelectLevel}
      />
      {/* Mobile Session Stats Sheet */}
      {isMobileStatsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileStatsOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border border-[#E5E3DF] shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DF]">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                <h3 className="text-base font-bold text-slate-900">
                  Thống kê phiên học
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileStatsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#FAF9F6] rounded-2xl p-3 border border-[#E5E3DF]">
                <div className="text-xs text-slate-500 font-medium">Đã luyện tập</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {stats.completedCount} <span className="text-xs font-normal text-slate-400">từ</span>
                </div>
              </div>
              <div className="bg-[#FAF9F6] rounded-2xl p-3 border border-[#E5E3DF]">
                <div className="text-xs text-slate-500 font-medium">Chuẩn 100%</div>
                <div className="text-xl font-bold text-[#24523B] mt-1">
                  {stats.correctCount} <span className="text-xs font-normal text-slate-400">từ</span>
                </div>
              </div>
            </div>

            {/* Accuracy bar */}
            <div className="bg-[#FAF9F6] rounded-2xl p-3.5 border border-[#E5E3DF] space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span>Độ chính xác</span>
                <span className="font-bold text-slate-900">
                  {stats.completedCount > 0
                    ? `${Math.round((stats.correctCount / stats.completedCount) * 100)}%`
                    : "—"}
                </span>
              </div>
              <div className="h-2 bg-[#EFECE6] w-full rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#24523B] rounded-full transition-all duration-300"
                  style={{
                    width: stats.completedCount > 0
                      ? `${Math.round((stats.correctCount / stats.completedCount) * 100)}%`
                      : "0%",
                  }}
                />
              </div>
            </div>

            {/* Streak row */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F6] border border-[#E5E3DF] text-xs">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                Chuỗi hiện tại
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {stats.currentStreak}{" "}
                <span className="text-xs text-slate-400 font-normal">
                  (Kỷ lục: {stats.bestStreak})
                </span>
              </span>
            </div>

            {/* Reset button */}
            {stats.completedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  handleResetStats();
                  setIsMobileStatsOpen(false);
                }}
                className="w-full py-2.5 rounded-xl border border-[#E5E3DF] text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Làm mới thống kê phiên này</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

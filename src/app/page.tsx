"use client";

import React, { useState, useCallback } from "react";
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
  getDefaultPracticeStats,
  loadUserProgress,
  saveUserProgress,
  scheduleNextReview,
} from "@/lib/data-service";
import { LevelInfo, Lesson, UserProgress } from "@/lib/types";
import { BookOpen, Flame } from "lucide-react";

export default function HomePage() {
  const [levels] = useState<LevelInfo[]>(LOCAL_LEVELS);

  // Synchronized active level, lesson, and mode stored in localStorage
  const [currentLevelId, setCurrentLevelId] = useState<string>(
    () => loadAppState().currentLevelId
  );
  const [currentLessonIdx, setCurrentLessonIdx] = useState<number>(
    () => loadAppState().currentLessonIdx
  );
  const [activeMode, setActiveMode] = useState<
    "typing" | "flashcards" | "lessons" | "garden"
  >(() => loadAppState().activeMode);

  const [progress, setProgress] = useState<UserProgress>(() =>
    loadUserProgress()
  );

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);

  // Practice stats tracking with localStorage persistence
  const [stats, setStats] = useState<EditorialStats>(() => loadPracticeStats());

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
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen lg:overflow-hidden w-full bg-[#FAF9F6] text-[#222B25] font-sans antialiased selection:bg-[#E5E3DF]">
      {/* Mobile Top Header (< lg) matching --main */}
      <header className="lg:hidden w-full border-b border-[#E5E3DF] bg-[#FAF9F6]/95 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div>
              <span className="text-xl font-black tracking-tighter text-[#222B25]">
                HANZI.
              </span>
              <span className="micro-caps ml-1">HSK</span>
            </div>

            {/* Quick Level switch for mobile */}
            <div className="flex items-center bg-[#E5E3DF]/60 p-0.5 rounded-lg text-xs font-bold">
              {levels.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => handleSelectLevel(lvl.id)}
                  className={`px-2 py-1 rounded-md transition-all ${
                    currentLevelId === lvl.id
                      ? "bg-[#24523B] text-white shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  {lvl.id.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Topic modal trigger on mobile */}
            <button
              type="button"
              onClick={() => setIsTopicModalOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-white px-2 py-1 rounded-lg border border-[#E5E3DF]"
            >
              <BookOpen className="w-3 h-3 text-slate-500" />
              <span className="max-w-[80px] truncate">
                Bài {safeLessonIdx + 1}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-bold text-orange-600 px-2 py-1 bg-orange-50 rounded-lg border border-orange-200">
              <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
              <span>{stats.currentStreak}</span>
            </div>
          </div>
        </div>

        {/* Mobile Mode Switcher Bar */}
        <div className="grid grid-cols-4 gap-1 pt-2 mt-2 border-t border-[#E5E3DF]">
          <button
            type="button"
            onClick={() => handleSelectMode("typing")}
            className={`py-1 text-xs font-bold rounded-lg cursor-pointer ${
              activeMode === "typing"
                ? "bg-[#24523B] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Luyện gõ
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode("flashcards")}
            className={`py-1 text-xs font-bold rounded-lg cursor-pointer ${
              activeMode === "flashcards"
                ? "bg-[#24523B] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Flashcard
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode("lessons")}
            className={`py-1 text-xs font-bold rounded-lg cursor-pointer ${
              activeMode === "lessons"
                ? "bg-[#24523B] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Bài khoá
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode("garden")}
            className={`py-1 text-xs font-bold rounded-lg cursor-pointer ${
              activeMode === "garden"
                ? "bg-[#24523B] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Vườn từ
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
      <main className="flex-1 flex flex-col h-full w-full min-w-0 overflow-hidden bg-[#FAF9F6]">
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
      />
    </div>
  );
}

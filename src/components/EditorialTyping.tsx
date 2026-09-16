"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Lesson, TypingSubMode, PassageItem } from "@/lib/types";
import { tupleToWord } from "@/lib/utils";
import { evaluateInput, EvaluationResult, speakChinese } from "@/utils/diff";
import { SentenceCard, SentenceItem } from "@/components/SentenceCard";
import { PassageCard } from "@/components/PassageCard";
import { InputArea } from "@/components/InputArea";
import { ResultDiff } from "@/components/ResultDiff";
import { StageHeader } from "@/components/StageHeader";
import { TypingControls } from "@/components/TypingControls";
import { getLessonPassages } from "@/lib/passage-service";
import confetti from "canvas-confetti";
import { playSuccessChime, playErrorBuzz } from "@/lib/sound";

interface EditorialTypingProps {
  lesson: Lesson;
  lessonIdx: number;
  levelId: string;
  onRecordResult: (isCorrect: boolean) => void;
}

export function EditorialTyping({
  lesson,
  lessonIdx,
  levelId,
  onRecordResult,
}: EditorialTypingProps) {
  // Default to "words" on server & initial render to prevent SSR hydration mismatch
  const [typingMode, setTypingMode] = useState<TypingSubMode>("words");

  // Sync saved preference from localStorage after client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("xuehanyu_typing_submode");
      if (saved === "words" || saved === "passages") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTypingMode(saved);
      }
    } catch {}
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[] | null>(null);

  // Display preferences
  const [showPinyin, setShowPinyin] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);

  const stageScrollRef = useRef<HTMLDivElement>(null);

  // Convert lesson tuples into single words list
  const wordItems: SentenceItem[] = useMemo(() => {
    if (!lesson || !lesson.w) return [];
    return lesson.w.map((item, idx) => {
      const w = tupleToWord(item, lessonIdx + 1);
      return {
        id: `word-${idx + 1}`,
        level: levelId.toUpperCase(),
        hanzi: w.zh,
        pinyin: w.py,
        meaning: w.vi,
        hv: w.hv,
        pos: w.pos,
        topicTitle: `Bài ${lessonIdx + 1}: ${lesson.t}`,
        source: "lesson" as const,
      };
    });
  }, [lesson, lessonIdx, levelId]);

  // Extract passages from lesson's readingPassages and texts
  const passageItems: PassageItem[] = useMemo(() => {
    if (!lesson) return [];
    return getLessonPassages(lesson, lessonIdx, levelId);
  }, [lesson, lessonIdx, levelId]);

  const rawCount = typingMode === "words" ? wordItems.length : passageItems.length;

  const indices = useMemo(() => {
    const arr = Array.from({ length: rawCount }, (_, i) => i);
    if (!isShuffle || !shuffledIndices || shuffledIndices.length !== rawCount) {
      return arr;
    }
    return shuffledIndices;
  }, [rawCount, isShuffle, shuffledIndices]);

  const activeIndex = indices[currentIndex] ?? 0;
  const currentWord = wordItems[activeIndex] || wordItems[0];
  const currentPassage = passageItems[activeIndex] || passageItems[0];

  // Target Hanzi text depending on active mode
  const targetHanzi = useMemo(() => {
    if (typingMode === "words") {
      return currentWord?.hanzi || "";
    }
    return currentPassage?.hanzi || "";
  }, [typingMode, currentWord, currentPassage]);

  // Target sentence representation for ResultDiff
  const currentSentenceItem: SentenceItem = useMemo(() => {
    if (typingMode === "words") {
      return currentWord;
    }
    return {
      id: currentPassage?.id || "passage-1",
      level: levelId.toUpperCase(),
      hanzi: currentPassage?.hanzi || "",
      pinyin: currentPassage?.pinyin || "",
      meaning: currentPassage?.meaning || "",
      topicTitle: currentPassage?.title,
    };
  }, [typingMode, currentWord, currentPassage, levelId]);

  const handleToggleTypingMode = (mode: TypingSubMode) => {
    if (mode === typingMode) return;
    setTypingMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("xuehanyu_typing_submode", mode);
    }
    setCurrentIndex(0);
    setUserInput("");
    setHasSubmitted(false);
    setEvaluation(null);
    setIsShuffle(false);
    setShuffledIndices(null);
  };

  const handleShuffleToggle = () => {
    if (!isShuffle) {
      const idxArr = Array.from({ length: rawCount }, (_, i) => i);
      for (let i = idxArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idxArr[i], idxArr[j]] = [idxArr[j], idxArr[i]];
      }
      setShuffledIndices(idxArr);
      setIsShuffle(true);
      setCurrentIndex(0);
      setUserInput("");
      setHasSubmitted(false);
      setEvaluation(null);
    } else {
      setIsShuffle(false);
      setShuffledIndices(null);
      setCurrentIndex(0);
      setUserInput("");
      setHasSubmitted(false);
      setEvaluation(null);
    }
  };

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setUserInput("");
      setHasSubmitted(false);
      setEvaluation(null);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < rawCount - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserInput("");
      setHasSubmitted(false);
      setEvaluation(null);
    } else {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });
      setCurrentIndex(0);
      setUserInput("");
      setHasSubmitted(false);
      setEvaluation(null);
    }
  }, [currentIndex, rawCount]);

  const handleSubmit = useCallback(() => {
    if (!userInput.trim() || !targetHanzi || hasSubmitted) return;

    const result = evaluateInput(userInput, targetHanzi, true);
    setEvaluation(result);
    setHasSubmitted(true);
    onRecordResult(result.isPerfect);

    if (result.isPerfect) {
      playSuccessChime();
    } else {
      playErrorBuzz();
    }
  }, [userInput, targetHanzi, hasSubmitted, onRecordResult]);

  const handleRetryKeep = () => {
    setHasSubmitted(false);
    setEvaluation(null);
  };

  const handleRetryClear = () => {
    setUserInput("");
    setHasSubmitted(false);
    setEvaluation(null);
  };

  const handleSkip = () => {
    onRecordResult(false);
    handleNext();
  };

  // Keyboard navigation on desktop
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleShuffleToggle();
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  });

  if (!lesson) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white border border-[#E5E3DF] rounded-2xl p-8 text-center text-slate-500">
          Chưa có dữ liệu bài học.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 lg:h-full lg:overflow-hidden select-none">
      <StageHeader currentIndex={currentIndex} totalCount={rawCount}>
        <TypingControls
          currentIndex={currentIndex}
          onPrev={handlePrev}
          onNext={handleNext}
          isShuffle={isShuffle}
          onToggleShuffle={handleShuffleToggle}
          showPinyin={showPinyin}
          onTogglePinyin={() => setShowPinyin((p) => !p)}
          showMeaning={showMeaning}
          onToggleMeaning={() => setShowMeaning((m) => !m)}
          onSpeak={() => {
            if (typingMode === "words" && currentWord?.hanzi) {
              speakChinese(currentWord.hanzi, 0.85);
            } else if (typingMode === "passages" && currentPassage?.hanzi) {
              speakChinese(currentPassage.hanzi, 0.85);
            }
          }}
          typingMode={typingMode}
          onToggleTypingMode={handleToggleTypingMode}
        />
      </StageHeader>

      {/* Main Workspace Stage - In passages mode, overscroll-y-auto allows natural unblocked scrolling */}
      <div
        ref={stageScrollRef}
        className={`flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 xl:px-8 py-3 sm:py-6 w-full touch-pan-y overscroll-y-auto ${
          typingMode === "words"
            ? "flex flex-col justify-start pt-4 sm:pt-0 sm:justify-center items-center pb-4"
            : "space-y-4 sm:space-y-6 pb-28 sm:pb-36"
        }`}
      >
        {/* Words Mode: SentenceCard displays word and highlights characters live as user types */}
        {typingMode === "words" && currentWord && (
          <div className="w-full flex flex-col items-center sm:my-auto">
            <SentenceCard
              key={`word-${currentWord.id}`}
              sentence={currentWord}
              showPinyin={showPinyin}
              showMeaning={showMeaning}
              currentLevel={levelId.toUpperCase()}
              userInput={userInput}
            />
          </div>
        )}

        {/* Passages Mode: Conversational Dialogue List */}
        {typingMode === "passages" && currentPassage && (
          <div className="w-full">
            <PassageCard
              key={`passage-${currentPassage.id}`}
              passage={currentPassage}
              userInput={userInput}
              showPinyin={showPinyin}
              showMeaning={showMeaning}
              currentLevel={levelId.toUpperCase()}
            />
          </div>
        )}
      </div>

      {/* Bottom Docked Input Area: Rendered cleanly for both words and passages without nested scroll locks */}
      {targetHanzi && (
        <div
          id="bottom-input-dock"
          className="shrink-0 border-t border-[#E5E3DF] bg-[#FAF9F6]/95 backdrop-blur-md px-3 sm:px-6 xl:px-8 py-2 sm:py-2.5 pb-safe w-full z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
        >
          <div className="w-full flex flex-col gap-2">
            <InputArea
              value={userInput}
              onChange={setUserInput}
              onSubmit={handleSubmit}
              onSkip={handleSkip}
              onReset={handleRetryClear}
              disabled={hasSubmitted && !!evaluation?.isPerfect}
              hasSubmitted={hasSubmitted}
              mode={typingMode}
              targetLength={Array.from(targetHanzi).length}
            />

            {hasSubmitted && evaluation && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-150">
                <ResultDiff
                  evaluation={evaluation}
                  targetSentence={currentSentenceItem}
                  userInput={userInput}
                  onContinue={handleNext}
                  onRetryKeep={handleRetryKeep}
                  onRetryClear={handleRetryClear}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

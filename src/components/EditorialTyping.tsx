"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Lesson } from "@/lib/types";
import { tupleToWord } from "@/lib/utils";
import { evaluateInput, EvaluationResult, speakChinese } from "@/utils/diff";
import { SentenceCard, SentenceItem } from "@/components/SentenceCard";
import { InputArea } from "@/components/InputArea";
import { ResultDiff } from "@/components/ResultDiff";
import { TopControlBar } from "@/components/TopControlBar";
import confetti from "canvas-confetti";
import { playSuccessChime, playErrorBuzz } from "@/lib/sound";

interface EditorialTypingProps {
  lesson: Lesson;
  lessonIdx: number;
  levelId: string;
  onOpenTopicModal: () => void;
  onRecordResult: (isCorrect: boolean) => void;
}

export function EditorialTyping({
  lesson,
  lessonIdx,
  levelId,
  onOpenTopicModal,
  onRecordResult,
}: EditorialTypingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[] | null>(null);

  // Display preferences
  const [showPinyin, setShowPinyin] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);

  // Convert lesson tuples into SentenceItem list
  const rawItems: SentenceItem[] = useMemo(() => {
    if (!lesson || !lesson.w) return [];
    return lesson.w.map((item, idx) => {
      const w = tupleToWord(item, lessonIdx + 1);
      return {
        id: idx + 1,
        level: levelId.toUpperCase(),
        hanzi: w.zh,
        pinyin: w.py,
        meaning: w.vi,
        hv: w.hv,
        pos: w.pos,
        topicTitle: `Bài ${lessonIdx + 1}: ${lesson.t}`,
      };
    });
  }, [lesson, lessonIdx, levelId]);

  const items = useMemo(() => {
    if (!isShuffle || !shuffledIndices || shuffledIndices.length !== rawItems.length) {
      return rawItems;
    }
    return shuffledIndices.map((i) => rawItems[i]);
  }, [rawItems, isShuffle, shuffledIndices]);

  const currentSentence = items[currentIndex] || items[0];

  const handleShuffleToggle = () => {
    if (!isShuffle) {
      const indices = rawItems.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledIndices(indices);
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
    if (currentIndex < items.length - 1) {
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
  }, [currentIndex, items.length]);

  const handleSubmit = useCallback(() => {
    if (!userInput.trim() || !currentSentence || hasSubmitted) return;

    const result = evaluateInput(userInput, currentSentence.hanzi, true);
    setEvaluation(result);
    setHasSubmitted(true);
    onRecordResult(result.isPerfect);

    if (result.isPerfect) {
      playSuccessChime();
    } else {
      playErrorBuzz();
    }
  }, [userInput, currentSentence, hasSubmitted, onRecordResult]);

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

  // Keyboard navigation
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

  if (!lesson || rawItems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white border border-[#E5E3DF] rounded-2xl p-8 text-center text-slate-500">
          Chưa có dữ liệu bài học.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden select-none">
      {/* Top Control Bar Header (Synchronized padding: px-4 sm:px-6 xl:px-8) */}
      <div className="h-14 px-4 sm:px-6 xl:px-8 border-b border-[#E5E3DF] flex items-center bg-[#FAF9F6] sticky top-0 z-10 shrink-0">
        <TopControlBar
          currentLevelId={levelId}
          currentIndex={currentIndex}
          totalCount={items.length}
          onPrev={handlePrev}
          onNext={handleNext}
          isShuffle={isShuffle}
          onToggleShuffle={handleShuffleToggle}
          showPinyin={showPinyin}
          onTogglePinyin={() => setShowPinyin((p) => !p)}
          showMeaning={showMeaning}
          onToggleMeaning={() => setShowMeaning((m) => !m)}
          onSpeak={() => {
            if (currentSentence?.hanzi) {
              speakChinese(currentSentence.hanzi, 0.9);
            }
          }}
          topicTitle={`Bài ${lessonIdx + 1}: ${lesson.t}`}
          onOpenTopicModal={onOpenTopicModal}
        />
      </div>

      {/* Main Workspace Stage (Synchronized padding: px-4 sm:px-6 xl:px-8) */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 xl:px-8 py-4 sm:py-6 flex flex-col justify-center items-center w-full">
        <div className="w-full flex flex-col items-center my-auto">
          <SentenceCard
            key={currentSentence.id}
            sentence={currentSentence}
            showPinyin={showPinyin}
            showMeaning={showMeaning}
            currentLevel={levelId.toUpperCase()}
          />
        </div>
      </div>

      {/* Bottom Docked Input Area (Synchronized padding: px-4 sm:px-6 xl:px-8) */}
      <div
        id="bottom-input-dock"
        className="shrink-0 border-t border-[#E5E3DF] bg-[#FAF9F6]/95 backdrop-blur-md px-4 sm:px-6 xl:px-8 py-2.5 sm:py-3.5 w-full z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
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
          />

          {hasSubmitted && evaluation && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-150">
              <ResultDiff
                evaluation={evaluation}
                targetSentence={currentSentence}
                userInput={userInput}
                onContinue={handleNext}
                onRetryKeep={handleRetryKeep}
                onRetryClear={handleRetryClear}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

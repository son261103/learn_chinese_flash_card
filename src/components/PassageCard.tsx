"use client";

import React, { useState, useMemo, useEffect, useRef, memo } from "react";
import { Volume2, Copy, Check, X, Play } from "lucide-react";
import { PassageItem, PassageSentence } from "@/lib/types";
import { getInitialWordRange } from "@/utils/pinyinParser";
import { speakChinese } from "@/utils/diff";
import { findWordInDict } from "@/lib/passage-service";

interface PassageCardProps {
  passage: PassageItem;
  userInput?: string;
  showPinyin?: boolean;
  showMeaning?: boolean;
  currentLevel?: string;
}

interface LookupInfo {
  word: string;
  pinyin: string;
  meaning: string;
  hv?: string;
}

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

export const PassageCard = memo(function PassageCard({
  passage,
  userInput = "",
  showPinyin = true,
  showMeaning = true,
  currentLevel = "HSK1",
}: PassageCardProps) {
  const [copied, setCopied] = useState(false);
  const [playingSentenceIdx, setPlayingSentenceIdx] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);

  // Word lookup state
  const [activeTokenKey, setActiveTokenKey] = useState<string | null>(null);
  const [lookupData, setLookupData] = useState<LookupInfo | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const charCount = useMemo(() => Array.from(passage.hanzi).length, [passage.hanzi]);

  // Clean user input without newlines or extra spaces for live character matching
  const userCleanChars = useMemo(() => {
    return Array.from(userInput.replace(/[\r\n\s]+/g, ""));
  }, [userInput]);

  // Calculate global start character offset for each sentence in the passage
  const sentenceOffsets = useMemo(() => {
    const offsets: number[] = [];
    let currentOffset = 0;
    for (const sent of passage.sentences) {
      offsets.push(currentOffset);
      const chars = Array.from(sent.zh.replace(/[\r\n\s]+/g, ""));
      currentOffset += chars.length;
    }
    return offsets;
  }, [passage.sentences]);

  // Speaker mapping for chat bubble layout (Speaker 0 = Left, Speaker 1 = Right, etc.)
  const speakerMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of passage.sentences) {
      const who = (item.who || "").trim();
      if (who && !(who in map)) {
        map[who] = Object.keys(map).length;
      }
    }
    return map;
  }, [passage.sentences]);

  const handleCopy = () => {
    navigator.clipboard.writeText(passage.hanzi);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSpeakSentence = async (text: string, idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isPlayingAll) return;
    setPlayingSentenceIdx(idx);
    await speakChinese(text, 0.9);
    setPlayingSentenceIdx(null);
  };

  const handleSpeakAll = async () => {
    if (isPlayingAll || passage.sentences.length === 0) return;
    setIsPlayingAll(true);
    for (let i = 0; i < passage.sentences.length; i++) {
      setPlayingSentenceIdx(i);
      await speakChinese(passage.sentences[i].zh, 0.88);
      await delay(350);
    }
    setPlayingSentenceIdx(null);
    setIsPlayingAll(false);
  };

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveTokenKey(null);
        setLookupData(null);
      }
    }
    if (activeTokenKey) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeTokenKey]);

  const handleCharClick = (
    sentence: PassageSentence,
    sentenceIdx: number,
    char: string,
    charIndex: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    const tokenKey = `${sentenceIdx}-${charIndex}`;
    if (activeTokenKey === tokenKey) {
      setActiveTokenKey(null);
      setLookupData(null);
      return;
    }

    setActiveTokenKey(tokenKey);
    const initial = getInitialWordRange(sentence.zh, charIndex);
    const targetWord = initial.word || char;
    const dictMatch = findWordInDict(targetWord) || findWordInDict(char);

    setLookupData({
      word: targetWord,
      pinyin: dictMatch?.py || "",
      meaning: dictMatch?.vi || sentence.vi,
      hv: dictMatch?.hv,
    });

    speakChinese(targetWord, 0.9);
  };

  return (
    <div
      id={`passage-card-${passage.id}`}
      className="w-full flex flex-col space-y-6 select-none"
    >
      {/* Top Bar Header matching Bài khoá style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E3DF]/70 w-full">
        {/* Left Section Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-xl bg-[#24523B] text-white text-xs font-bold flex items-center justify-center shrink-0">
            {passage.source === "text" ? "课" : "读"}
          </span>
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-[#222B25] uppercase truncate">
              {passage.title}
            </h3>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              · {passage.sentences.length} câu · {charCount} chữ Hán
            </span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleSpeakAll}
            disabled={isPlayingAll}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
              isPlayingAll
                ? "bg-[#24523B] text-white border-[#24523B]"
                : "bg-white text-slate-700 border-[#E5E3DF] hover:border-slate-400 hover:text-slate-900"
            }`}
            title="Nghe toàn bộ đoạn"
          >
            <Play className="w-3.5 h-3.5 text-[#24523B] fill-[#24523B]" />
            <span>{isPlayingAll ? "Đang phát..." : "Nghe toàn bộ đoạn"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-xl bg-white border border-[#E5E3DF] text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
            title="Sao chép toàn bộ chữ Hán"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#24523B]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Conversational Chat Feed matching Bài khoá layout */}
      <div className="space-y-6 pt-1 w-full">
        {passage.sentences.map((sent, sIdx) => {
          const isPlayingThis = playingSentenceIdx === sIdx;
          const speakerIndex = speakerMap[(sent.who || "").trim()] ?? 0;
          const isSecondarySpeaker = speakerIndex === 1;

          // Single character for avatar: e.g. "王" from "王一飞" or "言"
          const avatarLetter =
            (sent.who || "").replace(/[A-Za-z\s]/g, "").slice(0, 1) || String(sIdx + 1);

          const sentenceOffset = sentenceOffsets[sIdx] || 0;
          let nonSpaceCharCounter = 0;

          return (
            <div
              key={sIdx}
              className={`w-full flex ${
                isSecondarySpeaker ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex items-start gap-3 w-full md:max-w-[90%] lg:max-w-[85%] ${
                  isSecondarySpeaker ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Speaker Avatar Icon */}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs select-none border ${
                    isSecondarySpeaker
                      ? "bg-[#24523B] text-white border-[#24523B]"
                      : "bg-white text-slate-800 border-[#E5E3DF]"
                  }`}
                  title={sent.who || `Câu ${sIdx + 1}`}
                >
                  {avatarLetter}
                </div>

                {/* Speech Bubble Card */}
                <div
                  className={`flex-1 p-4 sm:p-5 rounded-3xl border transition-all flex flex-col gap-2 shadow-2xs ${
                    isSecondarySpeaker
                      ? "bg-[#FAF9F6] border-[#D1CFCA]/70 rounded-tr-xs"
                      : "bg-white border-[#E5E3DF] rounded-tl-xs"
                  } ${
                    isPlayingThis
                      ? "ring-2 ring-[#24523B]/40 bg-[#FAF9F6] border-[#24523B]/50"
                      : ""
                  }`}
                >
                  {/* Speaker Name & Play Button Row */}
                  <div className="flex items-center justify-between gap-4 pb-1.5 border-b border-[#E5E3DF]/50">
                    <span className="text-xs font-bold text-slate-500 tracking-wide font-chinese">
                      {sent.who || `Câu ${sIdx + 1}`}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleSpeakSentence(sent.zh, sIdx, e)}
                      disabled={isPlayingAll}
                      className="p-1 text-slate-400 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                      title="Phát âm câu này"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Chinese Hanzi with Live Typing Highlighting */}
                  <div className="hanzi text-2xl sm:text-3xl font-normal text-[#222B25] tracking-wide pt-0.5 leading-snug select-text">
                    {Array.from(sent.zh).map((char, charIdx) => {
                      const isWhitespace = /[\r\n\s]/.test(char);
                      if (isWhitespace) {
                        return <span key={charIdx}> </span>;
                      }

                      const globalCharIdx = sentenceOffset + nonSpaceCharCounter;
                      nonSpaceCharCounter++;

                      // Determine live typing status for this character
                      let status: "correct" | "incorrect" | "current" | "pending" =
                        "pending";
                      if (globalCharIdx < userCleanChars.length) {
                        status =
                          char === userCleanChars[globalCharIdx]
                            ? "correct"
                            : "incorrect";
                      } else if (globalCharIdx === userCleanChars.length) {
                        status = "current";
                      }

                      const tokenKey = `${sIdx}-${charIdx}`;
                      const isLookupHighlighted = activeTokenKey === tokenKey;

                      return (
                        <span
                          key={charIdx}
                          onClick={(e) =>
                            handleCharClick(sent, sIdx, char, charIdx, e)
                          }
                          title={`Nhấp để tra từ "${char}"`}
                          className={`inline-block cursor-pointer transition-all duration-150 ${
                            isLookupHighlighted
                              ? "bg-[#24523B]/20 ring-2 ring-[#24523B]/70 rounded px-0.5"
                              : ""
                          } ${
                            status === "correct"
                              ? "font-bold text-[#24523B]"
                              : status === "incorrect"
                              ? "font-bold text-rose-600 bg-rose-50/80 rounded px-0.5"
                              : status === "current"
                              ? "font-semibold text-slate-900 underline decoration-[#24523B] decoration-2 underline-offset-4 animate-pulse"
                              : "text-[#222B25] font-normal"
                          }`}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </div>

                  {/* Pinyin Line matching Bài khoá */}
                  {showPinyin && sent.py && (
                    <div className="text-sm sm:text-base font-semibold text-[#24523B] tracking-wide font-sans">
                      {sent.py}
                    </div>
                  )}

                  {/* Vietnamese Translation Line matching Bài khoá */}
                  {showMeaning && sent.vi && (
                    <div className="text-xs sm:text-sm text-slate-600 font-editorial-serif italic pt-0.5 leading-relaxed">
                      &ldquo;{sent.vi}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Word / Character Lookup Floating Popover */}
      {activeTokenKey && lookupData && (
        <div
          ref={popoverRef}
          className="fixed z-50 bottom-24 right-6 sm:right-10 w-72 sm:w-80 bg-white border border-[#E5E3DF] rounded-2xl p-4 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E5E3DF]/60">
            <div className="flex items-baseline gap-2">
              <span className="hanzi text-2xl font-bold text-slate-900 leading-none">
                {lookupData.word}
              </span>
              <span className="text-sm font-sans font-semibold text-[#24523B]">
                {lookupData.pinyin}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">
                {currentLevel}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => speakChinese(lookupData.word, 0.9)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                title="Phát âm"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTokenKey(null);
                  setLookupData(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="pt-2.5 space-y-1">
            <p className="text-xs sm:text-sm text-slate-700 font-medium leading-snug">
              {lookupData.meaning}
            </p>
            {lookupData.hv && (
              <p className="text-[11px] text-slate-400 italic">
                Âm Hán Việt: {lookupData.hv}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

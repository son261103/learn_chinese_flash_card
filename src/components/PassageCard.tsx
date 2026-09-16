"use client";

import React, { useState, useMemo, useEffect, useRef, memo } from "react";
import { Volume2, Copy, Check, X, Play, BookOpen, Quote } from "lucide-react";
import { PassageItem, PassageSentence } from "@/lib/types";
import { alignHanziAndPinyin, CharRubyToken, getInitialWordRange } from "@/utils/pinyinParser";
import { speakChinese } from "@/utils/diff";
import { findWordInDict } from "@/lib/passage-service";

interface PassageCardProps {
  passage: PassageItem;
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
  showPinyin = true,
  showMeaning = true,
  currentLevel = "HSK1",
}: PassageCardProps) {
  const [copied, setCopied] = useState(false);
  const [playingSentenceIdx, setPlayingSentenceIdx] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [hoveredSentenceIdx, setHoveredSentenceIdx] = useState<number | null>(null);

  // Word lookup state
  const [activeTokenKey, setActiveTokenKey] = useState<string | null>(null);
  const [lookupData, setLookupData] = useState<LookupInfo | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const charCount = useMemo(() => Array.from(passage.hanzi).length, [passage.hanzi]);

  // Pre-calculate and memoize tokens for all sentences in the passage
  const sentenceTokens = useMemo(() => {
    return passage.sentences.map((sent) => alignHanziAndPinyin(sent.zh));
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
    token: CharRubyToken,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (token.isPunctuation) return;

    const tokenKey = `${sentenceIdx}-${token.index}`;
    if (activeTokenKey === tokenKey) {
      setActiveTokenKey(null);
      setLookupData(null);
      return;
    }

    setActiveTokenKey(tokenKey);
    const initial = getInitialWordRange(sentence.zh, token.index);
    const targetWord = initial.word || token.char;
    const dictMatch = findWordInDict(targetWord) || findWordInDict(token.char);

    setLookupData({
      word: targetWord,
      pinyin: dictMatch?.py || token.pinyin,
      meaning: dictMatch?.vi || sentence.vi,
      hv: dictMatch?.hv,
    });

    speakChinese(targetWord, 0.9);
  };

  return (
    <div
      id={`passage-card-${passage.id}`}
      className="w-full flex flex-col space-y-4 select-none"
    >
      {/* Editorial Manuscript Paper Container */}
      <div className="w-full bg-white rounded-3xl border border-[#E5E3DF] p-6 sm:p-8 md:p-9 shadow-[0_4px_30px_rgba(0,0,0,0.02)] space-y-6 relative transition-all">
        {/* Header Bar of Manuscript */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E3DF]/70">
          {/* Left Metadata */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="h-6 px-2.5 rounded-lg bg-[#24523B] text-white text-[11px] font-bold tracking-tight inline-flex items-center gap-1 shadow-2xs">
              <BookOpen className="w-3 h-3" />
              <span>{currentLevel.toUpperCase()}</span>
            </span>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {passage.title}
            </h3>

            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              · {passage.sentences.length} câu · {charCount} chữ Hán
            </span>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleSpeakAll}
              disabled={isPlayingAll}
              className={`h-8 px-3.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                isPlayingAll
                  ? "bg-[#24523B] text-white border-[#24523B]"
                  : "bg-[#FAF9F6] text-slate-700 border-[#E5E3DF] hover:bg-white hover:text-slate-900 hover:border-slate-400"
              }`}
              title="Nghe toàn bộ đoạn văn"
            >
              <Play className="w-3 h-3 text-[#24523B] fill-[#24523B]" />
              <span>{isPlayingAll ? "Đang phát..." : "Nghe toàn bài"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="h-8 px-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E3DF] text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              title="Sao chép đoạn văn"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#24523B]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Continuous Natural Paragraph Flow */}
        <div className="w-full text-left text-slate-900">
          <div className="flex flex-wrap items-baseline gap-x-2 sm:gap-x-2.5 gap-y-6 sm:gap-y-7 leading-[2.3] sm:leading-[2.5]">
            {passage.sentences.map((sent, sIdx) => {
              const tokens = sentenceTokens[sIdx] || [];
              const isPlayingThisSentence = playingSentenceIdx === sIdx;
              const isHovered = hoveredSentenceIdx === sIdx;

              return (
                <span
                  key={sIdx}
                  onMouseEnter={() => setHoveredSentenceIdx(sIdx)}
                  onMouseLeave={() => setHoveredSentenceIdx(null)}
                  className={`group/sentence relative inline-flex flex-wrap items-end rounded-2xl px-2 py-1 -my-1 transition-all duration-150 ${
                    isPlayingThisSentence
                      ? "bg-[#24523B]/10 ring-2 ring-[#24523B]/40 shadow-xs"
                      : isHovered
                      ? "bg-[#FAF9F6] ring-1 ring-[#E5E3DF]"
                      : ""
                  }`}
                >
                  {/* Subtle superscript sentence indicator */}
                  <sup className="text-[10px] font-mono font-semibold text-slate-400 select-none mr-1 opacity-60">
                    [{sIdx + 1}]
                  </sup>

                  {/* Audio Trigger on Hover or Playing */}
                  <button
                    type="button"
                    onClick={(e) => handleSpeakSentence(sent.zh, sIdx, e)}
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-md mr-1 mb-1 transition-all cursor-pointer ${
                      isPlayingThisSentence
                        ? "text-[#24523B] bg-[#24523B]/20 opacity-100"
                        : "text-slate-400 hover:text-slate-700 opacity-0 group-hover/sentence:opacity-100"
                    }`}
                    title={`Nghe câu ${sIdx + 1}`}
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>

                  {/* Character Ruby Tokens */}
                  {tokens.map((tok) => {
                    const isChinese = !tok.isPunctuation && tok.isZh;
                    const tokenKey = `${sIdx}-${tok.index}`;
                    const isHighlighted = activeTokenKey === tokenKey;

                    if (tok.isPunctuation) {
                      return (
                        <span
                          key={tok.id}
                          className="hanzi text-xl sm:text-2xl md:text-3xl text-slate-700 select-text px-0.5"
                        >
                          {tok.char}
                        </span>
                      );
                    }

                    return (
                      <span
                        key={tok.id}
                        onClick={(e) => isChinese && handleCharClick(sent, sIdx, tok, e)}
                        title={isChinese ? `Nhấp để tra từ "${tok.char}"` : undefined}
                        className={`inline-flex flex-col items-center justify-end px-0.5 rounded-lg transition-all ${
                          isChinese ? "cursor-pointer hover:bg-slate-200/80" : ""
                        } ${isHighlighted ? "bg-[#24523B]/20 ring-2 ring-[#24523B]/70" : ""}`}
                      >
                        {showPinyin && (
                          <span className="text-[11px] sm:text-xs text-slate-400 font-sans select-none leading-none pb-1 pointer-events-none">
                            {tok.pinyin || ""}
                          </span>
                        )}
                        <span className="hanzi text-2xl sm:text-3xl md:text-[32px] font-normal text-[#1E2922] leading-tight select-text">
                          {tok.char}
                        </span>
                      </span>
                    );
                  })}
                </span>
              );
            })}
          </div>
        </div>

        {/* Footnote / Vietnamese Translation Section */}
        {showMeaning && passage.meaning && (
          <div className="pt-4 border-t border-[#E5E3DF]/70 text-left">
            <div className="flex items-start gap-2.5 p-3.5 sm:p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E3DF]/60">
              <Quote className="w-4 h-4 text-[#24523B] shrink-0 mt-0.5 opacity-80" />
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-sans">
                  Bản dịch tham khảo
                </span>
                <p className="text-sm sm:text-base text-slate-700 font-editorial-serif italic leading-relaxed">
                  &ldquo;{passage.meaning}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}
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

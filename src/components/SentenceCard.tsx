"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Volume2, Copy, Check, X } from "lucide-react";
import { alignHanziAndPinyin, CharRubyToken, getInitialWordRange } from "@/utils/pinyinParser";
import { speakChinese } from "@/utils/diff";

export interface SentenceItem {
  id: number;
  level: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  hv?: string;
  pos?: string;
  topicTitle?: string;
}

interface SentenceCardProps {
  sentence: SentenceItem;
  showPinyin?: boolean;
  showMeaning?: boolean;
  speechRate?: number;
  currentLevel?: string;
}

interface LookupInfo {
  word: string;
  pinyin: string;
  meaning: string;
  hv?: string;
}

export function SentenceCard({
  sentence,
  showPinyin = true,
  showMeaning = true,
  speechRate = 0.9,
  currentLevel = "HSK1",
}: SentenceCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);

  const [activeToken, setActiveToken] = useState<CharRubyToken | null>(null);
  const [highlightedRange, setHighlightedRange] = useState<[number, number] | null>(null);
  const [lookupData, setLookupData] = useState<LookupInfo | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const tokens = useMemo(() => {
    return alignHanziAndPinyin(sentence.hanzi);
  }, [sentence.hanzi]);

  const handleSpeak = async (textToSpeak?: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    await speakChinese(textToSpeak || sentence.hanzi, speechRate);
    setIsPlayingAudio(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sentence.hanzi);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Close lookup popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveToken(null);
        setHighlightedRange(null);
        setLookupData(null);
      }
    }
    if (activeToken || highlightedRange) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeToken, highlightedRange]);

  const handleCharClick = (token: CharRubyToken, e: React.MouseEvent) => {
    e.stopPropagation();
    if (token.isPunctuation) return;

    if (
      highlightedRange &&
      token.index >= highlightedRange[0] &&
      token.index <= highlightedRange[1]
    ) {
      setActiveToken(null);
      setHighlightedRange(null);
      setLookupData(null);
      return;
    }

    setActiveToken(token);
    const initial = getInitialWordRange(sentence.hanzi, token.index);
    setHighlightedRange([initial.start, initial.end]);

    setLookupData({
      word: initial.word || token.char,
      pinyin: token.pinyin,
      meaning: sentence.meaning,
      hv: sentence.hv,
    });

    handleSpeak(initial.word || token.char);
  };

  // Dynamic font size matching --main
  const charLength = Array.from(sentence.hanzi).length;
  const hanziSizeClass =
    charLength <= 6
      ? "text-5xl sm:text-6xl md:text-7xl lg:text-8xl"
      : charLength <= 14
      ? "text-4xl sm:text-5xl md:text-6xl"
      : charLength <= 26
      ? "text-3xl sm:text-4xl md:text-5xl"
      : "text-2xl sm:text-3xl md:text-4xl";

  return (
    <div
      id={`sentence-stage-${sentence.id}`}
      className="w-full flex flex-col items-center text-center relative select-none py-2"
    >
      {/* Audio Button on Top */}
      <button
        type="button"
        onClick={() => handleSpeak()}
        disabled={isPlayingAudio}
        className={`w-11 h-11 rounded-full border border-[#E5E3DF] bg-white text-slate-700 hover:bg-[#1C1C1C] hover:text-white hover:border-[#1C1C1C] transition-all flex items-center justify-center shadow-2xs mb-5 active:scale-95 cursor-pointer ${
          isPlayingAudio ? "ring-2 ring-emerald-500 bg-emerald-50 text-emerald-700" : ""
        }`}
        title="Nghe phát âm (Audio)"
      >
        <Volume2 className="w-4.5 h-4.5" />
      </button>

      {/* Target Hanzi with Interlinear Ruby Pinyin */}
      <div className="w-full flex flex-col justify-center items-center relative">
        <div className="relative group w-full flex flex-wrap items-end justify-center gap-x-1.5 sm:gap-x-2 gap-y-3 sm:gap-y-4 px-2 leading-tight">
          {tokens.map((tok) => {
            const isHighlighted =
              highlightedRange !== null &&
              tok.index >= highlightedRange[0] &&
              tok.index <= highlightedRange[1];
            const isChinese = !tok.isPunctuation && tok.isZh;

            if (tok.isPunctuation) {
              return (
                <div
                  key={tok.id}
                  className="inline-flex flex-col items-center justify-end px-0.5 py-0.5"
                >
                  {showPinyin && (
                    <span className="text-xs sm:text-sm select-none opacity-0 pb-1 min-h-[1.25rem] flex items-center justify-center pointer-events-none">
                      ·
                    </span>
                  )}
                  <span
                    className={`hanzi ${hanziSizeClass} font-medium text-slate-700 select-text leading-none`}
                  >
                    {tok.char}
                  </span>
                  <span className="w-1 h-1 mt-1 opacity-0 pointer-events-none" />
                </div>
              );
            }

            return (
              <div
                key={tok.id}
                onClick={(e) => isChinese && handleCharClick(tok, e)}
                title={isChinese ? `Nhấp để tra từ "${tok.char}"` : undefined}
                className={`group/char relative inline-flex flex-col items-center justify-end rounded-2xl transition-all duration-150 px-1.5 py-1 ${
                  isChinese
                    ? "cursor-pointer hover:bg-black/5 active:scale-95"
                    : "cursor-default"
                } ${
                  isHighlighted
                    ? "bg-amber-100/90 ring-2 ring-amber-400/80 shadow-xs z-10"
                    : ""
                }`}
              >
                {/* Pinyin above Hanzi */}
                {showPinyin ? (
                  <span
                    className={`text-xs sm:text-sm font-sans tracking-tight select-none transition-all pb-1 min-h-[1.25rem] flex items-center justify-center ${
                      isHighlighted
                        ? "font-bold text-amber-900"
                        : "text-slate-400 font-medium group-hover/char:text-slate-900"
                    }`}
                  >
                    {tok.pinyin || ""}
                  </span>
                ) : (
                  <span className="text-xs sm:text-sm select-none opacity-0 pb-1 min-h-[1.25rem] pointer-events-none">
                    &nbsp;
                  </span>
                )}

                {/* Hanzi character */}
                <span
                  id={`target-hanzi-${tok.id}`}
                  className={`hanzi ${hanziSizeClass} font-medium tracking-tight select-text transition-all leading-none ${
                    isHighlighted ? "text-amber-950 font-semibold" : "text-slate-900"
                  }`}
                >
                  {tok.char}
                </span>

                {/* Subtle dot to indicate clickable dictionary */}
                <span
                  className={`w-1 h-1 rounded-full transition-opacity mt-1.5 ${
                    isChinese
                      ? isHighlighted
                        ? "bg-amber-500 opacity-100"
                        : "bg-slate-300 opacity-0 group-hover/char:opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                />
              </div>
            );
          })}

          {/* Quick Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-6 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 rounded-lg hidden md:block cursor-pointer"
            title="Sao chép chữ Hán"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Full Sentence translation line */}
        {showMeaning && (
          <div className="mt-4 sm:mt-5 px-4 sm:px-6 py-2 rounded-2xl bg-white/75 border border-[#E5E3DF]/80 shadow-2xs">
            <p className="text-sm sm:text-base md:text-lg text-slate-700 italic font-editorial-serif leading-relaxed">
              &ldquo;{sentence.meaning}&rdquo;
            </p>
            {sentence.hv && (
              <span className="text-xs text-slate-400 block mt-0.5 font-sans">
                Hán Việt: {sentence.hv}
              </span>
            )}
          </div>
        )}

        {/* Word / Character Lookup Popover */}
        {activeToken && lookupData && (
          <div
            ref={popoverRef}
            className="absolute z-30 top-full mt-3 w-72 sm:w-80 bg-white border border-[#E5E3DF] rounded-2xl p-4 shadow-xl text-left animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E5E3DF]/60">
              <div className="flex items-baseline gap-2">
                <span className="hanzi text-2xl font-bold text-slate-900 leading-none">
                  {lookupData.word}
                </span>
                <span className="text-sm font-sans font-semibold text-amber-700">
                  {lookupData.pinyin}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">
                  {currentLevel}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSpeak(lookupData.word)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Phát âm"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveToken(null);
                    setHighlightedRange(null);
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
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import {
  Volume2,
  Keyboard,
  Layers,
  MessageSquare,
  FileText,
  BookOpenText,
  BookOpen,
  Play,
} from "lucide-react";
import { StageHeader, stageIconBtnClass } from "@/components/StageHeader";
import { Lesson } from "@/lib/types";
import { speakChinese } from "@/utils/diff";

interface EditorialLessonsProps {
  lesson: Lesson;
  onSelectMode: (mode: "typing" | "flashcards") => void;
}

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

export function EditorialLessons({
  lesson,
  onSelectMode,
}: EditorialLessonsProps) {
  const [activeSection, setActiveSection] = useState<"dialogue" | "grammar" | "reading">("dialogue");
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [showMeaning, setShowMeaning] = useState(true);

  const allDialogueLines = useMemo(() => {
    if (!lesson.texts) return [];
    return lesson.texts.flatMap((sec) => sec.dialogue || []);
  }, [lesson.texts]);

  const handleSpeakLine = async (key: string, text: string) => {
    setPlayingKey(key);
    await speakChinese(text, 0.9);
    setPlayingKey(null);
  };

  const handleSpeakAll = async (dialogueLines: { zh: string }[]) => {
    if (isPlayingAll || dialogueLines.length === 0) return;
    setIsPlayingAll(true);
    for (let i = 0; i < dialogueLines.length; i++) {
      setPlayingKey(`all_${i}`);
      await speakChinese(dialogueLines[i].zh, 0.85);
      await delay(400);
    }
    setPlayingKey(null);
    setIsPlayingAll(false);
  };

  const grammarCount = lesson.grammarPoints?.length || 0;
  const readingCount = lesson.readingPassages?.length || 0;

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 lg:h-full lg:overflow-hidden select-none">
      <StageHeader progress={0}>
        <div className="w-full flex items-center justify-between gap-2 py-0.5">
          {/* Left: section sub-tabs (scrollable on mobile) */}
          <div className="flex items-center min-w-0 flex-1 overflow-x-auto no-scrollbar">
            <div className="inline-flex items-center p-0.5 h-8 rounded-xl border border-[#E5E3DF] bg-[#EFECE6]/70 shrink-0">
              <button
                type="button"
                onClick={() => setActiveSection("dialogue")}
                className={`h-full px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeSection === "dialogue"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden min-[380px]:inline">Hội thoại</span>
              </button>
              {grammarCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSection("grammar")}
                  className={`h-full px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeSection === "grammar"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden min-[380px]:inline">Ngữ pháp ({grammarCount})</span>
                </button>
              )}
              {readingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSection("reading")}
                  className={`h-full px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeSection === "reading"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden min-[380px]:inline">Luyện đọc</span>
                </button>
              )}
            </div>
          </div>
          {/* Right: icon-only meaning + mode shortcuts */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setShowMeaning(!showMeaning)}
              aria-pressed={showMeaning}
              aria-label="Bật / tắt dịch nghĩa tiếng Việt"
              title="Bật / Tắt dịch nghĩa tiếng Việt"
              className={stageIconBtnClass(showMeaning)}
            >
              <BookOpenText className="w-4 h-4" />
            </button>
            {allDialogueLines.length > 0 && (
              <button
                type="button"
                onClick={() => handleSpeakAll(allDialogueLines)}
                aria-label={isPlayingAll ? "Đang phát toàn bộ bài khoá" : "Nghe toàn bộ bài khoá"}
                title={isPlayingAll ? "Đang phát toàn bộ bài khoá" : "Nghe toàn bộ bài khoá"}
                className={stageIconBtnClass(isPlayingAll)}
              >
                <Play className={`w-4 h-4 ${isPlayingAll ? "fill-white text-white" : "fill-[#24523B] text-[#24523B]"}`} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectMode("typing")}
              aria-label="Chuyển sang Luyện gõ bài này"
              title="Chuyển sang Luyện gõ bài này"
              className={stageIconBtnClass(false)}
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelectMode("flashcards")}
              aria-label="Chuyển sang Flashcard bài này"
              title="Chuyển sang Flashcard bài này"
              className={stageIconBtnClass(false)}
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>
      </StageHeader>

      {/* Main Content Area - Synchronized padding: px-3 sm:px-6 xl:px-8 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 xl:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8 w-full touch-scroll">
        {/* SECTION 1: True Conversational Chat Script */}
        {activeSection === "dialogue" && (
          <div className="space-y-10 w-full">
            {lesson.texts && lesson.texts.length > 0 ? (
              lesson.texts.map((sec, sIdx) => {
                const allDialogue = sec.dialogue || [];
                const speakerMap: Record<string, number> = {};
                for (const item of allDialogue) {
                  const who = (item.who || "").trim();
                  if (who && !(who in speakerMap)) {
                    speakerMap[who] = Object.keys(speakerMap).length;
                  }
                }

                // Clean label: remove "· Bài khoá X" or "· BÀI KHOÁ X"
                const cleanLabel = (sec.label || `课文 ${sIdx + 1}`).replace(/·\s*bài khoá\s*\d*/i, "").replace(/·\s*BÀI KHOÁ\s*\d*/i, "").trim();

                return (
                  <div key={sIdx} className="space-y-4 w-full">
                    {/* Section Top Bar with Title and Play Whole Dialogue */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E5E3DF]">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-[#24523B] text-white text-xs font-bold flex items-center justify-center">
                          {sIdx + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold tracking-tight text-[#222B25] uppercase font-chinese">
                            {cleanLabel}
                          </h3>
                        </div>
                      </div>

                      {allDialogue.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSpeakAll(allDialogue)}
                          disabled={isPlayingAll}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E5E3DF] text-slate-700 hover:border-slate-400 hover:text-slate-900 text-xs font-semibold transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
                        >
                          <Play className="w-3.5 h-3.5 text-[#24523B] fill-[#24523B]" />
                          <span>{isPlayingAll ? "Đang phát..." : "Nghe toàn bộ đoạn"}</span>
                        </button>
                      )}
                    </div>

                    {/* Situation / Context Callout Banner */}
                    {sec.situation && (
                      <div className="w-full p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E5E3DF] text-xs sm:text-sm text-slate-600 shadow-2xs flex items-start gap-2.5">
                        <span className="font-bold text-slate-800 shrink-0">Bối cảnh:</span>
                        <span className="italic leading-relaxed">{sec.situation}</span>
                      </div>
                    )}

                    {/* Conversational Chat Feed */}
                    <div className="space-y-4 pt-2 w-full">
                      {allDialogue.map((line, lIdx) => {
                        const lineKey = `${sIdx}_${lIdx}`;
                        const isPlayingThis =
                          playingKey === lineKey || playingKey === `all_${lIdx}`;
                        const speakerIndex = speakerMap[(line.who || "").trim()] ?? 0;
                        const isSecondarySpeaker = speakerIndex === 1;

                        const avatarLetter = (line.who || "").replace(/[A-Za-z\s]/g, "").slice(0, 1) || "言";

                        return (
                          <div
                            key={lIdx}
                            className={`w-full flex ${
                              isSecondarySpeaker ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`flex items-start gap-2 sm:gap-3 w-full md:max-w-[90%] lg:max-w-[85%] ${
                                isSecondarySpeaker ? "flex-row-reverse" : "flex-row"
                              }`}
                            >
                              {/* Speaker Avatar Icon */}
                              <div
                                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs select-none border ${
                                  isSecondarySpeaker
                                    ? "bg-[#24523B] text-white border-[#24523B]"
                                    : "bg-white text-slate-800 border-[#E5E3DF]"
                                }`}
                                title={line.who}
                              >
                                {avatarLetter}
                              </div>

                              {/* Speech Bubble Card */}
                              <div
                                className={`flex-1 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-col gap-1 sm:gap-1.5 shadow-2xs ${
                                  isSecondarySpeaker
                                    ? "bg-[#FAF9F6] border-[#D1CFCA] rounded-tr-xs"
                                    : "bg-white border-[#E5E3DF] rounded-tl-xs"
                                } ${
                                  isPlayingThis
                                    ? "ring-2 ring-[#24523B]/40 bg-[#FAF9F6] border-[#24523B]/50"
                                    : ""
                                }`}
                              >
                                {/* Speaker Name & Play Button Row */}
                                <div className="flex items-center justify-between gap-4 pb-1 border-b border-[#E5E3DF]/50">
                                  <span className="text-[11px] font-bold text-slate-500 tracking-wide">
                                    {line.who}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handleSpeakLine(lineKey, line.zh)}
                                    className="p-1 text-slate-400 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                                    title="Phát âm câu này"
                                  >
                                    <Volume2 className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Chinese Hanzi */}
                                <div className="hanzi text-xl sm:text-2xl md:text-3xl font-normal text-[#222B25] tracking-wide pt-0.5 leading-snug">
                                  {line.zh}
                                </div>

                                {/* Pinyin */}
                                <div className="text-sm sm:text-base font-semibold text-[#24523B] tracking-wide">
                                  {line.py}
                                </div>

                                {/* Vietnamese Translation (Toggled or Hidden per request) */}
                                {showMeaning && line.vi && (
                                  <div className="text-xs sm:text-sm text-slate-600 font-editorial-serif italic pt-0.5 leading-relaxed">
                                    &ldquo;{line.vi}&rdquo;
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white border border-[#E5E3DF] rounded-2xl text-slate-500 text-xs">
                Chưa có dữ liệu bài khoá cho bài học này.
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: Grammar Points (Synchronized padding) */}
        {activeSection === "grammar" && (
          <div className="space-y-6 w-full">
            {lesson.grammarPoints && lesson.grammarPoints.length > 0 ? (
              lesson.grammarPoints.map((gp, i) => (
                <div
                  key={i}
                  className="w-full p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#E5E3DF] shadow-2xs space-y-3 sm:space-y-4"
                >
                  {/* Grammar Title */}
                  <div className="flex items-baseline gap-3 pb-3 border-b border-[#E5E3DF]">
                    <span className="w-7 h-7 rounded-xl bg-[#24523B] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <h4 className="hanzi text-lg sm:text-2xl font-bold text-[#222B25]">
                        {gp.title_zh}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 font-editorial-serif italic mt-0.5">
                        {gp.title_vi}
                      </p>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed bg-[#FAF9F6] p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[#E5E3DF]/80">
                    <p className="hanzi font-normal text-base sm:text-lg text-slate-900">{gp.explain_zh}</p>
                    <p className="text-slate-600 italic font-editorial-serif border-t border-[#E5E3DF] pt-2">
                      {gp.explain_vi}
                    </p>
                  </div>

                  {/* Example Sentences */}
                  {gp.examples && gp.examples.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="micro-caps text-slate-400">Ví dụ câu mẫu</span>
                      <div className="space-y-2">
                        {gp.examples.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#FAF9F6] border border-[#E5E3DF] flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="hanzi text-base sm:text-lg font-normal text-slate-900">
                                {ex.zh}
                              </div>
                              <div className="text-xs sm:text-sm font-semibold text-[#24523B]">
                                {ex.py}
                              </div>
                              <div className="text-xs sm:text-sm text-slate-500 font-editorial-serif italic">
                                &ldquo;{ex.vi}&rdquo;
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => speakChinese(ex.zh, 0.9)}
                              className="w-9 h-9 rounded-xl bg-white border border-[#E5E3DF] text-slate-600 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                              title="Nghe câu ví dụ"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-white border border-[#E5E3DF] rounded-2xl text-slate-500 text-xs">
                Không có điểm ngữ pháp nào được ghi nhận cho bài này.
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: Reading Passages (Synchronized padding) */}
        {activeSection === "reading" && (
          <div className="space-y-6 w-full">
            {lesson.readingPassages && lesson.readingPassages.length > 0 ? (
              lesson.readingPassages.map((rp, rIdx) => (
                <div
                  key={rIdx}
                  className="w-full p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border border-[#E5E3DF] shadow-2xs space-y-4 sm:space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DF]">
                    <span className="micro-caps text-slate-400">
                      Đoạn văn đọc hiểu #{rIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSpeakAll(rp.zh.map((s) => ({ zh: s })))}
                      disabled={isPlayingAll}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#E5E3DF] text-slate-700 hover:text-slate-900 hover:bg-white text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-[#24523B] fill-[#24523B]" />
                      <span>Nghe cả đoạn</span>
                    </button>
                  </div>

                  {/* Sentence by sentence reading */}
                  <div className="space-y-3">
                    {rp.zh?.map((zhLine, zIdx) => (
                      <div
                        key={zIdx}
                        className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#FAF9F6] border border-[#E5E3DF] hover:border-slate-300 transition-all flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="hanzi text-lg sm:text-xl font-normal text-[#222B25] leading-relaxed">
                            {zhLine}
                          </div>
                          {rp.vi?.[zIdx] && (
                            <div className="text-xs sm:text-sm text-slate-500 font-editorial-serif italic">
                              &ldquo;{rp.vi[zIdx]}&rdquo;
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => speakChinese(zhLine, 0.9)}
                          className="w-8 h-8 rounded-lg bg-white border border-[#E5E3DF] text-slate-600 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                          title="Nghe câu"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-white border border-[#E5E3DF] rounded-2xl text-slate-500 text-xs">
                Không có đoạn văn luyện đọc cho bài này.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

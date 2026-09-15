"use client";

import React, { useState } from "react";
import {
  Volume2,
  BookOpen,
  Keyboard,
  Layers,
  ChevronDown,
  MessageSquare,
  FileText,
  Play,
} from "lucide-react";
import { Lesson } from "@/lib/types";
import { speakChinese } from "@/utils/diff";

interface EditorialLessonsProps {
  lesson: Lesson;
  lessonIdx: number;
  levelId: string;
  onOpenTopicModal: () => void;
  onSelectMode: (mode: "typing" | "flashcards") => void;
}

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

export function EditorialLessons({
  lesson,
  lessonIdx,
  levelId,
  onOpenTopicModal,
  onSelectMode,
}: EditorialLessonsProps) {
  const [activeSection, setActiveSection] = useState<"dialogue" | "grammar" | "reading">("dialogue");
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);

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
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden select-none">
      {/* Top Bar Header (Synchronized padding: px-4 sm:px-6 xl:px-8) */}
      <div className="h-14 px-4 sm:px-6 xl:px-8 border-b border-[#E5E3DF] flex items-center justify-between bg-[#FAF9F6] sticky top-0 z-10 shrink-0">
        {/* Left: Level Badge + Lesson Selector */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-9 px-3 inline-flex items-center justify-center text-xs font-bold tracking-tight rounded-xl bg-[#1C1C1C] text-white shadow-xs shrink-0">
            {levelId.toUpperCase()}
          </span>

          <button
            type="button"
            onClick={onOpenTopicModal}
            className="h-9 px-3.5 inline-flex items-center gap-2 text-xs sm:text-sm font-semibold rounded-xl border border-[#E5E3DF] bg-white text-slate-800 hover:border-slate-400 hover:bg-[#FAF9F6] transition-all shadow-2xs group cursor-pointer truncate"
            title="Đổi bài học"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-[280px]">
              Bài {lessonIdx + 1}: {lesson.t}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 ml-0.5" />
          </button>
        </div>

        {/* Center/Right: Sub-tabs, Meaning toggle & Mode Shortcuts */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Section Sub-tabs */}
          <div className="inline-flex items-center h-9 rounded-xl border border-[#E5E3DF] bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveSection("dialogue")}
              className={`h-full px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSection === "dialogue"
                  ? "bg-[#1C1C1C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Hội thoại</span>
            </button>

            {grammarCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveSection("grammar")}
                className={`h-full px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeSection === "grammar"
                    ? "bg-[#1C1C1C] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ngữ pháp ({grammarCount})</span>
              </button>
            )}

            {readingCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveSection("reading")}
                className={`h-full px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeSection === "reading"
                    ? "bg-[#1C1C1C] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Luyện đọc</span>
              </button>
            )}
          </div>

          {/* Optional Meaning toggle */}
          <button
            type="button"
            onClick={() => setShowMeaning(!showMeaning)}
            className={`h-9 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              showMeaning
                ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                : "bg-white text-slate-600 border-[#E5E3DF] hover:border-slate-400"
            }`}
            title="Bật / Tắt dịch nghĩa tiếng Việt"
          >
            Dịch nghĩa
          </button>

          {/* Quick Mode Shortcuts */}
          <button
            type="button"
            onClick={() => onSelectMode("typing")}
            className="h-9 px-3 rounded-xl bg-white hover:bg-[#FAF9F6] text-slate-700 border border-[#E5E3DF] text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer hidden md:inline-flex"
            title="Chuyển sang Luyện gõ bài này"
          >
            <Keyboard className="w-3.5 h-3.5 text-slate-500" />
            <span>Luyện gõ</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectMode("flashcards")}
            className="h-9 px-3 rounded-xl bg-white hover:bg-[#FAF9F6] text-slate-700 border border-[#E5E3DF] text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer hidden md:inline-flex"
            title="Chuyển sang Flashcard bài này"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Flashcard</span>
          </button>
        </div>
      </div>

      {/* Main Content Area - Synchronized padding: px-4 sm:px-6 xl:px-8 */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 xl:px-8 py-6 space-y-8 w-full">
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
                        <span className="w-7 h-7 rounded-xl bg-[#1C1C1C] text-white text-xs font-bold flex items-center justify-center">
                          {sIdx + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold tracking-tight text-[#1C1C1C] uppercase font-chinese">
                            {cleanLabel}
                          </h3>
                        </div>
                      </div>

                      {allDialogue.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSpeakAll(allDialogue)}
                          disabled={isPlayingAll}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E5E3DF] text-slate-700 hover:border-slate-400 hover:text-black text-xs font-semibold transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
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
                              className={`flex items-start gap-3 w-full md:max-w-[90%] lg:max-w-[85%] ${
                                isSecondarySpeaker ? "flex-row-reverse" : "flex-row"
                              }`}
                            >
                              {/* Speaker Avatar Icon */}
                              <div
                                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs select-none border ${
                                  isSecondarySpeaker
                                    ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                                    : "bg-white text-slate-800 border-[#E5E3DF]"
                                }`}
                                title={line.who}
                              >
                                {avatarLetter}
                              </div>

                              {/* Speech Bubble Card */}
                              <div
                                className={`flex-1 p-4 sm:p-5 rounded-3xl border transition-all flex flex-col gap-1.5 shadow-2xs ${
                                  isSecondarySpeaker
                                    ? "bg-[#FAF9F6] border-[#D1CFCA] rounded-tr-xs"
                                    : "bg-white border-[#E5E3DF] rounded-tl-xs"
                                } ${
                                  isPlayingThis
                                    ? "ring-2 ring-amber-400 bg-amber-50/70 border-amber-300"
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
                                    className="p-1 text-slate-400 hover:text-black rounded-lg transition-colors cursor-pointer"
                                    title="Phát âm câu này"
                                  >
                                    <Volume2 className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Chinese Hanzi */}
                                <div className="hanzi text-2xl sm:text-3xl font-normal text-[#1C1C1C] tracking-wide pt-0.5 leading-snug">
                                  {line.zh}
                                </div>

                                {/* Pinyin */}
                                <div className="text-sm sm:text-base font-semibold text-amber-800/95 tracking-wide">
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
                  className="w-full p-5 sm:p-7 rounded-3xl bg-white border border-[#E5E3DF] shadow-2xs space-y-4"
                >
                  {/* Grammar Title */}
                  <div className="flex items-baseline gap-3 pb-3 border-b border-[#E5E3DF]">
                    <span className="w-7 h-7 rounded-xl bg-[#1C1C1C] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <h4 className="hanzi text-xl sm:text-2xl font-bold text-[#1C1C1C]">
                        {gp.title_zh}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 font-editorial-serif italic mt-0.5">
                        {gp.title_vi}
                      </p>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed bg-[#FAF9F6] p-4 sm:p-5 rounded-2xl border border-[#E5E3DF]/80">
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
                            className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E3DF] flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="hanzi text-base sm:text-lg font-normal text-slate-900">
                                {ex.zh}
                              </div>
                              <div className="text-xs sm:text-sm font-semibold text-amber-800">
                                {ex.py}
                              </div>
                              <div className="text-xs sm:text-sm text-slate-500 font-editorial-serif italic">
                                &ldquo;{ex.vi}&rdquo;
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => speakChinese(ex.zh, 0.9)}
                              className="w-9 h-9 rounded-xl bg-white border border-[#E5E3DF] text-slate-600 hover:text-black hover:border-slate-400 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
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
                  className="w-full p-6 sm:p-8 rounded-3xl bg-white border border-[#E5E3DF] shadow-2xs space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DF]">
                    <span className="micro-caps text-slate-400">
                      Đoạn văn đọc hiểu #{rIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSpeakAll(rp.zh.map((s) => ({ zh: s })))}
                      disabled={isPlayingAll}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#E5E3DF] text-slate-700 hover:text-black hover:bg-white text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                      <span>Nghe cả đoạn</span>
                    </button>
                  </div>

                  {/* Sentence by sentence reading */}
                  <div className="space-y-3">
                    {rp.zh?.map((zhLine, zIdx) => (
                      <div
                        key={zIdx}
                        className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E3DF] hover:border-slate-300 transition-all flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="hanzi text-lg sm:text-xl font-normal text-[#1C1C1C] leading-relaxed">
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
                          className="w-8 h-8 rounded-lg bg-white border border-[#E5E3DF] text-slate-600 hover:text-black hover:border-slate-400 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
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

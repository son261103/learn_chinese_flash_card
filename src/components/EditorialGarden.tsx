"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Volume2,
  Search,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { StageHeader, stageIconBtnClass } from "@/components/StageHeader";
import gardenDataRaw from "@/data/garden.json";
import { speakChinese } from "@/utils/diff";

interface GardenWord {
  zh: string;
  py: string;
  hv: string;
  vi: string;
  pos?: string;
}

interface EditorialGardenProps {
  initialLevelId?: string;
  masteredCards?: Record<string, boolean>;
  onToggleMastered?: (key: string) => void;
}

const gardenData = gardenDataRaw as Record<string, GardenWord[]>;

export function EditorialGarden({
  initialLevelId = "hsk1",
}: EditorialGardenProps) {
  const [level, setLevel] = useState(initialLevelId);
  const [query, setQuery] = useState("");
  const [isHideMode, setIsHideMode] = useState(false);
  const [revealedItems, setRevealedItems] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(60);

  const rawList = useMemo<GardenWord[]>(() => gardenData[level] || [], [level]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rawList;
    return rawList.filter(
      (w) =>
        w.zh.includes(q) ||
        w.py.toLowerCase().includes(q) ||
        w.vi.toLowerCase().includes(q) ||
        (w.hv && w.hv.toLowerCase().includes(q))
    );
  }, [rawList, query]);

  const displayedWords = filtered.slice(0, page);

  const handleReveal = (wordKey: string) => {
    setRevealedItems((prev) => ({ ...prev, [wordKey]: true }));
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => (prev < filtered.length ? prev + 60 : prev));
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "300px",
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length, displayedWords.length]);

  const handleContainerScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 350) {
      setPage((prev) => (prev < filtered.length ? prev + 60 : prev));
    }
  };

  const handleLevelChange = (lvlKey: string) => {
    setLevel(lvlKey);
    setPage(60);
    setQuery("");
    setRevealedItems({});
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 lg:h-full lg:overflow-hidden select-none">
      <StageHeader progress={0}>
        <div className="w-full flex items-center justify-between gap-2 py-0.5">
          {/* Left: level switcher (scrollable on mobile) */}
          <div className="flex items-center min-w-0 flex-1 overflow-x-auto no-scrollbar">
            <div className="inline-flex items-center p-0.5 h-8 rounded-xl border border-[#E5E3DF] bg-[#EFECE6]/70 shrink-0">
              {(["hsk1", "hsk2", "hsk3"] as const).map((lvlKey) => (
                <button
                  key={lvlKey}
                  type="button"
                  onClick={() => handleLevelChange(lvlKey)}
                  className={`h-full px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    level === lvlKey
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {lvlKey.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {/* Right: icon-only hide-meaning toggle */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => {
                setIsHideMode(!isHideMode);
                setRevealedItems({});
              }}
              aria-pressed={isHideMode}
              aria-label="Ẩn / hiện nghĩa để tự kiểm tra trí nhớ"
              title="Ẩn / Hiện nghĩa để tự kiểm tra trí nhớ"
              className={stageIconBtnClass(isHideMode)}
            >
              {isHideMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </StageHeader>

      {/* Main Content Area (Synchronized padding: px-3 sm:px-6 xl:px-8) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleContainerScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 xl:px-8 py-4 sm:py-6 space-y-4 w-full touch-scroll"
      >
        {/* Table Card with Integrated Search */}
        <div className="w-full bg-white rounded-2xl border border-[#E5E3DF] shadow-2xs overflow-hidden">
          {/* Toolbar inside table header */}
          <div className="p-3.5 sm:p-5 border-b border-[#E5E3DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-3">
              <span className="micro-caps text-slate-400">
                Đang hiển thị {displayedWords.length} / {filtered.length} từ
              </span>
              {isHideMode && (
                <span className="text-xs text-[#24523B] font-medium hidden md:inline">
                  (Bấm vào biểu tượng mắt để mở nghĩa)
                </span>
              )}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(60);
                }}
                placeholder="Tìm từ vựng..."
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full pl-9 pr-8 py-2 text-base sm:text-xs bg-[#FAF9F6] border border-[#E5E3DF] rounded-xl focus:outline-none focus:border-[#24523B]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(60);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {/* Mobile: card list (no horizontal scroll) */}
          <div className="md:hidden divide-y divide-[#E5E3DF]">
            {displayedWords.map((w, idx) => {
              const wordKey = `${level}_garden_${w.zh}_${idx}`;
              const isRevealed = !isHideMode || !!revealedItems[wordKey];
              return (
                <div
                  key={idx}
                  className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 text-left transition-colors hover:bg-[#FAF9F6]/80"
                >
                  {/* Left Column: STT + Chữ Hán lớn + Pinyin + Hán Việt */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-5 text-center text-xs font-mono text-slate-400 shrink-0 font-medium">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="hanzi text-2xl font-bold text-slate-900 leading-tight">
                          {w.zh}
                        </span>
                        <span
                          className={`text-sm font-semibold text-[#24523B] font-sans transition-all ${
                            !isRevealed ? "blur-sm select-none" : ""
                          }`}
                        >
                          {w.py}
                        </span>
                      </div>
                      {w.hv && (
                        <p
                          className={`text-xs text-slate-400 italic mt-0.5 transition-all truncate font-sans ${
                            !isRevealed ? "blur-sm select-none" : ""
                          }`}
                        >
                          Hán Việt: {w.hv}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Nghĩa tiếng Việt dàn sang phải + Nút loa phát âm / Mắt */}
                  <div className="flex items-center gap-2 shrink-0 max-w-[52%] justify-end text-right">
                    <p
                      className={`text-sm font-medium text-slate-800 leading-snug line-clamp-2 transition-all ${
                        !isRevealed ? "blur-sm select-none" : ""
                      }`}
                    >
                      {w.vi}
                    </p>
                    <button
                      type="button"
                      onClick={() => speakChinese(w.zh, 0.9)}
                      aria-label={`Nghe ${w.zh}`}
                      className="w-8 h-8 rounded-xl bg-white border border-[#E5E3DF] text-slate-600 hover:text-slate-900 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center justify-center shadow-2xs"
                      title="Phát âm"
                    >
                      <Volume2 className="w-4 h-4 text-slate-600" />
                    </button>
                    {isHideMode && !isRevealed && (
                      <button
                        type="button"
                        onClick={() => handleReveal(wordKey)}
                        aria-label="Xem đáp án"
                        title="Xem đáp án"
                        className="w-8 h-8 rounded-xl border border-[#E5E3DF] bg-white text-slate-500 hover:text-slate-900 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {displayedWords.length === 0 && (
              <p className="p-6 text-center text-xs text-slate-400">
                Không tìm thấy từ nào khớp “{query}”.
              </p>
            )}
          </div>
          {/* Desktop: full table */}
          <div className="hidden md:block overflow-x-auto touch-scroll">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] text-xs text-slate-500 font-semibold border-b border-[#E5E3DF]">
                  <th className="py-2.5 px-3 sm:px-4 w-10 text-center whitespace-nowrap">STT</th>
                  <th className="py-2.5 px-3 sm:px-4 w-10 whitespace-nowrap">Nghe</th>
                  <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Chữ Hán</th>
                  <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Pinyin</th>
                  <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Hán Việt</th>
                  <th className="py-2.5 px-3 sm:px-4 min-w-[140px]">Nghĩa tiếng Việt</th>
                  {isHideMode && <th className="py-2.5 px-3 sm:px-4 w-12 text-center whitespace-nowrap">Hiện</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DF]">
                {displayedWords.map((w, idx) => {
                  const wordKey = `${level}_garden_${w.zh}_${idx}`;
                  const isRevealed = !isHideMode || !!revealedItems[wordKey];
                  return (
                    <tr key={idx} className="hover:bg-[#FAF9F6]/60 transition-colors">
                      <td className="py-2.5 px-4 text-xs text-slate-400 text-center">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => speakChinese(w.zh, 0.9)}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="py-2.5 px-4 hanzi text-2xl font-normal text-slate-900">
                        {w.zh}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        <span
                          className={`font-semibold text-[#24523B] transition-all ${
                            !isRevealed ? "blur-sm select-none" : ""
                          }`}
                        >
                          {w.py}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 italic text-xs">
                        <span
                          className={`transition-all ${
                            !isRevealed ? "blur-sm select-none" : ""
                          }`}
                        >
                          {w.hv || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 text-xs">
                        <div
                          className={`transition-all ${
                            !isRevealed ? "blur-sm select-none" : ""
                          }`}
                        >
                          {w.vi}
                        </div>
                      </td>
                      {isHideMode && (
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleReveal(wordKey)}
                            className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
                            title="Xem đáp án"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > displayedWords.length && (
            <div
              ref={sentinelRef}
              className="p-4 flex items-center justify-center gap-2.5 text-xs text-slate-500 font-sans border-t border-[#E5E3DF] bg-[#FAF9F6]/60"
            >
              <div className="w-3.5 h-3.5 border-2 border-[#24523B] border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Đang tự động tải thêm ({displayedWords.length} / {filtered.length} từ)...</span>
            </div>
          )}
          {filtered.length > 0 && displayedWords.length >= filtered.length && (
            <div className="p-4 text-center text-xs text-slate-400 font-sans border-t border-[#E5E3DF] bg-[#FAF9F6]/30">
              Đã tải hết toàn bộ {filtered.length} từ vựng
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

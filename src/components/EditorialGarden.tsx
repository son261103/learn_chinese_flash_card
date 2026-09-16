"use client";

import React, { useState, useMemo } from "react";
import {
  Volume2,
  Search,
  Eye,
  EyeOff,
  Check,
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
  masteredCards: Record<string, boolean>;
  onToggleMastered: (key: string) => void;
}

const gardenData = gardenDataRaw as Record<string, GardenWord[]>;

export function EditorialGarden({
  initialLevelId = "hsk1",
  masteredCards,
  onToggleMastered,
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

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 lg:h-full lg:overflow-hidden select-none">
      <StageHeader
        progress={
          filtered.length > 0
            ? Math.min(100, Math.round((displayedWords.length / filtered.length) * 100))
            : 0
        }
      >
        <div className="w-full flex items-center justify-between gap-2 py-0.5">
          {/* Left: level switcher (scrollable on mobile) */}
          <div className="flex items-center min-w-0 flex-1 overflow-x-auto no-scrollbar">
            <div className="inline-flex items-center h-8 rounded-xl border border-[#E5E3DF] bg-white p-0.5 shadow-2xs shrink-0">
              {(["hsk1", "hsk2", "hsk3"] as const).map((lvlKey) => (
                <button
                  key={lvlKey}
                  type="button"
                  onClick={() => {
                    setLevel(lvlKey);
                    setPage(60);
                    setQuery("");
                    setRevealedItems({});
                  }}
                  className={`h-full px-2 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    level === lvlKey
                      ? "bg-[#24523B] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
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
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 xl:px-8 py-4 sm:py-6 space-y-4 w-full touch-scroll">
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

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(60);
                }}
                placeholder="Tìm theo chữ Hán, pinyin, tiếng Việt..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E3DF] rounded-xl focus:outline-none focus:border-[#24523B]"
              />
            </div>
          </div>

          {/* Mobile: card list (no horizontal scroll) */}
          <div className="md:hidden divide-y divide-[#E5E3DF]">
            {displayedWords.map((w, idx) => {
              const wordKey = `${level}_garden_${w.zh}_${idx}`;
              const isRevealed = !isHideMode || !!revealedItems[wordKey];
              const isWordMastered = !!masteredCards[`${level}_${w.zh}`];
              return (
                <div
                  key={idx}
                  className="w-full flex items-start gap-2.5 p-3.5 text-left"
                >
                  <span className="w-5 shrink-0 pt-1 text-center text-[11px] font-mono text-slate-400">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="hanzi text-xl font-bold text-slate-900 whitespace-nowrap shrink-0">
                        {w.zh}
                      </span>
                      <button
                        type="button"
                        onClick={() => speakChinese(w.zh, 0.9)}
                        aria-label={`Nghe ${w.zh}`}
                        className="p-1 -m-1 text-slate-400 hover:text-slate-800 active:scale-95 transition-all shrink-0 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <span
                        className={`text-xs font-semibold text-[#24523B] min-w-0 break-words transition-all ${
                          !isRevealed ? "blur-sm select-none" : ""
                        }`}
                      >
                        {w.py}
                      </span>
                    </div>
                    <p
                      className={`mt-0.5 text-[13px] leading-snug text-slate-700 line-clamp-2 transition-all ${
                        !isRevealed ? "blur-sm select-none" : ""
                      }`}
                    >
                      {w.vi}
                    </p>
                    <p
                      className={`mt-1 text-[11px] leading-snug text-slate-400 truncate transition-all ${
                        !isRevealed ? "blur-sm select-none" : ""
                      }`}
                    >
                      {w.hv || ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {isHideMode && !isRevealed && (
                      <button
                        type="button"
                        onClick={() => handleReveal(wordKey)}
                        aria-label="Xem đáp án"
                        title="Xem đáp án"
                        className="p-1.5 rounded-lg border border-[#E5E3DF] text-slate-400 hover:text-slate-800 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleMastered(`${level}_${w.zh}`)}
                      aria-label={isWordMastered ? "Đã thuộc" : "Đánh dấu đã thuộc"}
                      title={isWordMastered ? "Đã thuộc" : "Đánh dấu đã thuộc"}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        isWordMastered
                          ? "bg-[#24523B] text-white border-[#24523B]"
                          : "text-slate-300 hover:text-slate-600 border-[#E5E3DF]"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
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
                  <th className="py-2.5 px-3 sm:px-4 w-12 text-center whitespace-nowrap">Thuộc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DF]">
                {displayedWords.map((w, idx) => {
                  const wordKey = `${level}_garden_${w.zh}_${idx}`;
                  const isRevealed = !isHideMode || !!revealedItems[wordKey];
                  const isWordMastered = !!masteredCards[`${level}_${w.zh}`];
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
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleMastered(`${level}_${w.zh}`)}
                          className={`p-1 rounded border transition-all cursor-pointer ${
                            isWordMastered
                              ? "bg-[#24523B] text-white border-[#24523B]"
                              : "text-slate-300 hover:text-slate-600 border-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > displayedWords.length && (
            <div className="p-4 text-center border-t border-[#E5E3DF] bg-[#FAF9F6]">
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 60)}
                className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-[#FAF9F6] text-slate-800 font-bold text-xs rounded-xl border border-[#E5E3DF] shadow-2xs transition-colors cursor-pointer"
              >
                Xem thêm 60 từ tiếp theo ({displayedWords.length}/{filtered.length})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import {
  Library,
  Volume2,
  Search,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
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
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden select-none">
      {/* Top Bar Header (Identical h-14 bar matching all other modes) */}
      <div className="h-14 px-4 sm:px-6 xl:px-8 border-b border-[#E5E3DF] flex items-center justify-between bg-[#FAF9F6] sticky top-0 z-10 shrink-0">
        {/* Left: Level badge + Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-9 px-3 inline-flex items-center justify-center text-xs font-bold tracking-tight rounded-xl bg-[#24523B] text-white shadow-xs shrink-0">
            {level.toUpperCase()}
          </span>

          <div className="flex items-center gap-2 truncate">
            <Library className="w-4 h-4 text-slate-700 shrink-0" />
            <span className="text-sm font-bold text-slate-800 tracking-tight">
              Vườn từ vựng HSK
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-[#E5E3DF] text-slate-600 hidden sm:inline">
              {(gardenData[level] || []).length} từ
            </span>
          </div>
        </div>

        {/* Right: Level Switcher Pills + Hide Meaning Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Level Switcher (HSK1, HSK2, HSK3) */}
          <div className="inline-flex items-center h-9 rounded-xl border border-[#E5E3DF] bg-white p-0.5 shadow-2xs">
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
                className={`h-full px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  level === lvlKey
                    ? "bg-[#24523B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {lvlKey.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Hide/Show Meaning Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsHideMode(!isHideMode);
              setRevealedItems({});
            }}
            className={`h-9 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isHideMode
                ? "bg-[#24523B] text-white border-[#24523B]"
                : "bg-white text-slate-700 border-[#E5E3DF] hover:border-slate-400"
            }`}
            title="Ẩn / Hiện nghĩa để tự kiểm tra trí nhớ"
          >
            {isHideMode ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {isHideMode ? "Đang ẩn nghĩa" : "Ẩn nghĩa"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area (Synchronized padding: px-4 sm:px-6 xl:px-8) */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 xl:px-8 py-6 space-y-4 w-full">
        {/* Table Card with Integrated Search */}
        <div className="w-full bg-white rounded-2xl border border-[#E5E3DF] shadow-2xs overflow-hidden">
          {/* Toolbar inside table header */}
          <div className="p-4 sm:p-5 border-b border-[#E5E3DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] text-xs text-slate-500 font-semibold border-b border-[#E5E3DF]">
                  <th className="py-2.5 px-4 w-12 text-center">STT</th>
                  <th className="py-2.5 px-4 w-12">Nghe</th>
                  <th className="py-2.5 px-4">Chữ Hán</th>
                  <th className="py-2.5 px-4">Pinyin</th>
                  <th className="py-2.5 px-4">Hán Việt</th>
                  <th className="py-2.5 px-4">Nghĩa tiếng Việt</th>
                  {isHideMode && <th className="py-2.5 px-4 w-16 text-center">Hiện</th>}
                  <th className="py-2.5 px-4 w-16 text-center">Thuộc</th>
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
                className="px-6 py-2.5 bg-white hover:bg-[#FAF9F6] text-slate-800 font-bold text-xs rounded-xl border border-[#E5E3DF] shadow-2xs transition-colors cursor-pointer"
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

"use client";

import React from "react";

interface StageHeaderProps {
  currentIndex?: number;
  totalCount?: number;
  /** 0-100 override (e.g. garden loaded/total). Takes precedence over currentIndex/totalCount. */
  progress?: number;
  children: React.ReactNode;
}

/** Icon-only tool button — shared by all workspace headers (h-8 w-8). */
export function stageIconBtnClass(active: boolean) {
  return `h-8 w-8 rounded-xl border transition-all flex items-center justify-center shadow-2xs cursor-pointer shrink-0 ${
    active
      ? "bg-[#24523B] text-white border-[#24523B]"
      : "bg-white text-slate-500 border-[#E5E3DF] hover:text-slate-900 hover:border-slate-400"
  }`;
}

/**
 * Shared workspace header shell — same chrome in every mode:
 * no HSK badge, no topic button, no numeric counter.
 * Progress is a slim 2px line under the header (like luyện gõ).
 */
export function StageHeader({
  currentIndex = 0,
  totalCount = 0,
  progress,
  children,
}: StageHeaderProps) {
  const percent =
    progress ??
    (totalCount > 0
      ? Math.min(100, Math.round(((currentIndex + 1) / totalCount) * 100))
      : 0);
  const show = progress !== undefined ? progress > 0 : totalCount > 0;

  return (
    <div className="w-full h-auto min-h-11 sm:min-h-14 px-2 sm:px-6 xl:px-8 py-1.5 sm:py-2 border-b border-[#E5E3DF] bg-[#FAF9F6] sticky top-0 z-20 shrink-0">
      <div className="w-full min-w-0 select-none">
        {children}
      </div>
      {show && (
        <div
          className="-mx-2 sm:-mx-6 xl:-mx-8 -mb-1.5 sm:-mb-2 mt-1 sm:mt-1.5 h-[2px] bg-[#E5E3DF]/70 overflow-hidden"
          role="progressbar"
          aria-valuenow={totalCount > 0 ? currentIndex + 1 : undefined}
          aria-valuemin={totalCount > 0 ? 1 : undefined}
          aria-valuemax={totalCount > 0 ? totalCount : undefined}
          title={totalCount > 0 ? `${currentIndex + 1}/${totalCount}` : undefined}
        >
          <div
            className="h-full bg-[#24523B] rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

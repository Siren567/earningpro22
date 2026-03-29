import React from 'react';
import { Zap } from 'lucide-react';

/**
 * AIRatingCard — premium placeholder for future AI score feature.
 * Props (all optional, for future use):
 *   score: number (0–100)
 *   label: string
 */
export default function AIRatingCard({ score = null }) {
  return (
    <div className="relative p-4 rounded-xl border overflow-hidden group
      dark:bg-gradient-to-br dark:from-blue-950/40 dark:to-[#0d0d14]
      bg-gradient-to-br from-blue-50 to-white
      dark:border-blue-500/20 border-blue-200
      shadow-[0_0_18px_-4px_rgba(16,185,129,0.18)]
      hover:shadow-[0_0_28px_-4px_rgba(16,185,129,0.32)]
      transition-shadow duration-300">

      {/* Subtle background glow blob */}
      <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-500/10 blur-2xl" />

      {/* Header row */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-blue-500" />
          <p className="text-xs font-semibold dark:text-gray-400 text-gray-500">AI Rating</p>
        </div>
        {/* SOON badge */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-widest uppercase
          bg-blue-500/10 text-cyan-400 border border-blue-500/20
          shadow-[0_0_8px_-2px_rgba(16,185,129,0.35)]">
          Soon
        </span>
      </div>

      {/* Score placeholder */}
      <div className="flex flex-col items-center justify-center py-1 relative z-10">
        <p className="text-xs dark:text-gray-600 text-gray-400 mb-0.5">AI Score</p>
        <p className="text-lg font-bold dark:text-gray-700 text-gray-300 tracking-tight">— / 100</p>
      </div>

      {/* Progress bar placeholder */}
      <div className="mt-3 relative z-10">
        <div className="h-1.5 w-full rounded-full dark:bg-white/5 bg-gray-200 overflow-hidden">
          <div className="h-full w-0 rounded-full bg-gradient-to-r from-blue-500/40 to-cyan-400/20" />
        </div>
        <p className="text-[10px] dark:text-gray-700 text-gray-400 mt-1 text-center">Coming Soon</p>
      </div>
    </div>
  );
}
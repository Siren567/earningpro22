import React, { useState } from 'react';
import { Clock, TrendingUp, Activity, Zap, HelpCircle } from 'lucide-react';
import GeckoIcon from '../icons/GeckoIcon';
import { useLanguage } from '../LanguageContext';
import { GeckoVisionPreviewModal } from './GeckoVisionPreview';

// ── Faint chart illustration (decorative) ────────────────────────────────────
function ChartIllustration() {
  return (
    <svg
      viewBox="0 0 200 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[220px] opacity-[0.07] dark:opacity-[0.09]"
      aria-hidden="true"
    >
      {[16, 32, 48, 64].map(y => (
        <line key={y} x1="10" y1={y} x2="190" y2={y} stroke="currentColor" strokeWidth="0.5" />
      ))}
      {[
        { x: 20,  lo: 58, hi: 22, open: 50, close: 30 },
        { x: 40,  lo: 54, hi: 20, open: 46, close: 28 },
        { x: 60,  lo: 60, hi: 30, open: 52, close: 38 },
        { x: 80,  lo: 50, hi: 18, open: 42, close: 24 },
        { x: 100, lo: 46, hi: 14, open: 38, close: 20 },
        { x: 120, lo: 42, hi: 16, open: 36, close: 22 },
        { x: 140, lo: 36, hi: 10, open: 30, close: 14 },
        { x: 160, lo: 32, hi:  8, open: 28, close: 12 },
        { x: 180, lo: 28, hi:  6, open: 22, close:  8 },
      ].map(({ x, lo, hi, open, close }) => (
        <g key={x}>
          <line x1={x} y1={hi} x2={x} y2={lo} stroke="currentColor" strokeWidth="1" />
          <rect
            x={x - 4} y={Math.min(open, close)}
            width={8} height={Math.abs(open - close) || 1}
            rx="1" fill="currentColor"
          />
        </g>
      ))}
      <polyline
        points="20,45 40,40 60,44 80,35 100,30 120,28 140,20 160,16 180,10"
        stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 2"
      />
    </svg>
  );
}

// ── Coming-soon body ──────────────────────────────────────────────────────────
function ComingSoonBody() {
  const { t } = useLanguage();

  const features = [
    { icon: TrendingUp, text: t('gecko_vision_feat1') },
    { icon: Zap,        text: t('gecko_vision_feat2') },
    { icon: Activity,   text: t('gecko_vision_feat3') },
  ];

  return (
    <div className="px-5 pb-6 pt-2">
      <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed dark:border-white/[0.06] border-gray-200 px-8 py-12 overflow-hidden select-none">

        {/* Faint background illustration */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <ChartIllustration />
        </div>

        {/* Gako mascot — muted via opacity */}
        <div className="relative z-10 mb-4 opacity-40">
          <GeckoIcon className="w-16 h-16" />
        </div>

        {/* Title */}
        <p className="relative z-10 text-sm font-semibold dark:text-gray-300 text-gray-700 mb-1.5 text-center">
          {t('gecko_vision_coming_soon')}
        </p>
        <p className="relative z-10 text-xs dark:text-gray-600 text-gray-400 text-center leading-relaxed mb-6 max-w-[220px]">
          {t('gecko_vision_desc')}
        </p>

        {/* Feature previews */}
        <div className="relative z-10 w-full space-y-2.5 mb-6">
          {features.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-2.5 opacity-40">
              <div className="w-6 h-6 rounded-lg dark:bg-white/[0.04] bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3 h-3 dark:text-gray-500 text-gray-400" />
              </div>
              <p className="text-xs dark:text-gray-500 text-gray-400">{text}</p>
            </div>
          ))}
        </div>

        {/* Disabled upload button */}
        <button
          disabled
          className="relative z-10 px-5 py-2 rounded-xl text-xs font-semibold dark:bg-white/[0.04] bg-gray-100 dark:text-gray-600 text-gray-300 cursor-not-allowed"
          tabIndex={-1}
        >
          {t('gecko_vision_upload')}
        </button>

        <p className="relative z-10 text-[10px] dark:text-gray-700 text-gray-300 mt-3">
          PNG · JPG · WebP
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GeckoVision() {
  const { t } = useLanguage();
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <GeckoVisionPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />

      <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b dark:border-white/5 border-gray-100">
          <div className="flex items-center gap-2">
            <GeckoIcon className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
            <h2 className="text-sm font-semibold dark:text-white text-gray-900">Gecko Vision</h2>
            {/* "Soon" badge */}
            <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded dark:bg-amber-500/10 bg-amber-50 dark:text-amber-500/70 text-amber-500 uppercase tracking-widest">
              <Clock className="w-2.5 h-2.5" />
              {t('lang_coming_soon')}
            </span>
            {/* Preview trigger */}
            <button
              onClick={() => setPreviewOpen(true)}
              title="See a preview of the upcoming chart analysis feature"
              className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
              style={{ color: '#64748b' }}
              onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
            >
              <HelpCircle size={14} />
            </button>
          </div>
        </div>

        {/* ── Body: coming soon ── */}
        <ComingSoonBody />

      </div>
    </>
  );
}

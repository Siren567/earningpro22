/**
 * GeckoIcon — Gecko brand mark.
 *
 * Two modes:
 *   Default  — inherits `currentColor` via Tailwind className (e.g. text-gray-500).
 *              Used in labels, badges, popovers — small & subtle.
 *
 *   colored  — renders in the brand sky-blue (#38bdf8) explicitly.
 *              Used in the primary "Analyze with Gecko" action button
 *              where the icon should be a strong, visible brand element.
 *
 * Usage:
 *   <GeckoIcon className="w-3.5 h-3.5 dark:text-gray-500" />           // label
 *   <GeckoIcon className="w-5 h-5" colored />                          // button
 */
export default function GeckoIcon({ className = 'w-3.5 h-3.5', style, colored = false }) {
  const c = colored ? '#38bdf8' : 'currentColor';

  return (
    <svg
      viewBox="0 0 24 24"
      fill={c}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Head */}
      <ellipse cx="12" cy="4.5" rx="2.6" ry="2.4" />

      {/* Body */}
      <rect x="10.6" y="6.6" width="2.8" height="8" rx="1.4" />

      {/* Front-left leg */}
      <rect x="7" y="8" width="4.2" height="1.5" rx="0.75"
        transform="rotate(-18 9 8.75)" />
      <rect x="6.2" y="9.4" width="1.4" height="1.2" rx="0.6"
        transform="rotate(-10 6.9 10)" />

      {/* Front-right leg */}
      <rect x="12.8" y="8" width="4.2" height="1.5" rx="0.75"
        transform="rotate(18 15 8.75)" />
      <rect x="16.4" y="9.4" width="1.4" height="1.2" rx="0.6"
        transform="rotate(10 17.1 10)" />

      {/* Rear-left leg */}
      <rect x="7.2" y="12" width="4" height="1.5" rx="0.75"
        transform="rotate(18 9.2 12.75)" />
      <rect x="6.2" y="13.5" width="1.4" height="1.2" rx="0.6"
        transform="rotate(8 6.9 14.1)" />

      {/* Rear-right leg */}
      <rect x="12.8" y="12" width="4" height="1.5" rx="0.75"
        transform="rotate(-18 14.8 12.75)" />
      <rect x="16.4" y="13.5" width="1.4" height="1.2" rx="0.6"
        transform="rotate(-8 17.1 14.1)" />

      {/* Tail — two segments curving right */}
      <rect x="11.1" y="14.4" width="2.2" height="4" rx="1.1"
        transform="rotate(12 12.2 16.4)" />
      <rect x="12.4" y="18" width="1.6" height="3" rx="0.8"
        transform="rotate(28 13.2 19.5)" />
    </svg>
  );
}

export default function GakoIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Gako"
    >
      <defs>
        <linearGradient id="gi-blue" x1="24" y1="18" x2="82" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#34E3E2" />
          <stop offset="1" stopColor="#0A66D9" />
        </linearGradient>
        <linearGradient id="gi-green" x1="56" y1="70" x2="100" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#C7F74A" />
          <stop offset="1" stopColor="#00A63E" />
        </linearGradient>
        <linearGradient id="gi-beak" x1="79" y1="33" x2="111" y2="63" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFE14A" />
          <stop offset="1" stopColor="#FF9A00" />
        </linearGradient>
        <linearGradient id="gi-dark" x1="62" y1="44" x2="89" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0B2F8E" />
          <stop offset="1" stopColor="#0046C7" />
        </linearGradient>
        <filter id="gi-shadow" x="10" y="10" width="110" height="112" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.18" />
        </filter>
      </defs>
      <g filter="url(#gi-shadow)">
        <path d="M28 41C39 27 56 21 76 22C67 26 61 31 59 36C49 35 39 37 28 41Z" fill="#1BD6D6" />
        <path d="M27 42C39 24 58 16 83 18C72 20 63 26 59 36C48 35 37 37 27 42Z" fill="url(#gi-blue)" />
        <path d="M36 44C42 34 53 28 67 28C88 28 104 43 104 64C104 88 89 106 67 114C48 121 29 108 26 85C24 69 28 54 36 44Z" fill="url(#gi-blue)" />
        <path d="M53 34C73 31 89 43 89 61C89 76 77 87 60 87C43 87 34 77 34 61C34 48 42 37 53 34Z" fill="#EAF7FF" fillOpacity="0.92" />
        <circle cx="68" cy="49" r="8" fill="#082A7A" />
        <circle cx="71" cy="46" r="2.7" fill="white" />
        <path d="M79 41C94 38 108 44 111 55C114 65 106 77 94 82C100 71 98 58 79 41Z" fill="url(#gi-beak)" />
        <path d="M79 41C89 49 93 55 93 61C93 67 88 72 81 73C84 67 84 58 79 41Z" fill="#FF9A00" />
        <path d="M77 53C81 51 85 52 88 55" stroke="#8B2F00" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M56 64C66 57 75 53 84 54C77 70 67 81 53 92C45 84 46 72 56 64Z" fill="url(#gi-dark)" />
        <path d="M50 72C65 69 79 73 91 84C97 90 99 100 96 110C80 104 65 107 49 121C40 102 40 84 50 72Z" fill="url(#gi-green)" />
        <path d="M58 78C69 78 79 82 88 91C79 91 67 98 57 110C53 98 53 87 58 78Z" fill="#F2FFAE" fillOpacity="0.55" />
        <path d="M40 66L41.7 61L43.4 66L48 67.7L43.4 69.4L41.7 74L40 69.4L35.4 67.7L40 66Z" fill="#EAFDFF" />
        <path d="M71 92L72.1 88.8L73.2 92L76.4 93.1L73.2 94.2L72.1 97.4L71 94.2L67.8 93.1L71 92Z" fill="#F6FFE0" />
      </g>
    </svg>
  );
}

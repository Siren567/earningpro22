/**
 * GeckoIcon (Gako) — brand mascot.
 *
 * Usage:
 *   <GeckoIcon className="w-6 h-6" />          // sized via className
 *   <GeckoIcon style={{ width: 32, height: 32 }} />
 */
export default function GeckoIcon({ className = 'w-6 h-6', style }) {
  return (
    <svg
      width="512"
      height="512"
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gako-bodyGrad" x1="140" y1="80" x2="390" y2="430" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4E79FF"/>
          <stop offset="0.55" stopColor="#2547D8"/>
          <stop offset="1" stopColor="#1531A8"/>
        </linearGradient>
        <linearGradient id="gako-bellyGrad" x1="220" y1="220" x2="350" y2="430" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F9FBFF"/>
          <stop offset="1" stopColor="#DCE6FF"/>
        </linearGradient>
        <linearGradient id="gako-beakGrad" x1="308" y1="210" x2="362" y2="284" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD84D"/>
          <stop offset="1" stopColor="#F5B800"/>
        </linearGradient>
        <radialGradient id="gako-cheek" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(334 274) rotate(149.534) scale(38 29)">
          <stop stopColor="#FF7B45"/>
          <stop offset="1" stopColor="#E64E3D"/>
        </radialGradient>
        <filter id="gako-shadow" x="40" y="40" width="430" height="430" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="16" stdDeviation="18" floodOpacity="0.18"/>
        </filter>
      </defs>

      <g filter="url(#gako-shadow)">
        {/* Crest */}
        <path d="M212 104C230 74 255 60 286 56C272 82 273 101 286 120C262 116 236 112 212 104Z" fill="url(#gako-bodyGrad)" stroke="#0E237F" strokeWidth="8" strokeLinejoin="round"/>
        <path d="M180 128C192 98 215 79 245 72C236 96 239 116 252 134C227 135 203 133 180 128Z" fill="url(#gako-bodyGrad)" stroke="#0E237F" strokeWidth="8" strokeLinejoin="round"/>
        <path d="M154 164C157 132 174 108 202 93C200 118 208 136 224 151C200 158 177 162 154 164Z" fill="url(#gako-bodyGrad)" stroke="#0E237F" strokeWidth="8" strokeLinejoin="round"/>

        {/* Main body */}
        <path d="M110 338C110 218 198 122 309 122C397 122 444 184 444 256C444 339 380 418 296 432C228 443 171 419 135 381C118 364 110 351 110 338Z"
              fill="url(#gako-bodyGrad)" stroke="#0E237F" strokeWidth="10" strokeLinejoin="round"/>

        {/* Left wing / tail */}
        <path d="M84 363C115 326 145 309 179 302C169 334 178 361 205 384C161 390 121 383 84 363Z"
              fill="#1734B7" stroke="#0E237F" strokeWidth="8" strokeLinejoin="round"/>
        <path d="M103 330C137 299 167 286 201 282C190 313 198 339 222 361C177 364 138 354 103 330Z"
              fill="#2140C8" stroke="#0E237F" strokeWidth="8" strokeLinejoin="round"/>
        <path d="M129 298C162 274 190 265 224 263C214 289 220 313 241 334C198 336 161 326 129 298Z"
              fill="#2B4DDA" stroke="#0E237F" strokeWidth="8" strokeLinejoin="round"/>

        {/* Face */}
        <ellipse cx="288" cy="235" rx="111" ry="98" fill="#FCFDFF" stroke="#DFE7FF" strokeWidth="4"/>
        <ellipse cx="239" cy="228" rx="44" ry="51" fill="#FCFDFF"/>
        <ellipse cx="340" cy="228" rx="39" ry="46" fill="#FCFDFF"/>

        {/* Eyes */}
        <circle cx="244" cy="226" r="22" fill="#1E2241"/>
        <circle cx="347" cy="226" r="18" fill="#1E2241"/>
        <circle cx="250" cy="218" r="6" fill="white"/>
        <circle cx="352" cy="220" r="5" fill="white"/>

        {/* Beak */}
        <path d="M286 238C294 200 325 186 355 193C373 197 383 211 382 228C381 251 364 271 338 282C318 290 301 288 288 278C279 271 275 258 286 238Z"
              fill="url(#gako-beakGrad)" stroke="#1E2241" strokeWidth="8" strokeLinejoin="round"/>
        <path d="M314 252C330 246 344 249 355 262C343 271 329 272 314 252Z" fill="url(#gako-cheek)"/>

        {/* Belly */}
        <path d="M200 288C217 265 243 252 272 252C327 252 366 293 366 349C366 387 340 419 304 432C253 438 212 423 182 391C158 365 163 319 200 288Z"
              fill="url(#gako-bellyGrad)" stroke="#C6D5FF" strokeWidth="4"/>

        {/* Belly feather rows */}
        <g opacity="0.9" stroke="#C7D3FF" strokeWidth="3" strokeLinecap="round">
          <path d="M214 310C228 297 244 292 262 294C249 311 232 316 214 310Z"/>
          <path d="M258 300C273 287 290 283 309 287C296 304 278 309 258 300Z"/>
          <path d="M224 336C240 322 258 317 278 320C264 338 245 343 224 336Z"/>
          <path d="M271 325C287 312 305 309 323 314C310 331 292 336 271 325Z"/>
          <path d="M236 363C252 350 270 345 289 349C276 366 257 370 236 363Z"/>
          <path d="M282 352C297 341 312 338 328 343C318 358 302 363 282 352Z"/>
          <path d="M250 390C267 378 285 373 305 377C292 393 272 398 250 390Z"/>
        </g>

        {/* Side feathers */}
        <g opacity="0.35" stroke="#5E81FF" strokeWidth="5" strokeLinecap="round">
          <path d="M177 215C198 198 220 191 243 194"/>
          <path d="M159 246C182 230 207 223 232 226"/>
          <path d="M149 278C175 264 201 258 227 262"/>
          <path d="M145 312C171 300 197 296 222 301"/>
          <path d="M151 346C174 338 197 336 219 340"/>
        </g>
      </g>
    </svg>
  );
}

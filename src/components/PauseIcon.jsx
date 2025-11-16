function PauseIcon() {
  return (
    <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle opacity="0.1" cx="50" cy="50" r="50" fill="#FFAA00"/>
      <circle opacity="0.36" cx="50" cy="50" r="44" fill="#FFAA00"/>
      <g filter="url(#filter0_ddddf_pause)">
        <circle cx="50" cy="50" r="36" fill="#FFF4E5"/>
      </g>
      <g>
        <rect x="35" y="30" width="8" height="40" rx="2" fill="url(#paint0_linear_pause)"/>
        <rect x="57" y="30" width="8" height="40" rx="2" fill="url(#paint0_linear_pause)"/>
      </g>
      <defs>
        <filter id="filter0_ddddf_pause" x="8" y="9" width="84" height="83" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="3"/>
          <feGaussianBlur stdDeviation="1"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_pause"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="-3"/>
          <feGaussianBlur stdDeviation="1"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="effect1_dropShadow_pause" result="effect2_dropShadow_pause"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dx="3"/>
          <feGaussianBlur stdDeviation="1.5"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0"/>
          <feBlend mode="normal" in2="effect2_dropShadow_pause" result="effect3_dropShadow_pause"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dx="-3"/>
          <feGaussianBlur stdDeviation="1.5"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0"/>
          <feBlend mode="normal" in2="effect3_dropShadow_pause" result="effect4_dropShadow_pause"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect4_dropShadow_pause" result="shape"/>
          <feGaussianBlur stdDeviation="0.5" result="effect5_foregroundBlur_pause"/>
        </filter>
        <linearGradient id="paint0_linear_pause" x1="50" y1="30" x2="50" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#CC8800"/>
          <stop offset="1" stopColor="#FFAA00"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export default PauseIcon


import { Ban, Bot } from "lucide-react"
import type { TargetKind } from "@/lib/game-data"

export interface TargetBoardProps {
  side: TargetKind
  compact?: boolean
  active?: boolean
  shake?: boolean
}

export function TargetBoard({
  side,
  compact = false,
  active = false,
  shake = false,
}: TargetBoardProps) {
  const isAI = side === "ai"
  return (
    <div
      className={`target-art ${isAI ? "target-ai" : "target-non-ai"} ${compact ? "target-compact" : ""} ${active ? "target-active" : ""} ${shake ? "target-shake" : ""}`}
    >
      <div className="target-post" />
      <div className="target-ring ring-outer" />
      <div className="target-ring ring-mid" />
      <div className="target-ring ring-inner" />
      <div className="target-center">
        {isAI ? (
          <Bot className="target-robot" aria-hidden="true" />
        ) : (
          <Ban className="target-noai" aria-hidden="true" />
        )}
      </div>
      <div className="target-label">
        <span>{isAI ? "CÓ" : "KHÔNG CÓ"}</span>
        <b>AI</b>
      </div>
    </div>
  )
}

export function SlingshotIllustration() {
  return (
    <svg className="sling-illustration" viewBox="0 0 220 260" aria-hidden="true">
      <defs>
        <linearGradient id="landingWoodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E69A50" />
          <stop offset="55%" stopColor="#B86B28" />
          <stop offset="100%" stopColor="#844614" />
        </linearGradient>
        <linearGradient id="landingGripGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5C7CFA" />
          <stop offset="50%" stopColor="#395AD2" />
          <stop offset="100%" stopColor="#233B99" />
        </linearGradient>
        <radialGradient id="landingOrbGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#A5C4FF" />
          <stop offset="55%" stopColor="#395AD2" />
          <stop offset="100%" stopColor="#1B3280" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="110" cy="242" rx="44" ry="11" fill="#24304a22" />

      {/* Back elastic band */}
      <path
        d="M 66 56 Q 88 96 110 86"
        fill="none"
        stroke="#F47920"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* Cartoon Wooden Y-Frame */}
      {/* Dark Cartoon Outline */}
      <path
        d="M 110 232 L 110 154 C 110 124 72 104 68 52 M 110 154 C 110 124 148 104 152 52"
        fill="none"
        stroke="#4A250B"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Main Wood Fill */}
      <path
        d="M 110 232 L 110 154 C 110 124 72 104 68 52 M 110 154 C 110 124 148 104 152 52"
        fill="none"
        stroke="url(#landingWoodGrad)"
        strokeWidth="21"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Wood Specular Highlight */}
      <path
        d="M 105 148 C 103 122 73 102 68 54 M 115 148 C 117 122 145 102 150 54"
        fill="none"
        stroke="#FAD09C"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* Fork Rubber Wraps */}
      <rect
        x="53"
        y="46"
        width="30"
        height="15"
        rx="7"
        fill="#EF5350"
        stroke="#4A250B"
        strokeWidth="3.5"
        transform="rotate(-6 68 53)"
      />
      <rect
        x="137"
        y="46"
        width="30"
        height="15"
        rx="7"
        fill="#EF5350"
        stroke="#4A250B"
        strokeWidth="3.5"
        transform="rotate(6 152 53)"
      />

      {/* Ergonomic Blue & Orange Arcade Handle Grip */}
      <rect
        x="93"
        y="162"
        width="34"
        height="58"
        rx="14"
        fill="url(#landingGripGrad)"
        stroke="#4A250B"
        strokeWidth="4"
      />
      <path
        d="M 95 178 Q 110 183 125 178 M 95 192 Q 110 197 125 192 M 95 206 Q 110 211 125 206"
        fill="none"
        stroke="#9BAAE8"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Orange Collar & Golden Base Cap */}
      <rect
        x="91"
        y="153"
        width="38"
        height="12"
        rx="6"
        fill="#FF9B42"
        stroke="#4A250B"
        strokeWidth="3.5"
      />
      <ellipse
        cx="110"
        cy="226"
        rx="19"
        ry="9"
        fill="#FFBE63"
        stroke="#4A250B"
        strokeWidth="3.5"
      />

      {/* Leather Pouch & Projectile */}
      <ellipse
        cx="110"
        cy="90"
        rx="22"
        ry="11"
        fill="#7C3F18"
        stroke="#4A250B"
        strokeWidth="3.5"
      />
      <circle
        cx="110"
        cy="82"
        r="18"
        fill="url(#landingOrbGrad)"
        stroke="#FFFFFF"
        strokeWidth="4.5"
      />
      <circle
        cx="110"
        cy="82"
        r="19.5"
        fill="none"
        stroke="#1B3280"
        strokeWidth="2"
      />
      <ellipse
        cx="104"
        cy="75"
        rx="6"
        ry="3.5"
        fill="#FFFFFF"
        opacity="0.85"
        transform="rotate(-25 104 75)"
      />

      {/* Front elastic band */}
      <path
        d="M 154 56 Q 132 96 110 86"
        fill="none"
        stroke="#FF9B42"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M 152 55 Q 132 92 112 85"
        fill="none"
        stroke="#FFE0B2"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

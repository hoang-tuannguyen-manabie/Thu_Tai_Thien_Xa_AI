"use client"

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  FastForward,
  MousePointerClick,
  ShieldCheck,
  SlidersHorizontal,
  Touchpad,
} from "lucide-react"
import type { PlayerProfile } from "@/lib/characters"
import { gameAudio } from "@/lib/audio"
import type { ControlMode } from "./slingshot-game"

const HAND_LANDMARKS: [number, number][] = [
  [50, 92],
  [36, 80], [25, 68], [17, 56], [10, 44],
  [38, 56], [32, 40], [27, 26], [23, 11],
  [50, 54], [50, 36], [50, 21], [50, 7],
  [62, 56], [68, 40], [73, 26], [77, 11],
  [74, 62], [82, 50], [87, 39], [92, 29],
]

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [0, 5], [0, 9], [0, 13], [0, 17],
  [5, 9], [9, 13], [13, 17],
  [1, 2], [2, 3], [3, 4],
  [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [17, 18], [18, 19], [19, 20],
]

const TIP_INDICES = [4, 8, 12, 16, 20]

export function HandSkeletonGraphic({
  color = "#16a34a",
  className = "w-full h-full",
}: {
  color?: string
  className?: string
}) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      {HAND_CONNECTIONS.map(([from, to], idx) => {
        const p1 = HAND_LANDMARKS[from]
        const p2 = HAND_LANDMARKS[to]
        return (
          <line
            key={`bone-${idx}`}
            x1={p1[0]}
            y1={p1[1]}
            x2={p2[0]}
            y2={p2[1]}
            stroke={color}
            strokeWidth="2.8"
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeOpacity="0.9"
          />
        )
      })}
      {HAND_LANDMARKS.map(([x, y], idx) => {
        const isTip = TIP_INDICES.includes(idx)
        const isWrist = idx === 0
        return (
          <g key={`joint-${idx}`}>
            {isTip && (
              <circle
                cx={x}
                y={y}
                r="4.8"
                fill={color}
                fillOpacity="0.3"
                className="animate-ping"
                style={{ transformOrigin: `${x}px ${y}px`, animationDuration: "2s" }}
              />
            )}
            <circle
              cx={x}
              y={y}
              r={isTip ? 3.6 : isWrist ? 4 : 2.6}
              fill={isTip ? "#FFFFFF" : color}
              stroke={isTip ? color : "#FFFFFF"}
              strokeWidth="1.5"
            />
          </g>
        )
      })}
    </svg>
  )
}

export function MouseGraphic({
  color = "#2563eb",
  className = "w-full h-full",
}: {
  color?: string
  className?: string
}) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      <defs>
        <linearGradient id="mouseBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eff6ff" />
        </linearGradient>
      </defs>
      <rect
        x="26"
        y="14"
        width="48"
        height="72"
        rx="24"
        fill="url(#mouseBodyGrad)"
        stroke={color}
        strokeWidth="3.5"
      />
      <line
        x1="50"
        y1="15"
        x2="50"
        y2="44"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray="2 2"
      />
      <rect
        x="46"
        y="23"
        width="8"
        height="16"
        rx="4"
        fill={color}
        stroke="#ffffff"
        strokeWidth="1.5"
      />
      <path
        d="M20 22 C22 15, 30 10, 38 8"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray="3 3"
        strokeLinecap="round"
      />
      <path
        d="M14 26 C17 14, 27 6, 42 4"
        stroke={color}
        strokeWidth="2"
        strokeDasharray="4 4"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      <path
        d="M62 62 L74 74 L68 76 L72 84 L68 86 L64 78 L58 83 Z"
        fill={color}
        stroke="#ffffff"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export interface InteractionModeScreenProps {
  controlMode: ControlMode
  onSelectControlMode: (mode: ControlMode) => void
  playerProfile: PlayerProfile | null
  onOpenPlayerSetup: () => void
  onBack: () => void
  onNext: () => void
  onDirectPlay?: () => void
}

export function InteractionModeScreen({
  controlMode,
  onSelectControlMode,
  playerProfile,
  onOpenPlayerSetup,
  onBack,
  onNext,
  onDirectPlay,
}: InteractionModeScreenProps) {
  return (
    <div className="relative w-full h-full flex flex-col justify-between gap-2 sm:gap-3 p-3 sm:p-5 overflow-hidden ppt-page-enter">
      {/* Top Header Chip & Player Info */}
      <div className="flex items-center justify-between pb-0.5 shrink-0 pr-20 sm:pr-28">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ebf9f1] border-2 border-[#16a34a] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
          <span className="text-[10px] sm:text-xs text-[#15803d] uppercase font-black tracking-wide">
            BƯỚC 02 / 05 • CHỌN PHƯƠNG THỨC TƯƠNG TÁC
          </span>
        </div>
        <div className="flex items-center gap-2">
          {playerProfile && (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onOpenPlayerSetup()
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ebf9f1] hover:bg-[#dcfce7] border-2 border-[#16a34a] text-[#1b3a8a] text-xs font-black cursor-pointer transition-all shadow-xs"
              title="Đổi nhân vật hoặc tên người chơi"
            >
              <img
                src={playerProfile.characterImage}
                alt={playerProfile.characterName}
                className="w-5 h-5 rounded-full object-contain bg-white border border-[#86efac]"
              />
              <span className="truncate max-w-[100px] sm:max-w-[150px] text-[#15803d]">
                {playerProfile.playerName}
              </span>
              <SlidersHorizontal size={13} className="text-[#16a34a]" />
            </button>
          )}
          <span className="hidden md:inline-block text-[11px] text-[#f47920] uppercase tracking-[0.14em] font-black">
            MANABIE EDTECH
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-0.5 shrink-0 text-center sm:text-left">
        <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-[#1b3a8a] uppercase leading-tight tracking-tight">
          CHỌN PHƯƠNG THỨC <span className="text-[#2563eb]">ĐIỀU KHIỂN NÁ BẮN AI</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-bold">
          Chọn 1 trong 2 cách kéo và thả ná cao su bên dưới để bước vào đấu trường:
        </p>
      </div>

      {/* 2 Side-by-Side 3D Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 flex-1 min-h-0 items-stretch">
        {/* CARD 1: AR HAND GESTURE CAMERA */}
        <button
          type="button"
          onClick={() => {
            gameAudio.init()
            gameAudio.playClick()
            onSelectControlMode("ar")
            onNext()
          }}
          className={`relative group rounded-3xl p-4 sm:p-5 flex flex-col justify-between text-left transition-all duration-200 cursor-pointer border-3 overflow-hidden select-none hover:scale-[1.01] active:scale-[0.99] gap-2 ${
            controlMode === "ar"
              ? "bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] border-[#16a34a] shadow-[0_6px_0_#15803d,0_16px_36px_rgba(22,163,74,0.22)]"
              : "bg-white hover:bg-slate-50 border-[#cbd5e1] hover:border-[#16a34a]/60 shadow-[0_4px_0_#cbd5e1]"
          }`}
        >
          <div className="flex items-center justify-between w-full shrink-0">
            <span className="mana-keep-white inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16a34a] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-xs">
              <Camera size={16} />
              <span>CỬ CHỈ TAY (CAMERA AR)</span>
            </span>
            {controlMode === "ar" ? (
              <span className="mana-keep-white inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#15803d] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-xs">
                <CheckCircle2 size={15} />
                <span>ĐANG CHỌN</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600">
                Nhấn để chọn
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center py-2">
            <div className="relative h-20 sm:h-28 md:h-32 aspect-square rounded-2xl bg-white/95 border-2 border-[#86efac] p-2.5 shadow-[0_4px_16px_rgba(22,163,74,0.12)] flex items-center justify-center group-hover:scale-105 transition-all duration-300">
              <div className="absolute inset-0 rounded-2xl bg-[#ebf9f1]/60 pointer-events-none" />
              <img
                src="/assets/ar-hand-dashed.png"
                alt="Nhận diện bàn tay AR"
                className="w-full h-full object-contain relative z-10 drop-shadow-[0_4px_10px_rgba(234,88,12,0.2)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0 w-full">
            <h2 className="text-base sm:text-lg font-black text-[#15803d] tracking-tight">
              Dùng tay trực tiếp Cầm, Kéo &amp; Thả Ná trước Camera
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 font-semibold leading-relaxed">
              <strong>Chụm ngón cái &amp; trỏ</strong> (hoặc nắm tay) để cầm viên đạn, kéo ngược hướng bia muốn bắn và <strong>mở bàn tay</strong> để phóng đạn!
            </p>
            <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 border border-[#86efac]/80 text-xs font-bold text-[#15803d] shadow-2xs self-start">
              <ShieldCheck size={15} className="text-[#16a34a]" />
              <span>Dành cho máy tính / laptop có Camera hoặc Webcam</span>
            </div>
          </div>
        </button>

        {/* CARD 2: MOUSE / TOUCHSCREEN */}
        <button
          type="button"
          onClick={() => {
            gameAudio.init()
            gameAudio.playClick()
            onSelectControlMode("mouse")
            onNext()
          }}
          className={`relative group rounded-3xl p-4 sm:p-5 flex flex-col justify-between text-left transition-all duration-200 cursor-pointer border-3 overflow-hidden select-none hover:scale-[1.01] active:scale-[0.99] gap-2 ${
            controlMode === "mouse"
              ? "bg-gradient-to-b from-[#eff6ff] to-[#dbeafe] border-[#2563eb] shadow-[0_6px_0_#1d4ed8,0_16px_36px_rgba(37,99,235,0.22)]"
              : "bg-white hover:bg-slate-50 border-[#cbd5e1] hover:border-[#2563eb]/60 shadow-[0_4px_0_#cbd5e1]"
          }`}
        >
          <div className="flex items-center justify-between w-full shrink-0">
            <span className="mana-keep-white inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2563eb] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-xs">
              <MousePointerClick size={16} />
              <span>CHUỘT / CẢM ỨNG</span>
            </span>
            {controlMode === "mouse" ? (
              <span className="mana-keep-white inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1d4ed8] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-xs">
                <CheckCircle2 size={15} />
                <span>ĐANG CHỌN</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600">
                Nhấn để chọn
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center py-2">
            <div className="relative h-20 sm:h-28 md:h-32 aspect-square rounded-2xl bg-white/95 border-2 border-[#bfdbfe] p-2.5 shadow-[0_4px_16px_rgba(37,99,235,0.12)] flex items-center justify-center group-hover:scale-105 transition-all duration-300">
              <div className="absolute inset-0 rounded-2xl bg-[#eaf2ff]/60 pointer-events-none" />
              <MouseGraphic
                color="#2563eb"
                className="w-full h-full relative z-10 drop-shadow-[0_4px_10px_rgba(37,99,235,0.18)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0 w-full">
            <h2 className="text-base sm:text-lg font-black text-[#1d4ed8] tracking-tight">
              Kéo Chuột hoặc Chạm màn hình tương tác
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 font-semibold leading-relaxed">
              Nhấn giữ vào viên đạn trên ná cao su, kéo ngược hướng bia mục tiêu để ngắm đường đạn và thả tay để bắn!
            </p>
            <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 border border-[#bfdbfe]/80 text-xs font-bold text-[#1d4ed8] shadow-2xs self-start">
              <Touchpad size={15} className="text-[#2563eb]" />
              <span>Dành cho màn hình cảm ứng lớp học, máy tính bảng &amp; chuột</span>
            </div>
          </div>
        </button>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="flex items-center justify-between gap-2 pt-1 shrink-0">
        <button
          type="button"
          onClick={() => {
            gameAudio.playClick()
            onBack()
          }}
          className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-white hover:bg-slate-100 border-2 border-slate-300 text-slate-700 text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
        >
          <ArrowLeft size={16} />
          <span>QUAY LẠI</span>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {onDirectPlay && (
            <button
              type="button"
              onClick={() => {
                gameAudio.init()
                gameAudio.playClick()
                onDirectPlay()
              }}
              className="btn-mana-orange px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer uppercase tracking-wide"
              title="Bỏ qua hướng dẫn & Vào đấu trường bắn bia ngay"
            >
              <span>VÀO CHƠI NGAY (BỎ QUA HD)</span>
              <FastForward size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              gameAudio.init()
              gameAudio.playClick()
              onNext()
            }}
            className="btn-mana-blue px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
          >
            <span>XEM HƯỚNG DẪN &amp; BẮN MẪU</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

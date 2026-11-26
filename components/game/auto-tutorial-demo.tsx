"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowLeft,
  Camera,
  Check,
  MousePointerClick,
  Play,
  RotateCcw,
  UserCheck,
  X,
} from "lucide-react"
import { applyScoreDelta, GAME_SCORING } from "@/lib/game-logic"
import {
  getCharacterById,
  PLAYER_CHARACTERS,
  type PlayerProfile,
} from "@/lib/characters"
import {
  getHandFrame,
  HAND_TUTORIAL_STEPS,
} from "@/lib/hand-sprites"
import { gameAudio } from "@/lib/audio"
import { CharacterAvatar } from "./player-setup-modal"
import type { ControlMode } from "./slingshot-game"

const manaUrl =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mana_dong_noi-WbeIHKkJGa9MxuXTjkmpf24fuJuY05.gif"

type DemoPhase =
  | "opening"
  | "aiming-correct"
  | "flight-correct"
  | "hit-correct"
  | "scenario-wrong"
  | "aiming-wrong"
  | "flight-wrong"
  | "hit-wrong"
  | "guide"
  | "countdown"
  | "ready"

export function TutorialScenarioCard({ scenario }: { scenario: "face" | "alarm" }) {
  return (
    <article className="auto-tutorial-question" aria-live="polite">
      <span className="auto-tutorial-question-icon">AI</span>
      <p>
        {scenario === "face"
          ? "Điện thoại mở khóa bằng nhận diện khuôn mặt."
          : "Đồng hồ báo thức reo theo giờ đã cài đặt."}
      </p>
    </article>
  )
}

function TutorialTarget({
  ai,
  active,
  warning,
  reducedMotion,
}: {
  ai?: boolean
  active?: boolean
  warning?: boolean
  reducedMotion?: boolean
}) {
  return (
    <motion.div
      className={`tutorial-target${ai ? " tutorial-target-ai" : " tutorial-target-noai"}${active ? " tutorial-target-hit" : ""}${warning ? " tutorial-target-warning" : ""}`}
      animate={
        active && !reducedMotion
          ? { x: [0, -9, 8, -5, 4, 0], scale: [1, 1.08, 1] }
          : { x: 0, scale: 1 }
      }
      transition={{ duration: reducedMotion ? 0 : 0.65, ease: "easeOut" }}
    >
      <span className="tutorial-target-ring tutorial-target-ring-outer" />
      <span className="tutorial-target-ring tutorial-target-ring-middle" />
      <span className="tutorial-target-ring tutorial-target-ring-inner" />
      <span className="tutorial-target-center">
        {ai ? (
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <rect x="7" y="10" width="18" height="15" rx="5" />
            <path d="M16 5v5M11 16h.01M21 16h.01M12 21h8M4 16h3M25 16h3" />
          </svg>
        ) : (
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="10" />
            <path d="m9 9 14 14" />
          </svg>
        )}
      </span>
      <span className="tutorial-target-label">{ai ? "CÓ AI" : "KHÔNG CÓ AI"}</span>
      {warning && (
        <span className="tutorial-target-warning-mark" aria-label="Bắn sai">
          !
        </span>
      )}
    </motion.div>
  )
}

export function TutorialScoreFeedback({
  correct,
  visible,
  reducedMotion,
}: {
  correct: boolean
  visible: boolean
  reducedMotion: boolean
}) {
  if (!visible) return null
  return (
    <motion.div
      className={`tutorial-success${correct ? " is-correct" : " is-incorrect"}`}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.7, x: "-50%", y: 10 }}
      animate={{ opacity: 1, scale: 1, x: "-50%", y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.35 }}
      role="status"
    >
      <strong>{correct ? "CHÍNH XÁC!" : "CHƯA CHÍNH XÁC!"}</strong>
      <b>
        {correct
          ? `+${GAME_SCORING.CORRECT_ANSWER}`
          : `-${GAME_SCORING.WRONG_ANSWER}`}{" "}
        ĐIỂM
      </b>
    </motion.div>
  )
}

export function TutorialScoringGuide() {
  return (
    <motion.section
      className="tutorial-scoring-guide"
      aria-label="Hướng dẫn tính điểm"
      initial={{ opacity: 0, x: "-50%", y: "-50%" }}
      animate={{ opacity: 1, x: "-50%", y: "-50%" }}
      transition={{ duration: 0.35 }}
    >
      <article className="tutorial-guide-card guide-correct">
        <span className="tutorial-guide-icon">
          <Check aria-hidden="true" />
        </span>
        <div>
          <strong>ĐÚNG</strong>
          <b>+{GAME_SCORING.CORRECT_ANSWER} ĐIỂM</b>
          <p>Bắn đúng bia để cộng điểm!</p>
        </div>
      </article>
      <article className="tutorial-guide-card guide-incorrect">
        <span className="tutorial-guide-icon">
          <X aria-hidden="true" />
        </span>
        <div>
          <strong>SAI</strong>
          <b>-{GAME_SCORING.WRONG_ANSWER} ĐIỂM</b>
          <p>Bắn sai bia sẽ bị trừ điểm!</p>
        </div>
      </article>
    </motion.section>
  )
}

export function TutorialCountdown({
  value,
  reducedMotion,
}: {
  value: number
  reducedMotion: boolean
}) {
  return (
    <motion.div
      className="tutorial-countdown"
      key={value}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.65, x: "-50%", y: "-50%" }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: reducedMotion ? 1 : [0.65, 1.08, 1, 0.88],
        x: "-50%",
        y: "-50%",
      }}
      transition={{ duration: reducedMotion ? 0 : 0.72, times: [0, 0.28, 0.72, 1] }}
      aria-live="assertive"
    >
      {value}
    </motion.div>
  )
}

export function StartGameButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="tutorial-start-button"
      onClick={() => {
        gameAudio.playClick()
        onClick()
      }}
    >
      CHƠI NGAY <span aria-hidden="true">→</span>
    </button>
  )
}

export interface AutoTutorialDemoProps {
  onPlay: () => void
  onBack: () => void
  playerProfile?: PlayerProfile | null
  onOpenPlayerSetup?: () => void
  soundOn?: boolean
  controlMode?: ControlMode
  onControlModeChange?: (mode: ControlMode) => void
}

export function AutoTutorialDemo({
  onPlay,
  onBack,
  playerProfile,
  onOpenPlayerSetup,
  soundOn = true,
  controlMode = "mouse",
  onControlModeChange,
}: AutoTutorialDemoProps) {
  const [phase, setPhase] = useState<DemoPhase>("opening")
  const [countdown, setCountdown] = useState<number | null>(null)
  const [demoScore, setDemoScore] = useState(0)
  const [replayKey, setReplayKey] = useState(0)
  const [handFrameNum, setHandFrameNum] = useState<number>(16)
  const reducedMotion = useReducedMotion() === true
  const companion = playerProfile
    ? getCharacterById(playerProfile.characterId)
    : PLAYER_CHARACTERS[0]

  useEffect(() => {
    const timers: number[] = []
    const at = (delay: number, callback: () => void) =>
      timers.push(window.setTimeout(callback, delay))

    setPhase("opening")
    setCountdown(null)
    setDemoScore(0)
    setHandFrameNum(16) // Frame 16: Open front palm entering connection zone

    // Step-by-step hand closing animation (16 -> 1 -> 2 -> 3 -> 4 -> 5)
    at(150, () => setHandFrameNum(1))
    at(280, () => setHandFrameNum(2))
    at(390, () => setHandFrameNum(3))
    at(480, () => setHandFrameNum(5))

    // Round 1: Pulling & aiming at Correct Target (CÓ AI) -> Frames 6 -> 7 -> 9 -> 10
    at(550, () => {
      setPhase("aiming-correct")
      setHandFrameNum(6)
      if (soundOn) gameAudio.playSlingshotPull(0.55)
    })
    at(950, () => setHandFrameNum(7))
    at(1350, () => {
      setHandFrameNum(9)
      if (soundOn) gameAudio.playSlingshotPull(0.85)
    })
    at(1650, () => setHandFrameNum(10))

    // Release Round 1 -> Wide open 5-finger burst (Frames 11 -> 12 -> 13)
    at(1850, () => {
      setPhase("flight-correct")
      setHandFrameNum(11)
      if (soundOn) gameAudio.playSlingshotRelease(0.85)
    })
    at(2020, () => setHandFrameNum(12))
    at(2200, () => setHandFrameNum(13))
    at(2350, () => {
      setPhase("hit-correct")
      setHandFrameNum(15)
      setDemoScore((prev) => applyScoreDelta(prev, true))
      if (soundOn) gameAudio.playCorrectHit(1)
    })

    // Round 2: Approaching & grabbing for Scenario 2 (Alarm Clock)
    at(3550, () => {
      setPhase("scenario-wrong")
      setHandFrameNum(16)
    })
    at(3800, () => setHandFrameNum(1))
    at(4020, () => setHandFrameNum(3))
    at(4200, () => setHandFrameNum(5))

    // Pulling & aiming at Wrong Target -> Frames 6 -> 7 -> 9 -> 10
    at(4350, () => {
      setPhase("aiming-wrong")
      setHandFrameNum(6)
      if (soundOn) gameAudio.playSlingshotPull(0.55)
    })
    at(4750, () => setHandFrameNum(7))
    at(5150, () => {
      setHandFrameNum(9)
      if (soundOn) gameAudio.playSlingshotPull(0.85)
    })
    at(5450, () => setHandFrameNum(10))

    // Release Round 2 -> Wide open 5-finger burst (Frames 11 -> 12 -> 13)
    at(5650, () => {
      setPhase("flight-wrong")
      setHandFrameNum(11)
      if (soundOn) gameAudio.playSlingshotRelease(0.85)
    })
    at(5820, () => setHandFrameNum(12))
    at(6000, () => setHandFrameNum(13))
    at(6150, () => {
      setPhase("hit-wrong")
      setHandFrameNum(15)
      setDemoScore((prev) => applyScoreDelta(prev, false))
      if (soundOn) gameAudio.playWrongHit()
    })

    // Scoring Guide & 3 -> 2 -> 1 Countdown
    at(7550, () => setPhase("guide"))
    at(8750, () => {
      setPhase("countdown")
      setCountdown(3)
    })
    at(9500, () => setCountdown(2))
    at(10250, () => setCountdown(1))
    at(11000, () => {
      setCountdown(null)
      setPhase("ready")
      setHandFrameNum(16)
    })

    return () => timers.forEach(window.clearTimeout)
  }, [replayKey, soundOn])

  useEffect(() => {
    if (countdown === null || reducedMotion || !soundOn) return
    gameAudio.playCountdown(countdown)
  }, [countdown, reducedMotion, soundOn])

  const isWrongRound = [
    "scenario-wrong",
    "aiming-wrong",
    "flight-wrong",
    "hit-wrong",
  ].includes(phase)
  const isAiming = phase === "aiming-correct" || phase === "aiming-wrong"
  const isFlying = phase === "flight-correct" || phase === "flight-wrong"
  const isCorrectHit = phase === "hit-correct"
  const isWrongHit = phase === "hit-wrong"
  const isHit = isCorrectHit || isWrongHit
  const targetAI = true

  const activeHandSprite = getHandFrame(handFrameNum)

  // Determine which of the 4 tutorial gesture cards is currently active
  const activeStepIndex =
    phase === "opening" || phase === "scenario-wrong"
      ? handFrameNum >= 2 && handFrameNum <= 5
        ? 1
        : 0
      : isAiming
      ? 2
      : isFlying || isHit
      ? 3
      : -1

  const message =
    phase === "opening"
      ? "BƯỚC 1 & 2: ĐƯA TAY VÀO KHUNG & NẮM VIÊN ĐẠN"
      : isAiming
      ? "BƯỚC 3: NẮM TAY KÉO CĂNG DÂY NÁ & NGẮM BIA"
      : isFlying
      ? "BƯỚC 4: BUNG XÒE 5 NGÓN TAY ĐỂ PHÓNG ĐẠN!"
      : isCorrectHit
      ? `BẮN ĐÚNG – CỘNG +${GAME_SCORING.CORRECT_ANSWER} ĐIỂM!`
      : phase === "scenario-wrong"
      ? "THỬ TÌNH HUỐNG 2: ĐƯA TAY NẮM NÁ..."
      : isWrongHit
      ? `BẮN SAI – TRỪ -${GAME_SCORING.WRONG_ANSWER} ĐIỂM!`
      : phase === "guide"
      ? "QUY TẮC TÍNH ĐIỂM XẠ THỦ AI"
      : phase === "ready"
      ? "SẴN SÀNG CHƯA?"
      : ""

  const scenario =
    isWrongRound || ["guide", "countdown", "ready"].includes(phase)
      ? "alarm"
      : "face"

  const onReplay = () => {
    gameAudio.playClick()
    setReplayKey((current) => current + 1)
  }

  return (
    <main className="screen auto-tutorial-screen relative w-full h-full flex flex-col justify-between gap-2 sm:gap-2.5 p-2.5 sm:p-4 md:p-5 overflow-hidden ppt-page-enter">
      {/* Header & Telemetry */}
      <div className="flex flex-row items-center justify-between gap-2 pb-0.5 shrink-0 pr-20 sm:pr-28">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#eaf2ff] border-2 border-[#2563eb] mb-0.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
            <span className="text-[10px] sm:text-xs text-[#1b3a8a] uppercase font-black">
              BƯỚC 03 / 05 • HƯỚNG DẪN CỬ CHỈ TAY KÉO – THẢ NÁ
            </span>
          </div>
          <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-[#1b3a8a] uppercase leading-tight m-0">
            4 BƯỚC CẦM – KÉO – THẢ NÁ{" "}
            <span className="text-[#f47920]">XẠ THỦ AI</span>
          </h1>
        </div>

        {/* Telemetry Box */}
        <div className="hidden sm:flex items-center gap-3 bg-white px-3 py-1.5 rounded-2xl shadow-xs border-2 border-[#bfdbfe] shrink-0">
          <div className="flex flex-col items-start">
            <span className="text-[9px] text-slate-500 uppercase font-bold">
              Bắn đúng bia
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-[#16a34a] leading-none">
              +{GAME_SCORING.CORRECT_ANSWER} PTS
            </span>
          </div>
          <div className="w-px h-6 bg-[#cbd5e1]" />
          <div className="flex flex-col items-start">
            <span className="text-[9px] text-slate-500 uppercase font-bold">
              Bắn sai bia
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-[#dc2626] leading-none">
              -{GAME_SCORING.WRONG_ANSWER} PTS
            </span>
          </div>
          <div className="w-px h-6 bg-[#cbd5e1]" />
          <div className="flex flex-col items-start" aria-live="polite">
            <span className="text-[9px] text-slate-500 uppercase font-bold">
              Điểm trình diễn
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-[#2563eb] leading-none">
              {demoScore} PTS
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Split Layout: Left 4 Hand-Sprite Steps + Right Live Slingshot Stage */}
      <div className="relative grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3.5 flex-1 min-h-0 overflow-hidden">
        {/* LEFT COLUMN (5/12): 4 Hand Sprite Gesture Steps + Current Scenario */}
        <div className="md:col-span-5 flex flex-col justify-between gap-2 h-full min-h-0">
          {/* 2x2 Grid of the 4 Hand Gesture Sprite Steps */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            {HAND_TUTORIAL_STEPS.map((stepItem, idx) => {
              const isStepActive = activeStepIndex === idx
              const primarySprite = getHandFrame(stepItem.primaryFrame)
              const displaySprite =
                isStepActive ? activeHandSprite : primarySprite

              return (
                <div
                  key={stepItem.step}
                  className={`rounded-2xl p-2 sm:p-2.5 border-2 flex items-center gap-2.5 transition-all duration-200 ${
                    isStepActive
                      ? "bg-white border-[#f47920] shadow-[0_4px_0_#c2410c] scale-[1.02]"
                      : "bg-white/90 border-[#dbeafe] shadow-2xs"
                  }`}
                >
                  <div
                    className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 p-1 flex items-center justify-center shrink-0 overflow-hidden"
                    style={{
                      backgroundColor: stepItem.bg,
                      borderColor: isStepActive ? "#f47920" : stepItem.color,
                    }}
                  >
                    <img
                      src={displaySprite.src}
                      alt={stepItem.title}
                      className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
                    />
                    <span
                      className="mana-keep-white absolute top-0.5 left-0.5 px-1.5 py-0.1 rounded-md text-[8.5px] font-black text-white"
                      style={{ backgroundColor: stepItem.color }}
                    >
                      {stepItem.step}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <b className="text-[11px] sm:text-xs font-black text-[#1b3a8a] leading-tight truncate">
                      {stepItem.title}
                    </b>
                    <span className="text-[10px] text-slate-600 font-semibold leading-snug">
                      {stepItem.subtitle}
                    </span>
                    {/* Mini sprite frames strip for this step */}
                    <div className="flex items-center gap-1 mt-1">
                      {stepItem.frames.map((fNum) => (
                        <img
                          key={fNum}
                          src={getHandFrame(fNum).src}
                          alt={`Frame ${fNum}`}
                          className={`w-4 h-4 object-contain rounded border ${
                            handFrameNum === fNum
                              ? "border-[#f47920] bg-[#fff7ed] scale-115"
                              : "border-slate-200 bg-slate-50 opacity-70"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Live Automated Demo Status & Scenario Card */}
          <div className="rounded-2xl bg-white border-2 border-[#bfdbfe] p-2.5 sm:p-3 flex flex-col justify-between gap-1.5 shadow-xs flex-1 min-h-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <img
                  src={activeHandSprite.src}
                  alt={activeHandSprite.labelVi}
                  className="w-7 h-7 object-contain rounded-lg bg-[#fff7ed] border border-[#fdba74] p-0.5"
                />
                <span className="text-[10px] font-black uppercase text-[#2563eb] tracking-wider">
                  TRẠNG THÁI TAY: {activeHandSprite.labelVi.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={onReplay}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] text-[10px] font-black cursor-pointer shrink-0"
              >
                <RotateCcw size={11} /> Phát lại
              </button>
            </div>

            <motion.div
              className="text-xs sm:text-sm font-black text-[#f47920] uppercase truncate"
              key={`${replayKey}-${message}`}
              initial={reducedMotion ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.22 }}
              aria-live="polite"
            >
              {message || "\u00A0"}
            </motion.div>

            <TutorialScenarioCard scenario={scenario} />
          </div>
        </div>

        {/* RIGHT COLUMN (7/12): Automated Slingshot Demonstration Stage with Hand Sprite */}
        <div className="md:col-span-7 flex flex-col h-full min-h-0">
          <section
            className={`auto-tutorial-arena flex-1 min-h-0${isHit ? " is-hit" : ""}${isWrongHit ? " is-warning" : ""}`}
            aria-label="Trình diễn bàn tay cầm, kéo và thả ná bắn vào hai bia"
          >
            <div className="tutorial-sun" />
            <div className="tutorial-cloud tutorial-cloud-left" />
            <div className="tutorial-cloud tutorial-cloud-right" />
            <div className="tutorial-hill tutorial-hill-back" />
            <div className="tutorial-hill tutorial-hill-front" />
            <TutorialTarget reducedMotion={reducedMotion} />
            <TutorialTarget
              ai
              reducedMotion={reducedMotion}
              active={isCorrectHit || isWrongHit}
              warning={isWrongHit}
            />

            <svg
              className="tutorial-sling-svg"
              viewBox="0 0 1000 560"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="tutWoodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E69A50" />
                  <stop offset="55%" stopColor="#B86B28" />
                  <stop offset="100%" stopColor="#844614" />
                </linearGradient>
                <linearGradient id="tutGripGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#5C7CFA" />
                  <stop offset="50%" stopColor="#395AD2" />
                  <stop offset="100%" stopColor="#233B99" />
                </linearGradient>
              </defs>

              {/* Hand Connection Docking Box around Slingshot Pouch */}
              <g transform="translate(500 350)">
                <rect
                  x="-64"
                  y="-58"
                  width="128"
                  height="116"
                  rx="24"
                  fill={isAiming ? "rgba(244, 121, 32, 0.14)" : "rgba(22, 163, 74, 0.12)"}
                  stroke={isAiming ? "#f47920" : "#16a34a"}
                  strokeWidth="3"
                  strokeDasharray="10 6"
                />
              </g>

              <motion.path
                className="tutorial-band tutorial-band-back"
                d={
                  isAiming
                    ? "M 464 334 Q 423 379 430 357"
                    : "M 464 334 Q 482 322 500 350"
                }
                stroke="#F47920"
                strokeWidth="10"
                transition={{ duration: reducedMotion ? 0 : 0.65, ease: "easeOut" }}
              />

              {/* 2D Cartoon Slingshot Y-Frame */}
              <path
                d="M 500 496 L 500 426 C 500 392 464 372 464 326 M 500 426 C 500 392 536 372 536 326"
                fill="none"
                stroke="#4A250B"
                strokeWidth="26"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 500 496 L 500 426 C 500 392 464 372 464 326 M 500 426 C 500 392 536 372 536 326"
                fill="none"
                stroke="url(#tutWoodGrad)"
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="452"
                y="324"
                width="24"
                height="11"
                rx="5"
                fill="#EF5350"
                stroke="#4A250B"
                strokeWidth="3"
              />
              <rect
                x="524"
                y="324"
                width="24"
                height="11"
                rx="5"
                fill="#EF5350"
                stroke="#4A250B"
                strokeWidth="3"
              />
              <rect
                x="487"
                y="436"
                width="26"
                height="48"
                rx="10"
                fill="url(#tutGripGrad)"
                stroke="#4A250B"
                strokeWidth="3.5"
              />
              <rect
                x="485"
                y="428"
                width="30"
                height="10"
                rx="5"
                fill="#FF9B42"
                stroke="#4A250B"
                strokeWidth="3"
              />
              <ellipse
                cx="500"
                cy="490"
                rx="15"
                ry="7"
                fill="#FFBE63"
                stroke="#4A250B"
                strokeWidth="3"
              />

              <motion.path
                className="tutorial-band tutorial-band-front"
                d={
                  isAiming
                    ? "M 536 334 Q 468 380 430 357"
                    : "M 536 334 Q 518 322 500 350"
                }
                stroke="#FF9B42"
                strokeWidth="10"
                transition={{ duration: reducedMotion ? 0 : 0.65, ease: "easeOut" }}
              />

              {isAiming && (
                <motion.path
                  className="tutorial-aim-arc"
                  d={
                    targetAI
                      ? "M 430 357 Q 576 180 780 155"
                      : "M 430 357 Q 360 180 220 155"
                  }
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: reducedMotion ? 0 : 0.45 }}
                />
              )}
            </svg>

            {/* Projectile */}
            <motion.div
              className="tutorial-projectile"
              initial={false}
              animate={
                isAiming
                  ? { left: "43%", top: "64%", rotate: -35 }
                  : isFlying || isHit
                  ? { left: targetAI ? "78%" : "22%", top: "28%", rotate: -18 }
                  : { left: "50%", top: "63%", rotate: 0 }
              }
              transition={{
                duration: reducedMotion ? 0 : isFlying ? 0.5 : 0.6,
                ease: isFlying ? "easeIn" : "easeOut",
              }}
            />

            {/* ===============================================================
             * ANIMATED CARTOON HAND SPRITE (FRAMES 01..16) ON THE SLINGSHOT!
             * Reaches -> Closes -> Grabs -> Pulls back -> Snaps wide open on release!
             * =============================================================== */}
            {!["guide", "countdown", "ready"].includes(phase) && (
              <motion.div
                className="tutorial-hand-sprite-actor"
                initial={false}
                animate={
                  isAiming
                    ? { left: "41%", top: "69%", scale: 1.08, rotate: -12 }
                    : isFlying || isHit
                    ? { left: "40%", top: "70%", scale: 1.15, rotate: 0 }
                    : { left: "51%", top: "66%", scale: 1, rotate: 0 }
                }
                transition={{
                  duration: reducedMotion ? 0 : isAiming ? 0.6 : 0.35,
                  ease: "easeOut",
                }}
              >
                <img
                  src={activeHandSprite.src}
                  alt={activeHandSprite.labelVi}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_6px_12px_rgba(15,23,42,0.32)]"
                />
                <span className="tutorial-hand-caption">
                  {activeHandSprite.labelVi}
                </span>
              </motion.div>
            )}

            <motion.div
              className="tutorial-mana"
              animate={
                phase === "hit-correct"
                  ? { y: [0, -16, 0, -12, 0], rotate: [0, -8, 8, -5, 0] }
                  : isAiming
                  ? { y: 7, rotate: -5 }
                  : { y: 0, rotate: 0 }
              }
              transition={{
                duration: reducedMotion ? 0 : 0.8,
                repeat: phase === "hit-correct" && !reducedMotion ? 1 : 0,
                ease: "easeInOut",
              }}
            >
              <img src={manaUrl} alt="Mana, linh vật Manabie" />
            </motion.div>

            {companion && (
              <div
                className="tutorial-companion-badge"
                aria-label={`Bạn đồng hành ${companion.name}`}
              >
                <div className="tutorial-companion-avatar">
                  <CharacterAvatar character={companion} />
                </div>
                <div className="tutorial-companion-meta">
                  <span>ĐỒNG HÀNH CÙNG {playerProfile?.playerName || "XẠ THỦ"}</span>
                  <b>{companion.name}</b>
                </div>
              </div>
            )}

            <TutorialScoreFeedback
              correct={isCorrectHit}
              visible={isCorrectHit || isWrongHit}
              reducedMotion={reducedMotion}
            />

            {isCorrectHit && (
              <div className="tutorial-confetti" aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => (
                  <motion.span
                    key={`${replayKey}-${index}`}
                    style={
                      {
                        "--confetti-x": `${8 + (index % 5) * 19}%`,
                        "--confetti-y": `${12 + (index % 4) * 13}%`,
                      } as React.CSSProperties
                    }
                    initial={{ opacity: 0, y: 0, scale: 0.4 }}
                    animate={{
                      opacity: [0, 1, 0],
                      y: reducedMotion ? 0 : [0, -44 - (index % 3) * 18, 12],
                      x: reducedMotion
                        ? 0
                        : [0, (index - 5) * 12, (index - 5) * 18],
                      rotate: reducedMotion ? 0 : [0, 90, 180],
                      scale: reducedMotion ? 1 : [0.4, 1, 0.6],
                    }}
                    transition={{
                      duration: reducedMotion ? 0 : 1.15,
                      delay: index * 0.035,
                    }}
                  >
                    {index % 2 ? "✦" : "●"}
                  </motion.span>
                ))}
              </div>
            )}

            {(phase === "guide" || phase === "countdown") && (
              <TutorialScoringGuide />
            )}
            {phase === "countdown" && countdown !== null && (
              <TutorialCountdown value={countdown} reducedMotion={reducedMotion} />
            )}
            {phase === "ready" && (
              <div className="absolute inset-0 z-20 bg-[#1b3a8a]/35 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-4">
                <div className="px-4 py-1 rounded-full bg-white border-2 border-[#16a34a] text-[#15803d] text-xs font-black uppercase shadow">
                  ĐÃ HOÀN TẤT HƯỚNG DẪN • SẴN SÀNG CHƯA?
                </div>
                <StartGameButton onClick={onPlay} />
              </div>
            )}
            <div className="tutorial-ground" />
          </section>
        </div>
      </div>

      {/* Bottom Navigation & Start Bar */}
      <div className="bg-white/95 rounded-2xl p-2 sm:p-2.5 border-2 border-[#bfdbfe] flex items-center justify-between gap-2 shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick()
              onBack()
            }}
            className="btn-mana-blue flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-black cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Quay lại</span>
          </button>

          <button
            type="button"
            onClick={onReplay}
            className="px-3.5 py-2 rounded-full bg-[#f4f8ff] hover:bg-[#eaf2ff] border-2 border-[#93c5fd] text-[#1b3a8a] text-xs font-black flex items-center gap-1.5 cursor-pointer"
            title="Phát lại toàn bộ hướng dẫn"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Phát lại mẫu</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick()
              onOpenPlayerSetup?.()
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ebf9f1] hover:bg-[#dcfce7] border-2 border-[#16a34a] text-xs font-black text-[#1b3a8a] transition-all cursor-pointer shadow-xs"
            title="Thiết lập tên và chọn nhân vật đồng hành"
          >
            <span className="w-5 h-5 rounded-full overflow-hidden bg-white border border-[#86efac] inline-flex shrink-0">
              <CharacterAvatar character={companion} />
            </span>
            <span className="max-w-[120px] truncate text-[#15803d]">
              {playerProfile ? playerProfile.playerName : "Chọn nhân vật"}
            </span>
            <UserCheck size={13} className="text-[#16a34a]" />
          </button>

          {onControlModeChange && (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onControlModeChange(controlMode === "ar" ? "mouse" : "ar")
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border-2 border-[#93c5fd] text-xs font-bold cursor-pointer hover:bg-[#f4f8ff]"
              title="Nhấn để chuyển chế độ điều khiển"
            >
              <span className="uppercase text-[10px] text-slate-500">
                Chế độ:
              </span>
              <span
                className={`font-black flex items-center gap-1 ${
                  controlMode === "ar" ? "text-[#15803d]" : "text-[#2563eb]"
                }`}
              >
                {controlMode === "ar" ? (
                  <Camera size={14} />
                ) : (
                  <MousePointerClick size={14} />
                )}
                {controlMode === "ar" ? "Camera AR" : "Chuột / Chạm"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              gameAudio.playClick()
              onPlay()
            }}
            className="btn-mana-orange px-6 sm:px-8 py-2 sm:py-2.5 rounded-full font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>CHƠI NGAY</span>
            <Play size={16} fill="currentColor" />
          </button>
        </div>
      </div>
    </main>
  )
}

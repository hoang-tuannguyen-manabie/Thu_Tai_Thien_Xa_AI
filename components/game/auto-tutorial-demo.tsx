"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, Check, RotateCcw, Sparkles, UserCheck, X } from "lucide-react"
import { applyScoreDelta, GAME_SCORING } from "@/lib/game-logic"
import { getCharacterById, type PlayerProfile } from "@/lib/characters"
import { gameAudio } from "@/lib/audio"
import { CharacterAvatar } from "./player-setup-modal"

const wordmarkUrl = "/assets/brand/manabie-logo.png"
const fallbackWordmarkUrl =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/images%20%281%29-Ns1blYYdKWbb0wu1BqOQ7FeHdlyQgc.png"
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
}

export function AutoTutorialDemo({
  onPlay,
  onBack,
  playerProfile,
  onOpenPlayerSetup,
  soundOn = true,
}: AutoTutorialDemoProps) {
  const [phase, setPhase] = useState<DemoPhase>("opening")
  const [countdown, setCountdown] = useState<number | null>(null)
  const [demoScore, setDemoScore] = useState(0)
  const [replayKey, setReplayKey] = useState(0)
  const [logoSrc, setLogoSrc] = useState(wordmarkUrl)
  const reducedMotion = useReducedMotion() === true
  const companion = playerProfile ? getCharacterById(playerProfile.characterId) : null

  useEffect(() => {
    const timers: number[] = []
    const at = (delay: number, callback: () => void) =>
      timers.push(window.setTimeout(callback, delay))

    setPhase("opening")
    setCountdown(null)
    setDemoScore(0)
    at(500, () => {
      setPhase("aiming-correct")
      if (soundOn) gameAudio.playSlingshotPull(0.75)
    })
    at(1850, () => {
      setPhase("flight-correct")
      if (soundOn) gameAudio.playSlingshotRelease(0.8)
    })
    at(2350, () => {
      setPhase("hit-correct")
      setDemoScore((prev) => applyScoreDelta(prev, true))
      if (soundOn) gameAudio.playCorrectHit(1)
    })
    at(3550, () => setPhase("scenario-wrong"))
    at(4350, () => {
      setPhase("aiming-wrong")
      if (soundOn) gameAudio.playSlingshotPull(0.75)
    })
    at(5650, () => {
      setPhase("flight-wrong")
      if (soundOn) gameAudio.playSlingshotRelease(0.8)
    })
    at(6150, () => {
      setPhase("hit-wrong")
      setDemoScore((prev) => applyScoreDelta(prev, false))
      if (soundOn) gameAudio.playWrongHit()
    })
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

  const message =
    phase === "opening"
      ? "QUAN SÁT MANA THỬ TÀI!"
      : isAiming
      ? "KÉO NÁ – NHẮM BIA"
      : isFlying
      ? "MANA ĐANG BẮN!"
      : isCorrectHit
      ? `BẮN ĐÚNG – CỘNG +${GAME_SCORING.CORRECT_ANSWER} ĐIỂM!`
      : phase === "scenario-wrong"
      ? "THỬ MỘT TÌNH HUỐNG KHÁC"
      : isWrongHit
      ? `BẮN SAI – TRỪ -${GAME_SCORING.WRONG_ANSWER} ĐIỂM!`
      : phase === "guide"
      ? "CÁCH TÍNH ĐIỂM"
      : phase === "ready"
      ? "SẴN SÀNG CHƯA?"
      : ""

  const scenario =
    isWrongRound || ["guide", "countdown", "ready"].includes(phase) ? "alarm" : "face"

  const onReplay = () => {
    gameAudio.playClick()
    setReplayKey((current) => current + 1)
  }

  return (
    <main className="screen auto-tutorial-screen">
      <header className="auto-tutorial-header">
        <button
          className="icon-button"
          onClick={() => {
            gameAudio.playClick()
            onBack()
          }}
          aria-label="Quay lại trang chủ"
          title="Quay lại trang chủ"
        >
          <ArrowLeft />
        </button>
        <img
          className="auto-tutorial-brand"
          src={logoSrc}
          onError={() => setLogoSrc(fallbackWordmarkUrl)}
          alt="Manabie"
        />
        <div className="auto-tutorial-controls">
          {playerProfile && companion && (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onOpenPlayerSetup?.()
              }}
              className="player-profile-chip"
              title="Đổi tên hoặc nhân vật đồng hành"
            >
              <span className="player-profile-avatar">
                <CharacterAvatar character={companion} />
              </span>
              <span className="player-profile-name">{playerProfile.playerName}</span>
              <UserCheck size={13} className="text-[#42b883]" />
            </button>
          )}
          <button
            className="icon-button"
            onClick={onReplay}
            aria-label="Phát lại toàn bộ hướng dẫn"
            title="Phát lại toàn bộ hướng dẫn"
          >
            <RotateCcw />
          </button>
        </div>
      </header>

      <div className="auto-tutorial-content">
        <motion.div
          className="auto-tutorial-message"
          key={`${replayKey}-${message}`}
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.3 }}
          aria-live="polite"
        >
          {message || "\u00A0"}
        </motion.div>
        <TutorialScenarioCard scenario={scenario} />

        <section
          className={`auto-tutorial-arena${isHit ? " is-hit" : ""}${isWrongHit ? " is-warning" : ""}`}
          aria-label="Mana trình diễn cách bắn vào hai bia"
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
            <motion.path
              className="tutorial-band tutorial-band-back"
              d={
                isAiming
                  ? "M 466 350 Q 423 379 430 357"
                  : "M 466 350 Q 482 322 500 350"
              }
              transition={{ duration: reducedMotion ? 0 : 0.65, ease: "easeOut" }}
            />
            <motion.path
              className="tutorial-band tutorial-band-front"
              d={
                isAiming
                  ? "M 534 350 Q 468 380 430 357"
                  : "M 534 350 Q 518 322 500 350"
              }
              transition={{ duration: reducedMotion ? 0 : 0.65, ease: "easeOut" }}
            />
            <path
              className="tutorial-sling-frame"
              d="M500 493 C488 443 478 391 466 350 M500 493 C512 443 522 391 534 350 M466 350 L460 314 M534 350 L540 314"
            />
            <path className="tutorial-sling-grip" d="M480 490 Q500 474 520 490" />
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
            <div className="tutorial-companion-badge" aria-label={`Bạn đồng hành ${companion.name}`}>
              <div className="tutorial-companion-avatar">
                <CharacterAvatar character={companion} />
              </div>
              <div className="tutorial-companion-meta">
                <span>ĐỒNG HÀNH CÙNG {playerProfile?.playerName}</span>
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
                    x: reducedMotion ? 0 : [0, (index - 5) * 12, (index - 5) * 18],
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
          {(phase === "guide" || phase === "countdown") && <TutorialScoringGuide />}
          {phase === "countdown" && countdown !== null && (
            <TutorialCountdown value={countdown} reducedMotion={reducedMotion} />
          )}
          <div className="tutorial-ground" />
        </section>

        <div className="tutorial-scoreboard" aria-live="polite">
          <span>ĐIỂM TRÌNH DIỄN (TÁCH BIỆT ĐIỂM CHƠI THẬT)</span>
          <strong key={demoScore}>{demoScore}</strong>
        </div>

        {phase === "ready" && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <StartGameButton onClick={onPlay} />
            <button
              type="button"
              onClick={onReplay}
              className="secondary-button"
              aria-label="Xem lại hướng dẫn"
            >
              <RotateCcw size={16} /> XEM LẠI HƯỚNG DẪN
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

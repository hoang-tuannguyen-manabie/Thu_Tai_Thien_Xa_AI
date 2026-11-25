"use client"

import { useCallback, useRef, useState } from "react"
import { Camera, Maximize2, Pause, Play, Sparkles } from "lucide-react"
import type { GameQuestion, TargetKind } from "@/lib/game-data"
import type { GameplayPhase, ShotResult } from "@/lib/game-logic"
import { getCharacterById, type PlayerProfile } from "@/lib/characters"
import { gameAudio } from "@/lib/audio"
import { ARHandController, type ARHandFrame } from "./ar-hand-controller"
import type { GameVisualState } from "./game-types"
import { FeedbackOverlay } from "./answer-feedback"
import { SlingshotGame, type ControlMode } from "./slingshot-game"
import { ManaMascot } from "./game-brand"
import { TargetBoard } from "./target-board"
import { GameHeader, QuestionCard, ScorePanel } from "./game-hud"
import { CharacterAvatar } from "./player-setup-modal"

export interface GameArenaProps {
  questions: GameQuestion[]
  questionIndex: number
  score: number
  attempts: ShotResult[]
  correctCount: number
  paused: boolean
  onPause: () => void
  onShot: (target: TargetKind) => void
  onNext: () => void
  feedback: ShotResult | null
  soundOn: boolean
  onSound: () => void
  visualState: GameVisualState
  gameplayPhase?: GameplayPhase
  onInteractionStateChange?: (
    state: "idle" | "dragging" | "aiming" | "shooting" | "collision"
  ) => void
  playerProfile?: PlayerProfile | null
  onOpenPlayerSetup?: () => void
  controlMode?: ControlMode
  onControlModeChange?: (mode: ControlMode) => void
}

export function GameArena({
  questions,
  questionIndex,
  score,
  attempts,
  correctCount,
  paused,
  onPause,
  onShot,
  onNext,
  feedback,
  soundOn,
  onSound,
  visualState,
  gameplayPhase = "QUESTION_ACTIVE",
  onInteractionStateChange,
  playerProfile,
  onOpenPlayerSetup,
  controlMode = "mouse",
  onControlModeChange,
}: GameArenaProps) {
  const question = questions[questionIndex]
  const attemptsSinceMiss = attempts
    .slice()
    .reverse()
    .findIndex((attempt) => !attempt.correct)
  const combo = attemptsSinceMiss === -1 ? attempts.length : attemptsSinceMiss
  const answeredCount = Math.min(
    questionIndex + (feedback ? 1 : 0),
    questions.length
  )
  const [isFullscreen, setIsFullscreen] = useState(false)
  const companion = playerProfile
    ? getCharacterById(playerProfile.characterId)
    : null
  const arHandFrameRef = useRef<((frame: ARHandFrame) => void) | null>(null)

  const handleARHandFrame = useCallback((frame: ARHandFrame) => {
    arHandFrameRef.current?.(frame)
  }, [])

  const enterFullscreen = () => {
    gameAudio.playClick()
    if (!document.fullscreenElement)
      void document.documentElement
        .requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch(() => undefined)
    else void document.exitFullscreen?.().then(() => setIsFullscreen(false))
  }

  return (
    <main
      className="game-screen"
      data-state={visualState}
      data-phase={gameplayPhase}
      data-control-mode={controlMode}
    >
      <GameHeader
        questionIndex={questionIndex}
        questionCount={questions.length}
        answeredCount={answeredCount}
        score={score}
        correctCount={correctCount}
        combo={combo}
        paused={paused}
        onPause={onPause}
        soundOn={soundOn}
        onSound={onSound}
        playerProfile={playerProfile}
        onOpenPlayerSetup={onOpenPlayerSetup}
        controlMode={controlMode}
        onControlModeChange={onControlModeChange}
      />

      <section className="arena-wrap">
        <div className="arena-topline">
          <span>
            <i className="live-dot" /> ĐẤU TRƯỜNG BẮN BIA AI
            {playerProfile && (
              <strong className="arena-player-inline">
                • XẠ THỦ: {playerProfile.playerName.toUpperCase()}
              </strong>
            )}
            {controlMode === "ar" && (
              <strong className="arena-ar-tag">
                <Camera size={12} /> CHẾ ĐỘ CAMERA AR (CỬ CHỈ TAY)
              </strong>
            )}
          </span>
          <button
            className="fullscreen-button"
            onClick={enterFullscreen}
            type="button"
          >
            <Maximize2 size={14} />
            {isFullscreen ? "THOÁT TOÀN MÀN HÌNH" : "TOÀN MÀN HÌNH"}
          </button>
        </div>

        <QuestionCard
          key={question.id}
          question={question}
          index={questionIndex}
          controlMode={controlMode}
        />

        <div className="arena-stage">
          <div className="arena-sun" />
          <div className="arena-cloud cloud-one" />
          <div className="arena-cloud cloud-two" />
          <div className="arena-mountain mountain-a" />
          <div className="arena-mountain mountain-b" />
          <div className="arena-flower flower-a">+</div>
          <div className="arena-flower flower-b">+</div>

          {companion && (
            <div
              className="arena-companion"
              aria-label={`Bạn đồng hành ${companion.name}`}
            >
              <div className="arena-companion-avatar">
                <CharacterAvatar character={companion} />
              </div>
              <span>
                {feedback
                  ? feedback.correct
                    ? "BẮN CHUẨN QUÁ!"
                    : "CỐ LÊN XẠ THỦ!"
                  : visualState === "aiming"
                  ? "NHẮM KỸ BIA NHÉ!"
                  : companion.name.toUpperCase()}
              </span>
            </div>
          )}

          <div className="arena-mascot">
            <ManaMascot small />
            <span>
              {feedback
                ? feedback.correct
                  ? "CHÍNH XÁC +100!"
                  : "XEM GIẢI THÍCH NHÉ!"
                : controlMode === "ar"
                ? "CHỤM TAY KÉO NÁ NHÉ!"
                : "EM CHỌN BIA NÀO?"}
            </span>
          </div>

          <div className="arena-target left-target">
            <TargetBoard
              side="non-ai"
              active={Boolean(
                feedback?.correct && feedback.answer === "non-ai"
              )}
              shake={Boolean(
                feedback && !feedback.correct && feedback.answer === "non-ai"
              )}
            />
            <span className="target-caption">
              BIỂN SỐ 01 <i>•</i> QUY TẮC CỐ ĐỊNH
            </span>
          </div>

          <div className="arena-target right-target">
            <TargetBoard
              side="ai"
              active={Boolean(feedback?.correct && feedback.answer === "ai")}
              shake={Boolean(
                feedback && !feedback.correct && feedback.answer === "ai"
              )}
            />
            <span className="target-caption">
              BIỂN SỐ 02 <i>•</i> HỌC &amp; NHẬN BIẾT
            </span>
          </div>

          <SlingshotGame
            key={question.id}
            onShot={onShot}
            disabled={Boolean(feedback) || paused}
            soundOn={soundOn}
            correctTarget={question.correctAnswer}
            visualState={visualState}
            controlMode={controlMode}
            arHandFrameRef={arHandFrameRef}
            onInteractionStateChange={onInteractionStateChange}
          />

          {/* AR Camera Hand Tracker Overlay */}
          <ARHandController
            enabled={controlMode === "ar"}
            disabled={Boolean(feedback) || paused}
            onHandFrame={handleARHandFrame}
            onFallbackToMouse={() => onControlModeChange?.("mouse")}
          />

          <div className="arena-ground" />
          <div className="arena-grass grass-a">+</div>
          <div className="arena-grass grass-b">+</div>

          {feedback && (
            <FeedbackOverlay
              result={feedback}
              question={question}
              onNext={onNext}
              isLastQuestion={questionIndex >= questions.length - 1}
              playerProfile={playerProfile}
            />
          )}

          {paused && (
            <div className="pause-overlay">
              <div className="pause-card">
                <div className="pause-icon">
                  <Pause />
                </div>
                <span>TẠM NGHỈ MỘT CHÚT</span>
                <h2>Sẵn sàng chơi tiếp chưa?</h2>
                <button
                  className="primary-button blue"
                  onClick={() => {
                    gameAudio.playClick()
                    onPause()
                  }}
                  type="button"
                >
                  TIẾP TỤC <Play size={17} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="arena-bottom">
          <div className="arena-instruction">
            <span className="drag-puck">●</span>
            {controlMode === "ar" ? (
              <span>
                <b>CHỤM NGÓN CÁI &amp; TRỎ (HOẶC NẮM TAY)</b> để cầm ná, kéo và{" "}
                <b>MỞ TAY</b> để bắn
              </span>
            ) : (
              <span>
                <b>KÉO NGƯỢC HƯỚNG BIA</b> rồi thả để bắn
              </span>
            )}
            <span className="key-hint">
              {controlMode === "ar" ? "AR HAND CAM" : "KÉO & THẢ"}
            </span>
          </div>
          <ScorePanel
            score={score}
            correctCount={correctCount}
            attempts={attempts.length}
            combo={combo}
          />
          <div className="arena-note">
            <Sparkles size={15} /> TỰ TIN LÊN,{" "}
            {playerProfile ? playerProfile.playerName.toUpperCase() : "XẠ THỦ"}!
          </div>
        </div>
      </section>

      <div className="game-footer">
        <span>MANABIE LEARNING ARCADE</span>
        <span>
          {questionIndex + 1} / {questions.length}{" "}
          <i className="footer-progress">
            <b
              style={{
                width: `${Math.round((answeredCount / Math.max(1, questions.length)) * 100)}%`,
              }}
            />
          </i>
        </span>
      </div>
    </main>
  )
}

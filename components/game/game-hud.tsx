"use client"

import { useState, type ReactNode } from "react"
import {
  Bot,
  Calculator,
  Camera,
  CircleHelp,
  Clock3,
  Fingerprint,
  Languages,
  Lightbulb,
  MousePointerClick,
  Pause,
  Play,
  Timer,
  UserCheck,
  Video,
  Volume2,
  VolumeX,
  Wind,
} from "lucide-react"
import type { GameQuestion } from "@/lib/game-data"
import { getCharacterById, type PlayerProfile } from "@/lib/characters"
import { gameAudio } from "@/lib/audio"
import { BrandMark } from "./game-brand"
import { CharacterAvatar } from "./player-setup-modal"
import type { ControlMode } from "./slingshot-game"

export interface GameHeaderProps {
  questionIndex: number
  questionCount: number
  answeredCount: number
  score: number
  correctCount: number
  combo: number
  paused: boolean
  onPause: () => void
  soundOn: boolean
  onSound: () => void
  playerProfile?: PlayerProfile | null
  onOpenPlayerSetup?: () => void
  controlMode?: ControlMode
  onControlModeChange?: (mode: ControlMode) => void
}

export interface QuestionCardProps {
  question: GameQuestion
  index: number
  controlMode?: ControlMode
}

export interface ScorePanelProps {
  score: number
  correctCount: number
  attempts: number
  combo: number
}

const questionIllustrations = {
  FACE: Fingerprint,
  TIME: Clock3,
  VOICE: Bot,
  CALC: Calculator,
  VIDEO: Video,
  LIGHT: Lightbulb,
  LANG: Languages,
  TIMER: Timer,
  CAM: Fingerprint,
  FAN: Wind,
} as const

const highlightedTerms =
  /(nhận diện khuôn mặt|trí tuệ nhân tạo|AI|trợ lý ảo|gợi ý nội dung|dịch tự động|lời nói|mô tả văn bản)/gi

function highlightQuestion(text: string): ReactNode[] {
  return text
    .split(highlightedTerms)
    .map((part, index) =>
      /^(nhận diện khuôn mặt|trí tuệ nhân tạo|AI|trợ lý ảo|gợi ý nội dung|dịch tự động|lời nói|mô tả văn bản)$/i.test(
        part
      ) ? (
        <strong className="question-keyword" key={`${part}-${index}`}>
          {part}
        </strong>
      ) : (
        part
      )
    )
}

export function GameHeader({
  questionIndex,
  questionCount,
  answeredCount,
  score,
  correctCount,
  combo,
  paused,
  onPause,
  soundOn,
  onSound,
  playerProfile,
  onOpenPlayerSetup,
  controlMode = "mouse",
  onControlModeChange,
}: GameHeaderProps) {
  const progress = Math.round((answeredCount / Math.max(1, questionCount)) * 100)
  const companion = playerProfile ? getCharacterById(playerProfile.characterId) : null

  return (
    <header className="game-header">
      <div className="header-brand">
        <BrandMark />
        <span className="header-divider" />
        <span className="header-game-name">
          THỬ TÀI
          <br />
          XẠ THỦ AI
        </span>
      </div>

      <div className="header-progress">
        <div className="progress-meta">
          <span>
            QUESTION{" "}
            <b>
              {String(questionIndex + 1).padStart(2, "0")}/
              {String(questionCount).padStart(2, "0")}
            </b>
          </span>
          <span>{progress}%</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Tiến độ câu hỏi"
          aria-valuemin={0}
          aria-valuemax={questionCount}
          aria-valuenow={answeredCount}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="header-stats">
        {onControlModeChange && (
          <div className="control-mode-switcher" role="group" aria-label="Chế độ điều khiển">
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onControlModeChange("mouse")
              }}
              className={`control-mode-pill ${controlMode === "mouse" ? "is-active" : ""}`}
              title="Kéo và thả ná bằng Chuột hoặc Màn hình cảm ứng"
            >
              <MousePointerClick size={13} />
              <span>CHUỘT</span>
            </button>
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onControlModeChange("ar")
              }}
              className={`control-mode-pill is-ar ${controlMode === "ar" ? "is-active" : ""}`}
              title="Dùng tay trên Camera AR trực tiếp cầm, kéo và thả ná"
            >
              <Camera size={13} />
              <span>AR CAM</span>
            </button>
          </div>
        )}

        {playerProfile && companion && (
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick()
              onOpenPlayerSetup?.()
            }}
            className="player-profile-chip"
            title={`Xạ thủ: ${playerProfile.playerName} • Đồng hành: ${companion.name}`}
          >
            <span className="player-profile-avatar">
              <CharacterAvatar character={companion} />
            </span>
            <span className="player-profile-text">
              <small>{companion.name}</small>
              <b>{playerProfile.playerName}</b>
            </span>
            <UserCheck size={13} className="text-[#42b883] shrink-0" />
          </button>
        )}
        <div className="header-stat score-stat">
          <span>TỔNG ĐIỂM</span>
          <b>{score.toLocaleString("vi-VN")}</b>
        </div>
        <div className="header-stat">
          <span>TRẢ LỜI ĐÚNG</span>
          <b>
            {String(correctCount).padStart(2, "0")}
            <small>/{questionCount}</small>
          </b>
        </div>
        <div className="header-stat combo-stat">
          <span>CHUỖI</span>
          <b>{combo > 0 ? `×${combo}` : "—"}</b>
        </div>
      </div>

      <div className="header-actions">
        <button
          className="icon-button light"
          type="button"
          onClick={() => {
            onSound()
          }}
          aria-label={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}
          title={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}
        >
          {soundOn ? <Volume2 /> : <VolumeX />}
        </button>
        <button
          className="icon-button light"
          type="button"
          onClick={() => {
            gameAudio.playClick()
            onPause()
          }}
          aria-label={paused ? "Tiếp tục" : "Tạm dừng"}
          title={paused ? "Tiếp tục" : "Tạm dừng"}
        >
          {paused ? <Play /> : <Pause />}
        </button>
      </div>
    </header>
  )
}

export function QuestionCard({ question, index, controlMode = "mouse" }: QuestionCardProps) {
  const [imgError, setImgError] = useState(false)
  const Illustration =
    questionIllustrations[question.illustrationKey as keyof typeof questionIllustrations] ??
    CircleHelp

  return (
    <article className="question-card">
      <div className="question-icon-wrap" aria-hidden="true">
        <span className="question-spark">+</span>
        {question.image && !imgError ? (
          <img
            className="question-illustration-img"
            src={question.image}
            alt=""
            onError={() => setImgError(true)}
          />
        ) : (
          <Illustration className="question-illustration" />
        )}
      </div>
      <div className="question-copy">
        <div className="question-meta">
          <span className="question-kicker">
            TÌNH HUỐNG {String(index + 1).padStart(2, "0")}
          </span>
          <span className="question-category">{question.category}</span>
          {question.toolName && (
            <span className="question-tool-tag">{question.toolName}</span>
          )}
        </div>
        <h2>“{highlightQuestion(question.question)}”</h2>
        <p>
          {controlMode === "ar"
            ? "Chụm ngón cái & trỏ trước Camera để cầm ná, kéo ngược hướng bia và mở tay để bắn!"
            : "Em hãy kéo ná và bắn vào bia phù hợp!"}
        </p>
      </div>
      <div className="question-bulb" aria-hidden="true">
        ?
      </div>
    </article>
  )
}

export function ScorePanel({ score, correctCount, attempts, combo }: ScorePanelProps) {
  return (
    <div className="scoreboard">
      <div className="score-item">
        <span>ĐIỂM SỐ</span>
        <b>{score.toLocaleString("vi-VN")}</b>
      </div>
      <i />
      <div className="score-item">
        <span>ĐÚNG</span>
        <b>
          {correctCount}
          <small>/{attempts}</small>
        </b>
      </div>
      <i />
      <div className="score-item">
        <span>CHUỖI LIÊN TIẾP</span>
        <b>{combo > 0 ? `×${combo}` : "—"}</b>
      </div>
    </div>
  )
}

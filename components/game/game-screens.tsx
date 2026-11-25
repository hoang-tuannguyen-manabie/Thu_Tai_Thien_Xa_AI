"use client"

import { useState } from "react"
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clock3,
  Home,
  Sparkles,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react"
import { getAward, sampleQuestions, type GameQuestion } from "@/lib/game-data"
import { GAME_SCORING, type ShotResult } from "@/lib/game-logic"
import { getCharacterById, type PlayerProfile } from "@/lib/characters"
import { gameAudio } from "@/lib/audio"
import { BrandMark, ManaMascot, PrimaryButton } from "./game-brand"
import { CharacterAvatar, type SetupStep } from "./player-setup-modal"
import { SlingshotIllustration, TargetBoard } from "./target-board"

export interface GameLandingProps {
  onStart: () => void
  playerProfile?: PlayerProfile | null
  onOpenPlayerSetup?: (step?: SetupStep) => void
}

export interface GameSummaryProps {
  score: number
  attempts: ShotResult[]
  questions?: GameQuestion[]
  onReplay: () => void
  onHome: () => void
  elapsed: number
  playerProfile?: PlayerProfile | null
  onOpenPlayerSetup?: (step?: SetupStep) => void
}

export function GameLanding({
  onStart,
  playerProfile,
  onOpenPlayerSetup,
}: GameLandingProps) {
  const companion = playerProfile ? getCharacterById(playerProfile.characterId) : null

  return (
    <main className="screen landing-screen">
      <div className="landing-top">
        <BrandMark />
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {playerProfile && companion ? (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onOpenPlayerSetup?.("confirm")
              }}
              className="player-profile-chip"
              title="Nhấn để đổi tên hoặc chọn lại nhân vật đồng hành"
            >
              <span className="player-profile-avatar">
                <CharacterAvatar character={companion} />
              </span>
              <span className="player-profile-text">
                <small>{companion.name}</small>
                <b>{playerProfile.playerName}</b>
              </span>
              <UserCheck size={14} className="text-[#42b883]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onOpenPlayerSetup?.("name")
              }}
              className="player-profile-chip is-empty"
            >
              <UserPlus size={14} className="text-[#395ad2]" />
              <span>TẠO NGƯỜI CHƠI &amp; CHỌN ĐỒNG HÀNH (36)</span>
            </button>
          )}
          <div className="classroom-tag">
            <span className="live-dot" /> ARCADE HỌC TẬP{" "}
            <span className="tag-separator">•</span> PHIÊN BẢN LỚP HỌC
          </div>
        </div>
      </div>

      <div className="landing-copy">
        <div className="eyebrow">
          <Sparkles size={14} /> HỌC VUI CÙNG MANABIE
        </div>
        <h1>
          THỬ TÀI
          <br />
          <span>XẠ THỦ AI</span>
        </h1>
        <p className="landing-subtitle">
          Bạn có nhận ra đâu là trí tuệ nhân tạo?
        </p>

        {playerProfile && companion && (
          <div className="landing-player-card">
            <div className="landing-player-avatar">
              <CharacterAvatar character={companion} />
            </div>
            <div className="landing-player-info">
              <span>XẠ THỦ ĐÃ SẴN SÀNG</span>
              <b>
                {playerProfile.playerName} <i>•</i> {companion.name}
              </b>
            </div>
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onOpenPlayerSetup?.("character")
              }}
              className="landing-player-edit"
            >
              Đổi nhân vật
            </button>
          </div>
        )}

        <div className="landing-meta">
          <span>
            <span className="mini-icon">10</span> 10 câu hỏi
          </span>
          <i />
          <span>
            <Clock3 size={16} /> 3 phút
          </span>
          <i />
          <span>
            <Sparkles size={16} /> 36 nhân vật đồng hành
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={onStart}>BẮT ĐẦU THỬ THÁCH</PrimaryButton>
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick()
              onOpenPlayerSetup?.(playerProfile ? "character" : "name")
            }}
            className="secondary-button"
          >
            <UserCheck size={16} />
            <span>{playerProfile ? "ĐỔI ĐỒNG HÀNH (36)" : "TẠO XẠ THỦ"}</span>
          </button>
        </div>

        <div className="quick-note">
          <span className="quick-note-icon">
            <CircleHelp size={15} />
          </span>{" "}
          Quan sát tình huống, kéo ná và chọn bia phù hợp!
        </div>
      </div>

      <div
        className="landing-stage"
        aria-label="Sân chơi hoạt hình với ná và hai mục tiêu"
      >
        <div className="sun-disc" />
        <div className="cloud cloud-one" />
        <div className="cloud cloud-two" />
        <div className="decor-star star-one">+</div>
        <div className="decor-star star-two">+</div>
        <div className="decor-star star-three">+</div>
        <div className="stage-hill hill-back" />
        <div className="stage-hill hill-front" />
        <TargetBoard side="non-ai" compact />
        <TargetBoard side="ai" compact />
        <div className="stage-sling">
          <SlingshotIllustration />
        </div>
        <ManaMascot />
        {companion && (
          <div className="landing-stage-companion" title={`Bạn đồng hành: ${companion.name}`}>
            <div className="landing-stage-companion-avatar">
              <CharacterAvatar character={companion} />
            </div>
            <span>{companion.name}</span>
          </div>
        )}
        <div className="stage-grass grass-left">+</div>
        <div className="stage-grass grass-right">+</div>
        <div className="stage-sign">
          <span>THỬ TÀI</span>
          <b>AI!</b>
        </div>
      </div>

      <div className="landing-footer">
        <span>MANABIE LEARNING ARCADE</span>
        <span>
          01 <i /> 04
        </span>
      </div>
    </main>
  )
}

export function GameSummary({
  score,
  attempts,
  questions = sampleQuestions,
  onReplay,
  onHome,
  elapsed,
  playerProfile,
  onOpenPlayerSetup,
}: GameSummaryProps) {
  const [showReview, setShowReview] = useState(false)
  const [filter, setFilter] = useState<"all" | "correct" | "wrong">("all")

  const totalQuestions = attempts.length > 0 ? attempts.length : questions.length
  const correctCount = attempts.filter((attempt) => attempt.correct).length
  const wrongCount = Math.max(0, totalQuestions - correctCount)
  const accuracy = Math.round((correctCount / Math.max(1, totalQuestions)) * 100)
  const minutes = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0")
  const seconds = (elapsed % 60).toString().padStart(2, "0")
  const companion = playerProfile ? getCharacterById(playerProfile.characterId) : null

  const reviewItems = attempts.map((attempt, index) => {
    const q =
      questions.find((item) => item.id === attempt.questionId) ??
      questions[index] ??
      sampleQuestions[index % sampleQuestions.length]
    return {
      index: index + 1,
      question: q,
      attempt,
    }
  })

  const filteredReview = reviewItems.filter((item) => {
    if (filter === "correct") return item.attempt.correct
    if (filter === "wrong") return !item.attempt.correct
    return true
  })

  return (
    <main className="screen summary-screen" data-state="completed">
      <header className="simple-top">
        <BrandMark />
        <div className="flex items-center gap-3">
          {playerProfile && companion && (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onOpenPlayerSetup?.("confirm")
              }}
              className="player-profile-chip"
            >
              <span className="player-profile-avatar">
                <CharacterAvatar character={companion} />
              </span>
              <span className="player-profile-text">
                <small>{companion.name}</small>
                <b>{playerProfile.playerName}</b>
              </span>
            </button>
          )}
          <div className="top-step">
            KẾT QUẢ <span>04 / 04</span>
          </div>
        </div>
      </header>

      <div className="summary-content">
        <div className="summary-celebration">
          <div className="confetti confetti-a">+</div>
          <div className="confetti confetti-b">+</div>
          <div className="confetti confetti-c">+</div>
          <ManaMascot />
          {companion && (
            <div className="summary-companion-badge" title={companion.name}>
              <div className="summary-companion-avatar">
                <CharacterAvatar character={companion} />
              </div>
              <span>{companion.name}</span>
            </div>
          )}
          <div className="summary-medal">
            <span>+</span>
            <b>
              {accuracy}
              <small>%</small>
            </b>
            <span>CHÍNH XÁC</span>
          </div>
        </div>

        <div className="summary-copy">
          <div className="eyebrow">
            <Sparkles size={14} /> THỬ THÁCH HOÀN THÀNH
          </div>
          <h1>
            XẠ THỦ AI
            <br />
            <span>{playerProfile ? playerProfile.playerName.toUpperCase() : "XUẤT SẮC!"}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="award-label">{getAward(accuracy)}</p>
            {companion && (
              <span className="summary-companion-tag">
                Đồng hành: <b>{companion.name}</b>
              </span>
            )}
          </div>
          <div className="summary-score">
            <span>TỔNG ĐIỂM</span>
            <b>{score.toLocaleString("vi-VN")}</b>
            <span>ĐIỂM</span>
          </div>
        </div>

        <div className="summary-stats">
          <div>
            <span>TỔNG CÂU</span>
            <b>{totalQuestions}</b>
          </div>
          <i />
          <div>
            <span>TRẢ LỜI ĐÚNG</span>
            <b className="good">{correctCount}</b>
          </div>
          <i />
          <div>
            <span>TRẢ LỜI SAI</span>
            <b className="bad">{wrongCount}</b>
          </div>
          <i />
          <div>
            <span>THỜI GIAN</span>
            <b>
              {minutes}:{seconds}
            </b>
          </div>
        </div>

        <article className="learning-note">
          <div className="learning-icon">
            <Sparkles />
          </div>
          <div>
            <span>EM ĐÃ HỌC ĐƯỢC GÌ?</span>
            <p>
              AI không xuất hiện trong mọi thiết bị thông minh. Thiết bị chỉ làm theo lịch hẹn hay quy tắc cố định là tự động hóa thông thường; thiết bị biết học từ dữ liệu, nhận diện khuôn mặt, giọng nói, hình ảnh hay gợi ý theo sở thích mới là Trí tuệ nhân tạo (AI)!
            </p>
          </div>
        </article>

        <div className="summary-actions">
          <PrimaryButton onClick={onReplay}>CHƠI LẠI</PrimaryButton>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              gameAudio.playClick()
              onOpenPlayerSetup?.("character")
            }}
          >
            <UserCheck size={17} /> ĐỔI NHÂN VẬT
          </button>
          {reviewItems.length > 0 && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                gameAudio.playClick()
                setShowReview((prev) => !prev)
              }}
            >
              {showReview ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              {showReview ? "ẨN CHI TIẾT CÂU HỎI" : "XEM CHI TIẾT ĐÁP ÁN"}
            </button>
          )}
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              gameAudio.playClick()
              onHome()
            }}
          >
            <Home size={17} /> VỀ TRANG CHỦ
          </button>
        </div>

        {showReview && reviewItems.length > 0 && (
          <section className="summary-review-section">
            <div className="summary-review-header">
              <div>
                <h3>BẢNG XEM LẠI TÌNH HUỐNG &amp; GIẢI THÍCH SƯ PHẠM</h3>
                <p>Đối chiếu lựa chọn của xạ thủ với đáp án chuẩn của Manabie</p>
              </div>
              <div className="summary-review-filters">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`review-filter-btn ${filter === "all" ? "is-active" : ""}`}
                >
                  Tất cả ({reviewItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("correct")}
                  className={`review-filter-btn is-good ${filter === "correct" ? "is-active" : ""}`}
                >
                  Đúng ({correctCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("wrong")}
                  className={`review-filter-btn is-bad ${filter === "wrong" ? "is-active" : ""}`}
                >
                  Chưa đúng ({wrongCount})
                </button>
              </div>
            </div>

            <div className="summary-review-list">
              {filteredReview.map(({ index, question, attempt }) => (
                <article
                  key={`${question.id}-${index}`}
                  className={`summary-review-card ${attempt.correct ? "is-correct" : "is-wrong"}`}
                >
                  <div className="summary-review-card-top">
                    <span className="review-q-badge">
                      CÂU {String(index).padStart(2, "0")} • {question.category}
                    </span>
                    <span className={`review-result-badge ${attempt.correct ? "is-correct" : "is-wrong"}`}>
                      {attempt.correct ? (
                        <>
                          <CheckCircle2 size={14} /> ĐÚNG (+{GAME_SCORING.CORRECT_ANSWER} ĐIỂM)
                        </>
                      ) : (
                        <>
                          <XCircle size={14} /> SAI (-{GAME_SCORING.WRONG_ANSWER} ĐIỂM)
                        </>
                      )}
                    </span>
                  </div>
                  <h4>“{question.question}”</h4>
                  <div className="summary-review-compare">
                    <div>
                      <span>Bia em bắn:</span>
                      <b className={attempt.correct ? "text-[#15803d]" : "text-[#dc2626]"}>
                        {attempt.answer === "ai" ? "CÓ AI" : "KHÔNG CÓ AI"}
                      </b>
                    </div>
                    <div>
                      <span>Đáp án chuẩn:</span>
                      <b className="text-[#395ad2]">
                        {question.correctAnswer === "ai" ? "CÓ AI" : "KHÔNG CÓ AI"}
                      </b>
                    </div>
                  </div>
                  <p className="summary-review-explanation">{question.explanation}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="screen-footer summary-footer">
        <span>MANABIE LEARNING ARCADE</span>
        <span>HỌC VUI MỖI NGÀY</span>
      </footer>
    </main>
  )
}

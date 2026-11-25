"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Brain, Check, Lightbulb, Sparkles, Star, X } from "lucide-react"
import type { GameQuestion } from "@/lib/game-data"
import { GAME_SCORING, type ShotResult } from "@/lib/game-logic"
import { getCharacterById, type PlayerProfile } from "@/lib/characters"
import { gameAudio } from "@/lib/audio"
import { CharacterAvatar } from "./player-setup-modal"

const manaImage =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mana_dong_noi-WbeIHKkJGa9MxuXTjkmpf24fuJuY05.gif"

export interface FeedbackOverlayProps {
  result: ShotResult
  question: GameQuestion
  onNext?: () => void
  isLastQuestion?: boolean
  playerProfile?: PlayerProfile | null
}

export function FeedbackOverlay({
  result,
  question,
  onNext,
  isLastQuestion = false,
  playerProfile,
}: FeedbackOverlayProps) {
  const reducedMotion = useReducedMotion()
  const isCorrect = result.correct
  const companion = playerProfile ? getCharacterById(playerProfile.characterId) : null

  return (
    <motion.article
      className={`answer-feedback ${isCorrect ? "answer-feedback-correct" : "answer-feedback-wrong"}`}
      data-state={isCorrect ? "correct" : "incorrect"}
      initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.96, x: "-50%" }}
      animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
      transition={{ duration: reducedMotion ? 0 : 0.28, ease: "easeOut" }}
      role="status"
      aria-live="polite"
    >
      <div className="answer-feedback-indicator" aria-hidden="true">
        {isCorrect ? <Check /> : <X />}
      </div>
      <div className={`answer-feedback-mascot ${isCorrect ? "is-happy" : "is-thinking"}`}>
        <img src={manaImage} alt="" />
        <span aria-hidden="true">{isCorrect ? <Sparkles /> : <Lightbulb />}</span>
      </div>
      <div className="answer-feedback-copy">
        <div className="answer-feedback-heading">
          <b>{isCorrect ? "CHÍNH XÁC!" : "CHƯA CHÍNH XÁC!"}</b>
          <strong className={isCorrect ? "points-positive" : "points-negative"}>
            {isCorrect
              ? `+${GAME_SCORING.CORRECT_ANSWER} ĐIỂM`
              : `-${GAME_SCORING.WRONG_ANSWER} ĐIỂM`}
          </strong>
          {companion && (
            <span className="answer-feedback-companion-pill">
              <span className="w-4 h-4 rounded-full overflow-hidden inline-flex bg-white border border-[#86efac]">
                <CharacterAvatar character={companion} />
              </span>
              <span>{companion.name}</span>
            </span>
          )}
        </div>
        {!isCorrect && (
          <p className="answer-feedback-answer">
            Đáp án đúng:{" "}
            <b>{question.correctAnswer === "ai" ? "CÓ AI" : "KHÔNG CÓ AI"}</b>
          </p>
        )}
        <p className="answer-feedback-explanation">{question.explanation}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
          <span className="answer-feedback-mascot-note">
            {isCorrect
              ? `Mana${companion ? ` & ${companion.name}` : ""} chúc mừng ${playerProfile?.playerName || "em"}!`
              : `Mana${companion ? ` & ${companion.name}` : ""} cùng ${playerProfile?.playerName || "em"} ghi nhớ nhé.`}
          </span>
          {onNext && (
            <button
              className="answer-feedback-next"
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onNext()
              }}
              aria-label={isLastQuestion ? "Xem tổng kết kết quả" : "Đi đến câu hỏi tiếp theo"}
            >
              {isLastQuestion ? "XEM KẾT QUẢ" : "CÂU TIẾP THEO"} <ArrowRight />
            </button>
          )}
        </div>
      </div>
      {isCorrect && (
        <div className="answer-feedback-stars" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <motion.span
              key={index}
              className={`answer-feedback-star star-${index + 1}`}
              initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.65 }}
              animate={
                reducedMotion
                  ? { opacity: 1 }
                  : {
                      opacity: [0, 1, 0],
                      y: [8, -18, -42],
                      scale: [0.65, 1, 0.75],
                    }
              }
              transition={{
                duration: reducedMotion ? 0 : 1.05,
                delay: reducedMotion ? 0 : index * 0.07,
              }}
            >
              <Star />
            </motion.span>
          ))}
        </div>
      )}
      {!isCorrect && (
        <span className="answer-feedback-thinking" aria-hidden="true">
          <Brain />
        </span>
      )}
    </motion.article>
  )
}

export { FeedbackOverlay as AnswerFeedback }

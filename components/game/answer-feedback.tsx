"use client"

import { useEffect } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, CheckCircle2, Sparkles, Star, XCircle } from "lucide-react"
import type { GameQuestion } from "@/lib/game-data"
import { GAME_SCORING, type ShotResult } from "@/lib/game-logic"
import {
  getCharacterById,
  PLAYER_CHARACTERS,
  type PlayerProfile,
} from "@/lib/characters"
import { gameAudio } from "@/lib/audio"
import { CharacterAvatar } from "./player-setup-modal"

export interface FeedbackOverlayProps {
  result: ShotResult
  question: GameQuestion
  questionIndex?: number
  totalQuestions?: number
  onNext?: () => void
  isLastQuestion?: boolean
  playerProfile?: PlayerProfile | null
}

export function FeedbackOverlay({
  result,
  question,
  questionIndex = 0,
  totalQuestions = 10,
  onNext,
  isLastQuestion = false,
  playerProfile,
}: FeedbackOverlayProps) {
  const reducedMotion = useReducedMotion()
  const isCorrect = result.correct
  const companion = playerProfile
    ? getCharacterById(playerProfile.characterId)
    : PLAYER_CHARACTERS[0]

  // Keyboard shortcut: Space / Enter / ArrowRight advances to next question
  useEffect(() => {
    if (!onNext) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        e.preventDefault()
        gameAudio.playClick()
        onNext()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onNext])

  return (
    <div
      className="fixed inset-0 z-[75] bg-[#1b3a8a]/45 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
    >
      <motion.article
        className={`answer-feedback-modal relative w-full max-w-xl md:max-w-2xl rounded-2xl sm:rounded-3xl bg-white border-3 sm:border-4 border-[#2563eb] p-3.5 sm:p-5 shadow-[0_8px_0_#133478,0_24px_60px_rgba(27,58,138,0.28)] flex flex-col gap-2.5 sm:gap-3 max-h-[95dvh] overflow-hidden ${
          isCorrect ? "answer-feedback-correct" : "answer-feedback-wrong"
        }`}
        data-state={isCorrect ? "correct" : "incorrect"}
        initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.24, ease: "easeOut" }}
      >
        {/* 3D Status Header Banner (Tug-of-War Pedagogical Popup Style) */}
        <div
          className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-2.5 ${
            isCorrect ? "btn-mana-green" : "btn-mana-red"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {isCorrect ? (
              <CheckCircle2 size={28} className="shrink-0 text-white" />
            ) : (
              <XCircle size={28} className="shrink-0 text-white" />
            )}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <b className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wide text-white">
                  {isCorrect ? "CHÍNH XÁC!" : "CHƯA CHÍNH XÁC!"}
                </b>
                <strong className="px-2.5 py-0.5 rounded-full bg-black/20 text-white text-xs font-black">
                  {isCorrect
                    ? `+${GAME_SCORING.CORRECT_ANSWER} ĐIỂM`
                    : `-${GAME_SCORING.WRONG_ANSWER} ĐIỂM`}
                </strong>
              </div>
              <span className="text-xs text-white/95 font-semibold truncate">
                {isCorrect
                  ? `Xạ thủ ${playerProfile?.playerName || "em"} đã bắn trúng bia chuẩn xác!`
                  : `Bia em bắn là ${result.answer === "ai" ? "CÓ AI" : "KHÔNG CÓ AI"} • Hãy xem giải thích bên dưới nhé!`}
              </span>
            </div>
          </div>

          <img
            src={
              isCorrect
                ? "/assets/tutorial/popup-mascot-action/mana-action-loop.gif"
                : "/assets/mascot/02_giang_giai.png"
            }
            alt="Mana Mascot"
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 bg-white/20 rounded-xl p-1"
          />
        </div>

        {/* Tool & AI Nature Analysis Card */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-[#f4f8ff] border-2 border-[#bfdbfe] flex items-center gap-3">
          {question.image && (
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-white p-1 shrink-0 flex items-center justify-center border-2 border-[#93c5fd] shadow-xs">
              <img
                src={question.image}
                alt={question.toolName || question.category}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="mana-keep-white text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#1b3a8a] text-white font-black">
                CÂU {questionIndex + 1}/{totalQuestions}
              </span>
              <span className="text-xs sm:text-sm font-black text-[#1b3a8a] truncate">
                {question.toolName || question.category}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-slate-600 font-bold">Đáp án chuẩn:</span>
              <span
                className={`mana-keep-white font-black px-2.5 py-0.5 rounded-full text-xs border border-white shadow-2xs ${
                  question.correctAnswer === "ai"
                    ? "bg-[#2563eb] text-white"
                    : "bg-[#16a34a] text-white"
                }`}
              >
                {question.correctAnswer === "ai"
                  ? "👉 CÓ SỬ DỤNG AI"
                  : "👈 KHÔNG CÓ AI"}
              </span>
            </div>
          </div>
        </div>

        {/* Core Pedagogical Insight Box with Companion Character */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-[#ebf9f1] border-2 border-[#16a34a] shadow-xs flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[#15803d] text-xs font-black uppercase tracking-wider">
            <div className="w-7 h-7 rounded-lg bg-white border border-[#16a34a] p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
              <CharacterAvatar character={companion} />
            </div>
            <span className="font-black text-[#1b3a8a] text-xs sm:text-sm">
              GIẢI NGHĨA SƯ PHẠM
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white text-[#15803d] border border-[#86efac] font-extrabold ml-auto flex items-center gap-1">
              <Sparkles size={11} />
              <span>{companion.name}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm md:text-[15px] font-bold text-[#1b3a8a] leading-relaxed m-0">
            {question.explanation}
          </p>
        </div>

        {/* Celebration Stars on Correct Hit */}
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

        {/* Next Question 3D Orange Button */}
        {onNext && (
          <button
            type="button"
            autoFocus
            onClick={() => {
              gameAudio.playClick()
              onNext()
            }}
            className="btn-mana-orange w-full py-2.5 sm:py-3.5 px-5 rounded-full text-xs sm:text-sm md:text-base font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer mt-0.5"
            aria-label={
              isLastQuestion
                ? "Xem tổng kết kết quả"
                : "Đi đến câu hỏi tiếp theo"
            }
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>
              {isLastQuestion
                ? "HOÀN THÀNH • XEM TỔNG KẾT TRẬN ĐẤU"
                : "CÂU TIẾP THEO (PHÍM SPACE / ENTER)"}
            </span>
            <ArrowRight size={18} />
          </button>
        )}
      </motion.article>
    </div>
  )
}

export { FeedbackOverlay as AnswerFeedback }

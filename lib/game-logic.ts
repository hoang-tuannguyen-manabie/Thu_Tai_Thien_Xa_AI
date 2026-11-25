import type { GameQuestion, TargetKind } from "./game-data"

/**
 * Centralized Scoring Configuration (Part 9)
 * Used across both automated tutorial and main gameplay.
 */
export const GAME_SCORING = {
  CORRECT_ANSWER: 100,
  WRONG_ANSWER: 50,
  MIN_SCORE: 0,
} as const

export type GameplayPhase =
  | "READY"
  | "QUESTION_ACTIVE"
  | "AIMING"
  | "PROJECTILE_FLYING"
  | "COLLISION"
  | "FEEDBACK"
  | "NEXT_QUESTION"
  | "GAME_COMPLETE"

export interface ShotResult {
  questionId?: number
  correct: boolean
  answer: TargetKind
  pointsDelta: number
}

export function applyScoreDelta(currentScore: number, correct: boolean): number {
  const delta = correct ? GAME_SCORING.CORRECT_ANSWER : -GAME_SCORING.WRONG_ANSWER
  return Math.max(GAME_SCORING.MIN_SCORE, currentScore + delta)
}

export function shuffleQuestions(questions: GameQuestion[]) {
  const shuffled = [...questions]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }
  return shuffled
}

export function resolveShot(question: GameQuestion, answer: TargetKind): ShotResult {
  const correct = answer === question.correctAnswer
  return {
    questionId: question.id,
    answer,
    correct,
    pointsDelta: correct ? GAME_SCORING.CORRECT_ANSWER : -GAME_SCORING.WRONG_ANSWER,
  }
}

/**
 * Calculates total score from shot results.
 * - Correct answer: +100
 * - Wrong answer: -50
 * - Minimum score: 0
 * - Each question (when questionId is provided) can only score once.
 */
export function calculateScore(results: ShotResult[]): number {
  const seenQuestions = new Set<number>()
  let score = 0

  for (const result of results) {
    if (result.questionId !== undefined) {
      if (seenQuestions.has(result.questionId)) continue
      seenQuestions.add(result.questionId)
    }
    score = applyScoreDelta(score, result.correct)
  }

  return score
}

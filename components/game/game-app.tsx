"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { sampleQuestions, type GameQuestion, type TargetKind } from "@/lib/game-data"
import {
  calculateScore,
  resolveShot,
  shuffleQuestions,
  type GameplayPhase,
  type ShotResult,
} from "@/lib/game-logic"
import {
  loadSavedPlayerProfile,
  savePlayerProfile,
  type PlayerProfile,
} from "@/lib/characters"
import { gameAudio } from "@/lib/audio"
import { GameArena } from "./game-arena"
import { GameLayout } from "./game-layout"
import { GameInstructions } from "./game-instructions"
import { GameLanding, GameSummary } from "./game-screens"
import { PlayerSetupModal, type SetupStep } from "./player-setup-modal"
import type { GameVisualState } from "./game-types"

type Screen = "home" | "instructions" | "game" | "summary"
type Attempt = ShotResult

export default function GameApp() {
  const [screen, setScreen] = useState<Screen>("home")
  const [questions, setQuestions] = useState<GameQuestion[]>(sampleQuestions)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [feedback, setFeedback] = useState<Attempt | null>(null)
  const [paused, setPaused] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [gameplayPhase, setGameplayPhase] = useState<GameplayPhase>("READY")
  const [interactionState, setInteractionState] = useState<
    "idle" | "dragging" | "aiming" | "shooting" | "collision"
  >("idle")

  // Player Profile & 36 Companion Characters state
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null)
  const [playerSetupOpen, setPlayerSetupOpen] = useState(false)
  const [playerSetupStep, setPlayerSetupStep] = useState<SetupStep>("name")

  // Guard to guarantee each question is processed and scored at most once per round
  const scoredQuestionIdsRef = useRef<Set<number>>(new Set())
  const advancingRef = useRef(false)

  useEffect(() => {
    const saved = loadSavedPlayerProfile()
    if (saved) {
      setPlayerProfile(saved)
      setPlayerSetupStep("confirm")
    } else {
      setPlayerSetupStep("name")
      setPlayerSetupOpen(true)
    }
  }, [])

  const openPlayerSetup = useCallback(
    (step?: SetupStep) => {
      setPlayerSetupStep(step ?? (playerProfile ? "confirm" : "name"))
      setPlayerSetupOpen(true)
    },
    [playerProfile]
  )

  const score = calculateScore(attempts)
  const correctCount = attempts.filter((attempt) => attempt.correct).length

  const nextQuestion = useCallback(() => {
    if (advancingRef.current) return
    advancingRef.current = true
    setGameplayPhase("NEXT_QUESTION")
    setFeedback(null)
    setInteractionState("idle")

    if (questionIndex >= questions.length - 1) {
      setGameplayPhase("GAME_COMPLETE")
      setScreen("summary")
      if (soundOn) gameAudio.playSummaryFanfare()
      advancingRef.current = false
    } else {
      setQuestionIndex((current) => current + 1)
      setGameplayPhase("QUESTION_ACTIVE")
      advancingRef.current = false
    }
  }, [questionIndex, questions.length, soundOn])

  useEffect(() => {
    if (screen !== "game" || paused) return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [screen, paused])

  useEffect(() => {
    if (!feedback || paused) return
    const timer = window.setTimeout(nextQuestion, 4000)
    return () => window.clearTimeout(timer)
  }, [feedback, paused, nextQuestion])

  const beginGame = useCallback(() => {
    scoredQuestionIdsRef.current.clear()
    advancingRef.current = false
    setQuestions(shuffleQuestions(sampleQuestions))
    setQuestionIndex(0)
    setAttempts([])
    setFeedback(null)
    setElapsed(0)
    setPaused(false)
    setInteractionState("idle")
    setGameplayPhase("QUESTION_ACTIVE")
    setScreen("game")
  }, [])

  const onShot = useCallback(
    (answer: TargetKind) => {
      const currentQuestion = questions[questionIndex]
      if (!currentQuestion || feedback || paused || advancingRef.current) return
      if (scoredQuestionIdsRef.current.has(currentQuestion.id)) return

      scoredQuestionIdsRef.current.add(currentQuestion.id)
      const attempt = resolveShot(currentQuestion, answer)

      setAttempts((current) => {
        const updated = [...current, attempt]
        if (soundOn) {
          if (attempt.correct) {
            const sinceMiss = updated
              .slice()
              .reverse()
              .findIndex((a) => !a.correct)
            const combo = sinceMiss === -1 ? updated.length : sinceMiss
            gameAudio.playCorrectHit(combo)
          } else {
            gameAudio.playWrongHit()
          }
        }
        return updated
      })

      setFeedback(attempt)
      setGameplayPhase("FEEDBACK")
    },
    [feedback, paused, questionIndex, questions, soundOn]
  )

  const handleInteractionStateChange = useCallback(
    (state: "idle" | "dragging" | "aiming" | "shooting" | "collision") => {
      setInteractionState(state)
      if (feedback) {
        setGameplayPhase("FEEDBACK")
        return
      }
      if (state === "aiming" || state === "dragging") {
        setGameplayPhase("AIMING")
      } else if (state === "shooting") {
        setGameplayPhase("PROJECTILE_FLYING")
      } else if (state === "collision") {
        setGameplayPhase("COLLISION")
      } else {
        setGameplayPhase("QUESTION_ACTIVE")
      }
    },
    [feedback]
  )

  const handleToggleSound = useCallback(() => {
    setSoundOn((current) => {
      const next = !current
      gameAudio.setMuted(!next)
      if (next) gameAudio.playClick()
      return next
    })
  }, [])

  const visualState: GameVisualState = paused
    ? "paused"
    : feedback
    ? feedback.correct
      ? "correct"
      : "incorrect"
    : interactionState === "shooting" || interactionState === "collision"
    ? "shooting"
    : interactionState === "aiming"
    ? "aiming"
    : interactionState === "dragging"
    ? "dragging"
    : "idle"

  return (
    <GameLayout>
      {screen === "home" && (
        <GameLanding
          onStart={() => {
            if (!playerProfile) {
              openPlayerSetup("name")
              return
            }
            setGameplayPhase("READY")
            setScreen("instructions")
          }}
          playerProfile={playerProfile}
          onOpenPlayerSetup={openPlayerSetup}
        />
      )}

      {screen === "instructions" && (
        <GameInstructions
          onBack={() => {
            setGameplayPhase("READY")
            setScreen("home")
          }}
          onPlay={beginGame}
          playerProfile={playerProfile}
          onOpenPlayerSetup={() => openPlayerSetup("confirm")}
          soundOn={soundOn}
        />
      )}

      {screen === "game" && (
        <GameArena
          questions={questions}
          questionIndex={questionIndex}
          score={score}
          attempts={attempts}
          correctCount={correctCount}
          paused={paused}
          onPause={() => setPaused((value) => !value)}
          onShot={onShot}
          onNext={nextQuestion}
          feedback={feedback}
          soundOn={soundOn}
          onSound={handleToggleSound}
          visualState={visualState}
          gameplayPhase={gameplayPhase}
          onInteractionStateChange={handleInteractionStateChange}
          playerProfile={playerProfile}
          onOpenPlayerSetup={() => openPlayerSetup("confirm")}
        />
      )}

      {screen === "summary" && (
        <GameSummary
          score={score}
          attempts={attempts}
          questions={questions}
          onReplay={beginGame}
          onHome={() => {
            setGameplayPhase("READY")
            setScreen("home")
          }}
          elapsed={elapsed}
          playerProfile={playerProfile}
          onOpenPlayerSetup={openPlayerSetup}
        />
      )}

      <PlayerSetupModal
        open={playerSetupOpen}
        initialProfile={playerProfile}
        initialStep={playerSetupStep}
        onConfirm={(profile) => {
          setPlayerProfile(profile)
          savePlayerProfile(profile)
          setPlayerSetupOpen(false)
        }}
        onClose={playerProfile ? () => setPlayerSetupOpen(false) : undefined}
      />
    </GameLayout>
  )
}

"use client"

import type { PlayerProfile } from "@/lib/characters"
import { AutoTutorialDemo } from "./auto-tutorial-demo"

export interface GameInstructionsProps {
  onPlay: () => void
  onBack: () => void
  playerProfile?: PlayerProfile | null
  onOpenPlayerSetup?: () => void
  soundOn?: boolean
}

export function GameInstructions({
  onPlay,
  onBack,
  playerProfile,
  onOpenPlayerSetup,
  soundOn = true,
}: GameInstructionsProps) {
  return (
    <AutoTutorialDemo
      onPlay={onPlay}
      onBack={onBack}
      playerProfile={playerProfile}
      onOpenPlayerSetup={onOpenPlayerSetup}
      soundOn={soundOn}
    />
  )
}

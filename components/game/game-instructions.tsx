"use client"

import type { PlayerProfile } from "@/lib/characters"
import { AutoTutorialDemo } from "./auto-tutorial-demo"
import type { ControlMode } from "./slingshot-game"

export interface GameInstructionsProps {
  onPlay: () => void
  onBack: () => void
  playerProfile?: PlayerProfile | null
  onOpenPlayerSetup?: () => void
  soundOn?: boolean
  controlMode?: ControlMode
  onControlModeChange?: (mode: ControlMode) => void
}

export function GameInstructions({
  onPlay,
  onBack,
  playerProfile,
  onOpenPlayerSetup,
  soundOn = true,
  controlMode = "mouse",
  onControlModeChange,
}: GameInstructionsProps) {
  return (
    <AutoTutorialDemo
      onPlay={onPlay}
      onBack={onBack}
      playerProfile={playerProfile}
      onOpenPlayerSetup={onOpenPlayerSetup}
      soundOn={soundOn}
      controlMode={controlMode}
      onControlModeChange={onControlModeChange}
    />
  )
}

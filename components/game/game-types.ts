import type { ReactNode } from "react"

export type GameVisualState =
  | "idle"
  | "dragging"
  | "aiming"
  | "shooting"
  | "correct"
  | "incorrect"
  | "paused"
  | "completed"

export interface GameLayoutProps {
  children: ReactNode
}

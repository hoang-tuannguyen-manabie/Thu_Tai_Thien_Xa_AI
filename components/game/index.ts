export { default as GameApp } from "./game-app"
export { GameArena } from "./game-arena"
export { GameHeader, QuestionCard, ScorePanel } from "./game-hud"
export { GameInstructions } from "./game-instructions"
export { GameLanding, GameSummary } from "./game-screens"
export { GameLayout } from "./game-layout"
export { BrandMark, ManaMascot, PrimaryButton } from "./game-brand"
export { SlingshotIllustration, TargetBoard } from "./target-board"
export { FeedbackOverlay } from "./answer-feedback"
export { SlingshotVisual } from "./slingshot-game"
export { CharacterAvatar, PlayerSetupModal } from "./player-setup-modal"
export { ARHandController } from "./ar-hand-controller"
export type { GameQuestion } from "@/lib/game-data"
export type { GameplayPhase, ShotResult } from "@/lib/game-logic"
export { GAME_SCORING } from "@/lib/game-logic"
export type { PlayerCharacter, PlayerProfile } from "@/lib/characters"
export type { GameVisualState } from "./game-types"
export type { FeedbackOverlayProps } from "./answer-feedback"
export type { GameArenaProps } from "./game-arena"
export type { GameHeaderProps, QuestionCardProps, ScorePanelProps } from "./game-hud"
export type { GameLandingProps, GameSummaryProps } from "./game-screens"
export type { ControlMode, SlingshotGameProps } from "./slingshot-game"
export type { PlayerSetupModalProps, SetupStep } from "./player-setup-modal"
export type { ARHandControllerProps, ARHandFrame } from "./ar-hand-controller"
export {
  calculateLaunchVelocity,
  clampPullPoint,
  createPhysicsConfig,
  dragDistance,
  findTargetCollision,
  integrateProjectile,
  isOutsideArena,
  normalizedPower,
  powerLevel,
  predictTrajectory,
  projectileAngle,
  projectileAngleDegrees,
} from "./slingshot-physics"
export type {
  CollisionResult,
  PhysicsConfig,
  Point,
  TargetHitbox,
  TargetHitboxes,
  TrajectoryPrediction,
} from "./slingshot-physics"

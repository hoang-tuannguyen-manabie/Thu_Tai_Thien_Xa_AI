/**
 * Hand Sprite Sheet Configuration & State-to-Frame Mapping
 * Based on the 4x4 (500x500, 125x125 per frame) cartoon hand sprite sheet
 * stored in /assets/hands/hand-spritesheet.png and /assets/hands/hand-frame-01..16.png
 */

export type HandGesturePhase =
  | "idle-palm"       // Frame 16: Front open palm (ready to connect)
  | "reaching"        // Frame 01: Side open hand reaching toward slingshot pouch
  | "closing-1"       // Frame 02: Fingers starting to curl
  | "closing-2"       // Frame 03: Fingers half-curled claw
  | "closing-3"       // Frame 04: Almost closed grab
  | "grabbed"         // Frame 05: Closed fist holding projectile at anchor
  | "pulling-light"   // Frame 06: Closed fist pulling back (light tension)
  | "pulling-medium"  // Frame 07: Closed fist pulling harder (medium tension)
  | "pulling-ready"   // Frame 08: Thumb tensing for release
  | "pulling-heavy"   // Frame 09: Max tension fist pull
  | "pulling-max"     // Frame 10: Peak tension fist pull
  | "release-burst"   // Frame 11: Wide open 5-finger splayed release!
  | "release-follow1" // Frame 12: Post-release open hand 1
  | "release-follow2" // Frame 13: Post-release open hand 2
  | "release-follow3" // Frame 14: Post-release open hand 3
  | "release-relax"   // Frame 15: Relaxed open hand

export interface HandSpriteFrameInfo {
  frameNumber: number // 1..16
  phase: HandGesturePhase
  src: string
  row: number // 0..3
  col: number // 0..3
  labelVi: string
}

export const HAND_SPRITE_SHEET_URL = "/assets/hands/hand-spritesheet.png"

const PHASE_BY_INDEX: Array<{ phase: HandGesturePhase; labelVi: string }> = [
  { phase: "reaching", labelVi: "Đưa tay chạm ổ ná" },
  { phase: "closing-1", labelVi: "Khép ngón tay (1/3)" },
  { phase: "closing-2", labelVi: "Khép ngón tay (2/3)" },
  { phase: "closing-3", labelVi: "Chuẩn bị nắm đạn" },
  { phase: "grabbed", labelVi: "Đã nắm chặt viên đạn" },
  { phase: "pulling-light", labelVi: "Kéo dây ná (Lực nhẹ)" },
  { phase: "pulling-medium", labelVi: "Kéo dây ná (Lực vừa)" },
  { phase: "pulling-ready", labelVi: "Ngắm mục tiêu" },
  { phase: "pulling-heavy", labelVi: "Kéo căng dây ná" },
  { phase: "pulling-max", labelVi: "Kéo căng tối đa (100%)" },
  { phase: "release-burst", labelVi: "Bung xòe tay bắn đạn!" },
  { phase: "release-follow1", labelVi: "Thả đạn hoàn tất" },
  { phase: "release-follow2", labelVi: "Thu tay sau khi bắn" },
  { phase: "release-follow3", labelVi: "Thả lỏng bàn tay" },
  { phase: "release-relax", labelVi: "Sẵn sàng lượt mới" },
  { phase: "idle-palm", labelVi: "Xòe bàn tay kết nối AR" },
]

export const HAND_SPRITE_FRAMES: HandSpriteFrameInfo[] = PHASE_BY_INDEX.map(
  (item, idx) => {
    const frameNumber = idx + 1
    const numStr = String(frameNumber).padStart(2, "0")
    return {
      frameNumber,
      phase: item.phase,
      src: `/assets/hands/hand-frame-${numStr}.png`,
      row: Math.floor(idx / 4),
      col: idx % 4,
      labelVi: item.labelVi,
    }
  }
)

export function getHandFrame(frameNumber: number): HandSpriteFrameInfo {
  const clamped = Math.max(1, Math.min(16, Math.round(frameNumber)))
  return HAND_SPRITE_FRAMES[clamped - 1]
}

/**
 * Selects the exact sprite frame (1..16) from the live AR/Pointer hand state:
 * - When releasing (`releaseStep` 1..4): frames 11 -> 12 -> 13 -> 14
 * - When grabbing & pulling: frames 5 -> 6 -> 7 -> 9 -> 10 based on pull `power` (0..1)
 * - When open hand approaching/closing: frames 16 -> 1 -> 2 -> 3 -> 4 based on `grabStrength` (0..1) and `isNearPouch`
 */
export function resolveHandSpriteFrame(options: {
  hasHand: boolean
  isGrabbing: boolean
  grabStrength: number
  pullPower: number
  isNearPouch: boolean
  releaseFrameOffset?: number | null // 0..4 right after release
}): HandSpriteFrameInfo {
  const {
    hasHand,
    isGrabbing,
    grabStrength,
    pullPower,
    isNearPouch,
    releaseFrameOffset,
  } = options

  // 1. Just released the slingshot -> show wide open splayed hand sequence (frames 11..14)
  if (
    releaseFrameOffset !== undefined &&
    releaseFrameOffset !== null &&
    releaseFrameOffset >= 0
  ) {
    const releaseFrames = [11, 12, 13, 14]
    const f = releaseFrames[Math.min(releaseFrames.length - 1, releaseFrameOffset)]
    return getHandFrame(f)
  }

  // 2. No hand detected yet -> show front open palm (frame 16)
  if (!hasHand) {
    return getHandFrame(16)
  }

  // 3. Hand is grabbing/pulling the slingshot -> frames 5..10 based on pull power
  if (isGrabbing) {
    if (pullPower < 0.12) return getHandFrame(5) // Closed fist at anchor
    if (pullPower < 0.38) return getHandFrame(6) // Light pull
    if (pullPower < 0.62) return getHandFrame(7) // Medium pull
    if (pullPower < 0.84) return getHandFrame(9) // Heavy pull
    return getHandFrame(10) // Max power pull
  }

  // 4. Hand is open/approaching -> transition through frames 16 -> 1 -> 2 -> 3 -> 4
  if (!isNearPouch && grabStrength < 0.18) {
    return getHandFrame(16)
  }
  if (grabStrength < 0.25) return getHandFrame(1)
  if (grabStrength < 0.45) return getHandFrame(2)
  if (grabStrength < 0.65) return getHandFrame(3)
  return getHandFrame(4)
}

/**
 * 4 Key Pedagogical Tutorial Steps using the Hand Sprite Sheet
 */
export const HAND_TUTORIAL_STEPS = [
  {
    step: "01",
    title: "ĐƯA TAY KẾT NỐI",
    subtitle: "Xòe bàn tay vào khung tâm ná",
    frames: [16, 1],
    primaryFrame: 16,
    color: "#16a34a",
    bg: "#ebf9f1",
  },
  {
    step: "02",
    title: "NẮM BẮT VIÊN ĐẠN",
    subtitle: "Khép ngón tay nắm chặt ổ ná",
    frames: [2, 3, 4, 5],
    primaryFrame: 5,
    color: "#2563eb",
    bg: "#eaf2ff",
  },
  {
    step: "03",
    title: "KÉO CĂNG & NGẮM",
    subtitle: "Giữ nắm tay & kéo ngược hướng bia",
    frames: [6, 7, 9, 10],
    primaryFrame: 9,
    color: "#f47920",
    bg: "#fff7ed",
  },
  {
    step: "04",
    title: "BUNG TAY BẮN ĐẠN!",
    subtitle: "Xòe bung 5 ngón tay để phóng đạn",
    frames: [11, 12, 13],
    primaryFrame: 11,
    color: "#dc2626",
    bg: "#fef2f2",
  },
] as const

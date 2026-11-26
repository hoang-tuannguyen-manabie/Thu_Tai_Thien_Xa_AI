"use client"

import { useEffect, useRef, useState } from "react"
import {
  Camera,
  CameraOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { getHandFrame, resolveHandSpriteFrame } from "@/lib/hand-sprites"

export interface ARHandFrame {
  /** Normalized mirrored X coordinate in [0, 1] (0 = left, 1 = right) */
  x: number
  /** Normalized Y coordinate in [0, 1] (0 = top, 1 = bottom) */
  y: number
  /** Whether the user is currently pinching (thumb+index) or grabbing (fist) */
  isGrabbing: boolean
  /** Normalized pinch/curl closeness in [0, 1] (1 = tight fist/pinch, 0 = wide open palm) */
  grabStrength: number
  /** Whether a hand is currently visible in the camera frame */
  hasHand: boolean
}

export interface ARHandControllerProps {
  enabled: boolean
  disabled?: boolean
  onHandFrame: (frame: ARHandFrame) => void
  onFallbackToMouse?: () => void
}

interface Landmark {
  x: number
  y: number
  z?: number
}

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17],            // Palm knuckles
]

function dist2d(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Evaluates whether the detected hand is pinching (thumb tip + index tip close together)
 * or grabbing (fingers curled into palm), returning continuous grabStrength (0..1)
 * to drive the 16-frame hand sprite animation smoothly.
 */
function evaluateHandGrab(
  lm: Landmark[],
  currentlyGrabbing: boolean
): {
  isGrabbing: boolean
  grabStrength: number
  controlPoint: { x: number; y: number }
} {
  const wrist = lm[0]
  const thumbTip = lm[4]
  const indexMcp = lm[5]
  const indexPip = lm[6]
  const indexTip = lm[8]
  const middleMcp = lm[9]
  const middlePip = lm[10]
  const middleTip = lm[12]
  const ringMcp = lm[13]
  const ringPip = lm[14]
  const ringTip = lm[16]
  const pinkyMcp = lm[17]
  const pinkyPip = lm[18]
  const pinkyTip = lm[20]

  const palmScale = Math.max(
    0.07,
    (dist2d(wrist, middleMcp) + dist2d(indexMcp, pinkyMcp)) * 0.55
  )

  // 1. Pinch distance between thumb tip and index tip
  const pinchDist = dist2d(thumbTip, indexTip)
  const pinchRatio = pinchDist / palmScale
  const pinchStrength = Math.max(0, Math.min(1, 1 - (pinchRatio - 0.25) / 0.65))

  // 2. Finger curl ratio across index, middle, ring, pinky (for fist grab style)
  const fingers = [
    { tip: indexTip, pip: indexPip, mcp: indexMcp },
    { tip: middleTip, pip: middlePip, mcp: middleMcp },
    { tip: ringTip, pip: ringPip, mcp: ringMcp },
    { tip: pinkyTip, pip: pinkyPip, mcp: pinkyMcp },
  ]
  let curledCount = 0
  let curlStrengthSum = 0
  for (const f of fingers) {
    const tipToWrist = dist2d(f.tip, wrist)
    const pipToWrist = dist2d(f.pip, wrist)
    const ratio = tipToWrist / Math.max(0.01, pipToWrist)
    const fingerCurl = Math.max(0, Math.min(1, (1.28 - ratio) / 0.42))
    curlStrengthSum += fingerCurl
    if (tipToWrist < pipToWrist * 1.05) {
      curledCount += 1
    }
  }
  const avgCurlStrength = curlStrengthSum / 4

  // Hysteresis thresholds so grabbing doesn't drop accidentally while pulling
  const pinchThreshold = currentlyGrabbing ? 0.72 : 0.52
  const isPinching = pinchRatio <= pinchThreshold
  const isFist = currentlyGrabbing ? curledCount >= 2 : curledCount >= 3

  const isGrabbing = isPinching || isFist
  const grabStrength = Math.max(pinchStrength, avgCurlStrength)

  // Mirrored control point (palm/pinch center)
  const rawX = 1 - (thumbTip.x * 0.4 + indexTip.x * 0.4 + middleMcp.x * 0.2)
  const rawY = thumbTip.y * 0.4 + indexTip.y * 0.4 + middleMcp.y * 0.2

  return {
    isGrabbing,
    grabStrength,
    controlPoint: { x: rawX, y: rawY },
  }
}

export function ARHandController({
  enabled,
  disabled = false,
  onHandFrame,
  onFallbackToMouse,
}: ARHandControllerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onHandFrameRef = useRef(onHandFrame)
  onHandFrameRef.current = onHandFrame
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string>("")
  // Default to "full-stage" so the player sees their real hand & body across the whole shooting arena!
  const [fullStageCamera, setFullStageCamera] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [activeSpriteFrame, setActiveSpriteFrame] = useState<number>(16)
  const [isGrabbingUI, setIsGrabbingUI] = useState(false)
  const [hasHandUI, setHasHandUI] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let active = true
    let rafId = 0
    let stream: MediaStream | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handLandmarker: any = null

    let smoothX = 0.5
    let smoothY = 0.65
    let hasInitializedPos = false
    let grabbingState = false
    let grabConfirmFrames = 0
    let releaseConfirmFrames = 0
    let releaseAnimFramesLeft = 0
    let lastInferenceTime = 0
    let lastLandmarks: Landmark[] | null = null
    let lastUiFrameNum = 16
    let lastHasHand = false

    setStatus("loading")
    setErrorMessage("")

    const initAR = async () => {
      try {
        const dynamicImport = new Function("url", "return import(url)") as (
          url: string
        ) => Promise<{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          FilesetResolver: any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          HandLandmarker: any
        }>

        let visionModule
        try {
          visionModule = await dynamicImport("/vendor/vision_bundle.mjs")
        } catch {
          visionModule = await dynamicImport(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"
          )
        }

        if (!active) return

        const { FilesetResolver, HandLandmarker } = visionModule
        let visionWasm
        try {
          visionWasm = await FilesetResolver.forVisionTasks("/vendor/wasm")
        } catch {
          visionWasm = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
          )
        }

        if (!active) return

        try {
          handLandmarker = await HandLandmarker.createFromOptions(visionWasm, {
            baseOptions: {
              modelAssetPath: "/vendor/hand_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          })
        } catch {
          handLandmarker = await HandLandmarker.createFromOptions(visionWasm, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
          })
        }

        if (!active) return

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 960 },
            height: { ideal: 360, max: 540 },
            facingMode: "user",
            frameRate: { ideal: 30, max: 30 },
          },
          audio: false,
        })

        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setStatus("ready")
        }
      } catch (err) {
        console.error("AR Hand Controller initialization error:", err)
        if (!active) return
        setStatus("error")
        setErrorMessage(
          "Không thể mở Camera. Vui lòng cấp quyền Camera trên trình duyệt hoặc chuyển sang chế độ Chuột."
        )
        return
      }

      const loop = (now: number) => {
        if (!active) return
        const video = videoRef.current
        const canvas = canvasRef.current

        if (video && canvas && video.readyState >= 2 && handLandmarker) {
          if (
            canvas.width !== video.videoWidth ||
            canvas.height !== video.videoHeight
          ) {
            canvas.width = video.videoWidth || 640
            canvas.height = video.videoHeight || 360
          }

          if (now - lastInferenceTime >= 30) {
            lastInferenceTime = now
            try {
              const res = handLandmarker.detectForVideo(video, now)
              if (res?.landmarks && res.landmarks.length > 0) {
                lastLandmarks = res.landmarks[0] as Landmark[]
              } else {
                lastLandmarks = null
              }
            } catch {
              // ignore single-frame detection errors
            }
          }

          const ctx = canvas.getContext("2d")
          if (ctx) {
            const w = canvas.width
            const h = canvas.height
            ctx.clearRect(0, 0, w, h)

            if (lastLandmarks && !disabledRef.current) {
              if (!lastHasHand) {
                lastHasHand = true
                setHasHandUI(true)
              }

              const evalRes = evaluateHandGrab(lastLandmarks, grabbingState)

              if (evalRes.isGrabbing) {
                grabConfirmFrames += 1
                releaseConfirmFrames = 0
                releaseAnimFramesLeft = 0
                if (!grabbingState && grabConfirmFrames >= 2) {
                  grabbingState = true
                  setIsGrabbingUI(true)
                }
              } else {
                releaseConfirmFrames += 1
                grabConfirmFrames = 0
                if (grabbingState && releaseConfirmFrames >= 2) {
                  grabbingState = false
                  releaseAnimFramesLeft = 18 // Show splayed release hand frames (11..14)
                  setIsGrabbingUI(false)
                }
              }

              if (releaseAnimFramesLeft > 0) {
                releaseAnimFramesLeft -= 1
              }

              if (!hasInitializedPos) {
                smoothX = evalRes.controlPoint.x
                smoothY = evalRes.controlPoint.y
                hasInitializedPos = true
              } else {
                smoothX += (evalRes.controlPoint.x - smoothX) * 0.44
                smoothY += (evalRes.controlPoint.y - smoothY) * 0.44
              }

              // Compute current sprite frame (1..16) for HUD status indicator
              const pullDistApprox = Math.min(
                1,
                Math.hypot(smoothX - 0.5, smoothY - 0.52) / 0.25
              )
              const releaseOffset =
                releaseAnimFramesLeft > 0
                  ? Math.min(3, Math.floor((18 - releaseAnimFramesLeft) / 4))
                  : null
              const spriteInfo = resolveHandSpriteFrame({
                hasHand: true,
                isGrabbing: grabbingState,
                grabStrength: evalRes.grabStrength,
                pullPower: pullDistApprox,
                isNearPouch: pullDistApprox < 0.35,
                releaseFrameOffset: releaseOffset,
              })
              if (spriteInfo.frameNumber !== lastUiFrameNum) {
                lastUiFrameNum = spriteInfo.frameNumber
                setActiveSpriteFrame(spriteInfo.frameNumber)
              }

              // Draw mirrored 21-point hand skeleton directly over the player's real hand on video!
              ctx.save()
              ctx.lineCap = "round"
              ctx.lineJoin = "round"

              // Outer dark outline for cartoon contrast on live video
              ctx.lineWidth = 6
              ctx.strokeStyle = "rgba(15, 23, 42, 0.72)"
              for (const [i1, i2] of HAND_CONNECTIONS) {
                const p1 = lastLandmarks[i1]
                const p2 = lastLandmarks[i2]
                ctx.beginPath()
                ctx.moveTo((1 - p1.x) * w, p1.y * h)
                ctx.lineTo((1 - p2.x) * w, p2.y * h)
                ctx.stroke()
              }

              // Inner vibrant skeleton line
              ctx.lineWidth = 3.2
              ctx.strokeStyle = grabbingState ? "#ff9b42" : "#22c55e"
              for (const [i1, i2] of HAND_CONNECTIONS) {
                const p1 = lastLandmarks[i1]
                const p2 = lastLandmarks[i2]
                ctx.beginPath()
                ctx.moveTo((1 - p1.x) * w, p1.y * h)
                ctx.lineTo((1 - p2.x) * w, p2.y * h)
                ctx.stroke()
              }

              // Draw 21 landmark joints
              for (let idx = 0; idx < lastLandmarks.length; idx += 1) {
                const pt = lastLandmarks[idx]
                const isTip = idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20
                ctx.fillStyle = isTip
                  ? grabbingState
                    ? "#ff9b42"
                    : "#ffffff"
                  : "#2563eb"
                ctx.strokeStyle = "#0f172a"
                ctx.lineWidth = 1.8
                ctx.beginPath()
                ctx.arc((1 - pt.x) * w, pt.y * h, isTip ? 6 : 4, 0, Math.PI * 2)
                ctx.fill()
                ctx.stroke()
              }
              ctx.restore()

              onHandFrameRef.current({
                x: smoothX,
                y: smoothY,
                isGrabbing: grabbingState,
                grabStrength: evalRes.grabStrength,
                hasHand: true,
              })
            } else {
              if (lastHasHand) {
                lastHasHand = false
                setHasHandUI(false)
              }
              if (grabbingState) {
                grabbingState = false
                setIsGrabbingUI(false)
              }
              if (lastUiFrameNum !== 16) {
                lastUiFrameNum = 16
                setActiveSpriteFrame(16)
              }
              onHandFrameRef.current({
                x: smoothX,
                y: smoothY,
                isGrabbing: false,
                grabStrength: 0,
                hasHand: false,
              })
            }
          }
        }

        rafId = requestAnimationFrame(loop)
      }

      rafId = requestAnimationFrame(loop)
    }

    void initAR()

    return () => {
      active = false
      if (rafId) cancelAnimationFrame(rafId)
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
      if (handLandmarker && typeof handLandmarker.close === "function") {
        try {
          handLandmarker.close()
        } catch {
          // ignore
        }
      }
    }
  }, [enabled, retryCount])

  if (!enabled) return null

  const currentSprite = getHandFrame(activeSpriteFrame)

  return (
    <>
      {/* =====================================================================
       * LIVE AR CAMERA VIDEO + 21-LANDMARK HAND SKELETON LAYER
       * - In fullStageCamera=true (DEFAULT): Covers the entire shooting stage
       *   so the player sees their whole arm & hand pulling the slingshot!
       * - In fullStageCamera=false: Docks as a large resizable panel on left.
       * ===================================================================== */}
      <div
        className={
          fullStageCamera
            ? "ar-stage-video-layer"
            : `ar-camera-hud is-expanded ${isGrabbingUI ? "is-grabbing" : ""}`
        }
        aria-label="Khung hình Camera AR trực tiếp nhận diện tay người bắn"
      >
        {!fullStageCamera && (
          <div className="ar-camera-hud-header">
            <span className="ar-camera-badge">
              <span className="ar-live-dot" />
              <Camera size={12} />
              <b>CAMERA AR TAY NGƯỜI BẮN</b>
            </span>
            <div className="ar-camera-actions">
              <button
                type="button"
                onClick={() => setFullStageCamera(true)}
                className="ar-hud-switch-btn"
                title="Mở rộng Camera AR toàn sân đấu"
              >
                <Maximize2 size={11} className="inline mr-1" />
                Toàn sân
              </button>
            </div>
          </div>
        )}

        <div className={fullStageCamera ? "ar-stage-video-wrap" : "ar-camera-viewport"}>
          <video
            ref={videoRef}
            playsInline
            muted
            className={fullStageCamera ? "ar-stage-video" : "ar-camera-video"}
          />
          <canvas
            ref={canvasRef}
            className={fullStageCamera ? "ar-stage-canvas" : "ar-camera-canvas"}
          />

          {status === "loading" && (
            <div className="ar-camera-overlay">
              <Sparkles size={22} className="animate-spin text-[#ff9b42]" />
              <span className="text-xs sm:text-sm font-black">
                Đang khởi động Camera AR nhận diện bàn tay người bắn...
              </span>
            </div>
          )}

          {status === "error" && (
            <div className="ar-camera-overlay is-error">
              <CameraOff size={22} className="text-[#ef5350]" />
              <span className="text-xs font-bold">
                {errorMessage || "Không mở được Camera"}
              </span>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="ar-retry-btn"
                >
                  <RefreshCw size={12} /> Thử lại Camera
                </button>
                {onFallbackToMouse && (
                  <button
                    type="button"
                    onClick={onFallbackToMouse}
                    className="ar-retry-btn is-secondary"
                  >
                    Chơi bằng Chuột
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
       * FLOATING AR HAND SPRITE STATUS & CAMERA VIEW BAR (BOTTOM-LEFT OF STAGE)
       * Displays the current cartoon hand sprite (frames 1..16) matching the
       * player's real hand state + toggle between Full-Stage Camera & Corner PIP
       * ===================================================================== */}
      <div
        className={`ar-hand-status-dock ${
          isGrabbingUI ? "is-grabbing" : hasHandUI ? "is-connected" : "is-waiting"
        }`}
      >
        <div className="ar-hand-sprite-box">
          <img
            src={currentSprite.src}
            alt={currentSprite.labelVi}
            className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
          />
          <span
            className={`ar-hand-status-dot ${
              isGrabbingUI
                ? "bg-[#f47920]"
                : hasHandUI
                ? "bg-[#16a34a]"
                : "bg-[#f59e0b]"
            }`}
          />
        </div>

        <div className="ar-hand-status-copy">
          <div className="flex items-center gap-1.5">
            <span className="ar-hand-badge-tag">
              {isGrabbingUI
                ? "ĐANG NẮM KÉO NÁ"
                : hasHandUI
                ? "ĐÃ KẾT NỐI TAY AR"
                : "CHỜ KẾT NỐI TAY"}
            </span>
            <span className="text-[9px] font-mono font-black text-slate-400">
              #{String(currentSprite.frameNumber).padStart(2, "0")}/16
            </span>
          </div>
          <b className="ar-hand-status-title">{currentSprite.labelVi}</b>
        </div>

        <div className="flex items-center gap-1 ml-1">
          <button
            type="button"
            onClick={() => setFullStageCamera((prev) => !prev)}
            className="ar-dock-btn"
            title={
              fullStageCamera
                ? "Thu gọn Camera về khung góc"
                : "Mở rộng Camera toàn sân đấu để thấy rõ tay người bắn"
            }
          >
            {fullStageCamera ? (
              <>
                <Minimize2 size={12} />
                <span className="hidden sm:inline">Khung góc</span>
              </>
            ) : (
              <>
                <Maximize2 size={12} />
                <span className="hidden sm:inline">Toàn sân</span>
              </>
            )}
          </button>

          {onFallbackToMouse && (
            <button
              type="button"
              onClick={onFallbackToMouse}
              className="ar-dock-btn is-mouse"
              title="Chuyển sang dùng Chuột / Cảm ứng"
            >
              <span>Chuột</span>
            </button>
          )}
        </div>
      </div>
    </>
  )
}

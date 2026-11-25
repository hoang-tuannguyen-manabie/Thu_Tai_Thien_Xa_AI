"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Maximize2, Minimize2, RefreshCw, Sparkles } from "lucide-react"

export interface ARHandFrame {
  /** Normalized mirrored X coordinate in [0, 1] (0 = left, 1 = right) */
  x: number
  /** Normalized Y coordinate in [0, 1] (0 = top, 1 = bottom) */
  y: number
  /** Whether the user is currently pinching (thumb+index) or grabbing (fist) */
  isGrabbing: boolean
  /** Normalized pinch closeness in [0, 1] (1 = tight pinch/fist, 0 = wide open hand) */
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
 * or grabbing (fingers curled into palm), with hysteresis to prevent flicker.
 */
function evaluateHandGrab(
  lm: Landmark[],
  currentlyGrabbing: boolean
): { isGrabbing: boolean; grabStrength: number; controlPoint: { x: number; y: number } } {
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

  // Reference palm scale (distance from wrist to middle knuckle + index-to-pinky width)
  const palmScale = Math.max(
    0.07,
    (dist2d(wrist, middleMcp) + dist2d(indexMcp, pinkyMcp)) * 0.55
  )

  // 1. Pinch distance between thumb tip and index tip
  const pinchDist = dist2d(thumbTip, indexTip)
  const pinchRatio = pinchDist / palmScale

  // 2. Finger curl count (for fist grab style)
  const fingers = [
    { tip: indexTip, pip: indexPip, mcp: indexMcp },
    { tip: middleTip, pip: middlePip, mcp: middleMcp },
    { tip: ringTip, pip: ringPip, mcp: ringMcp },
    { tip: pinkyTip, pip: pinkyPip, mcp: pinkyMcp },
  ]
  let curledCount = 0
  for (const f of fingers) {
    const tipToWrist = dist2d(f.tip, wrist)
    const pipToWrist = dist2d(f.pip, wrist)
    if (tipToWrist < pipToWrist * 1.04) {
      curledCount += 1
    }
  }

  // Hysteresis thresholds so grabbing doesn't accidentally drop while pulling
  const pinchThreshold = currentlyGrabbing ? 0.72 : 0.52
  const isPinching = pinchRatio <= pinchThreshold
  const isFist = currentlyGrabbing ? curledCount >= 2 : curledCount >= 3

  const isGrabbing = isPinching || isFist
  const grabStrength = Math.max(
    0,
    Math.min(1, isFist ? 1 : 1 - (pinchRatio - 0.25) / 0.65)
  )

  // Mirrored control point (midpoint of thumb tip, index tip, and index knuckle)
  const rawX = 1 - (thumbTip.x * 0.45 + indexTip.x * 0.45 + indexMcp.x * 0.1)
  const rawY = thumbTip.y * 0.45 + indexTip.y * 0.45 + indexMcp.y * 0.1

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
  const [expanded, setExpanded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [gestureLabel, setGestureLabel] = useState<string>("ĐƯA TAY VÀO CAMERA")
  const [isGrabbingUI, setIsGrabbingUI] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let active = true
    let rafId = 0
    let stream: MediaStream | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handLandmarker: any = null

    // Smoothed state
    let smoothX = 0.5
    let smoothY = 0.65
    let hasInitializedPos = false
    let grabbingState = false
    let grabConfirmFrames = 0
    let releaseConfirmFrames = 0
    let lastInferenceTime = 0
    let lastLandmarks: Landmark[] | null = null

    setStatus("loading")
    setErrorMessage("")

    const initAR = async () => {
      try {
        // Dynamically import MediaPipe Vision bundle from local public/vendor with CDN fallback
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
            width: { ideal: 480, max: 640 },
            height: { ideal: 270, max: 360 },
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
          "Không thể mở Camera hoặc tải mô hình nhận diện tay. Vui lòng kiểm tra quyền Camera trên trình duyệt."
        )
        return
      }

      const loop = (now: number) => {
        if (!active) return
        const video = videoRef.current
        const canvas = canvasRef.current

        if (video && canvas && video.readyState >= 2 && handLandmarker) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 480
            canvas.height = video.videoHeight || 270
          }

          // Run MediaPipe inference at ~30 FPS (every 32ms)
          if (now - lastInferenceTime >= 32) {
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

            // Draw subtle slingshot anchor guide zone in camera preview
            ctx.save()
            ctx.strokeStyle = "rgba(255, 255, 255, 0.28)"
            ctx.setLineDash([4, 4])
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(w * 0.5, h * 0.55, h * 0.22, 0, Math.PI * 2)
            ctx.stroke()
            ctx.restore()

            if (lastLandmarks && !disabledRef.current) {
              const evalRes = evaluateHandGrab(lastLandmarks, grabbingState)

              // Debounce grab/release by 2 consecutive frames for rock-solid control
              if (evalRes.isGrabbing) {
                grabConfirmFrames += 1
                releaseConfirmFrames = 0
                if (!grabbingState && grabConfirmFrames >= 2) {
                  grabbingState = true
                  setIsGrabbingUI(true)
                  setGestureLabel("🎯 ĐANG KÉO NÁ • MỞ TAY ĐỂ BẮN!")
                }
              } else {
                releaseConfirmFrames += 1
                grabConfirmFrames = 0
                if (grabbingState && releaseConfirmFrames >= 2) {
                  grabbingState = false
                  setIsGrabbingUI(false)
                  setGestureLabel("👌 CHỤM NGÓN TAY ĐỂ CẦM NÁ")
                } else if (!grabbingState) {
                  setGestureLabel("👌 CHỤM NGÓN TAY ĐỂ CẦM NÁ")
                }
              }

              if (!hasInitializedPos) {
                smoothX = evalRes.controlPoint.x
                smoothY = evalRes.controlPoint.y
                hasInitializedPos = true
              } else {
                // Smooth EMA filter (0.42 responsiveness)
                smoothX += (evalRes.controlPoint.x - smoothX) * 0.42
                smoothY += (evalRes.controlPoint.y - smoothY) * 0.42
              }

              // Draw mirrored hand skeleton on HUD canvas
              ctx.save()
              ctx.lineWidth = 2.5
              ctx.strokeStyle = grabbingState ? "#ff9b42" : "#42b883"
              for (const [i1, i2] of HAND_CONNECTIONS) {
                const p1 = lastLandmarks[i1]
                const p2 = lastLandmarks[i2]
                ctx.beginPath()
                ctx.moveTo((1 - p1.x) * w, p1.y * h)
                ctx.lineTo((1 - p2.x) * w, p2.y * h)
                ctx.stroke()
              }

              for (let idx = 0; idx < lastLandmarks.length; idx += 1) {
                const pt = lastLandmarks[idx]
                const isPinchTip = idx === 4 || idx === 8
                ctx.fillStyle = isPinchTip
                  ? grabbingState
                    ? "#ff9b42"
                    : "#ffffff"
                  : "#395ad2"
                ctx.beginPath()
                ctx.arc((1 - pt.x) * w, pt.y * h, isPinchTip ? 5.5 : 3.2, 0, Math.PI * 2)
                ctx.fill()
              }

              // Draw glowing active control point
              ctx.fillStyle = grabbingState ? "#ff9b42" : "#42b883"
              ctx.strokeStyle = "#ffffff"
              ctx.lineWidth = 2.5
              ctx.beginPath()
              ctx.arc(smoothX * w, smoothY * h, grabbingState ? 10 : 7, 0, Math.PI * 2)
              ctx.fill()
              ctx.stroke()
              ctx.restore()

              onHandFrameRef.current({
                x: smoothX,
                y: smoothY,
                isGrabbing: grabbingState,
                grabStrength: evalRes.grabStrength,
                hasHand: true,
              })
            } else {
              if (grabbingState) {
                grabbingState = false
                setIsGrabbingUI(false)
              }
              setGestureLabel(
                disabledRef.current ? "ĐANG CHỜ LƯỢT BẮN..." : "✋ ĐƯA TAY VÀO CAMERA"
              )
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

  return (
    <aside
      className={`ar-camera-hud ${expanded ? "is-expanded" : ""} ${isGrabbingUI ? "is-grabbing" : ""}`}
      aria-label="Khung điều khiển Camera AR nhận diện bàn tay"
    >
      <div className="ar-camera-hud-header">
        <span className="ar-camera-badge">
          <span className="ar-live-dot" />
          <Camera size={12} />
          <b>AR HAND CAM</b>
        </span>
        <div className="ar-camera-actions">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="ar-hud-icon-btn"
            title={expanded ? "Thu nhỏ khung Camera AR" : "Phóng to khung Camera AR"}
            aria-label={expanded ? "Thu nhỏ khung Camera AR" : "Phóng to khung Camera AR"}
          >
            {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          {onFallbackToMouse && (
            <button
              type="button"
              onClick={onFallbackToMouse}
              className="ar-hud-switch-btn"
              title="Chuyển sang chế độ Chuột / Cảm ứng"
            >
              Dùng Chuột
            </button>
          )}
        </div>
      </div>

      <div className="ar-camera-viewport">
        <video
          ref={videoRef}
          playsInline
          muted
          className="ar-camera-video"
        />
        <canvas ref={canvasRef} className="ar-camera-canvas" />

        {status === "loading" && (
          <div className="ar-camera-overlay">
            <Sparkles size={18} className="animate-spin text-[#ff9b42]" />
            <span>Đang khởi động AI nhận diện bàn tay...</span>
          </div>
        )}

        {status === "error" && (
          <div className="ar-camera-overlay is-error">
            <CameraOff size={18} className="text-[#ef5350]" />
            <span>{errorMessage || "Không mở được Camera"}</span>
            <div className="flex items-center gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => setRetryCount((c) => c + 1)}
                className="ar-retry-btn"
              >
                <RefreshCw size={11} /> Thử lại
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

      <div className={`ar-camera-status-bar ${isGrabbingUI ? "is-grabbing" : ""}`}>
        <span>{gestureLabel}</span>
      </div>
    </aside>
  )
}

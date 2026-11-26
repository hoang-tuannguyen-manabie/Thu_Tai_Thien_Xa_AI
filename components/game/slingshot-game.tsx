"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { MutableRefObject, PointerEvent } from "react"
import type { TargetKind } from "@/lib/game-data"
import { GAME_SCORING } from "@/lib/game-logic"
import { gameAudio } from "@/lib/audio"
import {
  getHandFrame,
  resolveHandSpriteFrame,
} from "@/lib/hand-sprites"
import type { ARHandFrame } from "./ar-hand-controller"
import type { GameVisualState } from "./game-types"
import {
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
  projectileAngleDegrees,
  type CollisionResult,
  type Point,
  type TargetHitboxes,
} from "./slingshot-physics"

interface Shot {
  point: Point
  previousPoint: Point
  velocity: Point
  power: number
}

interface Scene {
  width: number
  height: number
  targets: TargetHitboxes
}

const fallbackTargets: TargetHitboxes = {
  "non-ai": { center: { x: 170, y: 128 }, radius: 86 },
  ai: { center: { x: 830, y: 128 }, radius: 86 },
}
const fallbackScene: Scene = { width: 1000, height: 420, targets: fallbackTargets }

export type ControlMode = "mouse" | "ar"

export interface SlingshotGameProps {
  onShot: (target: TargetKind) => void
  disabled: boolean
  soundOn: boolean
  correctTarget: TargetKind
  visualState?: GameVisualState
  controlMode?: ControlMode
  arHandFrameRef?: MutableRefObject<((frame: ARHandFrame) => void) | null>
  onInteractionStateChange?: (
    state: "idle" | "dragging" | "aiming" | "shooting" | "collision"
  ) => void
}

export function SlingshotGame({
  onShot,
  disabled,
  soundOn,
  correctTarget,
  visualState = "idle",
  controlMode = "mouse",
  arHandFrameRef,
  onInteractionStateChange,
}: SlingshotGameProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const frameRef = useRef<number | null>(null)
  const impactTimerRef = useRef<number | null>(null)
  const missTimerRef = useRef<number | null>(null)
  const releaseSpriteTimerRef = useRef<number | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const shotRef = useRef<Shot | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const accumulatorRef = useRef(0)
  const firedRef = useRef(false)
  const trailRef = useRef<Point[]>([])

  // AR Hand tracking refs
  const arDraggingRef = useRef(false)
  const arGrabOriginRef = useRef<Point>({ x: 0.5, y: 0.52 })
  const currentPullRef = useRef<Point>({ x: 500, y: 310 })

  const [scene, setScene] = useState<Scene>(fallbackScene)
  const [pull, setPull] = useState<Point>({ x: 500, y: 310 })
  const [dragging, setDragging] = useState(false)
  const [shot, setShot] = useState<Shot | null>(null)
  const [flight, setFlight] = useState<Point | null>(null)
  const [flightAngleDeg, setFlightAngleDeg] = useState<number>(-90)
  const [flightTrail, setFlightTrail] = useState<Point[]>([])
  const [impact, setImpact] = useState<CollisionResult | null>(null)
  const [impactPower, setImpactPower] = useState(0)
  const [released, setReleased] = useState(false)
  const [releasePoint, setReleasePoint] = useState<Point | null>(null)
  const [releaseFrameOffset, setReleaseFrameOffset] = useState<number | null>(null)

  const [arCursor, setArCursor] = useState<{
    x: number
    y: number
    isGrabbing: boolean
    grabStrength: number
    hasHand: boolean
  }>({
    x: 500,
    y: 310,
    isGrabbing: false,
    grabStrength: 0,
    hasHand: false,
  })

  const physics = useMemo(
    () => createPhysicsConfig(scene.width, scene.height, scene.targets),
    [scene]
  )
  const distance = dragDistance(pull, physics.anchor)
  const power = normalizedPower(distance, physics)
  const currentPowerLevel = powerLevel(power)
  const slingScaleX = scene.width / 1000
  const slingScaleY = scene.height / 420
  const unitScale = Math.min(slingScaleX, slingScaleY)

  const leftFork = {
    x: physics.anchor.x - scene.width * 0.036,
    y: physics.anchor.y - scene.height * (42 / 420),
  }
  const rightFork = {
    x: physics.anchor.x + scene.width * 0.036,
    y: leftFork.y,
  }

  useLayoutEffect(() => {
    const svg = svgRef.current
    const stage = svg?.closest(".arena-stage")
    if (!svg || !stage) return

    const measure = () => {
      const bounds = svg.getBoundingClientRect()
      const readTarget = (selector: string, fallback: TargetHitboxes[TargetKind]) => {
        const element = stage.querySelector<HTMLElement>(selector)
        if (!element) return fallback
        const rect = element.getBoundingClientRect()
        return {
          center: {
            x: rect.left + rect.width / 2 - bounds.left,
            y: rect.top + rect.height / 2 - bounds.top,
          },
          radius: Math.min(rect.width, rect.height) * 0.45,
        }
      }
      const width = Math.max(1, bounds.width)
      const height = Math.max(1, bounds.height)
      const next: Scene = {
        width,
        height,
        targets: {
          "non-ai": readTarget(".left-target .target-art", fallbackTargets["non-ai"]),
          ai: readTarget(".right-target .target-art", fallbackTargets.ai),
        },
      }
      setScene((current) => {
        const unchanged =
          Math.abs(current.width - next.width) < 0.5 &&
          Math.abs(current.height - next.height) < 0.5 &&
          (Object.keys(next.targets) as TargetKind[]).every(
            (target) =>
              Math.abs(current.targets[target].center.x - next.targets[target].center.x) < 0.5 &&
              Math.abs(current.targets[target].center.y - next.targets[target].center.y) < 0.5 &&
              Math.abs(current.targets[target].radius - next.targets[target].radius) < 0.5
          )
        return unchanged ? current : next
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  useEffect(() => {
    if (!dragging && !shot) {
      setPull(physics.anchor)
      currentPullRef.current = physics.anchor
    }
  }, [dragging, physics.anchor, shot])

  const rawPointFromEvent = useCallback(
    (event: PointerEvent<SVGSVGElement>): Point => {
      const bounds = svgRef.current?.getBoundingClientRect()
      if (!bounds || bounds.width === 0 || bounds.height === 0) return physics.anchor
      return {
        x: ((event.clientX - bounds.left) / bounds.width) * scene.width,
        y: ((event.clientY - bounds.top) / bounds.height) * scene.height,
      }
    },
    [physics.anchor, scene.height, scene.width]
  )

  const pointFromEvent = useCallback(
    (event: PointerEvent<SVGSVGElement>): Point => {
      return clampPullPoint(rawPointFromEvent(event), physics)
    },
    [physics, rawPointFromEvent]
  )

  const reset = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    if (impactTimerRef.current !== null) window.clearTimeout(impactTimerRef.current)
    if (missTimerRef.current !== null) window.clearTimeout(missTimerRef.current)
    if (releaseSpriteTimerRef.current !== null)
      window.clearInterval(releaseSpriteTimerRef.current)
    frameRef.current = null
    impactTimerRef.current = null
    missTimerRef.current = null
    releaseSpriteTimerRef.current = null
    lastTimeRef.current = null
    accumulatorRef.current = 0
    shotRef.current = null
    trailRef.current = []
    pointerIdRef.current = null
    arDraggingRef.current = false
    firedRef.current = false
    setShot(null)
    setFlight(null)
    setFlightTrail([])
    setImpact(null)
    setImpactPower(0)
    setReleased(false)
    setReleasePoint(null)
    setReleaseFrameOffset(null)
    setDragging(false)
    setPull(physics.anchor)
    currentPullRef.current = physics.anchor
    onInteractionStateChange?.("idle")
  }, [onInteractionStateChange, physics.anchor])

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      if (impactTimerRef.current !== null) window.clearTimeout(impactTimerRef.current)
      if (missTimerRef.current !== null) window.clearTimeout(missTimerRef.current)
      if (releaseSpriteTimerRef.current !== null)
        window.clearInterval(releaseSpriteTimerRef.current)
    },
    []
  )

  // Plays the 4-frame open-hand release sequence (frames 11 -> 12 -> 13 -> 14) on release
  const triggerReleaseHandAnimation = useCallback((atPoint: Point) => {
    if (releaseSpriteTimerRef.current !== null) {
      window.clearInterval(releaseSpriteTimerRef.current)
    }
    setReleasePoint(atPoint)
    setReleaseFrameOffset(0)
    let step = 0
    releaseSpriteTimerRef.current = window.setInterval(() => {
      step += 1
      if (step <= 3) {
        setReleaseFrameOffset(step)
      } else {
        if (releaseSpriteTimerRef.current !== null) {
          window.clearInterval(releaseSpriteTimerRef.current)
          releaseSpriteTimerRef.current = null
        }
        setReleaseFrameOffset(null)
        setReleasePoint(null)
      }
    }, 95)
  }, [])

  const animate = useCallback(
    (time: number) => {
      const currentShot = shotRef.current
      if (!currentShot) return

      if (lastTimeRef.current === null) lastTimeRef.current = time
      accumulatorRef.current += Math.min(
        (time - lastTimeRef.current) / 1000,
        physics.maxFrameDelta
      )
      lastTimeRef.current = time

      let position = currentShot.point
      let previousPosition = currentShot.previousPoint
      let velocity = currentShot.velocity
      while (accumulatorRef.current >= physics.fixedStep) {
        previousPosition = position
        const next = integrateProjectile(position, velocity, physics)
        position = next.position
        velocity = next.velocity
        accumulatorRef.current -= physics.fixedStep

        const collision = findTargetCollision(previousPosition, position, physics)
        if (collision) {
          setFlight(collision.point)
          setFlightAngleDeg(projectileAngleDegrees(velocity))
          setImpact(collision)
          setImpactPower(currentShot.power)
          shotRef.current = null
          setShot(null)
          frameRef.current = null
          onInteractionStateChange?.("collision")
          impactTimerRef.current = window.setTimeout(() => {
            onShot(collision.target)
            reset()
          }, 260)
          return
        }

        if (isOutsideArena(position, physics)) {
          shotRef.current = null
          setShot(null)
          frameRef.current = null
          missTimerRef.current = window.setTimeout(reset, 180)
          return
        }
      }

      currentShot.point = position
      currentShot.previousPoint = previousPosition
      currentShot.velocity = velocity
      shotRef.current = currentShot
      const frameProgress = accumulatorRef.current / physics.fixedStep
      const renderPosition = {
        x: previousPosition.x + (position.x - previousPosition.x) * frameProgress,
        y: previousPosition.y + (position.y - previousPosition.y) * frameProgress,
      }
      const trail = [renderPosition, ...trailRef.current].slice(
        0,
        currentShot.power > 0.75 ? 9 : currentShot.power > 0.4 ? 7 : 4
      )
      trailRef.current = trail
      setFlight(renderPosition)
      setFlightAngleDeg(projectileAngleDegrees(velocity))
      setFlightTrail(trail)
      frameRef.current = requestAnimationFrame(animate)
    },
    [onInteractionStateChange, onShot, physics, reset]
  )

  const launch = useCallback(
    (pullPoint: Point) => {
      if (disabled || shotRef.current || firedRef.current) return
      const clampedPull = clampPullPoint(pullPoint, physics)
      const pullDistance = dragDistance(clampedPull, physics.anchor)
      if (pullDistance < physics.minDragDistance) {
        setPull(physics.anchor)
        currentPullRef.current = physics.anchor
        setReleased(false)
        onInteractionStateChange?.("idle")
        return
      }

      const shotPower = normalizedPower(pullDistance, physics)
      const velocity = calculateLaunchVelocity(clampedPull, shotPower, physics)
      const newShot: Shot = {
        point: clampedPull,
        previousPoint: clampedPull,
        velocity,
        power: shotPower,
      }

      firedRef.current = true
      arDraggingRef.current = false
      setDragging(false)
      setReleased(true)
      triggerReleaseHandAnimation(clampedPull)
      onInteractionStateChange?.("shooting")
      if (soundOn) {
        gameAudio.playSlingshotRelease(shotPower)
      }
      shotRef.current = newShot
      setShot(newShot)
      setFlight(clampedPull)
      setFlightAngleDeg(projectileAngleDegrees(velocity))
      setFlightTrail([])
      setImpact(null)
      trailRef.current = []
      lastTimeRef.current = null
      accumulatorRef.current = 0
      frameRef.current = requestAnimationFrame(animate)
    },
    [
      animate,
      disabled,
      onInteractionStateChange,
      physics,
      soundOn,
      triggerReleaseHandAnimation,
    ]
  )

  // Connect AR Hand Frame callback for direct grab -> pull -> release slingshot shooting
  useEffect(() => {
    if (!arHandFrameRef) return

    arHandFrameRef.current = (frame: ARHandFrame) => {
      if (controlMode !== "ar" || disabled || shotRef.current || firedRef.current) {
        if (arDraggingRef.current) {
          arDraggingRef.current = false
          setDragging(false)
          setPull(physics.anchor)
          currentPullRef.current = physics.anchor
        }
        setArCursor((prev) =>
          prev.hasHand ? { ...prev, hasHand: false, isGrabbing: false } : prev
        )
        return
      }

      if (!frame.hasHand) {
        if (arDraggingRef.current) {
          const d = dragDistance(currentPullRef.current, physics.anchor)
          arDraggingRef.current = false
          setDragging(false)
          if (d >= physics.minDragDistance) {
            launch(currentPullRef.current)
          } else {
            setPull(physics.anchor)
            currentPullRef.current = physics.anchor
            onInteractionStateChange?.("idle")
          }
        }
        setArCursor((prev) =>
          prev.hasHand
            ? { ...prev, hasHand: false, isGrabbing: false, grabStrength: 0 }
            : prev
        )
        return
      }

      const sensitivityX = physics.maxDragDistance * 3.1
      const sensitivityY = physics.maxDragDistance * 2.8

      const cursorX = Math.max(
        36,
        Math.min(scene.width - 36, physics.anchor.x + (frame.x - 0.5) * sensitivityX)
      )
      const cursorY = Math.max(
        36,
        Math.min(scene.height - 24, physics.anchor.y + (frame.y - 0.46) * sensitivityY)
      )

      if (frame.isGrabbing) {
        if (!arDraggingRef.current) {
          arDraggingRef.current = true
          arGrabOriginRef.current = { x: frame.x, y: frame.y }
          setReleased(false)
          setDragging(true)
          gameAudio.init()
        }

        const relX = (frame.x - arGrabOriginRef.current.x) * sensitivityX * 0.85
        const relY = (frame.y - arGrabOriginRef.current.y) * sensitivityY * 0.85
        const absX = (frame.x - 0.5) * sensitivityX * 0.45
        const absY = Math.max(0, (frame.y - 0.44) * sensitivityY * 0.55)

        const rawTargetPull: Point = {
          x: physics.anchor.x + relX + absX,
          y: physics.anchor.y + relY + absY,
        }
        const nextPull = clampPullPoint(rawTargetPull, physics)
        currentPullRef.current = nextPull
        setPull(nextPull)
        setArCursor({
          x: nextPull.x,
          y: nextPull.y,
          isGrabbing: true,
          grabStrength: frame.grabStrength,
          hasHand: true,
        })

        const d = dragDistance(nextPull, physics.anchor)
        const p = normalizedPower(d, physics)
        if (soundOn && d >= physics.minDragDistance) {
          gameAudio.playSlingshotPull(p)
        }
        onInteractionStateChange?.(d >= physics.minDragDistance ? "aiming" : "dragging")
      } else {
        if (arDraggingRef.current) {
          arDraggingRef.current = false
          setDragging(false)
          const finalPull = currentPullRef.current
          setArCursor({
            x: cursorX,
            y: cursorY,
            isGrabbing: false,
            grabStrength: frame.grabStrength,
            hasHand: true,
          })
          launch(finalPull)
        } else {
          setArCursor({
            x: cursorX,
            y: cursorY,
            isGrabbing: false,
            grabStrength: frame.grabStrength,
            hasHand: true,
          })
        }
      }
    }

    return () => {
      if (arHandFrameRef) arHandFrameRef.current = null
    }
  }, [
    arHandFrameRef,
    controlMode,
    disabled,
    launch,
    onInteractionStateChange,
    physics,
    scene.height,
    scene.width,
    soundOn,
  ])

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || shot || firedRef.current || pointerIdRef.current !== null) return
    const rawPoint = rawPointFromEvent(event)
    const currentPouch = dragging ? pull : physics.anchor
    const distToPouch = dragDistance(rawPoint, currentPouch)
    const clickedProjectile =
      event.target instanceof Element && Boolean(event.target.closest(".projectile"))
    const grabRadius = Math.max(54, physics.projectileRadius * 3.3)

    if (!clickedProjectile && distToPouch > grabRadius) return

    event.preventDefault()
    pointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    setReleased(false)
    setDragging(true)
    const clamped = clampPullPoint(rawPoint, physics)
    currentPullRef.current = clamped
    setPull(clamped)
    const d = dragDistance(clamped, physics.anchor)
    onInteractionStateChange?.(d >= physics.minDragDistance ? "aiming" : "dragging")
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragging || pointerIdRef.current !== event.pointerId) return
    event.preventDefault()
    const nextPull = pointFromEvent(event)
    currentPullRef.current = nextPull
    setPull(nextPull)
    const d = dragDistance(nextPull, physics.anchor)
    const p = normalizedPower(d, physics)
    if (soundOn && d >= physics.minDragDistance) {
      gameAudio.playSlingshotPull(p)
    }
    onInteractionStateChange?.(d >= physics.minDragDistance ? "aiming" : "dragging")
  }

  const cancelDrag = (event?: PointerEvent<SVGSVGElement>) => {
    if (!dragging || (event && pointerIdRef.current !== event.pointerId)) return
    pointerIdRef.current = null
    setDragging(false)
    setPull(physics.anchor)
    currentPullRef.current = physics.anchor
    setReleased(false)
    onInteractionStateChange?.("idle")
  }

  const release = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragging || pointerIdRef.current !== event.pointerId) return
    event.preventDefault()
    const finalPull = pointFromEvent(event)
    pointerIdRef.current = null
    setDragging(false)
    setPull(finalPull)
    currentPullRef.current = finalPull
    launch(finalPull)
  }

  const previewVelocity = useMemo(
    () =>
      dragging && distance >= physics.minDragDistance
        ? calculateLaunchVelocity(pull, power, physics)
        : null,
    [distance, dragging, physics, power, pull]
  )

  const trajectory = useMemo(
    () => (previewVelocity ? predictTrajectory(pull, previewVelocity, physics) : null),
    [physics, previewVelocity, pull]
  )

  const aimingAngleDeg = previewVelocity ? projectileAngleDegrees(previewVelocity) : -90

  const renderPath = (points: Point[]) =>
    points.length > 1
      ? `M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")}`
      : ""
  const impactIsCorrect = impact?.target === correctTarget
  const gripY = physics.anchor.y + scene.height * (52 / 420)
  const forkJointY = physics.anchor.y + scene.height * (14 / 420)
  const forkTopY = leftFork.y - 6 * slingScaleY
  const bandEnd = shot || released ? physics.anchor : pull
  const visualPull = dragging ? pull : bandEnd
  const dragPower = dragging ? power : impactPower
  const dragLevel = powerLevel(dragPower).toLowerCase()
  const coreRadius = 17.5 * unitScale
  const pouchAngle = dragging && distance >= physics.minDragDistance ? aimingAngleDeg + 90 : 0

  // Resolve current Cartoon Hand Sprite (frames 1..16) for the arena hand/slingshot overlay
  const isNearPouch =
    dragDistance(arCursor, physics.anchor) <= physics.maxDragDistance * 1.15
  const activeHandSprite = resolveHandSpriteFrame({
    hasHand: controlMode === "ar" ? arCursor.hasHand : dragging,
    isGrabbing: dragging,
    grabStrength:
      controlMode === "ar" ? arCursor.grabStrength : dragging ? 1 : 0,
    pullPower: power,
    isNearPouch: controlMode === "ar" ? isNearPouch : true,
    releaseFrameOffset,
  })
  const handSpriteSize = 72 * unitScale
  // Flip hand sprite horizontally when pulling right so the cartoon wrist/fingers orient naturally
  const pullingRight = visualPull.x > physics.anchor.x + 8

  return (
    <svg
      ref={svgRef}
      className={`slingshot-canvas${dragging ? " is-dragging" : ""}${dragging && power >= 0.76 ? " high-tension" : ""}${shot ? " is-flying" : ""}${shot && shot.power >= 0.76 ? " power-shot" : ""}${released ? " is-recoiling" : ""}`}
      data-state={
        shot
          ? "shooting"
          : dragging
          ? distance >= physics.minDragDistance
            ? "aiming"
            : "dragging"
          : disabled
          ? visualState
          : "idle"
      }
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      preserveAspectRatio="none"
      aria-label="Kéo viên đạn ngược hướng muốn bắn rồi thả để bắn"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={cancelDrag}
      onLostPointerCapture={cancelDrag}
    >
      <defs>
        <linearGradient id="cartoonSlingWood" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E89D54" />
          <stop offset="50%" stopColor="#BD6E2A" />
          <stop offset="100%" stopColor="#8A4A16" />
        </linearGradient>

        <linearGradient id="cartoonSlingGrip" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5E81F4" />
          <stop offset="50%" stopColor="#395AD2" />
          <stop offset="100%" stopColor="#203899" />
        </linearGradient>

        <linearGradient id="cartoonElasticBand" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={dragPower >= 0.75 ? "#FF5733" : "#FFB347"} />
          <stop offset="100%" stopColor={dragPower >= 0.75 ? "#C70039" : "#F47920"} />
        </linearGradient>

        <radialGradient id="cartoonOrbBlue" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#B8D0FF" />
          <stop offset="48%" stopColor="#395AD2" />
          <stop offset="100%" stopColor="#172B7A" />
        </radialGradient>

        <radialGradient id="cartoonOrbPower" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFF3B0" />
          <stop offset="48%" stopColor="#FF7A2F" />
          <stop offset="100%" stopColor="#B91C1C" />
        </radialGradient>
      </defs>

      {/* =====================================================================
       * AR HAND CONNECTION DOCKING FRAME AT SLINGSHOT POUCH (WHEN IN AR MODE)
       * Shows the docking target box, connection tether line, and guide sprite
       * ===================================================================== */}
      {controlMode === "ar" && !dragging && !shot && !disabled && (
        <g className="ar-connection-dock-frame" aria-hidden="true">
          {/* Glowing Connection Tether Beam from detected hand to Slingshot Pouch */}
          {arCursor.hasHand && (
            <line
              x1={arCursor.x}
              y1={arCursor.y}
              x2={physics.anchor.x}
              y2={physics.anchor.y}
              stroke="#16a34a"
              strokeWidth={3 * unitScale}
              strokeDasharray="6 6"
              opacity={0.85}
            />
          )}

          {/* Docking Frame Box around Slingshot Pouch */}
          <g transform={`translate(${physics.anchor.x} ${physics.anchor.y})`}>
            <rect
              x={-54 * unitScale}
              y={-52 * unitScale}
              width={108 * unitScale}
              height={104 * unitScale}
              rx={22 * unitScale}
              fill={
                arCursor.hasHand
                  ? "rgba(22, 163, 74, 0.14)"
                  : "rgba(245, 158, 11, 0.14)"
              }
              stroke={arCursor.hasHand ? "#16a34a" : "#f59e0b"}
              strokeWidth={2.8 * unitScale}
              strokeDasharray="10 6"
            />
            {/* Corner Targeting Brackets */}
            <path
              d={`M ${-56 * unitScale} ${-34 * unitScale} L ${-56 * unitScale} ${-54 * unitScale} L ${-36 * unitScale} ${-54 * unitScale} M ${36 * unitScale} ${-54 * unitScale} L ${56 * unitScale} ${-54 * unitScale} L ${56 * unitScale} ${-34 * unitScale} M ${-56 * unitScale} ${34 * unitScale} L ${-56 * unitScale} ${54 * unitScale} L ${-36 * unitScale} ${54 * unitScale} M ${36 * unitScale} ${54 * unitScale} L ${56 * unitScale} ${54 * unitScale} L ${56 * unitScale} ${34 * unitScale}`}
              fill="none"
              stroke={arCursor.hasHand ? "#15803d" : "#d97706"}
              strokeWidth={4 * unitScale}
              strokeLinecap="round"
            />
            {/* Ghost Guide Hand Sprite inside Docking Frame when waiting for hand */}
            {!arCursor.hasHand && (
              <image
                href={getHandFrame(16).src}
                x={14 * unitScale}
                y={-42 * unitScale}
                width={50 * unitScale}
                height={50 * unitScale}
                opacity={0.85}
              />
            )}
            <text
              y={-60 * unitScale}
              textAnchor="middle"
              fill={arCursor.hasHand ? "#15803d" : "#b45309"}
              stroke="#FFFFFF"
              strokeWidth={3.5 * unitScale}
              paintOrder="stroke"
              fontSize={10.5 * unitScale}
              fontWeight="900"
            >
              {arCursor.hasHand
                ? "👌 ĐÃ KẾT NỐI TAY • NẮM TAY ĐỂ CẦM NÁ"
                : "✋ KHUNG KẾT NỐI TAY AR"}
            </text>
          </g>
        </g>
      )}

      {/* Aiming Trajectory Preview */}
      {trajectory && trajectory.points.length > 0 && (
        <g
          className={`aim-preview power-${currentPowerLevel.toLowerCase()}`}
          aria-hidden="true"
        >
          {trajectory.points.length > 1 && (
            <path className="aim-line" d={renderPath(trajectory.points)} />
          )}
          {trajectory.points.map((point, index) => {
            const progress = index / Math.max(1, trajectory.points.length - 1)
            return (
              <circle
                key={`aim-${index}`}
                className="aim-dot"
                cx={point.x}
                cy={point.y}
                r={Math.max(2.4, 4.6 - progress * 1.8)}
                style={{ opacity: 0.86 - progress * 0.56 }}
              />
            )
          })}
          {trajectory.hit && (
            <g transform={`translate(${trajectory.hit.point.x} ${trajectory.hit.point.y})`}>
              <circle className="aim-marker" r={physics.projectileRadius + 9} />
              <circle r={4} fill="currentColor" />
            </g>
          )}
        </g>
      )}

      {/* Motion Flight Trail */}
      {flightTrail.map((point, index) => (
        <circle
          key={`trail-${index}`}
          className={`flight-trail-dot power-${dragLevel}`}
          cx={point.x}
          cy={point.y}
          r={Math.max(2.8, 8.5 - index * 0.8)}
          style={{ opacity: 0.52 - index * 0.048 }}
          aria-hidden="true"
        />
      ))}

      {/* Back Elastic Band */}
      <g aria-hidden="true">
        <path
          d={`M ${leftFork.x} ${leftFork.y} Q ${(leftFork.x + visualPull.x) / 2} ${(leftFork.y + visualPull.y) / 2 + 4 * slingScaleY} ${visualPull.x} ${visualPull.y}`}
          fill="none"
          stroke="#4A250B"
          strokeLinecap="round"
          strokeWidth={(11 + dragPower * 3) * unitScale}
        />
        <path
          className={`sling-band sling-band-back${dragging ? " under-tension" : ""}${released ? " is-snapping" : ""}`}
          style={{ "--tension": dragPower } as React.CSSProperties}
          d={`M ${leftFork.x} ${leftFork.y} Q ${(leftFork.x + visualPull.x) / 2} ${(leftFork.y + visualPull.y) / 2 + 4 * slingScaleY} ${visualPull.x} ${visualPull.y}`}
          stroke="url(#cartoonElasticBand)"
          strokeWidth={(6.5 + dragPower * 2.5) * unitScale}
        />
      </g>

      {/* 2D Cartoon Wooden Slingshot Frame */}
      <g className="sling-frame" aria-hidden="true">
        <ellipse
          cx={physics.anchor.x}
          cy={gripY + 12 * slingScaleY}
          rx={38 * slingScaleX}
          ry={10 * slingScaleY}
          className="sling-shadow"
        />

        <path
          d={`M ${physics.anchor.x} ${gripY} L ${physics.anchor.x} ${forkJointY} C ${physics.anchor.x - 6 * slingScaleX} ${physics.anchor.y - 4 * slingScaleY} ${leftFork.x + 2 * slingScaleX} ${leftFork.y + 24 * slingScaleY} ${leftFork.x} ${forkTopY} M ${physics.anchor.x} ${forkJointY} C ${physics.anchor.x + 6 * slingScaleX} ${physics.anchor.y - 4 * slingScaleY} ${rightFork.x - 2 * slingScaleX} ${rightFork.y + 24 * slingScaleY} ${rightFork.x} ${forkTopY}`}
          fill="none"
          stroke="#4A250B"
          strokeWidth={26 * unitScale}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d={`M ${physics.anchor.x} ${gripY} L ${physics.anchor.x} ${forkJointY} C ${physics.anchor.x - 6 * slingScaleX} ${physics.anchor.y - 4 * slingScaleY} ${leftFork.x + 2 * slingScaleX} ${leftFork.y + 24 * slingScaleY} ${leftFork.x} ${forkTopY} M ${physics.anchor.x} ${forkJointY} C ${physics.anchor.x + 6 * slingScaleX} ${physics.anchor.y - 4 * slingScaleY} ${rightFork.x - 2 * slingScaleX} ${rightFork.y + 24 * slingScaleY} ${rightFork.x} ${forkTopY}`}
          fill="none"
          stroke="url(#cartoonSlingWood)"
          strokeWidth={18.5 * unitScale}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d={`M ${physics.anchor.x - 3 * slingScaleX} ${forkJointY - 2 * slingScaleY} C ${physics.anchor.x - 9 * slingScaleX} ${physics.anchor.y - 6 * slingScaleY} ${leftFork.x - 1 * slingScaleX} ${leftFork.y + 20 * slingScaleY} ${leftFork.x - 2 * slingScaleX} ${forkTopY + 3 * slingScaleY}`}
          fill="none"
          stroke="#FAD29E"
          strokeWidth={3.2 * unitScale}
          strokeLinecap="round"
          opacity={0.82}
        />
        <path
          d={`M ${physics.anchor.x + 3 * slingScaleX} ${forkJointY - 2 * slingScaleY} C ${physics.anchor.x + 9 * slingScaleX} ${physics.anchor.y - 6 * slingScaleY} ${rightFork.x - 3 * slingScaleX} ${rightFork.y + 20 * slingScaleY} ${rightFork.x - 2 * slingScaleX} ${forkTopY + 3 * slingScaleY}`}
          fill="none"
          stroke="#FAD29E"
          strokeWidth={3.2 * unitScale}
          strokeLinecap="round"
          opacity={0.75}
        />

        <rect
          x={leftFork.x - 12 * slingScaleX}
          y={leftFork.y - 6 * slingScaleY}
          width={24 * slingScaleX}
          height={11 * slingScaleY}
          rx={5 * unitScale}
          fill="#EF5350"
          stroke="#4A250B"
          strokeWidth={3 * unitScale}
        />
        <rect
          x={rightFork.x - 12 * slingScaleX}
          y={rightFork.y - 6 * slingScaleY}
          width={24 * slingScaleX}
          height={11 * slingScaleY}
          rx={5 * unitScale}
          fill="#EF5350"
          stroke="#4A250B"
          strokeWidth={3 * unitScale}
        />

        <rect
          x={physics.anchor.x - 13 * slingScaleX}
          y={forkJointY + 5 * slingScaleY}
          width={26 * slingScaleX}
          height={34 * slingScaleY}
          rx={10 * unitScale}
          fill="url(#cartoonSlingGrip)"
          stroke="#4A250B"
          strokeWidth={3.2 * unitScale}
        />
        <path
          d={`M ${physics.anchor.x - 10 * slingScaleX} ${forkJointY + 15 * slingScaleY} Q ${physics.anchor.x} ${forkJointY + 18 * slingScaleY} ${physics.anchor.x + 10 * slingScaleX} ${forkJointY + 15 * slingScaleY} M ${physics.anchor.x - 10 * slingScaleX} ${forkJointY + 23 * slingScaleY} Q ${physics.anchor.x} ${forkJointY + 26 * slingScaleY} ${physics.anchor.x + 10 * slingScaleX} ${forkJointY + 23 * slingScaleY} M ${physics.anchor.x - 10 * slingScaleX} ${forkJointY + 31 * slingScaleY} Q ${physics.anchor.x} ${forkJointY + 34 * slingScaleY} ${physics.anchor.x + 10 * slingScaleX} ${forkJointY + 31 * slingScaleY}`}
          fill="none"
          stroke="#9BAAE8"
          strokeWidth={2 * unitScale}
          strokeLinecap="round"
        />
        <rect
          x={physics.anchor.x - 14.5 * slingScaleX}
          y={forkJointY + 1 * slingScaleY}
          width={29 * slingScaleX}
          height={8 * slingScaleY}
          rx={4 * unitScale}
          fill="#FF9B42"
          stroke="#4A250B"
          strokeWidth={2.8 * unitScale}
        />
        <ellipse
          cx={physics.anchor.x}
          cy={gripY + 2 * slingScaleY}
          rx={14 * slingScaleX}
          ry={6 * slingScaleY}
          fill="#FFBE63"
          stroke="#4A250B"
          strokeWidth={3 * unitScale}
        />
      </g>

      {/* =====================================================================
       * 2D CARTOON PROJECTILE IN POUCH
       * ===================================================================== */}
      {!shot && (
        <g
          className={`projectile${dragging ? " projectile-active" : ""}`}
          transform={`translate(${visualPull.x} ${visualPull.y})`}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Kéo viên đạn để ngắm; dùng phím mũi tên để chỉnh hướng, Enter hoặc Space để bắn"
          aria-disabled={disabled || undefined}
          aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Enter Space"
          onKeyDown={(event) => {
            if (disabled) return
            if (event.key.startsWith("Arrow")) {
              event.preventDefault()
              setDragging(true)
              const step = Math.max(10, physics.maxDragDistance * 0.12)
              setPull((current) => {
                const next = clampPullPoint(
                  {
                    x:
                      current.x +
                      (event.key === "ArrowLeft"
                        ? -step
                        : event.key === "ArrowRight"
                        ? step
                        : 0),
                    y:
                      current.y +
                      (event.key === "ArrowUp"
                        ? -step
                        : event.key === "ArrowDown"
                        ? step
                        : 0),
                  },
                  physics
                )
                currentPullRef.current = next
                const d = dragDistance(next, physics.anchor)
                onInteractionStateChange?.(
                  d >= physics.minDragDistance ? "aiming" : "dragging"
                )
                return next
              })
            } else if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              launch(pull)
            } else if (event.key === "Escape") {
              setDragging(false)
              setPull(physics.anchor)
              currentPullRef.current = physics.anchor
              onInteractionStateChange?.("idle")
            }
          }}
        >
          <circle
            className="projectile-hit-area"
            r={Math.max(46, physics.projectileRadius * 3)}
          />
          <circle
            className="projectile-shadow"
            cx={2 * slingScaleX}
            cy={8 * slingScaleY}
            r={coreRadius}
          />

          <g transform={`rotate(${pouchAngle})`}>
            <ellipse
              cx={0}
              cy={5 * unitScale}
              rx={coreRadius * 1.28}
              ry={coreRadius * 0.65}
              fill="#7C3F18"
              stroke="#4A250B"
              strokeWidth={3 * unitScale}
            />
            <path
              d={`M ${-coreRadius * 0.9} ${5 * unitScale} Q 0 ${11 * unitScale} ${coreRadius * 0.9} ${5 * unitScale}`}
              fill="none"
              stroke="#D28B54"
              strokeWidth={1.8 * unitScale}
              strokeDasharray="3 3"
              strokeLinecap="round"
            />
          </g>

          <g
            transform={
              dragging && distance >= physics.minDragDistance
                ? `rotate(${aimingAngleDeg})`
                : undefined
            }
          >
            {dragging && distance >= physics.minDragDistance && (
              <path
                d={`M ${-coreRadius * 0.55} ${-coreRadius * 0.55} L ${-coreRadius * 1.55} 0 L ${-coreRadius * 0.55} ${coreRadius * 0.55} Z`}
                fill="#FF9B42"
                stroke="#4A250B"
                strokeWidth={2 * unitScale}
                strokeLinejoin="round"
              />
            )}
            <circle r={coreRadius + 1.8 * unitScale} fill="#172B7A" />
            <circle
              r={coreRadius}
              fill={
                dragging && power >= 0.75
                  ? "url(#cartoonOrbPower)"
                  : "url(#cartoonOrbBlue)"
              }
              stroke="#FFFFFF"
              strokeWidth={3.6 * unitScale}
            />
            <ellipse
              cx={-4.5 * unitScale}
              cy={-5.5 * unitScale}
              rx={5.5 * unitScale}
              ry={3.2 * unitScale}
              fill="#FFFFFF"
              opacity={0.88}
              transform={`rotate(-28 ${-4.5 * unitScale} ${-5.5 * unitScale})`}
            />
            <circle
              cx={4.5 * unitScale}
              cy={4.5 * unitScale}
              r={2 * unitScale}
              fill="#FFFFFF"
              opacity={0.55}
            />
          </g>

          <circle className="projectile-outline" r={24 * unitScale} />
        </g>
      )}

      {/* Front Elastic Band */}
      <g aria-hidden="true">
        <path
          d={`M ${rightFork.x} ${rightFork.y} Q ${(rightFork.x + visualPull.x) / 2} ${(rightFork.y + visualPull.y) / 2 + 4 * slingScaleY} ${visualPull.x} ${visualPull.y}`}
          fill="none"
          stroke="#4A250B"
          strokeLinecap="round"
          strokeWidth={(11 + dragPower * 3) * unitScale}
        />
        <path
          className={`sling-band sling-band-front${dragging ? " under-tension" : ""}${released ? " is-snapping" : ""}`}
          style={{ "--tension": dragPower } as React.CSSProperties}
          d={`M ${rightFork.x} ${rightFork.y} Q ${(rightFork.x + visualPull.x) / 2} ${(rightFork.y + visualPull.y) / 2 + 4 * slingScaleY} ${visualPull.x} ${visualPull.y}`}
          stroke="url(#cartoonElasticBand)"
          strokeWidth={(6.5 + dragPower * 2.5) * unitScale}
        />
        <path
          d={`M ${rightFork.x} ${rightFork.y} Q ${(rightFork.x + visualPull.x) / 2} ${(rightFork.y + visualPull.y) / 2 + 3 * slingScaleY} ${visualPull.x} ${visualPull.y}`}
          fill="none"
          stroke="#FFE4B5"
          strokeLinecap="round"
          strokeWidth={1.8 * unitScale}
          opacity={0.75}
        />
      </g>

      {/* =====================================================================
       * CARTOON GLOVED HAND SPRITE (FRAMES 01..16) DIRECTLY GRABBING, PULLING
       * AND RELEASING THE SLINGSHOT ON STAGE!
       * ===================================================================== */}
      {dragging && !shot && (
        <g
          className="cartoon-slingshot-hand is-pulling"
          transform={`translate(${visualPull.x} ${visualPull.y + 16 * unitScale})`}
          aria-hidden="true"
        >
          <g transform={pullingRight ? "scale(-1, 1)" : undefined}>
            <image
              href={activeHandSprite.src}
              x={-handSpriteSize * 0.52}
              y={-handSpriteSize * 0.42}
              width={handSpriteSize}
              height={handSpriteSize}
            />
          </g>
        </g>
      )}

      {/* Splayed 5-Finger Open Hand Release Burst Animation (Frames 11..14) */}
      {releasePoint && releaseFrameOffset !== null && (
        <g
          className="cartoon-slingshot-hand is-releasing"
          transform={`translate(${releasePoint.x} ${releasePoint.y + 14 * unitScale})`}
          aria-hidden="true"
        >
          <circle
            r={(28 + releaseFrameOffset * 9) * unitScale}
            fill="none"
            stroke="#FF9B42"
            strokeWidth={3 * unitScale}
            strokeDasharray="6 6"
            opacity={Math.max(0, 0.85 - releaseFrameOffset * 0.22)}
          />
          <image
            href={getHandFrame(11 + Math.min(3, releaseFrameOffset)).src}
            x={-handSpriteSize * 0.5}
            y={-handSpriteSize * 0.45}
            width={handSpriteSize}
            height={handSpriteSize}
          />
        </g>
      )}

      {/* Live AR Hand Sprite Cursor when moving open hand toward the slingshot */}
      {controlMode === "ar" && arCursor.hasHand && !dragging && !shot && (
        <g
          className="ar-hand-arena-cursor"
          transform={`translate(${arCursor.x} ${arCursor.y})`}
          aria-hidden="true"
        >
          <circle
            r={34 * unitScale}
            fill="rgba(22, 163, 74, 0.16)"
            stroke="#16a34a"
            strokeWidth={3 * unitScale}
            strokeDasharray="6 4"
          />
          <image
            href={activeHandSprite.src}
            x={-handSpriteSize * 0.48}
            y={-handSpriteSize * 0.48}
            width={handSpriteSize * 0.96}
            height={handSpriteSize * 0.96}
          />
          <text
            y={-38 * unitScale}
            textAnchor="middle"
            fill="#15803D"
            stroke="#FFFFFF"
            strokeWidth={3.5 * unitScale}
            paintOrder="stroke"
            fontSize={10.5 * unitScale}
            fontWeight="900"
          >
            {activeHandSprite.labelVi.toUpperCase()}
          </text>
        </g>
      )}

      {/* Flying 2D Cartoon Projectile */}
      {flight && (
        <g
          className={`projectile projectile-flight${shot?.power && shot.power >= 0.76 ? " is-powered" : ""}`}
          transform={`translate(${flight.x} ${flight.y})`}
          aria-hidden="true"
        >
          <circle
            className="projectile-shadow"
            cx={2 * slingScaleX}
            cy={8 * slingScaleY}
            r={coreRadius}
          />
          <g transform={`rotate(${flightAngleDeg})`}>
            <path
              d={`M ${-coreRadius * 0.4} ${-coreRadius * 0.7} L ${-coreRadius * 1.95} 0 L ${-coreRadius * 0.4} ${coreRadius * 0.7} Z`}
              fill={shot?.power && shot.power >= 0.76 ? "#FF7A2F" : "#6E98FF"}
              stroke="#172B7A"
              strokeWidth={2 * unitScale}
              strokeLinejoin="round"
            />
            <path
              d={`M ${-coreRadius * 0.55} ${-coreRadius * 0.36} L ${-coreRadius * 1.4} 0 L ${-coreRadius * 0.55} ${coreRadius * 0.36} Z`}
              fill="#FFF3B0"
            />
            <circle r={coreRadius + 1.8 * unitScale} fill="#172B7A" />
            <circle
              r={coreRadius}
              fill={
                shot?.power && shot.power >= 0.76
                  ? "url(#cartoonOrbPower)"
                  : "url(#cartoonOrbBlue)"
              }
              stroke="#FFFFFF"
              strokeWidth={3.6 * unitScale}
            />
            <ellipse
              cx={3.5 * unitScale}
              cy={-5 * unitScale}
              rx={5.5 * unitScale}
              ry={3 * unitScale}
              fill="#FFFFFF"
              opacity={0.9}
              transform={`rotate(-18 ${3.5 * unitScale} ${-5 * unitScale})`}
            />
          </g>
        </g>
      )}

      {/* Target Collision Impact Effect */}
      {impact && (
        <g
          className={`impact-effect ${impactIsCorrect ? "impact-correct" : "impact-wrong"}${impactPower >= 0.76 ? " impact-power" : ""}`}
          transform={`translate(${impact.point.x} ${impact.point.y})`}
          aria-hidden="true"
        >
          <circle
            className="impact-burst"
            r={physics.projectileRadius + (impactPower >= 0.76 ? 25 : 16)}
          />
          <path
            className="impact-star"
            d={`M 0 ${-physics.projectileRadius - 16} l 3.4 8 8.6 1-6.4 5.7 1.8 8.3-7.4-4.4-7.4 4.4 1.8-8.3-6.4-5.7 8.6-1z`}
          />
          <text
            className="impact-label"
            y={-physics.projectileRadius - 27}
            textAnchor="middle"
          >
            {impactIsCorrect
              ? `+${GAME_SCORING.CORRECT_ANSWER} ĐIỂM`
              : `-${GAME_SCORING.WRONG_ANSWER} ĐIỂM`}
          </text>
        </g>
      )}

      {/* Power Meter */}
      {dragging && (
        <g
          className={`power-meter power-${currentPowerLevel.toLowerCase()}`}
          transform={`translate(${physics.anchor.x} ${physics.anchor.y + scene.height * (76 / 420)})`}
        >
          <rect
            x={-58 * slingScaleX}
            y={-8 * slingScaleY}
            width={116 * slingScaleX}
            height={8 * slingScaleY}
            rx={4 * slingScaleY}
            className="power-meter-track"
          />
          <rect
            x={-58 * slingScaleX}
            y={-8 * slingScaleY}
            width={116 * slingScaleX * power}
            height={8 * slingScaleY}
            rx={4 * slingScaleY}
            className="power-meter-fill"
          />
          <text y={17 * slingScaleY} textAnchor="middle">
            {currentPowerLevel} · {Math.round(power * 100)}%
          </text>
        </g>
      )}

      <text
        className="power-label"
        x={physics.anchor.x}
        y={scene.height - scene.height * (4 / 420)}
        textAnchor="middle"
      >
        {disabled
          ? "ĐANG CHỜ..."
          : dragging
          ? distance >= physics.minDragDistance
            ? controlMode === "ar"
              ? "BUNG XÒE BÀN TAY ĐỂ BẮN!"
              : "THẢ TAY ĐỂ BẮN!"
            : "KÉO THÊM ĐỂ TĂNG LỰC"
          : controlMode === "ar"
          ? "ĐƯA TAY VÀO KHUNG KẾT NỐI • NẮM TAY KÉO NÁ & BUNG TAY BẮN"
          : "KÉO VIÊN ĐẠN NGƯỢC HƯỚNG BIA"}
      </text>
    </svg>
  )
}

export { SlingshotGame as SlingshotVisual }

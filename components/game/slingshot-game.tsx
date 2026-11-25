"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { PointerEvent } from "react"
import type { TargetKind } from "@/lib/game-data"
import { GAME_SCORING } from "@/lib/game-logic"
import { gameAudio } from "@/lib/audio"
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

export interface SlingshotGameProps {
  onShot: (target: TargetKind) => void
  disabled: boolean
  soundOn: boolean
  correctTarget: TargetKind
  visualState?: GameVisualState
  onInteractionStateChange?: (state: "idle" | "dragging" | "aiming" | "shooting" | "collision") => void
}

export function SlingshotGame({
  onShot,
  disabled,
  soundOn,
  correctTarget,
  visualState = "idle",
  onInteractionStateChange,
}: SlingshotGameProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const frameRef = useRef<number | null>(null)
  const impactTimerRef = useRef<number | null>(null)
  const missTimerRef = useRef<number | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const shotRef = useRef<Shot | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const accumulatorRef = useRef(0)
  const firedRef = useRef(false)
  const trailRef = useRef<Point[]>([])

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

  const physics = useMemo(() => createPhysicsConfig(scene.width, scene.height, scene.targets), [scene])
  const distance = dragDistance(pull, physics.anchor)
  const power = normalizedPower(distance, physics)
  const currentPowerLevel = powerLevel(power)
  const slingScaleX = scene.width / 1000
  const slingScaleY = scene.height / 420
  const unitScale = Math.min(slingScaleX, slingScaleY)
  const leftFork = { x: physics.anchor.x - scene.width * 0.034, y: physics.anchor.y - scene.height * (41 / 420) }
  const rightFork = { x: physics.anchor.x + scene.width * 0.034, y: leftFork.y }

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
    if (!dragging && !shot) setPull(physics.anchor)
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
    frameRef.current = null
    impactTimerRef.current = null
    missTimerRef.current = null
    lastTimeRef.current = null
    accumulatorRef.current = 0
    shotRef.current = null
    trailRef.current = []
    pointerIdRef.current = null
    firedRef.current = false
    setShot(null)
    setFlight(null)
    setFlightTrail([])
    setImpact(null)
    setImpactPower(0)
    setReleased(false)
    setDragging(false)
    setPull(physics.anchor)
    onInteractionStateChange?.("idle")
  }, [onInteractionStateChange, physics.anchor])

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      if (impactTimerRef.current !== null) window.clearTimeout(impactTimerRef.current)
      if (missTimerRef.current !== null) window.clearTimeout(missTimerRef.current)
    },
    []
  )

  const animate = useCallback(
    (time: number) => {
      const currentShot = shotRef.current
      if (!currentShot) return

      if (lastTimeRef.current === null) lastTimeRef.current = time
      accumulatorRef.current += Math.min((time - lastTimeRef.current) / 1000, physics.maxFrameDelta)
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
      setDragging(false)
      setReleased(true)
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
    [animate, disabled, onInteractionStateChange, physics, soundOn]
  )

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || shot || firedRef.current || pointerIdRef.current !== null) return
    const rawPoint = rawPointFromEvent(event)
    const currentPouch = dragging ? pull : physics.anchor
    const distToPouch = dragDistance(rawPoint, currentPouch)
    const clickedProjectile =
      event.target instanceof Element && Boolean(event.target.closest(".projectile"))
    const grabRadius = Math.max(52, physics.projectileRadius * 3.2)

    if (!clickedProjectile && distToPouch > grabRadius) return

    event.preventDefault()
    pointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    setReleased(false)
    setDragging(true)
    const clamped = clampPullPoint(rawPoint, physics)
    setPull(clamped)
    const d = dragDistance(clamped, physics.anchor)
    onInteractionStateChange?.(d >= physics.minDragDistance ? "aiming" : "dragging")
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragging || pointerIdRef.current !== event.pointerId) return
    event.preventDefault()
    const nextPull = pointFromEvent(event)
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
    launch(finalPull)
  }

  const previewVelocity = useMemo(
    () => (dragging && distance >= physics.minDragDistance ? calculateLaunchVelocity(pull, power, physics) : null),
    [distance, dragging, physics, power, pull]
  )

  const trajectory = useMemo(
    () => (previewVelocity ? predictTrajectory(pull, previewVelocity, physics) : null),
    [physics, previewVelocity, pull]
  )

  const aimingAngleDeg = previewVelocity ? projectileAngleDegrees(previewVelocity) : -90

  const renderPath = (points: Point[]) =>
    points.length > 1 ? `M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")}` : ""
  const impactIsCorrect = impact?.target === correctTarget
  const gripY = physics.anchor.y + scene.height * (46 / 420)
  const bandEnd = shot || released ? physics.anchor : pull
  const visualPull = dragging ? pull : bandEnd
  const dragPower = dragging ? power : impactPower
  const dragLevel = powerLevel(dragPower).toLowerCase()
  const coreRadius = 17 * unitScale

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
      {trajectory && trajectory.points.length > 0 && (
        <g className={`aim-preview power-${currentPowerLevel.toLowerCase()}`} aria-hidden="true">
          {trajectory.points.length > 1 && <path className="aim-line" d={renderPath(trajectory.points)} />}
          {trajectory.points.map((point, index) => {
            const progress = index / Math.max(1, trajectory.points.length - 1)
            return (
              <circle
                key={`aim-${index}`}
                className="aim-dot"
                cx={point.x}
                cy={point.y}
                r={Math.max(2.2, 4.3 - progress * 1.8)}
                style={{ opacity: 0.82 - progress * 0.58 }}
              />
            )
          })}
          {trajectory.hit && (
            <circle
              className="aim-marker"
              cx={trajectory.hit.point.x}
              cy={trajectory.hit.point.y}
              r={physics.projectileRadius + 8}
            />
          )}
        </g>
      )}

      {flightTrail.map((point, index) => (
        <circle
          key={`trail-${index}`}
          className={`flight-trail-dot power-${dragLevel}`}
          cx={point.x}
          cy={point.y}
          r={Math.max(2.5, 8 - index * 0.8)}
          style={{ opacity: 0.48 - index * 0.045 }}
          aria-hidden="true"
        />
      ))}

      <path
        className={`sling-band sling-band-back${dragging ? " under-tension" : ""}${released ? " is-snapping" : ""}`}
        style={{ "--tension": dragPower } as React.CSSProperties}
        d={`M ${leftFork.x} ${leftFork.y} Q ${(leftFork.x + visualPull.x) / 2} ${(leftFork.y + visualPull.y) / 2} ${visualPull.x} ${visualPull.y}`}
      />
      <path
        className={`sling-band sling-band-front${dragging ? " under-tension" : ""}${released ? " is-snapping" : ""}`}
        style={{ "--tension": dragPower } as React.CSSProperties}
        d={`M ${rightFork.x} ${rightFork.y} Q ${(rightFork.x + visualPull.x) / 2} ${(rightFork.y + visualPull.y) / 2} ${visualPull.x} ${visualPull.y}`}
      />

      <g className="sling-frame" aria-hidden="true">
        <ellipse
          cx={physics.anchor.x}
          cy={gripY + 9 * slingScaleY}
          rx={34 * slingScaleX}
          ry={9 * slingScaleY}
          className="sling-shadow"
        />
        <path
          d={`M ${physics.anchor.x} ${gripY} C ${physics.anchor.x - 11 * slingScaleX} ${physics.anchor.y + 14 * slingScaleY} ${leftFork.x + 10 * slingScaleX} ${leftFork.y + 19 * slingScaleY} ${leftFork.x} ${leftFork.y} M ${physics.anchor.x} ${gripY} C ${physics.anchor.x + 11 * slingScaleX} ${physics.anchor.y + 14 * slingScaleY} ${rightFork.x - 10 * slingScaleX} ${rightFork.y + 19 * slingScaleY} ${rightFork.x} ${rightFork.y}`}
          className="sling-wood-outline"
        />
        <path
          d={`M ${leftFork.x} ${leftFork.y} Q ${leftFork.x - 3 * slingScaleX} ${leftFork.y - 26 * slingScaleY} ${leftFork.x - 5 * slingScaleX} ${leftFork.y - 51 * slingScaleY} M ${rightFork.x} ${rightFork.y} Q ${rightFork.x + 3 * slingScaleX} ${rightFork.y - 26 * slingScaleY} ${rightFork.x + 5 * slingScaleX} ${rightFork.y - 51 * slingScaleY}`}
          className="sling-wood-outline sling-fork-outline"
        />
        <path
          d={`M ${physics.anchor.x} ${gripY} C ${physics.anchor.x - 11 * slingScaleX} ${physics.anchor.y + 14 * slingScaleY} ${leftFork.x + 10 * slingScaleX} ${leftFork.y + 19 * slingScaleY} ${leftFork.x} ${leftFork.y} M ${physics.anchor.x} ${gripY} C ${physics.anchor.x + 11 * slingScaleX} ${physics.anchor.y + 14 * slingScaleY} ${rightFork.x - 10 * slingScaleX} ${rightFork.y + 19 * slingScaleY} ${rightFork.x} ${rightFork.y}`}
          className="sling-wood"
        />
        <path
          d={`M ${leftFork.x} ${leftFork.y} Q ${leftFork.x - 3 * slingScaleX} ${leftFork.y - 26 * slingScaleY} ${leftFork.x - 5 * slingScaleX} ${leftFork.y - 51 * slingScaleY} M ${rightFork.x} ${rightFork.y} Q ${rightFork.x + 3 * slingScaleX} ${rightFork.y - 26 * slingScaleY} ${rightFork.x + 5 * slingScaleX} ${rightFork.y - 51 * slingScaleY}`}
          className="sling-wood sling-fork"
        />
        <path
          d={`M ${leftFork.x - 5 * slingScaleX} ${leftFork.y - 49 * slingScaleY} Q ${physics.anchor.x} ${leftFork.y + 2 * slingScaleY} ${rightFork.x + 5 * slingScaleX} ${rightFork.y - 49 * slingScaleY}`}
          className="sling-leather"
        />
        <path
          d={`M ${physics.anchor.x - 15 * slingScaleX} ${gripY - 5 * slingScaleY} Q ${physics.anchor.x} ${gripY - 16 * slingScaleY} ${physics.anchor.x + 15 * slingScaleX} ${gripY - 5 * slingScaleY}`}
          className="sling-grip"
        />
        <path
          d={`M ${physics.anchor.x - 9 * slingScaleX} ${physics.anchor.y + 22 * slingScaleY} Q ${physics.anchor.x} ${physics.anchor.y + 28 * slingScaleY} ${physics.anchor.x + 9 * slingScaleX} ${physics.anchor.y + 22 * slingScaleY}`}
          className="sling-detail"
        />
      </g>

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
                    x: current.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
                    y: current.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0),
                  },
                  physics
                )
                const d = dragDistance(next, physics.anchor)
                onInteractionStateChange?.(d >= physics.minDragDistance ? "aiming" : "dragging")
                return next
              })
            } else if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              launch(pull)
            } else if (event.key === "Escape") {
              setDragging(false)
              setPull(physics.anchor)
              onInteractionStateChange?.("idle")
            }
          }}
        >
          <circle className="projectile-hit-area" r={Math.max(44, physics.projectileRadius * 2.8)} />
          <circle className="projectile-shadow" cx={2 * slingScaleX} cy={7 * slingScaleY} r={coreRadius} />
          <g transform={dragging && distance >= physics.minDragDistance ? `rotate(${aimingAngleDeg})` : undefined}>
            {dragging && distance >= physics.minDragDistance && (
              <path
                d={`M ${-coreRadius * 0.6} ${-coreRadius * 0.52} L ${-coreRadius * 1.45} 0 L ${-coreRadius * 0.6} ${coreRadius * 0.52} Z`}
                fill="#ff9b42"
                opacity={0.85}
              />
            )}
            <circle className="projectile-core" r={coreRadius} />
            <circle
              className="projectile-shine"
              cx={5 * unitScale}
              cy={-5 * unitScale}
              r={5 * unitScale}
            />
          </g>
          <circle className="projectile-outline" r={23 * unitScale} />
        </g>
      )}

      {flight && (
        <g
          className={`projectile projectile-flight${shot?.power && shot.power >= 0.76 ? " is-powered" : ""}`}
          transform={`translate(${flight.x} ${flight.y})`}
          aria-hidden="true"
        >
          <circle className="projectile-shadow" cx={2 * slingScaleX} cy={7 * slingScaleY} r={coreRadius} />
          <g transform={`rotate(${flightAngleDeg})`}>
            <path
              d={`M ${-coreRadius * 0.45} ${-coreRadius * 0.65} L ${-coreRadius * 1.75} 0 L ${-coreRadius * 0.45} ${coreRadius * 0.65} Z`}
              fill={shot?.power && shot.power >= 0.76 ? "#ff9b42" : "#7791ed"}
              opacity={0.9}
            />
            <circle className="projectile-core" r={coreRadius} />
            <circle
              className="projectile-shine"
              cx={5 * unitScale}
              cy={-5 * unitScale}
              r={5 * unitScale}
            />
          </g>
        </g>
      )}

      {impact && (
        <g
          className={`impact-effect ${impactIsCorrect ? "impact-correct" : "impact-wrong"}${impactPower >= 0.76 ? " impact-power" : ""}`}
          transform={`translate(${impact.point.x} ${impact.point.y})`}
          aria-hidden="true"
        >
          <circle className="impact-burst" r={physics.projectileRadius + (impactPower >= 0.76 ? 25 : 16)} />
          <path
            className="impact-star"
            d={`M 0 ${-physics.projectileRadius - 16} l 3.4 8 8.6 1-6.4 5.7 1.8 8.3-7.4-4.4-7.4 4.4 1.8-8.3-6.4-5.7 8.6-1z`}
          />
          <text className="impact-label" y={-physics.projectileRadius - 27} textAnchor="middle">
            {impactIsCorrect
              ? `+${GAME_SCORING.CORRECT_ANSWER} ĐIỂM`
              : `-${GAME_SCORING.WRONG_ANSWER} ĐIỂM`}
          </text>
        </g>
      )}

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
            ? "THẢ ĐỂ BẮN"
            : "KÉO THÊM ĐỂ TĂNG LỰC"
          : "KÉO VIÊN ĐẠN NGƯỢC HƯỚNG BIA"}
      </text>
    </svg>
  )
}

export { SlingshotGame as SlingshotVisual }

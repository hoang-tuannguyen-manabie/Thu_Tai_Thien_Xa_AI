import type { TargetKind } from "@/lib/game-data"

export interface Point {
  x: number
  y: number
}

export interface TargetHitbox {
  center: Point
  radius: number
}

export type TargetHitboxes = Record<TargetKind, TargetHitbox>

export interface PhysicsConfig {
  width: number
  height: number
  anchor: Point
  maxDragDistance: number
  minDragDistance: number
  minLaunchSpeed: number
  maxLaunchSpeed: number
  gravity: number
  fixedStep: number
  maxFrameDelta: number
  projectileRadius: number
  targets: TargetHitboxes
}

export interface CollisionResult {
  target: TargetKind
  point: Point
  distanceAlongSegment: number
}

export interface TrajectoryPrediction {
  points: Point[]
  hit: CollisionResult | null
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const RAD_TO_DEG = 180 / Math.PI

export function createPhysicsConfig(width: number, height: number, targets: TargetHitboxes): PhysicsConfig {
  const scale = Math.min(width / 1000, height / 420)
  const minLaunchSpeed = Math.max(280, 420 * scale)
  const maxDragDistance = clamp(Math.min(width, height) * 0.27, 56, 132)

  return {
    width,
    height,
    anchor: { x: width * 0.5, y: height * (310 / 420) },
    maxDragDistance,
    minDragDistance: Math.max(8, maxDragDistance * 0.2),
    minLaunchSpeed,
    maxLaunchSpeed: Math.max(minLaunchSpeed + 160, 900 * scale),
    gravity: Math.max(260, 520 * scale),
    fixedStep: 1 / 120,
    maxFrameDelta: 0.05,
    projectileRadius: clamp(17 * scale, 7, 17),
    targets,
  }
}

export function clampPullPoint(point: Point, config: PhysicsConfig): Point {
  const deltaX = point.x - config.anchor.x
  const deltaY = point.y - config.anchor.y
  const distance = Math.hypot(deltaX, deltaY)
  if (distance <= config.maxDragDistance) return point

  const scale = config.maxDragDistance / distance
  return {
    x: config.anchor.x + deltaX * scale,
    y: config.anchor.y + deltaY * scale,
  }
}

export function dragDistance(point: Point, anchor: Point): number {
  return Math.hypot(point.x - anchor.x, point.y - anchor.y)
}

export function normalizedPower(distance: number, config: PhysicsConfig): number {
  return clamp(distance / config.maxDragDistance, 0, 1)
}

export function powerLevel(power: number): "LIGHT" | "MEDIUM" | "POWER" {
  if (power <= 0.4) return "LIGHT"
  if (power <= 0.75) return "MEDIUM"
  return "POWER"
}

export function calculateLaunchVelocity(pullPoint: Point, power: number, config: PhysicsConfig): Point {
  const dragX = pullPoint.x - config.anchor.x
  const dragY = pullPoint.y - config.anchor.y
  const distance = Math.hypot(dragX, dragY)
  if (distance < config.minDragDistance) return { x: 0, y: 0 }

  const clampedPower = clamp(power, 0, 1)
  const launchSpeed = config.minLaunchSpeed + clampedPower * (config.maxLaunchSpeed - config.minLaunchSpeed)
  const directionX = -dragX / distance
  const directionY = -dragY / distance
  return {
    x: directionX * launchSpeed,
    y: directionY * launchSpeed,
  }
}

/**
 * Returns projectile orientation angle in radians using Math.atan2(vy, vx).
 */
export function projectileAngle(velocity: Point): number {
  return Math.atan2(velocity.y, velocity.x)
}

/**
 * Returns projectile orientation angle in degrees for SVG rotation,
 * handling any sprite orientation offset once without mixing radians and degrees.
 */
export function projectileAngleDegrees(velocity: Point, spriteOffsetDeg = 0): number {
  if (velocity.x === 0 && velocity.y === 0) return spriteOffsetDeg
  return projectileAngle(velocity) * RAD_TO_DEG + spriteOffsetDeg
}

export function integrateProjectile(position: Point, velocity: Point, config: PhysicsConfig) {
  const nextVelocity = { x: velocity.x, y: velocity.y + config.gravity * config.fixedStep }
  const nextPosition = {
    x: position.x + nextVelocity.x * config.fixedStep,
    y: position.y + nextVelocity.y * config.fixedStep,
  }

  return { position: nextPosition, velocity: nextVelocity }
}

export function findTargetCollision(from: Point, to: Point, config: PhysicsConfig): CollisionResult | null {
  let firstHit: CollisionResult | null = null
  const segmentX = to.x - from.x
  const segmentY = to.y - from.y
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY

  for (const target of Object.keys(config.targets) as TargetKind[]) {
    const hitbox = config.targets[target]
    const projection = segmentLengthSquared === 0
      ? 0
      : clamp(((hitbox.center.x - from.x) * segmentX + (hitbox.center.y - from.y) * segmentY) / segmentLengthSquared, 0, 1)
    const closestPoint = { x: from.x + segmentX * projection, y: from.y + segmentY * projection }
    const hitRadius = hitbox.radius + config.projectileRadius

    if (
      Math.hypot(closestPoint.x - hitbox.center.x, closestPoint.y - hitbox.center.y) <= hitRadius &&
      (!firstHit || projection < firstHit.distanceAlongSegment)
    ) {
      firstHit = { target, point: closestPoint, distanceAlongSegment: projection }
    }
  }

  return firstHit
}

export function isOutsideArena(point: Point, config: PhysicsConfig): boolean {
  const margin = config.projectileRadius + 8
  return point.x < -margin || point.x > config.width + margin || point.y < -margin || point.y > config.height + margin
}

export function predictTrajectory(
  start: Point,
  initialVelocity: Point,
  config: PhysicsConfig,
  duration = 2.2
): TrajectoryPrediction {
  const points: Point[] = []
  let position = { ...start }
  let velocity = { ...initialVelocity }
  const totalSteps = Math.ceil(duration / config.fixedStep)
  const stepsPerPoint = 5

  for (let index = 1; index <= totalSteps; index += 1) {
    const previous = position
    const next = integrateProjectile(position, velocity, config)
    position = next.position
    velocity = next.velocity

    const hit = findTargetCollision(previous, position, config)
    if (index % stepsPerPoint === 0 || hit || index === 1) points.push(hit?.point ?? position)
    if (hit) return { points, hit }
    if (isOutsideArena(position, config)) break
  }

  return { points, hit: null }
}

import assert from "node:assert/strict"
import test from "node:test"
import {
  calculateLaunchVelocity,
  clampPullPoint,
  createPhysicsConfig,
  dragDistance,
  findTargetCollision,
  integrateProjectile,
  normalizedPower,
  predictTrajectory,
  projectileAngle,
  projectileAngleDegrees,
} from "./slingshot-physics.ts"
import {
  applyScoreDelta,
  calculateScore,
  GAME_SCORING,
  resolveShot,
} from "../../lib/game-logic.ts"
import { sampleQuestions } from "../../lib/game-data.ts"

const config = createPhysicsConfig(1000, 420, {
  "non-ai": { center: { x: 170, y: 128 }, radius: 86 },
  ai: { center: { x: 830, y: 128 }, radius: 86 },
})
const pull = (deltaX, deltaY) => ({ x: config.anchor.x + deltaX, y: config.anchor.y + deltaY })
const close = (actual, expected, epsilon = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not close to ${expected}`)

test("atan2 preserves the angle in all four quadrants (radians and degrees)", () => {
  close(projectileAngle({ x: 1, y: 1 }), Math.PI / 4)
  close(projectileAngle({ x: -1, y: 1 }), (3 * Math.PI) / 4)
  close(projectileAngle({ x: -1, y: -1 }), (-3 * Math.PI) / 4)
  close(projectileAngle({ x: 1, y: -1 }), -Math.PI / 4)

  close(projectileAngleDegrees({ x: 1, y: 1 }), 45)
  close(projectileAngleDegrees({ x: -1, y: 1 }), 135)
  close(projectileAngleDegrees({ x: -1, y: -1 }), -135)
  close(projectileAngleDegrees({ x: 1, y: -1 }), -45)
})

test("launch velocity uses the inverse drag direction for all four requested pulls", () => {
  const cases = [
    { name: "down-left -> shoot up-right", drag: [-30, 30], expected: [1, -1] },
    { name: "down-right -> shoot up-left", drag: [30, 30], expected: [-1, -1] },
    { name: "left -> shoot right", drag: [-40, 0], expected: [1, 0] },
    { name: "right -> shoot left", drag: [40, 0], expected: [-1, 0] },
  ]

  for (const { name, drag, expected } of cases) {
    const velocity = calculateLaunchVelocity(pull(...drag), 0.5, config)
    assert.equal(Math.sign(velocity.x), expected[0], `${name} horizontal direction`)
    assert.equal(Math.sign(velocity.y) || 0, expected[1], `${name} vertical direction`)
    close(
      Math.hypot(velocity.x, velocity.y),
      config.minLaunchSpeed + 0.5 * (config.maxLaunchSpeed - config.minLaunchSpeed)
    )
  }
})

test("stronger pull produces faster projectile under the same shooting angle", () => {
  const lightPull = clampPullPoint(pull(-25, 25), config)
  const heavyPull = clampPullPoint(pull(-75, 75), config)
  const lightPower = normalizedPower(dragDistance(lightPull, config.anchor), config)
  const heavyPower = normalizedPower(dragDistance(heavyPull, config.anchor), config)

  const vLight = calculateLaunchVelocity(lightPull, lightPower, config)
  const vHeavy = calculateLaunchVelocity(heavyPull, heavyPower, config)

  assert.ok(Math.hypot(vHeavy.x, vHeavy.y) > Math.hypot(vLight.x, vLight.y))
  close(projectileAngle(vLight), projectileAngle(vHeavy))
})

test("sub-minimum drag produces no launch velocity", () => {
  assert.deepEqual(
    calculateLaunchVelocity(pull(config.minDragDistance / 2, 0), 0.5, config),
    { x: 0, y: 0 }
  )
})

test("horizontal velocity remains constant while gravity changes only vertical velocity", () => {
  const position = { x: 200, y: 180 }
  let velocity = { x: -240, y: -130 }
  const initialX = velocity.x
  const initialY = velocity.y

  for (let step = 0; step < 30; step += 1) {
    const result = integrateProjectile(position, velocity, config)
    velocity = result.velocity
    close(velocity.x, initialX)
  }

  close(velocity.y, initialY + config.gravity * config.fixedStep * 30)
})

test("RIGHT-to-LEFT shooting (Pull DOWN-RIGHT -> Shoot UP-LEFT) follows smooth parabola with no direction reversal", () => {
  const pullPoint = clampPullPoint(pull(68, 45), config)
  const power = normalizedPower(dragDistance(pullPoint, config.anchor), config)
  let velocity = calculateLaunchVelocity(pullPoint, power, config)
  let position = { ...pullPoint }

  assert.ok(velocity.x < 0, "Initial vx must be negative (moving left)")
  assert.ok(velocity.y < 0, "Initial vy must be negative (moving up)")

  for (let step = 0; step < 60; step += 1) {
    const prevX = position.x
    const next = integrateProjectile(position, velocity, config)
    position = next.position
    velocity = next.velocity
    assert.ok(position.x < prevX, "Projectile must move monotonically left without reversing")
    assert.ok(velocity.x < 0, "Horizontal velocity must remain negative")
  }
})

test("trajectory prediction matches actual projectile integration and target collision", () => {
  const start = clampPullPoint(pull(-72, 48), config)
  const power = normalizedPower(dragDistance(start, config.anchor), config)
  const initialVelocity = calculateLaunchVelocity(start, power, config)
  const prediction = predictTrajectory(start, initialVelocity, config)

  let position = { ...start }
  let velocity = { ...initialVelocity }
  let actualHit = null
  const actualPoints = []
  const totalSteps = Math.ceil(2.2 / config.fixedStep)

  for (let step = 1; step <= totalSteps; step += 1) {
    const prev = position
    const next = integrateProjectile(position, velocity, config)
    position = next.position
    velocity = next.velocity
    const hit = findTargetCollision(prev, position, config)
    if (step % 5 === 0 || hit || step === 1) actualPoints.push(hit?.point ?? position)
    if (hit) {
      actualHit = hit
      break
    }
  }

  assert.equal(prediction.points.length, actualPoints.length)
  for (let index = 0; index < prediction.points.length; index += 1) {
    close(prediction.points[index].x, actualPoints[index].x)
    close(prediction.points[index].y, actualPoints[index].y)
  }
  assert.deepEqual(prediction.hit, actualHit)
})

test("centralized scoring system enforces +100, -50, min 0, and single score per question", () => {
  assert.equal(GAME_SCORING.CORRECT_ANSWER, 100)
  assert.equal(GAME_SCORING.WRONG_ANSWER, 50)

  // Tutorial demo sequence: 0 -> +100 -> -50 = 50
  let demoScore = 0
  demoScore = applyScoreDelta(demoScore, true)
  assert.equal(demoScore, 100)
  demoScore = applyScoreDelta(demoScore, false)
  assert.equal(demoScore, 50)

  // Minimum score floor at 0
  assert.equal(applyScoreDelta(0, false), 0)

  // Per-question deduplication
  const q1 = sampleQuestions[0]
  const q2 = sampleQuestions[1]
  const r1 = resolveShot(q1, q1.correctAnswer) // +100
  const r1Duplicate = resolveShot(q1, q1.correctAnswer) // ignored duplicate
  const r2Wrong = resolveShot(q2, q2.correctAnswer === "ai" ? "non-ai" : "ai") // -50
  assert.equal(calculateScore([r1, r1Duplicate, r2Wrong]), 50)
})

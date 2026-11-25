/**
 * Hybrid Audio Engine for Thử Tài Xạ Thủ AI (Manabie Learning Arcade)
 * Combines real MP3 sound effects (/assets/audio/*.mp3) with WebAudio synthesis
 * for slingshot pull, release, projectile flight, target impact, countdown, and UI interactions.
 * Never autoplays before explicit user interaction.
 */

type SfxKey =
  | "comboStreak"
  | "correctHit"
  | "countdownTick"
  | "crowdCheer"
  | "loseStreak"
  | "powerPull"
  | "winFanfare"
  | "wrongBuzzer"

const SFX_PATHS: Record<SfxKey, string> = {
  comboStreak: "/assets/audio/combo-streak.mp3",
  correctHit: "/assets/audio/correct-hit.mp3",
  countdownTick: "/assets/audio/countdown-tick.mp3",
  crowdCheer: "/assets/audio/crowd-cheer.mp3",
  loseStreak: "/assets/audio/lose-streak.mp3",
  powerPull: "/assets/audio/power-pull.mp3",
  winFanfare: "/assets/audio/win-fanfare.mp3",
  wrongBuzzer: "/assets/audio/wrong-buzzer.mp3",
}

class GameAudioEngine {
  private ctx: AudioContext | null = null
  private initialized = false
  private muted = false
  private sfxCache: Partial<Record<SfxKey, HTMLAudioElement>> = {}
  private lastPullSoundAt = 0

  init() {
    if (typeof window === "undefined") return
    if (this.initialized) {
      if (this.ctx?.state === "suspended") void this.ctx.resume()
      return
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
        if (this.ctx.state === "suspended") void this.ctx.resume()
      }
      this.preloadSfx()
      this.initialized = true
    } catch {
      // Ignore if browser blocks AudioContext
    }
  }

  private preloadSfx() {
    if (typeof window === "undefined") return
    ;(Object.keys(SFX_PATHS) as SfxKey[]).forEach((key) => {
      if (!this.sfxCache[key]) {
        try {
          const el = new Audio(SFX_PATHS[key])
          el.preload = "auto"
          this.sfxCache[key] = el
        } catch {
          // ignore
        }
      }
    })
  }

  setMuted(muted: boolean) {
    this.muted = muted
  }

  isMuted() {
    return this.muted
  }

  private playSfxFile(key: SfxKey, volume = 0.65, playbackRate = 1.0) {
    if (this.muted || typeof window === "undefined") return
    try {
      const base = this.sfxCache[key] ?? new Audio(SFX_PATHS[key])
      this.sfxCache[key] = base
      const clone = base.cloneNode(true) as HTMLAudioElement
      clone.volume = Math.max(0, Math.min(1, volume))
      clone.playbackRate = playbackRate
      clone.muted = this.muted
      void clone.play().catch(() => undefined)
    } catch {
      // fallback to synth only
    }
  }

  private playTone(options: {
    type: OscillatorType
    startFreq: number
    endFreq: number
    duration: number
    gain: number
    delay?: number
  }) {
    if (this.muted || typeof window === "undefined") return
    this.init()
    const ctx = this.ctx
    if (!ctx) return

    try {
      if (ctx.state === "suspended") void ctx.resume()
      const now = ctx.currentTime + (options.delay ?? 0)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = options.type
      osc.frequency.setValueAtTime(Math.max(20, options.startFreq), now)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, options.endFreq),
        now + options.duration
      )
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(options.gain, now + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + options.duration + 0.02)
    } catch {
      // ignore
    }
  }

  /** Button / UI click sound */
  playClick() {
    if (this.muted) return
    this.playTone({
      type: "sine",
      startFreq: 560,
      endFreq: 880,
      duration: 0.065,
      gain: 0.045,
    })
  }

  /** Slingshot elastic tension feedback while pulling */
  playSlingshotPull(normalizedPower: number) {
    if (this.muted) return
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    if (now - this.lastPullSoundAt < 110) return
    this.lastPullSoundAt = now
    const p = Math.max(0, Math.min(1, normalizedPower))
    this.playTone({
      type: "triangle",
      startFreq: 160 + p * 220,
      endFreq: 190 + p * 260,
      duration: 0.055,
      gain: 0.015 + p * 0.02,
    })
  }

  /** Slingshot release & projectile flight sound */
  playSlingshotRelease(normalizedPower: number) {
    if (this.muted) return
    const p = Math.max(0, Math.min(1, normalizedPower))
    // Elastic snap
    this.playTone({
      type: "triangle",
      startFreq: 210 + p * 180,
      endFreq: 95 + p * 55,
      duration: 0.14 + p * 0.08,
      gain: 0.028 + p * 0.035,
    })
    // Air flight whoosh
    this.playTone({
      type: "sine",
      startFreq: 340 + p * 240,
      endFreq: 140 + p * 90,
      duration: 0.22 + p * 0.1,
      gain: 0.018 + p * 0.02,
      delay: 0.03,
    })
  }

  /** Correct target impact (+100 points) */
  playCorrectHit(combo = 1) {
    if (this.muted) return
    const pitchBoost = Math.min(5, Math.max(0, combo - 1)) * 45
    this.playSfxFile("correctHit", 0.65, 1 + Math.min(0.3, (combo - 1) * 0.05))
    ;[0, 0.06, 0.12].forEach((delay, idx) => {
      this.playTone({
        type: "triangle",
        startFreq: 523.25 + pitchBoost + idx * 140,
        endFreq: 783.99 + pitchBoost + idx * 180,
        duration: 0.18,
        gain: 0.045,
        delay,
      })
    })
    if (combo >= 3) {
      this.playSfxFile("comboStreak", 0.72, 1 + Math.min(0.2, (combo - 3) * 0.05))
    }
  }

  /** Incorrect target impact (-50 points) */
  playWrongHit() {
    if (this.muted) return
    this.playSfxFile("wrongBuzzer", 0.58, 1.0)
    this.playTone({
      type: "sawtooth",
      startFreq: 230,
      endFreq: 95,
      duration: 0.26,
      gain: 0.04,
    })
  }

  /** Countdown tick (3 -> 2 -> 1) */
  playCountdown(step: number) {
    if (this.muted) return
    this.playSfxFile("countdownTick", 0.5, 1 + Math.max(0, 3 - step) * 0.1)
    const freq = step === 3 ? 520 : step === 2 ? 620 : 760
    this.playTone({
      type: "sine",
      startFreq: freq,
      endFreq: freq * 1.05,
      duration: 0.12,
      gain: 0.04,
    })
  }

  /** Game completion fanfare */
  playSummaryFanfare() {
    if (this.muted) return
    this.playSfxFile("winFanfare", 0.72, 1.0)
    this.playSfxFile("crowdCheer", 0.52, 1.0)
  }
}

export const gameAudio = new GameAudioEngine()

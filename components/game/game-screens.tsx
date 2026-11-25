"use client"

import { useEffect, useState } from "react"
import {
  ArrowRight,
  Award,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Crown,
  Flame,
  Home,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Trophy,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react"
import { getAward, sampleQuestions, type GameQuestion } from "@/lib/game-data"
import { GAME_SCORING, type ShotResult } from "@/lib/game-logic"
import {
  getCharacterById,
  PLAYER_CHARACTERS,
  type PlayerProfile,
} from "@/lib/characters"
import { gameAudio } from "@/lib/audio"
import { BrandMark, ManaMascot, PrimaryButton } from "./game-brand"
import { CharacterAvatar, type SetupStep } from "./player-setup-modal"
import type { ControlMode } from "./slingshot-game"
import { SlingshotIllustration, TargetBoard } from "./target-board"

export interface GameLandingProps {
  onStart: () => void
  playerProfile?: PlayerProfile | null
  onOpenPlayerSetup?: (step?: SetupStep) => void
  controlMode?: ControlMode
  onControlModeChange?: (mode: ControlMode) => void
}

export interface GameSummaryProps {
  score: number
  attempts: ShotResult[]
  questions?: GameQuestion[]
  onReplay: () => void
  onHome: () => void
  elapsed: number
  playerProfile?: PlayerProfile | null
  onOpenPlayerSetup?: (step?: SetupStep) => void
  controlMode?: ControlMode
  sessionId?: string
}

interface LeaderboardEntry {
  id: string
  playerName: string
  characterId: string
  characterName: string
  score: number
  correctCount: number
  totalQuestions: number
  elapsed: number
  controlMode: ControlMode
  timestamp: number
}

const LEADERBOARD_STORAGE_KEY = "manabie_ai_sniper_leaderboard_2026"

function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      LEADERBOARD_STORAGE_KEY,
      JSON.stringify(entries.slice(0, 50))
    )
  } catch {
    // ignore
  }
}

function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount
    if (b.score !== a.score) return b.score - a.score
    return a.elapsed - b.elapsed
  })
}

/* ============================================================================
 * SCREEN 01 - TRANG CHÀO MỪNG (WELCOME / LANDING PAGE - TUG-OF-WAR UI STYLE)
 * ============================================================================ */
export function GameLanding({
  onStart,
  playerProfile,
  onOpenPlayerSetup,
}: GameLandingProps) {
  const companion = playerProfile
    ? getCharacterById(playerProfile.characterId)
    : null

  return (
    <main className="screen landing-screen relative w-full h-full flex flex-col justify-between gap-2 sm:gap-3 p-3 sm:p-5 md:p-6 overflow-hidden ppt-page-enter">
      {/* Top Bar Chip */}
      <div className="flex items-center justify-between pb-0.5 shrink-0 pr-20 sm:pr-28">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#ebf9f1] border-2 border-[#16a34a] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
            <span className="text-[10px] sm:text-xs text-[#15803d] uppercase font-black">
              BƯỚC 01 / 05 • KHỞI ĐỘNG
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {playerProfile && companion ? (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onOpenPlayerSetup?.("confirm")
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ebf9f1] hover:bg-[#dcfce7] border-2 border-[#16a34a] text-[#1b3a8a] text-xs font-black cursor-pointer transition-all shadow-xs"
              title="Nhấn để đổi tên hoặc chọn lại nhân vật đồng hành"
            >
              <span className="w-5 h-5 rounded-full overflow-hidden bg-white border border-[#86efac] inline-flex shrink-0">
                <CharacterAvatar character={companion} />
              </span>
              <span className="truncate max-w-[110px] sm:max-w-[150px] text-[#15803d]">
                {playerProfile.playerName}
              </span>
              <SlidersHorizontal size={13} className="text-[#16a34a]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onOpenPlayerSetup?.("name")
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaf2ff] hover:bg-[#dbeafe] border-2 border-[#2563eb] text-[#1b3a8a] text-xs font-black cursor-pointer transition-all shadow-xs"
            >
              <UserPlus size={14} className="text-[#2563eb]" />
              <span>Tạo Xạ Thủ &amp; Chọn Đồng Hành (36)</span>
            </button>
          )}
          <span className="hidden md:inline-block text-[11px] text-[#f47920] uppercase tracking-[0.12em] font-black">
            SỞ GD&amp;ĐT • MANABIE EDTECH
          </span>
        </div>
      </div>

      {/* Title Block */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-[#1b3a8a] uppercase leading-tight">
          THỬ TÀI XẠ THỦ AI •{" "}
          <span className="text-[#2563eb]">
            ĐẤU TRƯỜNG BẮN BIA TRÍ TUỆ NHÂN TẠO
          </span>
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 font-bold">
          Khám phá và phân biệt hoạt động ứng dụng Trí tuệ nhân tạo (AI) với thiết bị Tự động hóa thông thường
        </p>
      </div>

      {/* Central Split Pastel Arena Showcase */}
      <div className="flex-1 min-h-0 p-3 sm:p-5 rounded-3xl mana-split-arena flex flex-col justify-between gap-2.5 sm:gap-3.5 overflow-hidden">
        {/* Pedagogical Greeting Row */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-[260px]">
            <img
              alt="Mascot Mana chào đón"
              className="w-14 h-14 sm:w-20 sm:h-20 object-contain shrink-0 drop-shadow-[0_6px_14px_rgba(27,58,138,0.22)] ppt-mascot-enter"
              src="/assets/tutorial/popup-mascot-welcome-v3/mana-welcome-loop-v3.gif"
            />
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#15803d] uppercase text-xs font-black px-3 py-0.5 rounded-full bg-white/85 border border-[#86efac] shadow-xs">
                  MANA TRỢ LÝ SƯ PHẠM
                </span>
                <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-ping" />
              </div>
              <p className="text-xs sm:text-base md:text-lg text-[#1b3a8a] font-semibold leading-snug">
                Quan sát tình huống đời sống, kéo chiếc ná cao su hoạt hình 2D và bắn viên đạn năng lượng vào{" "}
                <strong className="text-[#15803d] font-black underline decoration-2 decoration-[#16a34a]">
                  Bia Trái (Không có AI)
                </strong>{" "}
                hoặc{" "}
                <strong className="text-[#2563eb] font-black underline decoration-2 decoration-[#2563eb]">
                  Bia Phải (Có AI)
                </strong>
                !
              </p>
            </div>
          </div>

          {playerProfile && companion && (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onOpenPlayerSetup?.("character")
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/90 hover:bg-white border-2 border-[#16a34a] shadow-[0_4px_0_#0b5626] cursor-pointer transition-transform hover:-translate-y-0.5 shrink-0"
            >
              <div className="w-11 h-11 rounded-xl bg-[#ebf9f1] border border-[#86efac] p-1 shrink-0">
                <CharacterAvatar character={companion} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9.5px] font-black uppercase text-[#15803d] tracking-wider">
                  Xạ thủ &amp; Đồng hành
                </span>
                <b className="text-xs sm:text-sm font-black text-[#1b3a8a]">
                  {playerProfile.playerName} • {companion.name}
                </b>
                <span className="text-[10px] font-bold text-[#2563eb]">
                  Nhấn để đổi nhân vật (36) ›
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Center Stage Showcase with Targets, 2D Cartoon Slingshot & Companion */}
        <div className="flex-1 min-h-0 flex items-center justify-around relative px-3 sm:px-8 py-2 rounded-2xl bg-white/75 backdrop-blur-xs border-2 border-white shadow-inner overflow-hidden">
          {/* Left Target Preview */}
          <div className="flex flex-col items-center gap-1.5 z-10">
            <span className="mana-keep-white px-3 py-0.5 rounded-full bg-[#16a34a] text-white text-[10px] sm:text-xs font-black uppercase shadow-xs">
              👈 BIA SỐ 01 • QUY TẮC CỐ ĐỊNH
            </span>
            <div className="scale-90 sm:scale-100">
              <TargetBoard side="non-ai" compact />
            </div>
          </div>

          {/* Center 2D Cartoon Slingshot & Companion Showcase */}
          <div className="flex flex-col items-center justify-center relative z-10 mx-2">
            <div className="mana-vs-badge px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase mb-1">
              🎯 10 TÌNH HUỐNG • +100 / -50 ĐIỂM
            </div>
            <div className="flex items-end justify-center gap-2 sm:gap-4">
              {companion && (
                <div className="hidden sm:flex flex-col items-center gap-1 animate-float">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#ebf9f1] border-3 border-[#16a34a] p-1.5 shadow-[0_4px_0_#0b5626]">
                    <CharacterAvatar character={companion} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#16a34a] text-white text-[9px] font-black">
                    {companion.name}
                  </span>
                </div>
              )}
              <div className="w-24 sm:w-32 md:w-36">
                <SlingshotIllustration />
              </div>
              <div className="hidden sm:block scale-90">
                <ManaMascot small />
              </div>
            </div>
          </div>

          {/* Right Target Preview */}
          <div className="flex flex-col items-center gap-1.5 z-10">
            <span className="mana-keep-white px-3 py-0.5 rounded-full bg-[#2563eb] text-white text-[10px] sm:text-xs font-black uppercase shadow-xs">
              👉 BIA SỐ 02 • HỌC &amp; NHẬN BIẾT
            </span>
            <div className="scale-90 sm:scale-100">
              <TargetBoard side="ai" compact />
            </div>
          </div>
        </div>

        {/* Bottom Team / Target Legend */}
        <div className="flex items-center justify-between text-[11px] sm:text-xs md:text-sm font-bold text-slate-600 px-2 shrink-0 flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-[#15803d]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
            Bia Không Có AI: Thiết bị hẹn giờ, máy tính bỏ túi, công tắc cơ học
          </span>
          <span className="flex items-center gap-1.5 text-[#1d4ed8]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
            Bia Có AI: Nhận diện khuôn mặt, trợ lý giọng nói, gợi ý &amp; dịch thuật thông minh
          </span>
        </div>
      </div>

      {/* Bottom 3D Orange CTA Button */}
      <div className="pt-0.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            gameAudio.init()
            gameAudio.playClick()
            onStart()
          }}
          className="btn-mana-orange group w-full py-3 sm:py-3.5 lg:py-4 px-5 rounded-full text-xs sm:text-base lg:text-lg font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          <span>TIẾP TỤC: CHỌN PHƯƠNG THỨC TƯƠNG TÁC (BƯỚC 02)</span>
          <ArrowRight
            size={20}
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </main>
  )
}

/* ============================================================================
 * SCREEN 04 - TRANG TỔNG KẾT & BẢNG VINH DANH TOP 1-2-3 (TUG-OF-WAR UI STYLE)
 * ============================================================================ */
export function GameSummary({
  score,
  attempts,
  questions = sampleQuestions,
  onReplay,
  onHome,
  elapsed,
  playerProfile,
  onOpenPlayerSetup,
  controlMode = "mouse",
  sessionId = "session-default",
}: GameSummaryProps) {
  const [victoryPopupOpen, setVictoryPopupOpen] = useState(true)
  const [summaryTab, setSummaryTab] = useState<"dashboard" | "review">("dashboard")
  const [filterMode, setFilterMode] = useState<"all" | "correct" | "wrong">("all")
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  const totalQuestions =
    attempts.length > 0 ? attempts.length : questions.length
  const correctCount = attempts.filter((attempt) => attempt.correct).length
  const wrongCount = Math.max(0, totalQuestions - correctCount)
  const accuracy = Math.round(
    (correctCount / Math.max(1, totalQuestions)) * 100
  )
  const minutes = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0")
  const seconds = (elapsed % 60).toString().padStart(2, "0")
  const companion = playerProfile
    ? getCharacterById(playerProfile.characterId)
    : PLAYER_CHARACTERS[0]

  // Calculate max consecutive correct streak
  let currentStreak = 0
  let maxWinStreak = 0
  for (const a of attempts) {
    if (a.correct) {
      currentStreak += 1
      if (currentStreak > maxWinStreak) maxWinStreak = currentStreak
    } else {
      currentStreak = 0
    }
  }

  // Record finished session into localStorage Leaderboard
  useEffect(() => {
    const existing = loadLeaderboard()
    if (attempts.length === 0) {
      setLeaderboard(sortLeaderboard(existing))
      return
    }
    const newEntry: LeaderboardEntry = {
      id: sessionId,
      playerName: playerProfile?.playerName || "Xạ Thủ Manabie",
      characterId: companion.id,
      characterName: companion.name,
      score,
      correctCount,
      totalQuestions,
      elapsed: Math.max(1, elapsed),
      controlMode,
      timestamp: Date.now(),
    }
    const filtered = existing.filter((e) => e.id !== sessionId)
    const updated = sortLeaderboard([newEntry, ...filtered])
    saveLeaderboard(updated)
    setLeaderboard(updated)
  }, [
    attempts.length,
    companion.id,
    companion.name,
    controlMode,
    correctCount,
    elapsed,
    playerProfile?.playerName,
    score,
    sessionId,
    totalQuestions,
  ])

  const reviewItems = attempts.map((attempt, index) => {
    const q =
      questions.find((item) => item.id === attempt.questionId) ??
      questions[index] ??
      sampleQuestions[index % sampleQuestions.length]
    return {
      index: index + 1,
      question: q,
      attempt,
    }
  })

  const filteredReview = reviewItems.filter((item) => {
    if (filterMode === "correct") return item.attempt.correct
    if (filterMode === "wrong") return !item.attempt.correct
    return true
  })

  const topThree = leaderboard.slice(0, 3)

  return (
    <main
      className="summary-tug-wrapper flex flex-col w-full max-w-7xl mx-auto gap-3.5 sm:gap-4 relative ppt-page-enter"
      data-state="completed"
    >
      {/* VICTORY POPUP MODAL ON COMPLETION (TUG-OF-WAR STYLE) */}
      {victoryPopupOpen && (
        <div
          className="fixed inset-0 z-[95] bg-[#1b3a8a]/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none"
          onClick={() => setVictoryPopupOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white border-4 border-[#2563eb] p-4 sm:p-6 shadow-[0_8px_0_#133478,0_24px_60px_rgba(27,58,138,0.28)] flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center rounded-2xl bg-[#ebf9f1] border-3 border-[#16a34a] p-1 overflow-hidden shadow-[0_3px_0_#0b5626]">
                <CharacterAvatar character={companion} className="w-full h-full" />
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 mb-0.5 text-[#15803d] font-black text-xs uppercase">
                  <Trophy size={14} />
                  <span className="truncate">
                    {playerProfile
                      ? `XẠ THỦ: ${playerProfile.playerName} • ${companion.name}`
                      : "HOÀN THÀNH ĐẤU TRƯỜNG XẠ THỦ AI"}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-[#1b3a8a] uppercase leading-tight">
                  DANH HIỆU:{" "}
                  <span className="text-[#16a34a]">{getAward(accuracy)}</span>
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 font-semibold leading-snug">
              Chúc mừng xạ thủ đã hoàn thành {totalQuestions} tình huống phân biệt Trí tuệ nhân tạo (AI) và Tự động hóa với tổng điểm{" "}
              <strong className="text-[#2563eb] font-black">{score} PTS</strong>!
            </p>

            {/* Accuracy Progress Bar inside Popup */}
            <div className="mana-split-arena rounded-2xl p-3">
              <div className="flex justify-between items-center mb-1.5 text-[10px] sm:text-xs uppercase font-black">
                <span className="text-[#15803d]">
                  BẮN TRÚNG: {correctCount}/{totalQuestions} CÂU ({accuracy}%)
                </span>
                <span className="mana-vs-badge px-2.5 py-0.5 rounded-full text-[10px]">
                  {score} ĐIỂM
                </span>
                <span className="text-[#2563eb]">
                  THỜI GIAN: {minutes}:{seconds}
                </span>
              </div>
              <div className="h-3 w-full bg-white rounded-full relative overflow-hidden flex border-2 border-[#cbd5e1]">
                <div
                  className="h-full bg-gradient-to-r from-[#16a34a] via-[#22c55e] to-[#2563eb] rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(12, accuracy)}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick()
                  setVictoryPopupOpen(false)
                  onReplay()
                }}
                className="btn-mana-green w-full sm:w-auto px-4 py-2 rounded-full text-xs font-black cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Chơi lại</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick()
                  setSummaryTab("review")
                  setVictoryPopupOpen(false)
                }}
                className="btn-mana-blue w-full sm:w-auto px-4 py-2 rounded-full text-xs font-black cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ClipboardCheck size={14} />
                <span>Xem Đáp án chi tiết</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick()
                  setSummaryTab("dashboard")
                  setVictoryPopupOpen(false)
                }}
                className="btn-mana-orange w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trophy size={15} />
                <span>XEM BẢNG VINH DANH TOP 1-2-3</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP NAVIGATION BAR WITH TABS */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mana-card-3d px-4 py-2.5 rounded-2xl pr-20 sm:pr-28">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#ebf9f1] border-2 border-[#16a34a] text-[#15803d] text-[10px] sm:text-xs uppercase font-black">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
            BƯỚC 05 / 05 • TỔNG KẾT &amp; THỐNG KÊ
          </span>
        </div>

        {/* 2 Tab Switcher: Dashboard & Question Review */}
        <div className="flex items-center bg-[#f4f8ff] rounded-full p-1 gap-1.5 border-2 border-[#bfdbfe]">
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick()
              setSummaryTab("dashboard")
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
              summaryTab === "dashboard"
                ? "btn-mana-orange"
                : "text-slate-600 hover:text-[#1b3a8a] hover:bg-white"
            }`}
          >
            <Trophy size={14} />
            <span>BẢNG VINH DANH &amp; TOP 1-2-3</span>
          </button>

          <button
            type="button"
            onClick={() => {
              gameAudio.playClick()
              setSummaryTab("review")
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
              summaryTab === "review"
                ? "btn-mana-blue"
                : "text-slate-600 hover:text-[#1b3a8a] hover:bg-white"
            }`}
          >
            <ClipboardCheck size={14} />
            <span>THỐNG KÊ CHI TIẾT CÂU HỎI ({totalQuestions})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            gameAudio.playClick()
            setVictoryPopupOpen(true)
          }}
          className="text-xs text-[#2563eb] hover:underline uppercase cursor-pointer flex items-center gap-1 font-black"
        >
          <Award size={15} />
          <span>Xem lại Popup</span>
        </button>
      </div>

      {/* TAB 1: HERO SUMMARY & TOP 1-2-3 LEADERBOARD */}
      {summaryTab === "dashboard" ? (
        <div className="flex flex-col gap-4 w-full">
          {/* Hero Summary Card (preserving V0 celebration & stats inside 3D Mana card) */}
          <div className="mana-card-3d rounded-3xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-5 summary-celebration relative min-h-[210px] rounded-2xl mana-split-arena flex items-center justify-center p-4">
              <div className="confetti confetti-a">+</div>
              <div className="confetti confetti-b">+</div>
              <div className="confetti confetti-c">+</div>
              <div className="flex items-center gap-3">
                <ManaMascot />
                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-3 border-[#16a34a] p-1.5 shadow-[0_4px_0_#0b5626]">
                    <CharacterAvatar character={companion} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#16a34a] text-white text-[10px] font-black">
                    {companion.name}
                  </span>
                </div>
              </div>
              <div className="summary-medal">
                <span>+</span>
                <b>
                  {accuracy}
                  <small>%</small>
                </b>
                <span>CHÍNH XÁC</span>
              </div>
            </div>

            <div className="md:col-span-7 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#fff3e6] border border-[#fdba74] text-[#d47d2d] text-xs font-black uppercase tracking-wider">
                  <Sparkles size={13} className="inline mr-1" />
                  {getAward(accuracy)}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#ebf9f1] border border-[#86efac] text-[#15803d] text-xs font-black">
                  Đồng hành: {companion.name}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-[#1b3a8a] uppercase leading-tight m-0">
                XẠ THỦ AI:{" "}
                <span className="text-[#2563eb]">
                  {playerProfile ? playerProfile.playerName : "XUẤT SẮC!"}
                </span>
              </h1>

              {/* 5 KPI Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="p-2.5 rounded-xl bg-[#eaf2ff] border-2 border-[#93c5fd] flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-600">
                    Tổng điểm
                  </span>
                  <b className="text-lg sm:text-xl font-black text-[#2563eb] font-mono">
                    {score}
                  </b>
                </div>
                <div className="p-2.5 rounded-xl bg-[#ebf9f1] border-2 border-[#86efac] flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-600">
                    Bắn đúng
                  </span>
                  <b className="text-lg sm:text-xl font-black text-[#15803d] font-mono">
                    {correctCount}/{totalQuestions}
                  </b>
                </div>
                <div className="p-2.5 rounded-xl bg-red-50 border-2 border-red-300 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-600">
                    Bắn sai
                  </span>
                  <b className="text-lg sm:text-xl font-black text-red-600 font-mono">
                    {wrongCount}
                  </b>
                </div>
                <div className="p-2.5 rounded-xl bg-[#fff7ed] border-2 border-[#fdba74] flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-600">
                    Thời gian
                  </span>
                  <b className="text-lg sm:text-xl font-black text-[#ea580c] font-mono">
                    {minutes}:{seconds}
                  </b>
                </div>
                <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-[#ebf9f1] border-2 border-[#86efac] flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-600">
                    Chuỗi thắng
                  </span>
                  <b className="text-lg sm:text-xl font-black text-[#15803d] font-mono">
                    🔥 x{maxWinStreak}
                  </b>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#f4f8ff] border border-[#bfdbfe] flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="text-xs text-slate-700 font-semibold leading-relaxed">
                  <strong className="text-[#1b3a8a] font-black block uppercase text-[10.5px]">
                    ĐÚC KẾT SƯ PHẠM MANABIE:
                  </strong>
                  Thiết bị làm theo lịch hẹn cố định là Tự động hóa (Rule-based). Thiết bị có khả năng học từ dữ liệu, nhận diện khuôn mặt, giọng nói, dịch thuật hay gợi ý thông minh mới là Trí tuệ nhân tạo (AI)!
                </div>
              </div>
            </div>
          </div>

          {/* LIVE CLASSROOM LEADERBOARD TOP 1 - 2 - 3 */}
          <div className="mana-card-3d rounded-3xl p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] animate-ping" />
                  <span className="text-[10px] font-black uppercase text-[#15803d] tracking-wider">
                    LIVE CLASSROOM DASHBOARD • ĐẤU TRƯỜNG XẠ THỦ AI
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-[#1b3a8a] uppercase mt-0.5">
                  BẢNG VINH DANH <span className="text-[#2563eb]">TOP 1 - 2 - 3</span> XẠ THỦ XUẤT SẮC
                </h2>
              </div>

              {leaderboard.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick()
                    saveLeaderboard([])
                    setLeaderboard([])
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Làm mới BXH</span>
                </button>
              )}
            </div>

            {topThree.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {topThree.map((entry, idx) => {
                  const char = getCharacterById(entry.characterId)
                  const rankColors = [
                    "from-[#fffbeb] to-[#fef3c7] border-[#f59e0b] shadow-[0_5px_0_#b45309]",
                    "from-[#f8fafc] to-[#e2e8f0] border-[#64748b] shadow-[0_5px_0_#334155]",
                    "from-[#fff7ed] to-[#ffedd5] border-[#ea580c] shadow-[0_5px_0_#9a3412]",
                  ]
                  const badgeColors = [
                    "bg-[#f59e0b] text-white",
                    "bg-[#64748b] text-white",
                    "bg-[#ea580c] text-white",
                  ]
                  return (
                    <div
                      key={entry.id}
                      className={`rounded-2xl bg-gradient-to-b border-3 p-3.5 flex items-center gap-3 ${rankColors[idx]}`}
                    >
                      <div className="relative w-14 h-14 rounded-2xl bg-white border-2 border-[#16a34a] p-1 shrink-0">
                        <CharacterAvatar character={char} />
                        <span
                          className={`mana-keep-white absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 border-white shadow ${badgeColors[idx]}`}
                        >
                          {idx + 1}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <Crown
                            size={14}
                            className={
                              idx === 0
                                ? "text-[#d97706]"
                                : idx === 1
                                ? "text-slate-600"
                                : "text-[#ea580c]"
                            }
                          />
                          <b className="text-sm sm:text-base font-black text-[#1b3a8a] truncate">
                            {entry.playerName}
                          </b>
                        </div>
                        <span className="text-[11px] font-bold text-[#15803d] truncate">
                          Đồng hành: {char.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-xs font-mono font-black">
                          <span className="text-[#2563eb]">{entry.score} PTS</span>
                          <span>•</span>
                          <span className="text-[#15803d]">
                            {entry.correctCount}/{entry.totalQuestions} Đúng
                          </span>
                          <span>•</span>
                          <span className="text-slate-600">{entry.elapsed}s</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl bg-[#f8fbff] border border-[#dbeafe] text-slate-500 text-sm font-semibold">
                Hãy hoàn thành lượt bắn để ghi danh lên Bảng Vinh Danh Top 1-2-3!
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl mana-card-3d">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick()
                  onReplay()
                }}
                className="btn-mana-orange inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-black text-xs sm:text-sm cursor-pointer uppercase"
              >
                <RotateCcw size={17} />
                <span>CHƠI LẠI TRẬN MỚI</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick()
                  onOpenPlayerSetup?.("character")
                }}
                className="btn-mana-green inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full text-xs sm:text-sm font-black cursor-pointer"
              >
                <UserCheck size={17} />
                <span>Đổi Nhân Vật (36)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick()
                  onHome()
                }}
                className="btn-mana-blue inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full text-xs sm:text-sm font-black cursor-pointer"
              >
                <Home size={17} />
                <span>Về Trang Chủ</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                setSummaryTab("review")
              }}
              className="text-[#2563eb] hover:underline text-xs sm:text-sm font-black flex items-center gap-1 cursor-pointer"
            >
              <span>Xem thống kê chi tiết từng câu hỏi</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* TAB 2: DETAILED QUESTION REVIEW & PEDAGOGICAL INSIGHTS */
        <div className="flex flex-col gap-3.5 w-full">
          {/* Filter Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl mana-card-3d flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="mana-keep-white w-10 h-10 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Brain size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-[#2563eb] tracking-wider block">
                  BẢNG THỐNG KÊ CHI TIẾT &amp; ĐÁNH GIÁ SƯ PHẠM
                </span>
                <p className="text-xs sm:text-sm text-[#1b3a8a] font-semibold m-0">
                  Xem lại chi tiết từng tình huống đã bắn để đối chiếu cách ứng dụng AI trong đời sống.
                </p>
              </div>
            </div>

            <div className="flex items-center bg-[#f4f8ff] rounded-full p-1 border-2 border-[#bfdbfe] shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                  filterMode === "all"
                    ? "btn-mana-blue"
                    : "text-slate-600 hover:text-[#1b3a8a]"
                }`}
              >
                Tất cả ({reviewItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("correct")}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                  filterMode === "correct"
                    ? "btn-mana-green"
                    : "text-slate-600 hover:text-[#15803d]"
                }`}
              >
                ✅ Đúng ({correctCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("wrong")}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                  filterMode === "wrong"
                    ? "btn-mana-red"
                    : "text-slate-600 hover:text-red-600"
                }`}
              >
                ❌ Chưa đúng ({wrongCount})
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="flex flex-col gap-3">
            {filteredReview.length === 0 ? (
              <div className="p-8 text-center rounded-2xl mana-card-3d text-slate-600 font-semibold">
                Không có câu hỏi nào trong bộ lọc này.
              </div>
            ) : (
              filteredReview.map(({ index, question, attempt }) => (
                <div
                  key={`${question.id}-${index}`}
                  className={`rounded-2xl p-4 border-2 bg-white shadow-sm ${
                    attempt.correct ? "border-[#16a34a]" : "border-red-400"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="mana-keep-white font-mono text-xs font-black px-2.5 py-0.5 rounded-full bg-[#1b3a8a] text-white">
                        CÂU {String(index).padStart(2, "0")} /{" "}
                        {String(totalQuestions).padStart(2, "0")}
                      </span>
                      <span className="text-xs uppercase text-slate-600 tracking-wider font-extrabold">
                        {question.category}
                      </span>
                    </div>

                    <span
                      className={`mana-keep-white inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                        attempt.correct
                          ? "bg-[#16a34a] text-white"
                          : "bg-[#dc2626] text-white"
                      }`}
                    >
                      {attempt.correct ? (
                        <>
                          <CheckCircle2 size={14} /> ĐÚNG (+
                          {GAME_SCORING.CORRECT_ANSWER} PTS)
                        </>
                      ) : (
                        <>
                          <XCircle size={14} /> CHƯA ĐÚNG (-
                          {GAME_SCORING.WRONG_ANSWER} PTS)
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-2.5">
                    {question.image && (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#f4f8ff] border-2 border-[#bfdbfe] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                        <img
                          src={question.image}
                          alt={question.toolName || question.category}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {question.toolName && (
                        <span className="text-[10px] font-black uppercase text-[#2563eb] tracking-wider block mb-0.5">
                          {question.toolName}
                        </span>
                      )}
                      <h4 className="text-sm sm:text-base font-extrabold text-[#1b3a8a] leading-snug m-0">
                        “{question.question}”
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                    <div
                      className={`p-2.5 rounded-xl border-2 flex items-center justify-between ${
                        attempt.correct
                          ? "bg-[#ebf9f1] border-[#86efac]"
                          : "bg-red-50 border-red-300"
                      }`}
                    >
                      <span className="text-xs uppercase text-slate-600 font-bold">
                        Bia em đã bắn:
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-black ${
                          attempt.correct ? "text-[#15803d]" : "text-red-600"
                        }`}
                      >
                        {attempt.answer === "ai"
                          ? "👉 CÓ SỬ DỤNG AI"
                          : "👈 KHÔNG CÓ AI"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border-2 bg-[#eaf2ff] border-[#93c5fd] flex items-center justify-between">
                      <span className="text-xs uppercase text-slate-600 font-bold">
                        Đáp án chuẩn sư phạm:
                      </span>
                      <span className="text-xs sm:text-sm font-black text-[#2563eb] flex items-center gap-1">
                        <ShieldCheck size={15} />
                        {question.correctAnswer === "ai"
                          ? "👉 CÓ SỬ DỤNG AI"
                          : "👈 KHÔNG CÓ AI"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#f8fbff] border border-[#bfdbfe] flex items-start gap-2.5">
                    <div className="mana-keep-white w-6 h-6 rounded-lg bg-[#2563eb] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Brain size={14} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black uppercase text-[#2563eb] tracking-wider">
                        GIẢI THÍCH SƯ PHẠM (MANABIE INSIGHT):
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed m-0">
                        {question.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl mana-card-3d">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick()
                  onReplay()
                }}
                className="btn-mana-orange inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-black text-xs sm:text-sm cursor-pointer uppercase"
              >
                <RotateCcw size={17} />
                <span>CHƠI LẠI TRẬN MỚI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick()
                  onHome()
                }}
                className="btn-mana-blue inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full text-xs sm:text-sm font-black cursor-pointer"
              >
                <Home size={17} />
                <span>Về Trang Chủ</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                setSummaryTab("dashboard")
              }}
              className="text-[#2563eb] hover:underline text-xs sm:text-sm font-black flex items-center gap-1 cursor-pointer"
            >
              <Trophy size={16} />
              <span>Quay lại Bảng Vinh Danh Top 1-2-3</span>
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

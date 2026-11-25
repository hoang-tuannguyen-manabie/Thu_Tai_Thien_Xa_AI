"use client"

import { useCallback, useRef, useState } from "react"
import {
  BookOpen,
  Camera,
  CircleHelp,
  MousePointerClick,
  Pause,
  Play,
  SlidersHorizontal,
  Timer,
  X,
} from "lucide-react"
import type { GameQuestion, TargetKind } from "@/lib/game-data"
import type { GameplayPhase, ShotResult } from "@/lib/game-logic"
import {
  getCharacterById,
  PLAYER_CHARACTERS,
  type PlayerProfile,
} from "@/lib/characters"
import { gameAudio } from "@/lib/audio"
import { ARHandController, type ARHandFrame } from "./ar-hand-controller"
import type { GameVisualState } from "./game-types"
import { FeedbackOverlay } from "./answer-feedback"
import { SlingshotGame, type ControlMode } from "./slingshot-game"
import { ManaMascot } from "./game-brand"
import { TargetBoard } from "./target-board"
import { CharacterAvatar } from "./player-setup-modal"

export interface GameArenaProps {
  questions: GameQuestion[]
  questionIndex: number
  score: number
  attempts: ShotResult[]
  correctCount: number
  paused: boolean
  onPause: () => void
  onShot: (target: TargetKind) => void
  onNext: () => void
  feedback: ShotResult | null
  soundOn: boolean
  onSound: () => void
  visualState: GameVisualState
  gameplayPhase?: GameplayPhase
  onInteractionStateChange?: (
    state: "idle" | "dragging" | "aiming" | "shooting" | "collision"
  ) => void
  playerProfile?: PlayerProfile | null
  onOpenPlayerSetup?: () => void
  controlMode?: ControlMode
  onControlModeChange?: (mode: ControlMode) => void
  elapsed?: number
}

export function GameArena({
  questions,
  questionIndex,
  score,
  attempts,
  correctCount,
  paused,
  onPause,
  onShot,
  onNext,
  feedback,
  soundOn,
  visualState,
  gameplayPhase = "QUESTION_ACTIVE",
  onInteractionStateChange,
  playerProfile,
  onOpenPlayerSetup,
  controlMode = "mouse",
  onControlModeChange,
  elapsed = 0,
}: GameArenaProps) {
  const question = questions[questionIndex]
  const attemptsSinceMiss = attempts
    .slice()
    .reverse()
    .findIndex((attempt) => !attempt.correct)
  const combo = attemptsSinceMiss === -1 ? attempts.length : attemptsSinceMiss
  const answeredCount = Math.min(
    questionIndex + (feedback ? 1 : 0),
    questions.length
  )
  const progressPercent = Math.max(
    10,
    Math.round(((questionIndex + (feedback ? 1 : 0)) / Math.max(1, questions.length)) * 100)
  )
  const [guideModalOpen, setGuideModalOpen] = useState(false)
  const [imgError, setImgError] = useState(false)

  const companion = playerProfile
    ? getCharacterById(playerProfile.characterId)
    : PLAYER_CHARACTERS[0]
  const arHandFrameRef = useRef<((frame: ARHandFrame) => void) | null>(null)

  const handleARHandFrame = useCallback((frame: ARHandFrame) => {
    arHandFrameRef.current?.(frame)
  }, [])

  const minutes = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0")
  const seconds = (elapsed % 60).toString().padStart(2, "0")

  return (
    <main
      className={`game-screen relative flex flex-col w-full h-full max-h-full justify-between gap-1.5 sm:gap-2 p-2 sm:p-3 md:p-4 select-none overflow-hidden bg-transparent ppt-page-enter ${
        feedback
          ? feedback.correct
            ? "arena-shake-win"
            : "arena-shake-lose"
          : ""
      }`}
      data-state={visualState}
      data-phase={gameplayPhase}
      data-control-mode={controlMode}
    >
      {/* =====================================================================
       * ROW 1: TOP HUD BAR (MATCHING TUG-OF-WAR GAMEPLAY HUD)
       * ===================================================================== */}
      <div className="flex items-center justify-between gap-2 px-1 shrink-0 pr-20 sm:pr-28">
        {/* Left: Player & Companion Avatar + Name + Score + Streak */}
        <button
          type="button"
          onClick={() => {
            gameAudio.playClick()
            onOpenPlayerSetup?.()
          }}
          className="flex items-center gap-2 min-w-0 shrink cursor-pointer group text-left"
          title="Nhấn để đổi tên hoặc nhân vật đồng hành"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#ebf9f1] border-2 border-[#16a34a] p-0.5 shrink-0 shadow-[0_2px_0_#0b5626] overflow-hidden group-hover:scale-105 transition-transform">
            <CharacterAvatar character={companion} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-[#1b3a8a] font-black uppercase tracking-wide truncate max-w-[90px] sm:max-w-[160px]">
                {playerProfile ? playerProfile.playerName : "XẠ THỦ AI"}
              </span>
              <SlidersHorizontal size={11} className="text-[#16a34a] shrink-0" />
              {combo >= 2 && (
                <span className="mana-keep-white px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-[#16a34a] text-white shrink-0">
                  🔥x{combo}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-xs sm:text-base font-black text-[#15803d] leading-none">
                {score.toLocaleString("vi-VN")}
              </span>
              <span className="text-[9px] text-[#15803d] font-bold">PTS</span>
              <span className="hidden sm:inline-block text-[10px] text-slate-500 font-bold ml-1">
                ({companion.name})
              </span>
            </div>
          </div>
        </button>

        {/* Center: Question Progress & Timer Pill */}
        <div className="flex flex-col items-center justify-center gap-1 px-2 flex-1 max-w-[160px] sm:max-w-xs md:max-w-sm shrink-0">
          <div className="flex items-center justify-between w-full text-[9.5px] sm:text-[10.5px] font-black">
            <span className="text-[#1b3a8a] font-mono whitespace-nowrap">
              CÂU {String(questionIndex + 1).padStart(2, "0")}/
              {String(questions.length).padStart(2, "0")}
            </span>
            <div className="mana-camera-pill inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10.5px] font-black font-mono shrink-0">
              <Timer size={12} />
              <span>
                {minutes}:{seconds}
              </span>
            </div>
          </div>

          {/* Split Progress Bar */}
          <div
            className="w-full h-2 sm:h-2.5 bg-[#e2e8f0] rounded-full p-0.5 relative overflow-hidden flex items-center border-2 border-[#cbd5e1]"
            role="progressbar"
            aria-label="Tiến độ câu hỏi"
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={answeredCount}
          >
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#f47920] -translate-x-1/2 z-10" />
            <div
              className="h-full bg-gradient-to-r from-[#16a34a] via-[#22c55e] to-[#2563eb] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Accuracy Stats, Control Mode Switcher, Pause & Help */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end shrink">
          {onControlModeChange && (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                onControlModeChange(controlMode === "ar" ? "mouse" : "ar")
              }}
              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase cursor-pointer border-2 transition-all ${
                controlMode === "ar"
                  ? "bg-[#fff7ed] border-[#f47920] text-[#ea580c] shadow-[0_2px_0_#c2410c]"
                  : "bg-[#eaf2ff] border-[#2563eb] text-[#2563eb] shadow-[0_2px_0_#133478]"
              }`}
              title="Chuyển đổi giữa Chế độ Camera AR (Tay) và Chuột / Cảm ứng"
            >
              {controlMode === "ar" ? (
                <>
                  <Camera size={12} />
                  <span>AR CAM</span>
                </>
              ) : (
                <>
                  <MousePointerClick size={12} />
                  <span>CHUỘT</span>
                </>
              )}
            </button>
          )}

          <div className="flex flex-col text-right min-w-0">
            <span className="hidden xs:inline-block text-[9px] sm:text-[10px] text-[#2563eb] font-black uppercase tracking-wider truncate">
              BẮN TRÚNG
            </span>
            <div className="flex items-baseline justify-end gap-0.5 font-mono">
              <span className="text-xs sm:text-base font-black text-[#2563eb] leading-none">
                {String(correctCount).padStart(2, "0")}
              </span>
              <span className="text-[9px] text-slate-500 font-bold">
                /{questions.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              gameAudio.playClick()
              onPause()
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full btn-mana-blue flex items-center justify-center cursor-pointer shrink-0"
            title={paused ? "Tiếp tục" : "Tạm dừng"}
            aria-label={paused ? "Tiếp tục" : "Tạm dừng"}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>

          <button
            type="button"
            onClick={() => {
              gameAudio.playClick()
              setGuideModalOpen(true)
            }}
            className="hidden md:flex w-7 h-7 sm:w-8 sm:h-8 rounded-full btn-mana-orange items-center justify-center cursor-pointer shrink-0"
            title="Xem nhanh hướng dẫn cách chơi"
            aria-label="Xem nhanh hướng dẫn cách chơi"
          >
            <CircleHelp size={15} />
          </button>
        </div>
      </div>

      {/* =====================================================================
       * ROW 2: PROMINENT 3D QUESTION & TOOL BANNER (MATCHING TUG-OF-WAR ROW 2)
       * ===================================================================== */}
      <article className="question-card-tug rounded-2xl sm:rounded-3xl bg-white/95 border-2 sm:border-3 border-[#93c5fd] px-3 sm:px-5 py-2 sm:py-2.5 flex items-center gap-3 sm:gap-4 shrink-0 shadow-[0_5px_0_#cbd5e1,0_10px_24px_rgba(27,58,138,0.08)]">
        {/* Large 3D Tool Illustration */}
        <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-2xl bg-[#eff6ff] border-2 border-[#bfdbfe] p-1.5 shrink-0 flex items-center justify-center shadow-xs">
          {question.image && !imgError ? (
            <img
              src={question.image}
              alt={question.toolName || question.category}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-base font-black text-[#2563eb]">AI</span>
          )}
        </div>

        {/* Tool Kicker & High-Contrast Question Text */}
        <div className="flex flex-col min-w-0 flex-1 justify-center gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mana-keep-white px-2.5 py-0.5 sm:px-3 sm:py-0.5 rounded-full bg-[#2563eb] text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-2xs">
              TÌNH HUỐNG {questionIndex + 1}/{questions.length}:{" "}
              {question.toolName || question.category}
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#ebf9f1] border border-[#86efac] text-[#15803d] text-[10px] font-extrabold uppercase">
              {controlMode === "ar"
                ? "✋ Chụm tay kéo ná • Mở tay để bắn"
                : "🖱️ Kéo viên đạn ngược hướng bia rồi thả"}
            </span>
          </div>
          <h2 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-black text-[#1b3a8a] leading-snug tracking-tight m-0">
            “{question.question}”
          </h2>
        </div>
      </article>

      {/* =====================================================================
       * ROW 3: SPLIT PASTEL SHOOTING ARENA STAGE (MINT LEFT / SKY RIGHT)
       * ===================================================================== */}
      <div className="arena-stage relative flex-1 min-h-0 rounded-3xl mana-split-arena overflow-hidden">
        {/* Pastel Decorative Circles & Center Dashed Divider (Tug-of-War style) */}
        <div
          className="absolute -left-10 -top-10 w-36 h-36 rounded-full bg-[#d3f2df]/65 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#d6e6ff]/65 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute inset-y-3 left-1/2 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-[#f47920]/55 z-10 pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Side Badges (Left = Không có AI, Center = VS Badge, Right = Có AI) */}
        <div className="mana-keep-white absolute top-2.5 left-3.5 z-20 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider bg-[#16a34a] px-3 py-0.5 rounded-full border-2 border-white shadow-[0_2px_0_#0b5626]">
          ◄ BIA TRÁI: KHÔNG CÓ AI
        </div>

        <div className="mana-vs-badge absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-0.5 rounded-full font-mono text-[9.5px] sm:text-xs font-black uppercase">
          {visualState === "aiming"
            ? "🎯 ĐANG NGẮM BIA..."
            : visualState === "shooting"
            ? "🚀 ĐẠN ĐANG BAY!"
            : "VS • ĐẤU TRƯỜNG BẮN BIA"}
        </div>

        <div className="mana-keep-white absolute top-2.5 right-3.5 z-20 text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wider bg-[#2563eb] px-3 py-0.5 rounded-full border-2 border-white shadow-[0_2px_0_#133478]">
          BIA PHẢI: CÓ SỬ DỤNG AI ►
        </div>

        {/* Companion Character Cheering on Left of Slingshot */}
        {companion && (
          <div
            className="arena-companion"
            aria-label={`Bạn đồng hành ${companion.name}`}
          >
            <div className="arena-companion-avatar">
              <CharacterAvatar character={companion} />
            </div>
            <span>
              {feedback
                ? feedback.correct
                  ? "BẮN CHUẨN QUÁ!"
                  : "CỐ LÊN XẠ THỦ!"
                : visualState === "aiming"
                ? "NHẮM KỸ BIA NHÉ!"
                : companion.name.toUpperCase()}
            </span>
          </div>
        )}

        {/* Mana Mascot Cheering on Right of Slingshot */}
        <div className="arena-mascot">
          <ManaMascot small />
          <span>
            {feedback
              ? feedback.correct
                ? "CHÍNH XÁC +100!"
                : "XEM GIẢI THÍCH NHÉ!"
              : controlMode === "ar"
              ? "CHỤM TAY KÉO NÁ NHÉ!"
              : "EM CHỌN BIA NÀO?"}
          </span>
        </div>

        {/* Left Target Board: KHÔNG CÓ AI */}
        <div className="arena-target left-target">
          <TargetBoard
            side="non-ai"
            active={Boolean(feedback?.correct && feedback.answer === "non-ai")}
            shake={Boolean(feedback && !feedback.correct && feedback.answer === "non-ai")}
          />
          <span className="target-caption">
            BIỂN SỐ 01 <i>•</i> QUY TẮC CỐ ĐỊNH
          </span>
        </div>

        {/* Right Target Board: CÓ AI */}
        <div className="arena-target right-target">
          <TargetBoard
            side="ai"
            active={Boolean(feedback?.correct && feedback.answer === "ai")}
            shake={Boolean(feedback && !feedback.correct && feedback.answer === "ai")}
          />
          <span className="target-caption">
            BIỂN SỐ 02 <i>•</i> HỌC &amp; NHẬN BIẾT
          </span>
        </div>

        {/* 2D Cartoon Slingshot Physics Engine Canvas */}
        <SlingshotGame
          key={question.id}
          onShot={onShot}
          disabled={Boolean(feedback) || paused}
          soundOn={soundOn}
          correctTarget={question.correctAnswer}
          visualState={visualState}
          controlMode={controlMode}
          arHandFrameRef={arHandFrameRef}
          onInteractionStateChange={onInteractionStateChange}
        />

        {/* AR Camera Hand Tracker Overlay */}
        <ARHandController
          enabled={controlMode === "ar"}
          disabled={Boolean(feedback) || paused}
          onHandFrame={handleARHandFrame}
          onFallbackToMouse={() => onControlModeChange?.("mouse")}
        />

        <div className="arena-ground" />

        {/* Pedagogical Explanation Popup after Shot */}
        {feedback && (
          <FeedbackOverlay
            result={feedback}
            question={question}
            questionIndex={questionIndex}
            totalQuestions={questions.length}
            onNext={onNext}
            isLastQuestion={questionIndex >= questions.length - 1}
            playerProfile={playerProfile}
          />
        )}

        {/* Pause Overlay */}
        {paused && (
          <div className="pause-overlay">
            <div className="pause-card border-4 border-[#2563eb] shadow-[0_8px_0_#133478]">
              <div className="pause-icon">
                <Pause />
              </div>
              <span>TẠM NGHỈ MỘT CHÚT</span>
              <h2>Sẵn sàng bắn tiếp chưa?</h2>
              <button
                className="btn-mana-orange px-6 py-2.5 rounded-full font-black text-xs uppercase flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  gameAudio.playClick()
                  onPause()
                }}
                type="button"
              >
                TIẾP TỤC <Play size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick In-Game Guide Popup Modal (Matching Tug-of-War Guide Modal) */}
      {guideModalOpen && (
        <div
          className="fixed inset-0 z-[85] bg-[#1b3a8a]/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden select-none"
          onClick={() => setGuideModalOpen(false)}
        >
          <div
            className="bg-white border-4 border-[#2563eb] rounded-3xl p-4 sm:p-5 max-w-lg w-full shadow-[0_8px_0_#133478,0_24px_60px_rgba(27,58,138,0.28)] flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#bfdbfe]">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-[#2563eb]" />
                <h3 className="text-sm sm:text-base text-[#1b3a8a] font-black uppercase m-0">
                  HƯỚNG DẪN BẮN NÁ XẠ THỦ AI
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGuideModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-2 text-xs sm:text-sm text-slate-700 font-medium">
              <div className="p-3 rounded-xl bg-[#ebf9f1] border border-[#86efac] flex items-start gap-2.5">
                <span className="mana-keep-white w-5 h-5 rounded-md bg-[#16a34a] text-white flex items-center justify-center text-xs font-black shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-[#15803d] font-black">
                    Quan sát &amp; Phân tích:{" "}
                  </strong>
                  Đọc tình huống xem thiết bị có dùng{" "}
                  <strong>Trí tuệ nhân tạo (AI)</strong> hay chỉ là{" "}
                  <strong>Tự động hóa theo quy tắc cố định</strong>.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#eaf2ff] border border-[#93c5fd] flex items-start gap-2.5">
                <span className="mana-keep-white w-5 h-5 rounded-md bg-[#2563eb] text-white flex items-center justify-center text-xs font-black shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-[#1b3a8a] font-black">
                    Kéo ná &amp; Bắn bia:{" "}
                  </strong>
                  <span className="text-[#15803d] font-bold">
                    BIA TRÁI (👈): KHÔNG CÓ AI
                  </span>{" "}
                  |{" "}
                  <span className="text-[#2563eb] font-bold">
                    BIA PHẢI (👉): CÓ AI
                  </span>
                  .
                  <span className="block text-slate-600 text-xs mt-1">
                    {controlMode === "ar"
                      ? "• Camera AR: Chụm ngón cái & trỏ (hoặc nắm tay) để cầm ná, kéo ngược hướng bia và mở bàn tay để bắn."
                      : "• Chuột / Cảm ứng: Nhấn giữ viên đạn trên ná, kéo ngược hướng bia muốn bắn và thả ra."}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                setGuideModalOpen(false)
              }}
              className="w-full py-2.5 rounded-full btn-mana-green font-black text-xs sm:text-sm cursor-pointer uppercase"
            >
              ĐÃ HIỂU • TIẾP TỤC TRẬN ĐẤU
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

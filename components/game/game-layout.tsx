"use client"

import { Maximize2, Volume2, VolumeX } from "lucide-react"
import { gameAudio } from "@/lib/audio"
import type { GameLayoutProps } from "./game-types"

export function GameLayout({
  children,
  soundOn = true,
  onToggleSound,
  transitionText = null,
  allowScroll = false,
}: GameLayoutProps) {
  const toggleFullscreen = () => {
    gameAudio.playClick()
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => undefined)
    } else {
      document.exitFullscreen?.().catch(() => undefined)
    }
  }

  return (
    <div
      className={`game-app min-h-[100dvh] h-[100dvh] w-full flex flex-col justify-between relative overflow-x-hidden ${
        allowScroll ? "overflow-y-auto" : "max-h-[100dvh] overflow-hidden"
      }`}
    >
      {/* Split Pastel Mint & Sky Atmosphere Background (matching Tug-AR-Game-Manabie) */}
      <div className="workshop-atmosphere" aria-hidden="true">
        <span className="workshop-grid" />
        <span className="workshop-scanline" />
      </div>

      {/* Single-layer Lightweight Page Transition Overlay */}
      {transitionText && (
        <div className="page-fade-overlay" aria-hidden="true">
          <b>{transitionText}</b>
        </div>
      )}

      {/* Top-Right Floating System Settings Toolbar (Audio & Fullscreen) */}
      <div
        role="toolbar"
        aria-label="Cài đặt hệ thống"
        className="fixed top-2 right-2 sm:top-3 sm:right-3.5 z-50 flex items-center gap-1.5 p-1 sm:p-1.5 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl border-2 border-[#bfdbfe] shadow-[0_4px_14px_rgba(27,58,138,0.12)] select-none"
      >
        {onToggleSound && (
          <button
            type="button"
            onClick={onToggleSound}
            className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center cursor-pointer transition-transform active:scale-95 ${
              !soundOn
                ? "bg-slate-100 text-slate-400 border border-slate-200"
                : "btn-mana-blue"
            }`}
            title={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}
            aria-label={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}
          >
            {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
        )}

        <button
          type="button"
          onClick={toggleFullscreen}
          className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white hover:bg-[#eaf2ff] text-[#1b3a8a] border border-[#bfdbfe] flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-xs"
          title="Toàn màn hình"
          aria-label="Toàn màn hình"
        >
          <Maximize2 size={17} />
        </button>
      </div>

      {/* Fullscreen Main Content Container */}
      <div
        className={`w-full h-full flex-1 flex flex-col justify-between ${
          allowScroll ? "pt-2 pb-6 px-2 sm:px-4 overflow-y-auto" : "overflow-hidden p-0"
        }`}
      >
        {children}
      </div>
    </div>
  )
}

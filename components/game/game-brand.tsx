"use client"

import { useState, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { gameAudio } from "@/lib/audio"

export interface PrimaryButtonProps {
  children: ReactNode
  onClick: () => void
  kind?: "orange" | "blue" | "white"
}

const LOCAL_LOGO = "/assets/brand/manabie-logo.png"
const FALLBACK_LOGO =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/images%20%281%29-Ns1blYYdKWbb0wu1BqOQ7FeHdlyQgc.png"
const MANA_GIF =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mana_dong_noi-WbeIHKkJGa9MxuXTjkmpf24fuJuY05.gif"
const LOCAL_MANA_FALLBACK = "/assets/brand-mascot/mana-action.png"

export function BrandMark() {
  const [src, setSrc] = useState(LOCAL_LOGO)
  return (
    <div className="brand-mark">
      <img src={src} onError={() => setSrc(FALLBACK_LOGO)} alt="Manabie" />
    </div>
  )
}

export function ManaMascot({ small = false }: { small?: boolean }) {
  const [src, setSrc] = useState(MANA_GIF)
  return (
    <div className={`mana-mascot${small ? " mana-small" : ""}`}>
      <img
        className="mana-asset"
        src={src}
        onError={() => setSrc(LOCAL_MANA_FALLBACK)}
        alt="Mana, linh vật xanh của Manabie"
      />
    </div>
  )
}

export function PrimaryButton({ children, onClick, kind = "orange" }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      className={`primary-button ${kind}`}
      onClick={() => {
        gameAudio.playClick()
        onClick()
      }}
    >
      {children}
      <ChevronRight size={19} strokeWidth={2.8} />
    </button>
  )
}

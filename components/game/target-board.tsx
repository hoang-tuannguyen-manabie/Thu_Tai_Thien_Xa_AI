import { Ban, Bot } from "lucide-react"
import type { TargetKind } from "@/lib/game-data"

export interface TargetBoardProps {
  side: TargetKind
  compact?: boolean
  active?: boolean
  shake?: boolean
}

export function TargetBoard({ side, compact = false, active = false, shake = false }: TargetBoardProps) {
  const isAI = side === "ai"
  return <div className={`target-art ${isAI ? "target-ai" : "target-non-ai"} ${compact ? "target-compact" : ""} ${active ? "target-active" : ""} ${shake ? "target-shake" : ""}`}>
    <div className="target-post"/><div className="target-ring ring-outer"/><div className="target-ring ring-mid"/><div className="target-ring ring-inner"/><div className="target-center">{isAI ? <Bot className="target-robot" aria-hidden="true"/> : <Ban className="target-noai" aria-hidden="true"/>}</div>
    <div className="target-label"><span>{isAI ? "CÓ" : "KHÔNG CÓ"}</span><b>AI</b></div>
  </div>
}

export function SlingshotIllustration() {
  return <svg className="sling-illustration" viewBox="0 0 200 250" aria-hidden="true"><path d="M100 225 C95 177 89 129 72 65 M100 225 C105 177 111 129 128 65" fill="none" stroke="#8B542C" strokeWidth="18" strokeLinecap="round"/><path d="M71 64 L69 35 M129 64 L131 35" stroke="#8B542C" strokeWidth="17" strokeLinecap="round"/><path d="M69 36 Q100 90 131 36" fill="none" stroke="#D7794A" strokeWidth="5"/><circle cx="100" cy="75" r="13" fill="#395AD2" stroke="#fff" strokeWidth="5"/><path d="M87 225 Q100 214 113 225" stroke="#654020" strokeWidth="6" strokeLinecap="round"/></svg>
}

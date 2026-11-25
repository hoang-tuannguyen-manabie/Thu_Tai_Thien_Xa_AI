import type { GameLayoutProps } from "./game-types"

export function GameLayout({ children }: GameLayoutProps) {
  return <div className="game-app">{children}</div>
}

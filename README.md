# AI Target Shooting Game

A client-side Vietnamese classroom game prototype for recognizing examples of AI. It intentionally uses local sample content and has no backend or persistence requirement.

## Project structure

```text
app/
  page.tsx                 Next.js route that mounts GameApp
  globals.css              Global styles, responsive rules, and design tokens
components/game/
  index.ts                 Public component exports for reuse
  game-app.tsx             Screen state, question order, score, timer, and game flow
  game-layout.tsx          Shared application shell
  game-screens.tsx         GameLanding and GameSummary
  game-instructions.tsx    GameInstructions screen adapter
  game-arena.tsx           GameArena composition
  game-hud.tsx              GameHeader, QuestionCard, and ScorePanel
  game-brand.tsx            BrandMark, ManaMascot, and PrimaryButton
  target-board.tsx          TargetBoard and static SlingshotIllustration
  slingshot-game.tsx        SlingshotVisual interaction and lightweight canvas-free physics
  answer-feedback.tsx       FeedbackOverlay
  auto-tutorial-demo.tsx    Existing instructions/tutorial presentation
lib/
  game-data.ts              GameQuestion interface and sample questions
  game-logic.ts             Question shuffling, shot resolution, score calculation
```

Import reusable components through `@/components/game` where practical. Individual component modules remain available for focused imports.

## Components

- **GameLayout** owns the application shell.
- **GameHeader** displays progress, score, combo, sound, and pause controls.
- **GameArena** composes the header, question card, targets, slingshot, feedback, and pause presentation.
- **QuestionCard** renders one typed question and its category.
- **SlingshotVisual** (exported alias of `SlingshotGame`) owns pointer/keyboard input, aim state, and the existing lightweight projectile simulation.
- **TargetBoard** renders either answer target; **SlingshotIllustration** is the static landing-page graphic.
- **ScorePanel** is a reusable compact score display.
- **FeedbackOverlay** presents answer feedback and explanation.
- **GameInstructions**, **GameSummary**, and **GameLanding** are independently reusable screen components.

## Design tokens

The visual system is defined in `app/globals.css` and intentionally preserves the current interface:

- Brand palette: `--brand-blue`, `--brand-blue-light`, `--brand-orange`, `--brand-green`, `--brand-red`, `--brand-ink`, `--brand-muted`, `--brand-paper`, and `--brand-white`.
- Typography: `--font-family-sans` (Be Vietnam Pro with system fallbacks).
- Spacing scale: `--space-1` through `--space-8`.
- Radius scale: `--radius-sm` through `--radius-xl`, plus `--radius-screen` and `--radius-button` for existing geometry.
- Shadows: `--shadow-card`, `--shadow-soft`, and button shadow tokens.
- Motion: `--motion-fast` and `--motion-normal`.
- `.primary-button` and its variants are the shared button treatment.

Use these variables for future visual changes rather than introducing one-off values. Preserve existing CSS breakpoints and layout rules when extending screen sizes.

## Screen navigation

`GameApp` manages four screens: `home` → `instructions` → `game` → `summary`. The landing CTA opens instructions; the tutorial starts a fresh shuffled round; each shot records a result and advances after feedback; the summary supports replay or return home. The timer runs only while the game is active and not paused. Sound preference, score, attempts, and question order remain in component state.

## Sample question schema

`GameQuestion` in `lib/game-data.ts` is the content contract:

```ts
interface GameQuestion {
  id: number
  question: string
  image: string | null
  correctAnswer: "ai" | "non-ai"
  explanation: string
  category: string
  illustrationKey: string
}
```

`image` is nullable so future content can use an illustration or supplied image without changing gameplay logic. `illustrationKey` selects the current local icon treatment. Add or edit examples in `sampleQuestions`; scoring and answer resolution consume `correctAnswer`.

## Visual/gameplay state contract

`GameVisualState` declares `idle`, `dragging`, `aiming`, `shooting`, `correct`, `incorrect`, `paused`, and `completed`. Relevant UI elements expose the current state as a `data-state` attribute: the arena, slingshot, feedback overlay, and summary screen. This is a presentation/integration contract; the current drag-and-release interaction remains local and does not add a backend or a full physics dependency.

Future integrations can replace `resolveShot` or the slingshot interaction in `lib/game-logic.ts` and `components/game/slingshot-game.tsx`, while retaining the `GameQuestion`, `ShotResult`, and `GameVisualState` contracts. Persisted questions, accounts, or multiplayer are intentionally out of scope.

## Responsive handoff checks

Keep the existing responsive presentation and verify at these target viewports after UI changes:

- Classroom display: 1920 × 1080
- Laptop: 1366 × 768
- Tablet landscape: 1024 × 768
- Tablet portrait: 768 × 1024

During this handoff, the landing rendered at 1920 × 1080, the instructions-to-arena navigation was exercised, and the arena was checked at all four sizes above. At 768 × 1024, the document had no horizontal overflow; question text wrapped and the targets, slingshot, and score panel remained in the viewport. Recheck the summary screen and focus behavior when making future visual or interaction changes. Respect reduced-motion preferences when introducing animation.

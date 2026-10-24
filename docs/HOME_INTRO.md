# Home intro: design package

The Home tab's scroll-driven intro and the sections below it. The build follows this file; every line of copy here ships word for word.

## 1. Premise

**See the blunder before you make it.** The intro slows one real trap down to scroll speed: a pawn that looks free, the reply that punishes taking it, and the move that holds. Every section below serves that one idea, and they all lead to one call to action: **Start a game**.

The position is the Blackburne Shilling trap, checked with python-chess and Stockfish (depth 20):
- Start: `r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4` (after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4).
- The trap: 4.Nxe5? is met by 4...Qg5, which hits the knight on e5 and the pawn on g2 at once. The eval goes from +1.25 to −0.60.
- The move that holds: 4.Nxd4, eval +1.25.
- The scan position (after 4.Nxe5 Qg5): `r1b1kbnr/pppp1ppp/8/4N1q1/2BnP3/8/PPPP1PPP/RNBQK2R w KQkq - 1 5`. Loose (attacked, no defender): e5, g2. Attacked but defended: c2, d2.

Every number in the intro is a real engine number. There's no blunder-risk % in the intro, because that would need a trained model.

## 2. Palette

The app's Modern slate tokens. There are no new colours. Roles:
- **Canvas:** `--surface-0`.
- **Panel:** `--surface-1`.
- **Accent (the CTA and the good-move arrow):** `--accent`.
- **Temptation (the arrow that looks good):** `--warn`.
- **Threat:** `--danger`.

## 3. Type

The app's trio:
- **Display:** Bricolage Grotesque, 650 to 800.
- **Body:** Figtree, 400 to 600.
- **Labels and numbers:** JetBrains Mono, 500.

## 4. Band map (scroll progress through the hero; the ranges are starting points for the flick test)

| Band | Range | What the board does | Copy | Entrance |
|---|---|---|---|---|
| 1 | 0.00 to 0.18 | Full board, still. Kicker: "Move 4 · White to play" | "Every blunder starts as a move that looks fine." | Approach from depth (echoes the push-in that follows) |
| 2 | 0.21 to 0.39 | The view pushes in toward e5. An amber arrow draws from f3 to e5. | "That pawn on e5 looks free." / "One knight jump and it's yours. Or so it seems." | Grid snap, characters slide in along the arrow's direction |
| 3 | 0.42 to 0.60 | The queen's path d8 to g5 draws in red, and e5 and g2 light up. The eval readout counts from +1.3 to −0.6. | "It isn't. After Nxe5, Qg5 hits the knight and g2 at once." | Word punch, landing as the threat lands |
| 4 | 0.63 to 0.81 | The red fades back, and a green arrow draws from f3 to d4. Readout: +1.3. | "ChessWise shows you the move that holds." / "Nxd4 keeps White ahead. Same position, no trap." | Blur to sharp (focus arriving) |
| 5 | 0.85 to 1.00 | The view pulls back to the whole board and rests with the green arrow drawn. | "Train smarter. Blunder less." / "Play real games, see the danger before you move, and drill the mistakes you actually make." / [Start a game] [Try trap puzzles] | Word-by-word rise into a staged settle |

## 5. Static hero (phones, portrait tablets, landscape phones, reduced motion)

The resting frame: the whole board with the green arrow and a faint threat, beside or under:
- Kicker: "The pawn on e5 looks free. It isn't."
- Headline: "Train smarter. Blunder less."
- Subline: "Play real games, see the danger before you move, and drill the mistakes you actually make."
- Buttons: [Start a game] [Try trap puzzles]

## 6. Below the hero

1. **How it works** (three equal steps, joined by a line that draws itself):
   - "Play a real game." / "Pick a mode and a strength. Every finished game is saved for review."
   - "See it coming." / "Before you move: the engine's top three, the threats on the board, and your blunder risk."
   - "Fix what you miss." / "Review any game, then drill the patterns your profile says cost you points."
2. **The interactive moment: Check before you move.** Split layout, with a board on one side and copy on the other.
   - Intro: "This is the position after 4.Nxe5 Qg5. Hold the button and run the check a strong player runs before every move."
   - Button: "Hold to scan the board" (press and hold; letting go early eases it back).
   - Result: "Two loose targets. The knight on e5 and the pawn on g2 have no defender, and the queen hits both. c2 and d2 are attacked too, but they're covered."
   - With reduced motion, the button is "Show loose pieces" and shows the result at once.
3. **Five ways to play** (a horizontal rail of mode cards; each opens Play in that mode):
   - "Analysis" / "Free play with live feedback."
   - "Stockfish" / "Play the engine at the strength you pick."
   - "Maia" / "A human-like opponent at your rating."
   - "Trapper" / "A bot that steers you toward traps."
   - "Puzzles" / "Classic opening traps, played as puzzles."
4. **Honest numbers** (a centred statement with three chips):
   - "Every number tells you what it is."
   - "Tap the ⓘ on any percentage to see what it measures and how it's worked out. If the engine or the model isn't connected, you see a dash, never a made-up number."
   - Chips: "Blunder risk", "Outlook", "Accuracy".
5. **Final CTA:** "Your next game starts here." / [Start a game]

## 7. Vector layer

- The board overlay arrows and rings: SVG in board coordinates, drawn with `pathLength="1"` dash offsets driven by the scroll.
- The connector line in "How it works", drawn on scroll.
- One whisper-level living element per section:
  - the glowing rings on the scan board
  - a slow shimmer on the active mode card
  - a soft pulse on the final CTA
- The app-wide ambient layer: two soft glows drifting on cycles of 70 seconds or more, behind everything.
- Reduced motion shows final states and stops the drives.

## 8. Engineering

- **Drive loop:** a dt-normalised lerp in a `requestAnimationFrame` loop that rests once it settles and while the hero is off-screen. Writes to the DOM only when values change (`--k` gated at 0.008, the readout at about 10Hz).
- **Five static-hero gates,** written identically in CSS and JS and kept live with change listeners.
- **Band 1** opens assembled with a one-time load ramp.
- **The board** is static and non-interactive, so the push-in transform is safe there. The drag-ghost rule is about interactive boards.
- **Animation rules:** `transform` and `opacity` only, except the self-drawing strokes. Everything pauses on hidden tabs. `overflow-x: clip` on `html` and `body`. Touch targets are 44px or more.

## 9. Copy gate

- Every line above ships word for word.
- The built page must pass the grep gate: zero em dashes and zero stock words (leverage, seamless, empower, unlock, robust, actionable, data-driven, solutions), plus the body-copy sweep for AI tells.
- "Train smarter. Blunder less." is the brand's tagline, a deliberate device, so it stays.

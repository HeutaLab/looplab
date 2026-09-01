# The Club floor — fixed roles

Derived from `docs/mockups/design_handoff_in_the_club/README.md` (options 3a and
3b). **The handoff is the design intent; this file is the set of rules that stop
one change forcing three others.**

Written because the colour work kept rippling: lanes took red, so the fault had
to leave red; lanes took yellow, so "write" had to leave amber; write became
white, so it collided with the primary button; the button went outlined, so
seven white pills became the loudest thing on screen. Every step was
defensible. The chain was not.

A change that breaks a rule here is a change to this file first.

Scope: `src/club/` only. The Studio has its own palette in `C` and its own
handoff (`design_handoff_in_the_studio/`).

---

## 1. The ground

| Token | Value | Use |
|---|---|---|
| `--void` | `#07060c` | The floor. |
| `glow` | `#161027` | Radial panel glow over the highway side only. |
| `--ink` | `#f3eee4` | Primary text, hit line, primary control. |
| `--dim` | `#c9c3d4` | Secondary text, script body. |
| `noteInk` | `#0c0910` | The token printed on a note tile. |

---

## 2. Colour roles

**A colour carries exactly one meaning. If it needs a second, it is the wrong
colour.**

| Role | Value | Means | Never |
|---|---|---|---|
| write | `#ffb703` amber | The thing you write: hole note, hole line rail, TYPE IT boxes, chips. Ink on amber is `#120c00`. | Decoration. A transport control. |
| success | `#7dffb3` (border `#d2ffe6`) | A committed line, a done phase, the combo ring. | Progress-so-far. Encouragement. |
| fault | `#ff2d1a` | The sour value in the script. | A control the player pressed. |
| lane 1–4 | §3 | Which channel a note belongs to. | Anything outside the highway. |
| code symbol | `#45E0BE` | `:tb303`, `:bass` in the script. | — |
| code number | `#FFD34D` | Numbers in the script. | — |

**Misses never flash red.** The sour note plays sour; that is the whole
feedback. No fail styling anywhere — this rule outranks any HUD state.

### The rule that stops the cascade

**Lane colours are fixed first. Role colours move out of their way — never the
reverse.** Lanes are the largest and most numerous thing in the pit; a role
colour is one small mark. When they collide, the mark moves.

The current set works because no lane is amber and no lane is red, so write and
fault are both free. Any future lane colour must preserve that.

---

## 3. The lanes

By position in the track, so drums are the same colour on all six records.

| # | Fill | Border | Shadow | Warehouse |
|---|---|---|---|---|
| 1 | `#ece7f2` | `#ffffff` | `#8d87a0` | drums |
| 2 | `#4ab8f0` | `#a8dcf8` | `#22688e` | claps |
| 3 | `#b085ff` | `#d8c4ff` | `#6a4bad` | bass |
| 4 | `#ff7fb0` | `#ffc2da` | `#a8446e` | stabs / siren |

In `theme.js` as `CHANNEL`, `CHANNEL_EDGE`, `CHANNEL_SHADOW`.

Lanes are **flat vertical columns**, radius 13px, gradient fill
`rgba(C,.03) → rgba(C,.16)`, 2px border `rgba(C,.4)`. The active lane goes
`.06 → .24`, 2.5px at `.8`, plus `0 0 20px rgba(C,.3)` and a **YOUR LANE** badge
pinned to its top edge. Lane name pinned bottom-centre, 10px mono, lane colour.

There is no perspective, no vanishing point and no depth fade. That was the
previous direction and it is gone.

---

## 4. Notes

68px rounded tiles, radius 11px, lane fill, 3px lighter border, hard drop shadow
`0 3px 0 <lane shadow>`. Near the hit line add `0 0 16px rgba(C,.6)`.

- `play` / `sleep` — one line, 11px mono 700, `noteInk`.
- `sample` — two lines: 8px "sample" muted, 10px token.
- **The hole** — 3px **dashed** amber border, `rgba(255,183,3,.08)` fill, amber
  text, `0 0 18px rgba(255,183,3,.4)`.
- **Committed (3b)** — solid `#7dffb3`, 3px `#d2ffe6`, `0 0 26px rgba(125,255,179,.9)`,
  now reading the finished token.

---

## 5. Fill and outline

**Filled means "this is the subject". Outlined means "this is a tool".**
Broken twice by accident; at most one filled emphasis colour on screen.

| Element | State |
|---|---|
| Note tiles | Filled |
| Hole note | Dashed outline — it is absent |
| Chips, Write, Stuck? Chips | Ghost pills, 1.5px `rgba(243,238,228,.35)` |
| Hear the goal | Outlined `#f3eee4` |
| Play this loop | Filled `#f3eee4`, ink `#07060c` |

---

## 6. Time and motion

Notes scroll at the track's BPM. The highway is the **ear** — it previews what
the loop plays. Nothing is tapped, scored or timed on it; only the amber hole
requires input.

Transitions: tile glow/scale in `120ms ease-out`, out `400ms ease`. PERFECT!
pops with slight scale overshoot. Equalizer bars pulse to the beat, opacity ≤ .3.

---

## 7. Type

Bundled, no CDN. `TYPE.ui` / `TYPE.code` in `theme.js`.

| Role | Face |
|---|---|
| UI | **Fredoka** 400–700 |
| Code, notes | **JetBrains Mono** 500/700 |

Scale at the 880-wide reference: 8–11px note text, 13–14px UI, 14px/1.55 script,
17–22px combo, 18px TYPE IT characters. Scale proportionally at real viewport.

Atkinson Hyperlegible is still bundled and unused. It was chosen because a child
must tell `play 45` from `play 46` across a room; if Fredoka's rounder
letterforms cost that in a classroom, the swap back is one line in `TYPE`.

Minimum touch target 44px, everywhere.

---

## 8. Carried over — still true

These were measured, not preferred, and the handoff does not overturn them.

- **Contrast on the floor: 4.5:1 minimum.**
- **Colour alone must never be the only difference between two states.** Shape,
  weight, position or a word as well. With write, success and fault claiming the
  warm half of the wheel, the lane hues sit close enough that blue-blindness
  merges some of them.
- **Deuteranopia is the one that matters in a classroom** — roughly one boy per
  class.

---

## 9. Forbidden

- White as an emphasis fill. Amber is the write colour again.
- Magenta. It was a workaround for red being a lane; red is free now.
- Red for anything but the sour value in the script — and never as a flash.
- Muting or greying a lane to show focus. Focus is fill strength, border weight,
  glow and the YOUR LANE badge.
- Colour as the only difference between two states.
- Emoji, except the plain glyphs the handoff names (★ ← ▶).

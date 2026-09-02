# Handoff: LoopLab "In the Club" Booth Redesign

## Overview
Redesign of the "In the Club" practice booth — a Guitar-Hero-style typing game where 10–12 year-olds fill holes in a running Sonic Pi script (e.g. `sleep 0.5`) while pre-made notes fall down 4 instrument lanes. This handoff covers the chosen direction **3a** (full screen) and **3b** (the hit-moment feedback state), merging an arcade HUD (combo ring, crowd meter, equalizer floor, star progress) onto the real booth split layout.

Target repo: `HeutaLab/looplab`, branch `main`. Files to modify: `src/club/ClubHighway.jsx`, `src/club/booth.css`, and possibly `src/club/BoothScreen` layout. Colors should be wired through `src/theme.js` tokens where they already exist.

## About the Design Files
The files in this bundle are **design references created in HTML** — static prototypes showing intended look and behavior, NOT production code to copy directly. The task is to **recreate these designs in the LoopLab codebase's existing React + canvas + CSS environment**, following its established patterns (the highway is canvas-drawn in `ClubHighway.jsx`; chrome/HUD is DOM styled by `booth.css`). Inline styles in the mockups are for prototyping only — translate to the repo's CSS conventions.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy are final intent. Recreate pixel-close, but express dimensions responsively (mockups are drawn at 880×560; the real booth is full-viewport — scale proportionally, lanes column ≈ 38% width, script column ≈ 43%, HUD rail between).

## Screens / Views

### 3a — Arcade Booth Live (main screen)
Reference: `In The Club Mockups.dc.html` → option id `3a`.

**Layout (at 880×560 reference):**
- Background: `#07060c` with `radial-gradient(ellipse 90% 45% at 28% 0%, #161027 0%, #07060c 65%)` (glow sits over the highway side).
- Top bar (padding 12px 22px 6px): back arrow `←`, breadcrumb "G · **Hardfloor Finale** · 140 BPM" (13px, muted `#c9c3d4`, bold title `#f3eee4`); right side: star progress (3 stars, earned `#ffb703` 15px, unearned `rgba(243,238,228,.25)`) + goal link "SILENCE THE ROOM" (11px, letter-spacing 1.5px, underline offset 5px).
- Gradual-release tabs: 3-col grid under top bar, 1px bottom border `rgba(243,238,228,.14)`. Tabs: "I do ✓ / WATCH" (done, `#7dffb3`), "We do / TOGETHER" (active, 2px `#f3eee4` underline), "You do / YOUR TURN" (upcoming, opacity .5). Labels 14px/700, sublabels 9px, letter-spacing 1.5px.
- **Highway** (left column, 330×352 at 22,118): 4 lanes, flex gap 7px. Each lane: border-radius 13px, `linear-gradient(180deg, rgba(C,.03), rgba(C,.16))` fill, 2px border `rgba(C,.4)` where C is the lane color. Lane name label pinned at bottom center (10px JetBrains Mono 700, lane color). Active lane (`:bass`) is stronger: gradient .06→.24, 2.5px border at .8 alpha, `box-shadow 0 0 20px rgba(176,133,255,.3)`, plus a "YOUR LANE" badge pill centered on its top edge (9px Fredoka 700, letter-spacing 1px, `#120c00` on `#ffb703`, radius 99px, padding 2px 9px).
- **Notes** (canvas-drawn in `ClubHighway.jsx`): 68px-wide rounded tiles (radius 11px), lane-colored fill, 3px lighter border, hard drop shadow `0 3px 0 <darker shade>`. Near the hit line add a glow `0 0 16px rgba(C,.6–.7)`. Sample notes show two lines (8px "sample" in dark muted, 10px token); play/sleep notes one line 11px token, JetBrains Mono 700, ink `#0c0910`. The **hole note** (the line the kid must write) is distinct: 3px **dashed** `#ffb703` border, `rgba(255,183,3,.08)` fill, amber text, glow `0 0 18px rgba(255,183,3,.4)`.
- Hit line: full lane-column width, 3px `#f3eee4`, glow `0 0 14px rgba(243,238,228,.7)`, at y=430 (≈78% height).
- Equalizer floor: behind lanes at bottom-left, 9 bars flex gap 5px, height 70px, opacity .28, bar colors cycle lane palette, radius 3px 3px 0 0. Decorative only (canvas or CSS).
- **HUD rail** (between highway and script, 96px wide at x=362): combo ring — 76px circle, `conic-gradient(#7dffb3 0 P%, rgba(243,238,228,.12) P% 100%)` with 58px inner `#07060c` disc showing "×6" (17px Fredoka 700 `#7dffb3`) over "COMBO" (8px, letter-spacing 1px, `#c9c3d4`). Crowd meter — "CROWD" label (9px, ls 1.5px), 20×150px pill track `rgba(243,238,228,.1)`, fill from bottom `linear-gradient(to top, #4ab8f0, #7dffb3, #ffb703)`, caption "Hyped!" (11px 600 `#f3eee4`).
- **Script panel** (right column, 376×396 at 482,118): JetBrains Mono 700 14px/1.55, default `#c9c3d4`. Keywords (`use_synth`, `live_loop`, `do`, `end`, `play`, `sleep`) in `#f3eee4`; symbols (`:tb303`, `:bass`) in `#45E0BE`; numbers in `#FFD34D`. The **hole line** is highlighted: `rgba(243,238,228,.07)` bg, 2px radius, 4px amber `#ffb703` left rail, and the missing value rendered as `?` in amber with 2px dashed amber underline.
- **TYPE IT input** (docked at script panel bottom): label "TYPE IT — sleep ?" (10px Fredoka 700, ls 2px, `#ffb703`). Per-character boxes 30×38px radius 8px: typed chars filled `#ffb703` with `#120c00` 18px mono; current char outlined 2px `#ffb703` with amber caret (2×18px). Beside it: "Write" ghost pill and "Stuck? Chips" ghost pill (1.5px border `rgba(243,238,228,.35)`, radius 99px, Fredoka 600). Bottom row: "Hear the goal" (outlined `#f3eee4` pill) and "Play this loop" (filled `#f3eee4` pill, ink `#07060c`), both flex:1, padding 10px 0, 14px 600.

### 3b — Hit moment (feedback state)
Reference: option id `3b`. When the typed line is committed on the beat:
- The hole note swaps to a solid success tile: `#7dffb3` fill, 3px `#d2ffe6` border, glow `0 0 26px rgba(125,255,179,.9)`, now reading the completed token (`sleep 0.5`).
- "PERFECT!" flash above the tile: 20px Fredoka 700 `#7dffb3`, `text-shadow 0 0 16px rgba(125,255,179,.9)`, rotated −4°, over a 100px radial amber burst `radial-gradient(circle, rgba(255,183,3,.5), transparent 70%)`.
- Active lane border brightens to solid `#b085ff`, glow to `0 0 30px rgba(176,133,255,.5)`; hit line glow doubles.
- Combo ring ticks up (×6→×7), ring gains `box-shadow 0 0 26px rgba(125,255,179,.4)`; caption "Crowd goes up!" in `#ffb703`.
- In the script, the hole line resolves: `rgba(125,255,179,.08)` bg, 4px `#7dffb3` left rail, value in `#7dffb3` + "✓ locked in".
- **Misses never flash red** — the sour note just plays sour, like real Sonic Pi. No fail styling.

## Interactions & Behavior
- Notes scroll downward at the track's BPM (140 in the mock); the highway is the *ear* — pre-made notes preview what the loop plays. Only the amber hole note requires typing.
- Typing goes char-by-char into the TYPE IT boxes; Enter (or reaching the hit line) commits. On-beat commit → 3b feedback (~600ms flash, then tile joins the loop and keeps scrolling).
- "Hear the goal" plays the target loop; "Play this loop" runs the student's current script; "Stuck? Chips" reveals tappable token chips as a scaffold.
- Combo ring fills proportionally (P% = progress to next star or streak cap); crowd meter rises on hits, drains slowly on misses.
- Equalizer bars can pulse to the beat (cheap sine offsets, opacity stays ≤ .3).
- Suggested transitions: tile glow/scale on hit `120ms ease-out` in, `400ms ease` out; PERFECT! pops in with slight scale overshoot.

## State Management
- `phase`: "I do" | "We do" | "You do" (gradual-release tabs).
- `notes[]`: per lane — token, beat time, y-position (canvas), isHole, hitState (pending | hit | passed).
- `typed`: current input string vs target token; caret index.
- `combo`, `crowdLevel` (0–1), `stars` (0–3), `score` optional.
- Script model: array of lines with hole markers; hole resolves on successful commit.

## Design Tokens
Lane colors (from `theme.js` CHANNEL colors — reuse existing tokens):
- drums `#ece7f2` (border `#fff`, shadow `#8d87a0`)
- claps `#4ab8f0` (border `#a8dcf8`, shadow `#22688e`, dark ink `#123a52`)
- bass `#b085ff` (border `#d8c4ff`, shadow `#6a4bad`)
- siren `#ff7fb0` (border `#ffc2da`, shadow `#a8446e`)

Club palette:
- void/bg `#07060c`, glow panel `#161027`
- text `#f3eee4`, muted `#c9c3d4`, note ink `#0c0910`
- amber (the thing you write) `#ffb703`, amber ink `#120c00`
- ok/success `#7dffb3` (border `#d2ffe6`)
- code symbol `#45E0BE`, code number `#FFD34D`

Type:
- UI: **Fredoka** (400–700)
- Code/notes: **JetBrains Mono** (500, 700)
- Scale (880-wide ref): 8–11px note text, 13–14px UI, 14px/1.55 script, 17–22px combo, 18px type-it chars. Scale up proportionally at real viewport size.

Radii: notes 11–14px, lanes 13px, pills 99px, input boxes 8px. Note drop shadow: `0 3px 0 <lane shadow color>`.

## Assets
None — all vector/CSS. Fonts from Google Fonts (Fredoka, JetBrains Mono). Emoji glyphs (★ ← ▶) are plain text.

## Files
- `In The Club Mockups.dc.html` — all iterations; **3a and 3b are the chosen direction** (top section). Earlier turns (1a–1d, 2a–2c) are exploration history for context only.
- `support.js` — mockup runtime; ignore, needed only to open the HTML locally.

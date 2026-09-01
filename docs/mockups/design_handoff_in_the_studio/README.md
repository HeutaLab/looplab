# Handoff: LoopLab "In the Studio" — Story, Crew & Progression Layer

## Overview
A UX/story layer over LoopLab's existing Studio (the learning side of the app), designed to carry a 10–12-year-old from chips to typed Sonic Pi and into The Club. Four systems, designed to reinforce each other:

1. **Records & the Chart (the ladder).** The Studio is a recording studio: finishing work "cuts a take", clean takes "press a record" (bronze/silver/gold vinyl), records rank on a music chart, and chart tiers (Garage → Demo → Radio → Club → Headliner) are the meta-progression that unlocks Club sets.
2. **Gear = curriculum.** Each piece of studio hardware IS a chip group (`chipGroups.js`): TR-08 Beatbox = drums samples, Bassline 303 = `play` notes, Synth Rack = `use_synth`, Chance Module = `choose()`/`rrand`. Unlocking equipment and unlocking language features are the same event.
3. **The Crew.** One mentor character per skill, met in curriculum order (see Cast below). Reverb the robot is the constant companion — his facial expressions ARE the feedback system (replacing toast banners).
4. **Drills that teach themselves away.** Short practice sessions where chips solve the task at first, then grey out one per retake until the kid types the line unaided.

Target repo: `HeutaLab/looplab`, branch `main`. This layer wraps/extends: `src/screens/MapScreen.jsx` (→ Crew Map), `src/phases/BuildPhase.jsx` (→ session screens), `src/ui/controls.jsx` `Mentor` (→ character dialogue), `src/data/chipGroups.js` (→ gear), `src/state/progressCode.js` + `src/state/report.js` (→ records/chart persistence).

## About the Design Files
The files in this bundle are **design references created in HTML** — static prototypes showing intended look and behavior, not production code. Recreate them in the repo's existing React + Tailwind-class + inline-style environment, following its established patterns (`C`/`TYPE`/`PHASE` from `theme.js`, `Chip`/`BigButton`/`Mentor`/`Mark` from `ui/controls.jsx`). Keep the existing level/stage engine — this is a re-skin + additive layer, not a rewrite of `BuildPhase`'s logic.

## Fidelity
**High-fidelity for style, mid-fidelity for layout.** Colors, typography, component treatments, and copy voice are final intent and use the repo's real tokens. Exact pixel positions are mockup-scale (880-wide frames); express them with the repo's existing responsive `PHASE` grid instead. Character art crops (in `assets/`) are placeholder-quality extractions from concept sheets — production should re-export clean transparent PNGs from the source art.

## The Cast (curriculum mapping)
Each mentor owns exactly one chip group / concept. Met in order; meeting a mentor = that gear installs = those chips unlock.

- **Reverb** (robot soundbot) — basic syntax: `play`, `sleep`. Constant companion. Expressions map to code states: **Hype** = clean take, **Confused** = stuck >30s (he taps the chip that would fix it — hint-by-face), **Error** = parse error (points at the line). Eyes are equalizer bars that dance to the kid's loop while it plays.
- **Echo & BPM** (cat + metronome) — timing: sleep math, `use_bpm`. The cat only lands on the beat.
- **Octave** (owl archivist) — loop logic: `live_loop`, `x.times`. His tape rack is the kid's library of every pressed loop, replayable forever (persist in profile state).
- **Synth-ia** (keytar wizard) — melodies: `use_synth`, note choices.
- **Sample Sam** (hedgehog, patch-cable quills) — samples: `sample :bd_haus` etc.
- **Glitch** (pixel gremlin) — debugging. Antagonist-turned-crewmate: he makes loops *sour* (wrong values, typos like `paly`), the kid hears the bug before seeing it, each fixed line shrinks his health bar. Beaten, he joins as the error console.
- **Cadence** (capybara) — mixing: two loops at once, patience/tempo.
- **Amp** (walking amplifier) — the Club's crowd meter, embodied. Walks toward whoever's set is hotter.
- **Pixel Beat** (girl or boy version — player picks avatar at start; the other appears as the rival) — track battles at chapter ends: same brief, 3 minutes, best take wins; winning steals a chart position.
- **DJ Shadow Master** — final boss at the Club. His set is the whole curriculum replayed live, no chips. Story reveal on victory: he built Reverb.

Story chapters (3-line skippable scenes between levels, gear handover always on-screen): CH.1 Garage (find Reverb in a junk pile) → CH.2 Demo Days (pawn-shop 303, synth rack, Reverb gets ears) → CH.3 Radio Play (chance module, chest speaker) → CH.4 The Club → CH.5 Headliner (Reverb DJs your warm-up using loops the kid wrote).

## Screens / Views
All in `In The Club Mockups.dc.html` (open in a browser). Option ids are visible badges next to each frame. **Scope of this handoff: options 6a–6c and 7a–7c — these six screens are the design to implement.** Turns 4–5 and 7d are exploration context only. Studio palette throughout: bg `#110F26`, panel `#1D1A3E`, panel2 `#26225A`, line `#332E66`, ink `#F4F2FF`, dim `#A29CCB`, pink `#FF5CA8`, yellow `#FFD34D`, aqua `#45E0BE`, violet `#9C8BFF`, orange `#FF9A57`, green `#5CE07E`, red `#FF6B6B` — these are exactly `C` in `theme.js`. Fonts: Atkinson Hyperlegible Next (UI) / Atkinson Hyperlegible Mono (code) = `TYPE.ui` / `TYPE.code`. Code token colors: keywords `#B7A9FF`, numbers `#FFD34D`, symbols `#45E0BE` (= `tokColor`). Vinyl motif: circle with `radial-gradient(circle, <tier color> 26%, #2a2450 30%, #1a1638 70%)` + 2px tier-color border; tiers gold `#FFD34D`, silver `#c9c3d4`, bronze `#cd7f32`.

**The six screens to build:**
- **7a Crew Map** — replaces/extends `MapScreen`'s level list. Each level row: mentor portrait (46px, rounded 8px), name + mono skill token, one-line character blurb, stars or state. States: met (aqua border, green left rail), in-session (pink accent + glow), locked (45% opacity, grayscale portrait, lock/`?`). Footer: Club door card (Club palette `#07060c`/amber border, Shadow Master) + rival card (Pixel Beat).
- **7b Mentor session** (Octave shown; pattern generalizes) — left mentor panel: portrait, name+role in mono, speech bubble (character voice replaces the generic `Mentor` copy), mentor-specific widget (Octave: tape rack of pressed loops). Right: existing stage checklist + editor + chip rows + actions (`▶ Play`, `● Press to tape` pink, `Ask <mentor>` orange ghost). The session IS today's `BuildPhase` with a face.
- **6a Reverb feedback wiring** — companion panel with live expression states; the "stuck" state highlights the fixing chip in aqua with glow. Status strip below actions: vinyl icon + plain-language diagnosis ("This take is 0.5 beats short") + take counter.
- **7c Glitch encounter** — debugging drill screen: darker bg (`#0b0916` radial), buggy lines highlighted `rgba(255,107,107,.12)` with dashed-underline wrong token + plain-language ear-first hints; Glitch portrait with red health bar (40% = 2 bugs left); actions `▶ Hear the bug` / `Fix this line`. Reverb's error face reacts alongside.
- **6b/6c Career screen** — full-height avatar card (girl 6b pink / boy 6c aqua), chart list (#1–#4, vinyl icons, your record highlighted with `▲ n` mover), ladder progress bar with rung labels, Reverb story quip, next-session drill cards, `Book the session` yellow CTA.

**Context only (do not build; useful background on intent):** 4a chart-rail-beside-BuildPhase, 4b record wall + ladder, 4c drill desk with fading chip pads, 4d session flow storyboard, 5a gear shelf ("The Rig"), 5b story map chapters, 5c Reverb evolution spec, 7d road-to-club strip (track battle / Amp / boss set).

## Interactions & Behavior
- **Cut a take**: pink `●` action; evaluates current stage checks (`BuildPhase` already has them). Clean = Reverb Hype flash + take counter; N clean takes = record pressed (tier by takes needed: first-try = gold, steady = silver, sloppy = bronze) → chart insert animation.
- **Chart movement**: record enters at tier-based position; `▲ n` badge on movers. Chart rungs gate content exactly like today's `stars`-based gating — map tiers onto the existing `trackOpen`/star thresholds rather than a new economy.
- **Reverb states**: idle (eyes dance while playing), hype (~1.2s on stage complete, replaces the current green banner), confused (after ~30s no progress; simultaneously glow the relevant chip), error (on `parseCode` errors; point at line). Never punitive — no red flashes for musical misses, matching the Club's "sour, not sour-faced" rule.
- **Drills**: 3–5 min sessions; each retake removes one chip from the palette (grey, non-interactive) until typed entry only. Reuses `codeMode` switch already in `BuildPhase`.
- **Track battles**: chapter-end; same `build` config for both sides; rival's take is a pre-authored recording; simple A/B playback then result.
- **Story scenes**: max 3 lines, always skippable, gear handover rendered (new chip group visibly installs on the rig shelf).

## State Management
Extend existing `state/` modules; do not add a parallel store:
- `records: { [levelOrDrillId]: { tier: 'bronze'|'silver'|'gold', loop: savedLines, name } }` — the pressed loop is saved so Octave's tape rack can replay it.
- `chart: ordered record ids + rival entries`, `rung: 0–4`, `chapter: 1–5`, `avatar: 'girl'|'boy'`.
- `crewMet: Set<mentorId>` — derives gear/chip unlocks (replaces raw stage-unlock presentation, not its logic).
- Reverb expression is derived state (parse errors / idle-timer / stage-complete), not stored.

## Design Tokens
See palette above (= `theme.js` `C`, `TYPE`, `tokColor`). Radii: panels 4–6px (repo uses 4), portraits 8px, gear cards 8px, pills 99px only for chips-as-pads. Chips: `#26225A` bg, 1px `#332E66` border, 4px radius, mono 12px. Buttons: solid fills with `#110F26` ink (aqua = play, pink = record/cut, yellow = book/CTA), ghost = 1px colored border. Locked/unmet: 45–65% opacity + grayscale filter. Club-side cards keep the Club palette (`#07060c`, ink `#f3eee4`, amber `#ffb703`) — the two rooms never share accents.

## Assets
`assets/` (cropped from the user's two concept sheets; re-export clean versions for production):
reverb-main2.png, reverb-hype2.png, reverb-confused2.png, reverb-error.png, pixel-beat-girl.png, pixel-beat-boy.png, beat-duo.png, echo-bpm.png, octave.png, synthia.png, sample-sam.png, shadow-master.png, glitch.png, cadence.png, amp.png. Source sheets in `uploads/`.

## Files
- `In The Club Mockups.dc.html` — all mockups. **Options 6a–6c + 7a–7c are the scope of this handoff**; turns 4–5 and 7d are exploration context; turn 3 (3a/3b) is the Club booth, already handed off separately in `design_handoff_in_the_club/`.
- `assets/` — character art used by the mockups.
- `support.js` — mockup runtime; needed only to open the HTML locally, ignore otherwise.

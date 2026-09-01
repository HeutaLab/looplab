# LoopLab — a complete description of the site, for learning and for learners

*A source document describing what LoopLab is, what it teaches, how it teaches it, and
how a learner or a teacher moves through it. Everything here describes the site as it
actually is.*

---

## 1. What LoopLab is, in one paragraph

LoopLab is a browser-based music-coding game that teaches children to write **real Sonic
Pi code** — the same commands, synth names and sample names used in the free Sonic Pi
desktop application — by using that code to make dance music they can hear immediately.
It has two halves. **The Studio** is a six-level course that introduces one coding idea
at a time. **The Club** is a performance area where the learner takes six original dance
tracks, debugs them by ear, and then performs them live to an animated crowd, editing the
code while it is playing. Nothing the learner writes is thrown away: any track can be
copied out as plain Sonic Pi source and pasted into the real application. The strapline
on the front screen is *"Learn to code music — then DJ the club."*

The site is a single-page web app. It runs entirely in the browser, has no accounts, makes
no network calls after the page loads, and works offline. It deploys as a static site to
`looplab.heutalab.com`.

---

## 2. Who it is for, and where it is used

- **Age range:** roughly 10–13 (upper primary and lower secondary).
- **Two settings, deliberately both supported at once:**
  - **In school** — shared devices, a class of up to about 30, lessons of about 45
    minutes, often two children to one machine.
  - **At home** — a phone, no supervision, and no Sonic Pi installed.
- **Prior knowledge assumed:** none. No coding experience, no music theory, no ability to
  read staff notation. The learner needs to be able to read short sentences and tap or type.
- **Prior software assumed:** none. Sonic Pi itself is *not* required to use LoopLab; it
  is the destination the site points learners towards, not a dependency.

The design consequence of serving both settings is that everything is local and portable:
a child can start at school and carry their progress home by writing an eight-character
code in their exercise book.

---

## 3. The language LoopLab teaches

Every line of code shown, tapped or typed in LoopLab is valid Sonic Pi. There is no
invented pseudo-language and no block-only dialect that has to be unlearned later.

### Commands taught

| Command | What it does | Introduced in |
|---|---|---|
| `play 60` | Plays one note. The number is a MIDI note number: 60 is middle C, higher numbers sound higher. | Level 1 |
| `sleep 0.5` | Waits before the next line. The number is in beats. | Level 1 |
| `3.times do` … `end` | Repeats everything between `do` and `end` three times. | Level 2 |
| `sample :bd_haus` | Plays a drum sound by its real Sonic Pi name. | Level 3 |
| `use_synth :saw` | Changes the instrument used by every `play` after it. | Level 4 |
| `live_loop :drums do` … `end` | A loop that runs forever, on its own, alongside other live loops. | Level 5 |
| `use_bpm 130` | Sets the tempo in beats per minute. | Level 6 |
| `play choose([60, 64, 67, 72])` | Picks one note at random from a list, every time round. | Level 6 |
| `sample choose([:sn_dolf, :drum_cymbal_closed])` | The same idea for drums. | Level 6 |
| `sleep rrand(0.25, 0.5)` | Waits a random amount of time between two values. | Level 6 |

### The three drum samples

- `:bd_haus` — the house kick drum (the "boom"), shown in the game with 🦶
- `:sn_dolf` — the snare (the "crack"), shown with 🥁
- `:drum_cymbal_closed` — the closed hi-hat (the "tss"), shown with ✨

These are the genuine Sonic Pi sample names, kept deliberately rather than simplified, so
that the code transfers. The site teaches the everyday word and the real name together.

### The six instruments (`use_synth`)

`:beep` (the default, a soft triangle tone) · `:saw` (buzzy) · `:square` (game-console
sounding) · `:tb303` (squelchy acid bass) · `:prophet` (warm chord pad) · `:pretty_bell`
(dreamy bell).

### The note numbers in use

The palettes offer 33, 36, 38, 40, 43, 45, 48, 52, 55, 57, 59, 60, 62, 64, 66, 67, 69, 72,
76 and 79 — bass notes in the 30s and 40s, melody notes in the 60s and 70s. Learners are
never asked to name a note; they learn that *bigger number = higher sound* and that certain
numbers sound good together.

### Timing

Sleeps are always fractions of a beat: `0.25`, `0.5`, `0.75`, `1`, `1.5`, `2`. One bar is
four beats. Level 5 makes this explicit by requiring a loop whose sleeps add up to *exactly*
four beats, with a live beat counter on screen.

---

## 4. How the site is organised

The learner sees a small number of screens:

1. **"Who's playing?"** — a list of players on this device. On a fresh device this is the
   first thing shown; the learner types a first name or nickname.
2. **The Map** — the home screen. It shows the LoopLab title, a mentor greeting, the six
   Studio levels as a vertical list with star ratings and locks, and the entrance to The
   Club. It also carries the save indicator and links to "My progress" and "Switch player".
3. **A Level screen** — three phase tabs across the top and the current phase below.
4. **The Club** — a "crate" of six records to pick from.
5. **The DJ screen** — soundcheck, then the live set, then a results card.
6. **My progress** — the report, the progress code, and the code-entry box.
7. **The Teacher panel** — hidden; see §11.

A mentor character called **DJ Loop** (a 🤖 avatar) speaks in a small speech bubble at the
top of nearly every screen. DJ Loop explains the idea, reacts to what the learner did, and
gives the encouragement. All instructional voice in the game is DJ Loop's.

Beneath most screens is a **note highway**: a five-lane view where each note or drum hit
falls down the screen and bursts on a hit line exactly as it sounds. Low sounds occupy the
left lanes, high sounds the right; drums are squares, notes are circles labelled with their
number. It exists so that code, sound and time are visibly the same thing.

---

## 5. The teaching model

### 5.1 I do → We do → You do

Every level in the Studio has three phases, shown as tabs and worth one star each:

- **👀 I do — "Watch."** DJ Loop's own code is on screen. The learner presses play, hears
  it, and watches the highway. A closing message explains what just happened. The "next"
  button only becomes available once the demo has actually played through.
- **🤝 We do — "Together."** The same kind of code, but with two blanks in it. Four chips
  are offered, of which two are correct. The learner taps chips into the blanks and presses
  **▶ Play & check**. There is also **🎧 Hear the goal**, which plays the correct version.
  A wrong answer is answered with a hint that points at listening, never at failure.
- **🚀 You do — "Your turn."** An open build with a palette of chips and a checklist of
  goals (for example, *use `play` at least four times*). Goals tick green as they are met.
  The level completes when every goal is met **and** the learner has played their own track.

In Levels 5 and 6 the third phase is replaced by the **🧱 Build Lab** (see §5.3).

Completing all three phases awards three stars, triggers a confetti celebration, and
unlocks the next level.

### 5.2 The scaffolding ramp: chips → hybrid → typed

The single most important pedagogical structure in LoopLab is the gradual removal of
scaffolding across the whole site, in three named modes:

| Mode | What the learner does | Where it appears |
|---|---|---|
| **chips** | Taps buttons; each tap adds a whole line of code. No typing at all. | Studio Levels 1–4; club tracks *Warehouse 909* and *Acid Alley* |
| **hybrid** | Types into a real code editor — and the chips are still there, but a chip now *types its text at the cursor* instead of adding a line. The learner watches the syntax appear, then starts typing it themselves. | Studio Level 5; club track *Piano Sunrise* |
| **typed** | Types the code. The chips are hidden behind a button labelled *"Stuck? Show me the blocks 🧱"*, one tap away. | Studio Level 6; club tracks *Rave Siren*, *Deep Down*, *Hardfloor Finale* |

Two design rules go with this: it is the *same editor* throughout, so nothing has to be
relearned; and returning to the blocks is always one tap and is never described as a step
backwards. (The button to hide them again reads *"Hide the blocks — I've got this ✍️"*.)

### 5.3 The Build Lab (staged construction)

In Levels 5 and 6, instead of a free build, the learner works through numbered **stages**,
each with a short brief, its own hint, and its own automatic check. Only the chips and loops
that a stage needs are unlocked, so the palette grows as the learner progresses rather than
overwhelming them at stage one. When a stage's check passes, a green banner appears and the
next stage opens about a second later. Some stages require *playing* the result a certain
number of times, not just writing it, so that listening is part of the work.

---

## 6. The Studio, level by level

### Level 1 — First Notes 🎵 · *"Notes are just numbers!"*
- **Idea:** `play` turns a number into a note; `sleep` puts a gap between notes.
- **Watch:** a rising chord — `play 60`, `sleep 0.5`, `play 64`, `sleep 0.5`, `play 67`,
  `sleep 0.5`, `play 72`.
- **Together:** *Twinkle Twinkle* with two pieces missing — one `play` value and one
  `sleep` value.
- **Your turn goals:** use `play` at least 4 times; use `sleep` at least 3 times; use 2
  different note numbers.
- **Palette:** notes 48, 52, 55, 60, 64, 67, 72; sleeps 0.25, 0.5, 1.

### Level 2 — Loop Magic 🔁 · *"Repeat with 3.times do"*
- **Idea:** a loop repeats code so you write less and get more music. Four lines make six
  notes.
- **Together:** fill in the repeat count and a missing note in a bouncy loop.
- **Your turn goals:** turn on Repeat (which is a loop); at least 2 `play`s; at least 2
  `sleep`s.
- **Completing this level unlocks The Club.**

### Level 3 — Drum Machine 🥁 · *"sample plays drum sounds"*
- **Idea:** `sample` plays drums, using their real names. The demo is kick–hat–snare–hat,
  described as the pattern in thousands of songs.
- **Together:** two drums have gone missing from the beat; the learner places the hat and
  the snare by ear.
- **Your turn goals:** 2 different drum sounds; Repeat on; 8 or more drum hits in total.

### Level 4 — Super Jam ⭐ · *"use_synth + everything!"*
- **Idea:** `use_synth` changes the instrument, and — crucially — **notes with no `sleep`
  between them play at the same time**, which is how a drum and a bass note land together.
- **Together:** choose the buzzy `:saw` sound and find a missing note.
- **Your turn goals:** choose a sound with `use_synth`; use at least 1 drum sample; at
  least 3 `play`s; Repeat on.
- Finishing this level is framed as graduating: *"You're officially a LoopLab DJ!"*

### Level 5 — Two Loops at Once 🔀 · *"live_loop — parts running side by side"*
- **Idea:** real tracks have parts playing simultaneously. A `live_loop` runs forever on
  its own, and you can have several, locked to the same clock. Runs at 126 BPM.
- **Watch:** a drums loop and a bass loop, each exactly four beats long, running together.
- **Together:** DJ Loop's drum loop is already rolling; the learner fills in the bass loop
  so that it locks in.
- **Build Lab (hybrid mode, beat counter visible), four stages:**
  1. *Lay the foundation* — in `:drums`, at least 4 drum hits and sleeps totalling exactly
     4 beats.
  2. *Add the low end* — switch to `:bass`, at least 3 notes, sleeps totalling exactly 4
     beats, so it matches the drums.
  3. *Run them together* — press play and hear both loops at once.
  4. *Make it yours* — free build, 12+ lines across the two loops, then play it again.

### Level 6 — Never the Same Twice 🎲 · *"choose, rrand and use_bpm"*
- **Idea:** `use_bpm` sets the speed; `choose` picks a random item from a list every time
  round, so the same code produces different music. Named for the learner as **generative
  music**: *"Your program is composing."* Runs at 130 BPM.
- **Together:** set the tempo and give `choose` a list of notes and a list of drums.
- **Build Lab (typed mode), five stages:**
  1. *Set the tempo* — add a `use_bpm` line (house lives around 126–134).
  2. *Add a random note* — a `play choose([...])` line.
  3. *Randomise the drums* — a `sample choose([...])` line, plus at least 3 sleeps, because
     *"without sleeps, everything lands at once."*
  4. *Hear it change* — play the loop twice and listen to the difference.
  5. *Your generative track* — 10+ lines, play it, and copy it into real Sonic Pi.

### Progression rules in the Studio
- Level 1 is open. Every later level unlocks when the previous one has all three stars.
- Within a level, phase *n* is available once the learner has *n* stars, so phases are
  taken in order but can be revisited freely.
- Stars never go down.

---

## 7. The Club

The Club opens after Level 2. It contains six original tracks written in classic dance
styles between 125 and 140 BPM. Every loop in every track is exactly one bar of real Sonic
Pi code. The first two tracks are open; each later track unlocks when the learner earns any
record on the one before it.

| # | Track | Style | BPM | Loops | Bugs | Mode |
|---|---|---|---|---|---|---|
| 1 | Warehouse 909 🏭 | Classic House | 128 | drums, claps, bass, stabs | 3 | chips |
| 2 | Acid Alley 🧪 | Acid | 133 | drums, claps, acid, lead | 3 | chips |
| 3 | Piano Sunrise 🌅 | Piano House | 126 | drums, claps, keys, bass | 3 | hybrid |
| 4 | Rave Siren 📢 | Oldskool Rave | 138 | drums, stabs, lead, bass | 4 | typed |
| 5 | Deep Down 🌊 | Deep House | 125 | drums, claps, sub, chords | 3 | typed |
| 6 | Hardfloor Finale 🔥 | Peak-Time Techno | 140 | drums, claps, bass, siren | 4 | typed |

Each track is played in three stages.

### 7.1 Soundcheck — debugging by ear
Every track "arrives from the studio" with bugs planted in it: a sour bass note, a hat
swapped for a snare, a sleep that makes the rhythm limp. The learner can:
- **▶ Solo this loop** — hear just the loop they are working on,
- **🎧 Hear it fixed** — hear the correct version of that loop for comparison,
- **💡 Hints** — reveal a written clue for every bug (for example, *"The stabs are
  stumbling — a sleep is wrong."*).

In chips mode a tap on a line offers the legal alternatives for that line; in hybrid and
typed mode the loop is edited as text. Soundcheck passes only when *every* loop matches the
studio version again — including any line the learner changed themselves while hunting. If
they have fixed all the planted bugs but left a stray edit, DJ Loop says so explicitly and
distinguishes the two cases. Repairs are saved automatically, so an interrupted lesson does
not mean listening for the same sour note twice.

This stage is the site's debugging curriculum: read, listen, compare against a known-good
version, isolate, change one thing, listen again.

### 7.2 The Live Set — performing the code
A set is **48 bars** long. It starts with only the drums running; the other loops are muted.
On screen: a bar counter, a **crowd hype** meter from 0–100%, a dancing crowd, DJ Loop's
running commentary, and the note highway. The learner has four controls:

- **Mute / unmute each loop** — changes take effect at the start of the next bar.
- **BPM up and down** in steps of 2, between 118 and 148.
- **Live code edits** — tap a line, choose a new value; the edit drops in on the next loop,
  exactly as it would in a real `live_loop`.
- **⏹ End set** at any time.

Two things happen during a set:
- **Crowd requests** appear every eight bars, starting at bar 4: *"Drop the bass! Bring it
  IN!"*, *"Strip it back — cut the stabs!"*, *"Take it to 132 BPM!"* Meeting a request
  within eight bars gives +15 hype; letting it expire costs 10.
- **Glitches** strike at bars 10, 24 and 38: one line of a running loop is silently
  corrupted — a note shifted by one, a sleep halved or doubled, a drum swapped. Hype drains
  while it persists; fixing it live gains +12 and the message *"Live fix! The floor goes
  wild!"* After a few bars the offending line is highlighted, so nobody is stuck.

Hype also rises for keeping the track full — running three or more loops gains hype each
bar, one loop holds steady, and muting everything loses hype fast. The lesson embedded in
the scoring is *arrangement*: build it up, keep parts moving, respond, repair.

### 7.3 Results
The set is scored on **average crowd hype across the bars played**: 70%+ earns a 🥇 gold
record, 50%+ a 🥈 silver, 30%+ a 🥉 bronze; below that the card reads *"The crowd wants more
practice…"* with a tip. A set shorter than 16 bars does not earn a record. Records are
kept as the best ever achieved for that track — replaying can only improve them. From the
results card the learner can replay, go back to the crate, or **📋 Take this track to Sonic
Pi**.

### 7.4 Exporting to Sonic Pi
Anywhere a 📋 button appears — a Your-turn track, a Build Lab loop, a finished live set —
LoopLab generates genuine Sonic Pi source, complete with `use_bpm`, `live_loop :name do`
wrappers and indentation, ready to copy into the free desktop application. The map screen
states this plainly: *"Everything here is real Sonic Pi code — real synth names, real
sample names, real live loops."*

---

## 8. How LoopLab talks to a learner who is wrong

This is a distinctive part of the design and worth understanding on its own.

**There are no fail states, no timers on learning content, no red crosses on a learner's
work, and no scores in the Studio.** The strongest negative feedback permitted anywhere in
the learning content is of the form *"not quite — have another listen."*

**Wrong answers in the "Together" phase** are answered with a listening hint, shown
immediately rather than after playback: *"Hmm, not quite the goal track — tap 🎧 Hear the
goal, then try different chips!"* The learner still hears their own attempt, capped to about
ten seconds so that a wrong `sleep` value cannot produce a minute of near-silence before
they are told anything.

**Typed code gets error messages written for a ten-year-old.** There is no "unexpected
token", no "NaN", and every message contains a worked example of the corrected line. The
parser reports every bad line at once rather than stopping at the first. Examples of real
messages:

- `plai 60` → *"So close — `plai` should be `play` 🙂"*
- `sample snare` → *"Drums need a colon in front: `sample :sn_dolf`"*
- `sample :snare` → *"I don't know `:snare` — did you mean `:sn_dolf`?"*
- `sleep 0,5` → *"Use a dot for decimals: `sleep 0.5`"*
- `4 times do` → *"Nearly — put a dot in it: `4.times do`"*
- `4.times` → *"`4.times` needs `do` on the end: `4.times do`"*
- a missing `end` → *"One loop is still open — add `end` on its own line to close it."*
- an extra `end` → *"There's an extra `end` here — every `end` needs a `.times do` above it."*
- `live_loop :bass do` typed inside a Build Lab loop → *"You're already inside a loop here —
  just write the notes, and the game wraps them in the `live_loop` for you."*

Two mechanisms make this possible. A **word map** translates the vocabulary a child actually
has into the vocabulary Sonic Pi has — *snare, kick, hat, clap, boom, hihat, cymbal* map to
the real sample names; *bass, acid, lead, buzz, game, chip, bell, pad, chord* map to the
synths. And an **edit-distance check** catches ordinary typos. A recognised word wins over a
spelling guess, so the message teaches the real name rather than merely rejecting the input.

**Hints are always available and never penalised.** Every Build Lab stage has one; every
club track has a full list of them behind the 💡 button.

---

## 9. Players, saving and carrying progress

### Local players
A single device holds up to 40 players. Each has a first name or nickname (16 characters
max), their own stars, their own records, and their own half-finished work. Switching player
swaps the entire state, so two children sharing a machine never see each other's progress.
The map header shows who is playing and offers *"Not you? Switch player."*

### Autosave
Stars, records and **work in progress** are saved continuously — a partially built Build Lab
loop, a partly repaired club track, the stage the learner had reached, and how many times
they had played it. Returning mid-task produces the message *"Picking up where you left off
🎧 — your code is just as you had it."* The map shows the true saving status, including an
honest warning if the browser is refusing to store anything.

### Progress codes (school ↔ home)
The "My progress" screen shows an eight-character code in the form **`LL-XXXX-XXXX`**. It
encodes the learner's six level star ratings and six track records into 32 bits, rendered in
Crockford base-32 with a checksum. Two consequences matter for learners: the alphabet has no
I, L, O or U, and confusable characters are corrected on entry, so a code copied by hand off
a whiteboard still works; and a mistyped character fails the checksum rather than silently
restoring the wrong progress.

Codes **merge upward only** — entering a code can add stars and better records, never remove
them. A child who did more at home than at school is not penalised for typing their school
code in. The instruction on screen is simply: *"✍️ Write this in your book. Type it in at
home to carry on there."*

There is no cloud sync, no login and no server involved in this — the code *is* the
transport.

---

## 10. The progress report and evidence

"My progress" generates a plain-Markdown report containing:

- the learner's name and the date,
- how many Studio levels and Club tracks they have finished,
- whether they completed any level **by typing real Sonic Pi** rather than tapping blocks,
- a table of the six levels with stars and *how they wrote it* ("blocks", "blocks + typing",
  "typed it myself"),
- a table of the six club tracks with records earned and the same mode column,
- an **"I can…"** checklist.

The "I can" statements are derived from what was actually completed, not self-reported, so
every tick is defensible:

- I can use `play` to turn numbers into notes
- I can use a loop to repeat music instead of writing it out
- I can use `sample` to play drum sounds
- I can change the instrument with `use_synth`
- I can run two `live_loop`s at the same time
- I can use `choose` and `rrand` so it never plays the same twice
- I can find a bug in code by listening to it
- I can keep a live set going and answer the crowd

The report can be **copied** (for pasting into Google Classroom during the lesson) or
**saved as a file** for an evidence folder. Both produce identical text, so a teacher
collecting thirty of them gets thirty identically shaped documents. The report footer states
that everything was done on the device and that the student themselves copied or saved it.

---

## 11. The teacher's controls

The teacher panel is deliberately invisible in the student interface. It opens by
**pressing and holding the LoopLab title on the map for three seconds**, and then asks for a
**four-digit PIN** (default `2468`, changeable, stored on the device rather than with a
player). A wrong PIN reveals nothing at all.

Inside it: manage players, unlock every level (for a learner joining mid-scheme or a
demonstration), reset the current player's progress (with a confirm-twice step), and change
the PIN.

Other classroom-facing features:
- A **master volume slider and mute** that persist across screens and belong to the device
  rather than the player — set once for the room.
- **Mute keeps the note highway animating**, so a track can be demonstrated silently on a
  projector.
- A **headphones prompt** on a device's first run: *"This one makes noise. Plug your
  headphones in so you can hear your track — and so everyone else can hear theirs."*
- A persistent footer note for the commonest classroom problem: *"No sound? Turn the volume
  up, switch off silent mode, and tap ▶ again."*

---

## 12. Privacy, safeguarding and offline use

These are stated product positions, not incidental technical facts:

- **No accounts, no login, no email address.** A first name typed on the device is the only
  personal data, and it never leaves that device.
- **No network calls after the page loads.** No telemetry, no analytics, no cloud sync, no
  API. The deployment even suppresses the hosting platform's automatic analytics injection
  so that no beacon reaches a child's browser.
- **No chat, no user-to-user sharing, no leaderboards, no public profiles.** Children cannot
  contact each other through LoopLab, because there is nothing to contact through.
- **Works offline** once loaded.
- **All audio is synthesised in the browser** — there are no audio files to download, and
  the drums are generated, not sampled recordings.
- **All musical content is original**, composed for the game in recognisable genres. There
  are no copyrighted melodies, samples or riffs.
- Progress leaves the device only when a human copies it: a progress code written in a book,
  or a report pasted or saved by the student.

---

## 13. Device and accessibility design

- **Mobile-first and portrait.** A phone gets a single column with everything reachable by
  one thumb; touch targets are large. On tablets, laptops and projectors the same layout
  gets more room, and from large screens up the phase screens split into two columns — what
  you watch (mentor, note highway, goals) beside what you edit — so nobody scrolls between
  making a change and hearing it.
- **Reduced motion** is respected: with the system setting on, all animation and transition
  is switched off.
- Interactive controls carry accessible labels; error messages and restore messages are
  announced politely to screen readers.
- Text inputs disable autocapitalise, autocorrect and spellcheck where code is being typed.
- A silent-audio unlock keeps sound working on iPhones even with the physical mute switch
  on — a common cause of "it doesn't work" in a classroom.
- Corrupt or unreadable saved data is discarded rather than allowed to lock a learner out.

---

## 14. What the site covers, in curriculum terms

**Computing / computer science**
- **Sequence** — code runs top to bottom; `sleep` is what puts events in time.
- **Iteration** — count-controlled loops (`n.times do`), and the reason for them: less
  typing, more music.
- **Concurrency** — several `live_loop`s running side by side and staying in time; the
  distinction between "at the same time" (no `sleep` between lines) and "one after another".
- **Debugging** — a whole game area built on it: reproduce, isolate (solo a loop), compare
  against a correct version, change one thing, re-test. Including *live* debugging under
  time pressure in the set.
- **Syntax and error handling** — real syntax, real errors, but errors phrased as guidance.
- **Randomness and generative systems** — `choose` and `rrand`, and the idea that the same
  program can produce different output every run.
- **Parameters and abstraction** — `use_synth`, `use_bpm` and note numbers as values that
  change what a command does.
- **Data representation** — pitch as a number, duration as a number.

**Music**
- Beat, bar, tempo (BPM) and why dance music lives at 125–140.
- Structure and arrangement: building a track up, stripping it back, responding to a room.
- Layering: drums, bass, chords/stabs, lead.
- Timbre: recognising and choosing between six instrument sounds.
- Genre: house, acid, piano house, oldskool rave, deep house, techno.
- Ear training: identifying a wrong note, a wrong drum, or wrong timing by listening.

**Mathematics**
- Decimal fractions in use: 0.25, 0.5, 0.75 and 1 summing to exactly 4.
- Counting repeats, and multiplication as repetition (4 lines × 3 repeats = 12 events).
- Number line intuition for pitch (bigger number = higher).

---

## 15. Misconceptions the design anticipates

Useful to know, because the site's structure is partly a response to them:

1. *"The computer plays all the lines at once."* Addressed by `sleep` from the very first
   demo, and by the note highway making time visible.
2. *"No `sleep` means nothing happens."* Level 4 turns this into a feature: lines with no
   `sleep` between them are how a drum and a note land together.
3. *"A loop is a kind of speed-up."* Level 2's demo counts the notes: four lines make six
   notes, and the loop body is what repeats.
4. *"Random means broken."* Level 6 names the behaviour — generative music — and asks the
   learner to play it twice deliberately to hear it change.
5. *"Two loops can't run at once."* Level 5 exists for this, with a beat counter enforcing
   that both loops are the same length so they lock together.
6. *"An error means I failed."* Every parser message offers the corrected line, and the
   blocks are always one tap away.
7. *"Only the bug lines matter."* Soundcheck checks the whole loop against the correct
   version, so a stray edit is caught and explained rather than carried into the set.

---

## 16. Glossary for learners

- **BPM** — beats per minute; how fast the music goes.
- **Bar** — four beats. Every loop in the Club is one bar long.
- **Chip / block** — a button that writes a line of code for you.
- **Crowd hype** — the 0–100% meter in a live set; how much the crowd is enjoying it.
- **Glitch** — a line of code that breaks mid-set and has to be repaired live.
- **Live loop** — a loop that runs forever on its own, alongside other live loops.
- **MIDI note number** — the number in `play 60`; 60 is middle C, bigger is higher.
- **Note highway** — the falling-notes display; each shape is one sound.
- **Record** — bronze, silver or gold, earned by performing a club track well.
- **Request** — something the crowd asks for during a set, with eight bars to do it.
- **Soundcheck** — repairing a track's bugs before performing it.
- **Star** — one per phase of a Studio level; three per level.
- **Sonic Pi** — the free desktop application that uses this same code language.

---

## 17. What LoopLab deliberately does not do

Stated plainly, because it shapes how the site should be taught and described:

- It does not have accounts, logins, profiles in the cloud, or password recovery.
- It does not collect, transmit or store anything off the device — including no analytics.
- It does not let children message, share with, or see each other.
- It does not have leaderboards or class rankings.
- It does not put a timer on any learning content, and there is nothing to lose or fail in
  the Studio.
- It does not mark a learner's own creative work wrong; the "Your turn" phases have goals to
  unlock, and explicitly *"no wrong answers."*
- It does not teach a simplified or invented language that would have to be unlearned.
- It does not require Sonic Pi to be installed, and does not require an internet connection
  after the first load.
- It does not include built-in lesson plans, worksheets or a printable command reference —
  the in-app report is the teacher-facing artefact that exists today.

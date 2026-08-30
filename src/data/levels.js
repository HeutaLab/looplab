import { D, END, LOOP, P, S, SY, seq } from "../engine/interpreter.js";
import { DRUMS } from "../theme.js";

export const LEVELS = [
  {
    id: "notes",
    title: "First Notes",
    emoji: "🎵",
    blurb: "Notes are just numbers!",
    watch: {
      mentor: "In music code, every note is a number — 60 is middle C, bigger numbers sound higher. `sleep` waits between notes. Watch me climb a happy chord!",
      lines: [P(60), S(0.5), P(64), S(0.5), P(67), S(0.5), P(72)],
      after: "See how each line became a flying note, and sleep made the gaps? That's the whole secret!",
    },
    together: {
      mentor: "This song is Twinkle Twinkle — but two pieces fell out! Tap the chips to fix it, and check with your ears. 👂",
      lines: [P(60), S(0.5), P(60), S(0.5), { t: "play", blank: "67" }, S(0.5), P(67), { t: "sleep", blank: "0.5" }, P(69), S(0.5), P(69), S(0.5), P(67)],
      chips: ["67", "0.5", "44", "2"],
      hint: "Hmm, not quite the goal track — tap 🎧 Hear the goal, then try different chips!",
    },
    yourTurn: {
      mentor: "Your turn! Build your very own melody. Any notes you like — there are no wrong answers, only goals to unlock. 🚀",
      palette: { notes: [48, 52, 55, 60, 64, 67, 72], sleeps: [0.25, 0.5, 1], drums: null, loop: false, synth: false },
      goals: [
        { label: "Use play at least 4 times", test: (s) => s.plays >= 4 },
        { label: "Use sleep at least 3 times", test: (s) => s.sleeps >= 3 },
        { label: "Use 2 different note numbers", test: (s) => s.distinctNotes >= 2 },
      ],
    },
  },
  {
    id: "loops",
    title: "Loop Magic",
    emoji: "🔁",
    blurb: "Repeat with 3.times do",
    watch: {
      mentor: "Why write the same line again and again? A loop repeats code for you. These 4 little lines make SIX notes — watch!",
      lines: [LOOP(3), P(72), S(0.25), P(69), S(0.5), END()],
      after: "The loop ran everything between `do` and `end` three times. Loops = more music, less typing!",
    },
    together: {
      mentor: "Let's finish this bouncy loop together. How many times should it repeat, and which note is missing?",
      lines: [{ t: "loop", blank: "4" }, P(62), S(0.25), { t: "play", blank: "69" }, S(0.25), END()],
      chips: ["4", "69", "99", "0.25"],
      hint: "Almost! Listen to the goal — count the repeats, and hunt for the right note. 🎧",
    },
    yourTurn: {
      mentor: "Build a pattern, then flip on Repeat to loop it. Tiny code, big music! 🔁",
      palette: { notes: [48, 52, 55, 60, 64, 67, 72], sleeps: [0.25, 0.5, 1], drums: null, loop: true, synth: false },
      goals: [
        { label: "Turn on Repeat (that's a loop!)", test: (s) => s.loopCount >= 2 },
        { label: "Use play at least 2 times", test: (s) => s.plays >= 2 },
        { label: "Use sleep at least 2 times", test: (s) => s.sleeps >= 2 },
      ],
    },
  },
  {
    id: "drums",
    title: "Drum Machine",
    emoji: "🥁",
    blurb: "sample plays drum sounds",
    watch: {
      mentor: "`sample` plays drum sounds — with their REAL Sonic Pi names! :bd_haus is the famous house kick (boom), :sn_dolf cracks, :drum_cymbal_closed goes tss. Feel this beat!",
      lines: [LOOP(2), D("bd_haus"), S(0.25), D("drum_cymbal_closed"), S(0.25), D("sn_dolf"), S(0.25), D("drum_cymbal_closed"), S(0.25), END()],
      after: "Kick, hat, snare, hat — that pattern is in thousands of songs. Now you know its code!",
    },
    together: {
      mentor: "Two drums escaped from this beat! Where do the hat and the snare go? Trust your ears. 👂",
      lines: [
        LOOP(2),
        D("bd_haus"),
        S(0.25),
        { t: "sample", blank: "drum_cymbal_closed" },
        S(0.25),
        { t: "sample", blank: "sn_dolf" },
        S(0.25),
        D("drum_cymbal_closed"),
        S(0.25),
        END(),
      ],
      chips: ["drum_cymbal_closed", "sn_dolf", "bd_haus", "1"],
      hint: "Not quite the groove — hear the goal again. The tss comes before the crack!",
    },
    yourTurn: {
      mentor: "Build YOUR drum beat. Mix kicks, snares and hats — then loop it and dance. 🕺",
      palette: { notes: null, sleeps: [0.25, 0.5, 1], drums: DRUMS, loop: true, synth: false },
      goals: [
        { label: "Use 2 different drum sounds", test: (s) => s.distinctDrums >= 2 },
        { label: "Turn on Repeat", test: (s) => s.loopCount >= 2 },
        { label: "Make 8 or more drum hits in total", test: (s) => s.drumEvents >= 8 },
      ],
    },
  },
  {
    id: "jam",
    title: "Super Jam",
    emoji: "⭐",
    blurb: "use_synth + everything!",
    watch: {
      mentor: "Final power: `use_synth` changes the instrument! :saw is buzzy, :square is game-y, :pretty_bell is dreamy. Here's melody AND drums together:",
      lines: [SY("saw"), LOOP(3), D("bd_haus"), P(48), S(0.5), D("sn_dolf"), P(55), S(0.5), END()],
      after: "Notes with no sleep between them play at the SAME time — that's how the drum and note hit together!",
    },
    together: {
      mentor: "Last team-up! Pick the buzzy saw sound and find the missing note to finish this jam.",
      lines: [{ t: "synth", blank: "saw" }, LOOP(2), D("bd_haus"), P(48), S(0.5), D("sn_dolf"), { t: "play", blank: "55" }, S(0.5), END()],
      chips: ["saw", "square", "55", "72"],
      hint: "So close! The goal uses the buzzy sound — and the second note is a little higher than 48.",
    },
    yourTurn: {
      mentor: "This is it — your graduation jam! Pick a sound, drop a beat, write a melody, loop it all. Make it YOURS. 🌟",
      palette: { notes: [48, 52, 55, 60, 64, 67, 72], sleeps: [0.25, 0.5, 1], drums: DRUMS, loop: true, synth: true },
      goals: [
        { label: "Choose a sound with use_synth", test: (s) => s.synth !== "beep" },
        { label: "Use at least 1 drum sample", test: (s) => s.drumLines >= 1 },
        { label: "Use play at least 3 times", test: (s) => s.plays >= 3 },
        { label: "Turn on Repeat", test: (s) => s.loopCount >= 2 },
      ],
    },
  },
  {
    id: "liveloops",
    title: "Two Loops at Once",
    emoji: "🔀",
    blurb: "live_loop — parts running side by side",
    watch: {
      mentor: "Real tracks have parts playing AT THE SAME TIME. A `live_loop` runs forever on its own — and you can have several. Here are drums and bass, locked together:",
      loops: [
        { name: "drums", lines: seq(null, [["bd_haus", 0.5], ["drum_cymbal_closed", 0.5], ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5], ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5], ["sn_dolf", 0.5], ["drum_cymbal_closed", 0.5]]) },
        { name: "bass", lines: seq("tb303", [[33, 1], [40, 1], [38, 1], [33, 1]]) },
      ],
      bpm: 126,
      after: "Two loops, each 4 beats long, running side by side and staying in time. Stack a few of these and you have a whole track!",
    },
    together: {
      mentor: "My drum loop is already rolling. You fill in the bass loop so it locks in with mine — listen to how they fit together!",
      overLoop: seq(null, [["bd_haus", 0.5], ["drum_cymbal_closed", 0.5], ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5], ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5], ["sn_dolf", 0.5], ["drum_cymbal_closed", 0.5]]),
      bpm: 126,
      lines: [SY("tb303"), P(33), S(1), { t: "play", blank: "40" }, S(1), P(38), { t: "sleep", blank: "1" }, P(33), S(1)],
      chips: ["40", "1", "67", "0.25"],
      hint: "Not locked in yet — hear the goal and count: every note lasts one whole beat.",
    },
    build: {
      /* Halfway across the bridge: the editor is real, but a chip still types
         the line for you when you want it. */
      codeMode: "hybrid",
      mentor: "Now you write it yourself, one stage at a time — typing real code, with the blocks there if you want them. Each stage checks itself. 🧱",
      bpm: 126,
      showBeats: true,
      loops: [
        { name: "drums", icon: "🥁", allow: ["drums", "sleeps"] },
        { name: "bass", icon: "🎸", allow: ["notes", "sleeps", "synth"] },
      ],
      stages: [
        {
          title: "Lay the foundation",
          allow: ["drums", "sleeps"],
          brief: "In the :drums loop, build one bar: at least 4 drum hits, and sleeps adding up to exactly 4 beats.",
          hint: "Eight `sleep 0.5` lines make 4 beats. Put a drum before each one!",
          loop: 0,
          check: (c) => c.count(0, "sample") >= 4 && Math.abs(c.beats(0) - 4) < 0.01,
        },
        {
          title: "Add the low end",
          allow: ["notes", "sleeps"],
          brief: "Switch to the :bass loop. Write at least 3 notes, with sleeps adding up to exactly 4 beats — so it matches the drums.",
          hint: "Try low notes (33, 38, 40) and `sleep 1` after each — four of them make a bar.",
          loop: 1,
          check: (c) => c.count(1, "play") >= 3 && Math.abs(c.beats(1) - 4) < 0.01,
        },
        {
          title: "Run them together",
          allow: [],
          brief: "Both loops are ready. Press ▶ Play both loops and hear them run at the same time.",
          hint: "Just hit play — this is what live_loop does for real.",
          loop: 1,
          requirePlay: 1,
          check: () => true,
        },
        {
          title: "Make it yours",
          allow: ["synth"],
          brief: "Free build! Add more to either loop (12+ lines in total), then play it again.",
          hint: "Add a snare, or make the bass wander with different notes.",
          loop: 1,
          requirePlay: 2,
          check: (c) => c.lines(0) + c.lines(1) >= 12,
        },
      ],
    },
  },
  {
    id: "random",
    title: "Never the Same Twice",
    emoji: "🎲",
    blurb: "choose, rrand and use_bpm",
    watch: {
      mentor: "Last power-up: `use_bpm` sets the speed, and `choose` picks a RANDOM note from a list each time round. Your code starts surprising you!",
      loops: [
        { name: "generative", lines: [{ t: "bpm", v: 130 }, SY("prophet"), { t: "playChoose", v: [60, 64, 67, 72] }, S(0.5), D("bd_haus"), S(0.5), { t: "playChoose", v: [60, 64, 67, 72] }, S(0.5), D("drum_cymbal_closed"), S(0.5)] },
      ],
      bpm: 130,
      after: "Play it again — different notes, same code! Musicians call that generative music. Your program is composing.",
    },
    together: {
      mentor: "Let's set the speed and give `choose` a list of notes to pick from. Which chips belong in the blanks?",
      bpm: 130,
      lines: [
        { t: "bpm", blank: "132" },
        SY("prophet"),
        { t: "playChoose", blank: "60,64,67" },
        S(0.5),
        D("bd_haus"),
        S(0.5),
        { t: "sampleChoose", blank: "sn_dolf,drum_cymbal_closed" },
        S(0.5),
      ],
      chips: ["132", "60,64,67", "44", "sn_dolf,drum_cymbal_closed"],
      hint: "Nearly! One chip sets a dance-floor tempo, one is a list of notes, one is a list of drums.",
    },
    build: {
      /* The far side: typing only, with the blocks one tap away for anyone
         who needs them — never framed as a step backwards. */
      codeMode: "typed",
      mentor: "Final build — this one you type yourself. Stage by stage, make a loop that never plays the same way twice, then take it to Sonic Pi. 🎲",
      bpm: 130,
      showBeats: false,
      loops: [{ name: "generative", icon: "🎲", allow: ["bpm", "notes", "drums", "sleeps", "synth", "chooseNote", "chooseDrum", "rand"] }],
      stages: [
        {
          title: "Set the tempo",
          allow: ["bpm"],
          brief: "Add a `use_bpm` line to set your track's speed. House lives around 126–134.",
          hint: "Tap one of the use_bpm chips — it should be the first line of your loop.",
          loop: 0,
          check: (c) => c.count(0, "bpm") >= 1,
        },
        {
          title: "Add a random note",
          allow: ["chooseNote"],
          brief: "Add a `play choose([...])` line — it picks one note from the list at random, every time round.",
          hint: "The choose chips give you a ready-made list of notes that sound good together.",
          loop: 0,
          check: (c) => c.count(0, "playChoose") >= 1,
        },
        {
          title: "Randomise the drums",
          allow: ["chooseDrum", "sleeps"],
          brief: "Add a `sample choose([...])` line so even the drums surprise you. Add some sleeps too — at least 3.",
          hint: "Without sleeps, everything lands at once. Space it out!",
          loop: 0,
          check: (c) => c.count(0, "sampleChoose") >= 1 && c.count(0, "sleep") + c.count(0, "sleepRand") >= 3,
        },
        {
          title: "Hear it change",
          allow: [],
          brief: "Play your loop TWICE and listen — same code, different music.",
          hint: "Press ▶ Play, let it finish, then press it again.",
          loop: 0,
          requirePlay: 2,
          check: () => true,
        },
        {
          title: "Your generative track",
          allow: ["notes", "drums", "synth", "rand"],
          brief: "Finish it: 10+ lines in the loop. Then play it and copy it into real Sonic Pi. 🎹",
          hint: "Add a use_synth, more choose lines, or a `sleep rrand(...)` for random timing.",
          loop: 0,
          requirePlay: 3,
          check: (c) => c.lines(0) >= 10,
        },
      ],
    },
  },
];

export const PHASES = [
  { key: "watch", label: "I do", sub: "Watch", icon: "👀" },
  { key: "together", label: "We do", sub: "Together", icon: "🤝" },
  { key: "yourTurn", label: "You do", sub: "Your turn", icon: "🚀" },
];

/* ---------- The Club: track crate ----------
   Original tracks in classic EDM styles, 125–140 BPM.
   Every loop is exactly 4 beats (one bar) of real Sonic Pi code. */

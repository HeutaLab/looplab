import { seq } from "../engine/interpreter.js";
import { DRUMS } from "../theme.js";

export const HOUSE_DRUMS = seq(null, [
  ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5],
  ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5],
  ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5],
  ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5],
]);

export const CLAPS = seq(null, [[null, 1], ["sn_dolf", 1], [null, 1], ["sn_dolf", 1]]);

export const TRACKS = [
  {
    id: "warehouse",
    codeMode: "chips",
    title: "Warehouse 909",
    style: "Classic House",
    bpm: 128,
    emoji: "🏭",
    blurb: "Four-on-the-floor and offbeat stabs — the sound that started it all.",
    loops: [
 { name:"drums", icon:"", lines: HOUSE_DRUMS, pool: null, startOn: true },
 { name:"claps", icon:"", lines: CLAPS, pool: null, startOn: false },
      {
        name: "bass",
        icon: "🎸",
        lines: seq("tb303", [[33, 0.5], [33, 0.25], [45, 0.25], [33, 0.5], [33, 0.25], [45, 0.25], [33, 0.5], [36, 0.25], [43, 0.25], [33, 0.5], [40, 0.25], [45, 0.25]]),
        pool: [33, 36, 40, 43, 45],
        startOn: false,
      },
      {
        name: "stabs",
        icon: "🎹",
        lines: seq("prophet", [[null, 0.5], [[57, 60, 64], 0.5], [null, 0.5], [[57, 60, 64], 0.5], [null, 0.5], [[57, 60, 64], 0.5], [null, 0.5], [[57, 60, 64], 0.5]]),
        pool: [55, 57, 60, 62, 64, 67],
        startOn: false,
      },
    ],
    bugs: [
      { loop: 2, find: ["play", 2], v: 46, hint: "One bass note is sour…" },
      { loop: 0, find: ["sample", 3], v: "sn_dolf", hint: "A hat got swapped for something heavier." },
      { loop: 3, find: ["sleep", 1], v: 0.25, hint: "The stabs are stumbling — a sleep is wrong." },
    ],
  },
  {
    id: "acid",
    codeMode: "chips",
    title: "Acid Alley",
    style: "Acid",
    bpm: 133,
    emoji: "🧪",
    blurb: "A squelchy :tb303 sixteenth-note riff that never stops wriggling.",
    loops: [
      {
        name: "drums",
        icon: "🥁",
        lines: seq(null, [["bd_haus", 0.5], ["drum_cymbal_closed", 0.25], ["drum_cymbal_closed", 0.25], ["bd_haus", 0.5], ["drum_cymbal_closed", 0.25], ["drum_cymbal_closed", 0.25], ["bd_haus", 0.5], ["drum_cymbal_closed", 0.25], ["drum_cymbal_closed", 0.25], ["bd_haus", 0.5], ["drum_cymbal_closed", 0.25], ["drum_cymbal_closed", 0.25]]),
        pool: null,
        startOn: true,
      },
 { name:"claps", icon:"", lines: CLAPS, pool: null, startOn: false },
      {
        name: "acid",
        icon: "🧪",
        lines: seq("tb303", [[33, 0.25], [33, 0.25], [45, 0.25], [33, 0.25], [36, 0.25], [33, 0.25], [43, 0.25], [45, 0.25], [33, 0.25], [40, 0.25], [33, 0.25], [45, 0.25], [36, 0.25], [43, 0.25], [45, 0.25], [40, 0.25]]),
        pool: [33, 36, 40, 43, 45],
        startOn: false,
      },
      {
        name: "lead",
        icon: "🚨",
        lines: seq("saw", [[69, 0.75], [67, 0.25], [64, 0.5], [60, 0.5], [null, 2]]),
        pool: [60, 64, 67, 69, 72],
        startOn: false,
      },
    ],
    bugs: [
      { loop: 2, find: ["play", 4], v: 37, hint: "The acid riff hits one wrong note." },
      { loop: 2, find: ["sleep", 7], v: 0.5, hint: "One sleep makes the riff limp — it's longer than the others." },
      { loop: 3, find: ["play", 2], v: 65, hint: "The lead melody has a clunker." },
    ],
  },
  {
    id: "sunrise",
    codeMode: "hybrid",
    title: "Piano Sunrise",
    style: "Piano House",
    bpm: 126,
    emoji: "🌅",
    blurb: "Warm bell chords and a rolling bass — hands in the air at dawn.",
    loops: [
 { name:"drums", icon:"", lines: HOUSE_DRUMS, pool: null, startOn: true },
 { name:"claps", icon:"", lines: CLAPS, pool: null, startOn: false },
      {
        name: "keys",
        icon: "🎹",
        lines: seq("pretty_bell", [[[60, 64, 67], 0.75], [[60, 64, 67], 0.75], [null, 0.5], [[57, 60, 64], 1], [null, 1]]),
        pool: [55, 57, 60, 62, 64, 66, 67],
        startOn: false,
      },
      {
        name: "bass",
        icon: "🎸",
        lines: seq("saw", [[36, 1], [36, 0.5], [43, 0.5], [40, 1], [43, 1]]),
        pool: [36, 40, 43, 45, 48],
        startOn: false,
      },
    ],
    bugs: [
      { loop: 2, find: ["play", 1], v: 66, hint: "One note in the first chord is off-key." },
      { loop: 3, find: ["play", 3], v: 44, hint: "The bass takes a wrong turn." },
      { loop: 1, find: ["sleep", 0], v: 0.5, hint: "The claps come in too early." },
    ],
  },
  {
    id: "rave",
    codeMode: "typed",
    title: "Rave Siren",
    style: "Oldskool Rave",
    bpm: 138,
    emoji: "📢",
    blurb: "Chunky breaks, chord stabs and a hoover-style lead. Hands. Up.",
    loops: [
      {
        name: "drums",
        icon: "🥁",
        lines: seq(null, [["bd_haus", 0.5], ["drum_cymbal_closed", 0.25], ["bd_haus", 0.25], ["sn_dolf", 0.5], ["drum_cymbal_closed", 0.5], ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5], ["sn_dolf", 0.5], ["drum_cymbal_closed", 0.5]]),
        pool: null,
        startOn: true,
      },
      {
        name: "stabs",
        icon: "⚡",
        lines: seq("saw", [[[57, 60, 64], 0.5], [null, 0.5], [[57, 60, 64], 0.25], [[57, 60, 64], 0.25], [null, 0.5], [[57, 60, 64], 0.5], [null, 0.5], [[57, 60, 64], 0.5], [null, 0.5]]),
        pool: [55, 57, 60, 62, 64, 67],
        startOn: false,
      },
      {
        name: "lead",
        icon: "🚨",
        lines: seq("square", [[72, 0.5], [69, 0.5], [67, 0.5], [69, 0.5], [72, 0.5], [76, 0.5], [72, 1]]),
        pool: [64, 67, 69, 72, 76],
        startOn: false,
      },
      {
        name: "bass",
        icon: "🎸",
        lines: seq("tb303", [[33, 0.5], [33, 0.5], [36, 0.5], [33, 0.5], [33, 0.5], [33, 0.5], [38, 0.5], [40, 0.5]]),
        pool: [33, 36, 38, 40, 45],
        startOn: false,
      },
    ],
    bugs: [
      { loop: 2, find: ["play", 5], v: 77, hint: "The lead screeches one note too high." },
      { loop: 3, find: ["play", 6], v: 39, hint: "The bassline takes a sour step." },
      { loop: 1, find: ["sleep", 1], v: 0.25, hint: "The stabs rush — one gap is too short." },
      { loop: 0, find: ["sample", 3], v: "drum_cymbal_closed", hint: "A snare went missing from the break." },
    ],
  },
  {
    id: "deep",
    codeMode: "typed",
    title: "Deep Down",
    style: "Deep House",
    bpm: 125,
    emoji: "🌊",
    blurb: "Subby bass and dreamy chords for the 3am dance floor.",
    loops: [
      {
        name: "drums",
        icon: "🥁",
        lines: seq(null, [["bd_haus", 0.5], ["drum_cymbal_closed", 0.25], ["drum_cymbal_closed", 0.25], ["bd_haus", 0.5], ["drum_cymbal_closed", 0.25], ["drum_cymbal_closed", 0.25], ["bd_haus", 0.5], ["drum_cymbal_closed", 0.25], ["drum_cymbal_closed", 0.25], ["bd_haus", 0.5], ["drum_cymbal_closed", 0.25], ["drum_cymbal_closed", 0.25]]),
        pool: null,
        startOn: true,
      },
 { name:"claps", icon:"", lines: CLAPS, pool: null, startOn: false },
      {
        name: "sub",
        icon: "🎸",
        lines: seq("tb303", [[33, 1.5], [36, 0.5], [33, 1], [40, 0.5], [38, 0.5]]),
        pool: [31, 33, 36, 38, 40],
        startOn: false,
      },
      {
        name: "chords",
        icon: "🎹",
        lines: seq("prophet", [[null, 0.5], [[57, 60, 64], 1.5], [null, 0.5], [[55, 59, 62], 1.5]]),
        pool: [55, 57, 59, 60, 62, 64],
        startOn: false,
      },
    ],
    bugs: [
      { loop: 2, find: ["play", 1], v: 37, hint: "The sub bass wobbles onto a wrong note." },
      { loop: 3, find: ["play", 4], v: 58, hint: "The second chord has an off-key note." },
      { loop: 0, find: ["sleep", 0], v: 0.25, hint: "The kick pattern rushes at the start." },
    ],
  },
  {
    id: "hardfloor",
    codeMode: "typed",
    title: "Hardfloor Finale",
    style: "Peak-Time Techno",
    bpm: 140,
    emoji: "🔥",
    blurb: "140 BPM, offbeat bass, siren lead. Close the night. Bring the house down.",
    loops: [
 { name:"drums", icon:"", lines: HOUSE_DRUMS, pool: null, startOn: true },
 { name:"claps", icon:"", lines: CLAPS, pool: null, startOn: false },
      {
        name: "bass",
        icon: "🎸",
        lines: seq("tb303", [[null, 0.5], [33, 0.5], [null, 0.5], [33, 0.5], [null, 0.5], [33, 0.5], [null, 0.5], [36, 0.5]]),
        pool: [31, 33, 36, 38, 40],
        startOn: false,
      },
      {
        name: "siren",
        icon: "🚨",
        lines: seq("square", [[72, 0.25], [76, 0.25], [72, 0.25], [76, 0.25], [null, 1], [72, 0.25], [76, 0.25], [72, 0.25], [76, 0.25], [null, 1]]),
        pool: [67, 69, 72, 76, 79],
        startOn: false,
      },
    ],
    bugs: [
      { loop: 2, find: ["sleep", 0], v: 0.25, hint: "The offbeat bass isn't on the offbeat any more…" },
      { loop: 3, find: ["play", 1], v: 77, hint: "The siren hits a sour note." },
      { loop: 2, find: ["play", 3], v: 35, hint: "One bass note is wrong." },
      { loop: 0, find: ["sample", 1], v: "sn_dolf", hint: "Something heavy snuck into the hats." },
    ],
  },
];

export function applyBugs(track) {
  return track.loops.map((lp, li) => {
    const lines = lp.lines.map((L) => ({ ...L }));
    track.bugs
      .filter((b) => b.loop === li)
      .forEach((b) => {
        const [type, nth] = b.find;
        let c = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].t === type) {
            c++;
            if (c === nth) {
              lines[i].v = b.v;
              lines[i].bug = true;
              break;
            }
          }
        }
      });
    return lines;
  });
}

/* Which records a player can take off the shelf.

   This used to be a chain: each track needed a record on the one above it, so
   the crate opened in an order that had nothing to do with what a child could
   actually do yet.

   Finished Studio levels open it now — a level counts when it is worth all
   three stars — and the threshold for each track is the level that teaches
   the way that track is written. Warehouse and Acid Alley are tapped from
   chips, so they open with the Club itself. Piano Sunrise is hybrid, which
   Level 5 introduces. The last three are typed, which Level 6 introduces.

   That is deliberately strict: the crate never runs ahead of the Studio, and
   a child is never handed a track written in a way nobody has shown them. The
   cost is that most of the crate stays shut until late, so the Studio has to
   carry the lesson and the Club is the reward at the end of it.

   The old record chain still works as a second route, so a player who earned
   a track under the previous rule keeps it. */
export const TRACK_LEVELS = [0, 0, 5, 6, 6, 6];

export const levelsDone = (stars) => (stars || []).filter((s) => s >= 3).length;

export function trackOpen(i, stars, records) {
  if (levelsDone(stars) >= TRACK_LEVELS[i]) return true;
  const above = TRACKS[i - 1];
  return !!(above && records && records[above.id]);
}

export function optionsFor(L, pool) {
  if (L.t === "play") return (pool || [48, 52, 55, 60, 64, 67, 72]).map(String);
  if (L.t === "sleep") return ["0.25", "0.5", "0.75", "1", "1.5", "2"];
  if (L.t === "sample") return DRUMS;
  if (L.t === "synth") return ["beep", "saw", "square", "tb303", "prophet", "pretty_bell"];
  return [];
}

/* ---------- clock hook ---------- */

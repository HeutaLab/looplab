import React, { useState, useRef, useEffect, useMemo } from "react";
import * as Tone from "tone";

/* ============================================================
   LoopLab 🎧 — learn to code music, then DJ The Club
   Real Sonic Pi syntax · I do / We do / You do · live_loops
   ============================================================ */

const LEAD = 1.6;

/* Tone 15 deprecates the `Tone.Transport` singleton in favour of
   getTransport(); Tone 14 has no getTransport at all. Nothing here pins a
   version, so resolve it once and let both work. */
const transport = () => (typeof Tone.getTransport === "function" ? Tone.getTransport() : Tone.Transport);

const C = {
  bg: "#110F26",
  panel: "#1D1A3E",
  panel2: "#26225A",
  line: "#332E66",
  ink: "#F4F2FF",
  dim: "#A29CCB",
  pink: "#FF5CA8",
  yellow: "#FFD34D",
  aqua: "#45E0BE",
  violet: "#9C8BFF",
  orange: "#FF9A57",
  green: "#5CE07E",
  red: "#FF6B6B",
};
const LANES = [C.pink, C.orange, C.yellow, C.aqua, C.violet];
const DRUMS = ["bd_haus", "sn_dolf", "drum_cymbal_closed"];
const DRUM_EMOJI = { bd_haus: "🦶", sn_dolf: "🥁", drum_cymbal_closed: "✨" };

/* ---------- tiny Sonic Pi interpreter ---------- */

const P = (v) => ({ t: "play", v });
const S = (v) => ({ t: "sleep", v });
const D = (v) => ({ t: "sample", v });
const SY = (v) => ({ t: "synth", v });
const LOOP = (v) => ({ t: "loop", v });
const END = () => ({ t: "end" });

function seq(synth, steps) {
  const out = [];
  if (synth) out.push(SY(synth));
  for (const [s, d] of steps) {
    if (s !== null) {
      if (Array.isArray(s)) s.forEach((n) => out.push(P(n)));
      else if (typeof s === "number") out.push(P(s));
      else out.push(D(s));
    }
    out.push(S(d));
  }
  return out;
}

function findEndIdx(lines, i) {
  let d = 0;
  for (let j = i; j < lines.length; j++) {
    if (lines[j].t === "loop") d++;
    else if (lines[j].t === "end") {
      d--;
      if (d === 0) return j;
    }
  }
  return lines.length - 1;
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* Chips fill blanks left-to-right, so a chip can land in a blank it doesn't
   fit — a drum-list chip in a `use_bpm` blank used to make spb NaN, which
   poisoned every event time and the track duration with it. Every number
   that reaches the scheduler goes through here first. */
const safeNum = (v, fallback = 0) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

function compile(lines, bpm = 60) {
  let spb = 60 / safeNum(bpm, 60);
  const events = [];
  let time = 0;
  let synth = "beep";
  function run(i, stop) {
    while (i < stop && events.length < 500) {
      const L = lines[i];
      if (L.t === "play") events.push({ time, kind: "note", note: safeNum(L.v, 60), synth, line: i });
      else if (L.t === "playChoose") events.push({ time, kind: "note", note: safeNum(pick(L.v), 60), synth, line: i });
      else if (L.t === "sleep") time += safeNum(L.v, 0.5) * spb;
      else if (L.t === "sleepRand") time += (L.v[0] + Math.random() * (L.v[1] - L.v[0])) * spb;
      else if (L.t === "sample") events.push({ time, kind: L.v, line: i });
      else if (L.t === "sampleChoose") events.push({ time, kind: pick(L.v), line: i });
      else if (L.t === "synth") synth = L.v;
      else if (L.t === "bpm") spb = 60 / safeNum(L.v, 60);
      else if (L.t === "loop") {
        const e = findEndIdx(lines, i);
        // Ruby has no Float#times, so a fractional count is never valid code —
        // it used to slip through and run the body exactly once.
        const reps = Math.max(0, Math.floor(safeNum(L.v, 1)));
        for (let k = 0; k < reps; k++) run(i + 1, e);
        i = e;
      }
      i++;
    }
  }
  run(0, lines.length);
  events.sort((a, b) => a.time - b.time);
  const total = Math.max(time, events.length ? events[events.length - 1].time + 0.4 : 0);
  return { events, total };
}

/* Runs several loops at once, each repeating on its own length — like
   real live_loops. Recompiled every cycle so `choose`/`rrand` stay random. */
function compileLoops(loopsLines, bpm = 60, reps = 2) {
  const base = loopsLines.map((ls) => compile(ls, bpm).total);
  const cycle = Math.max(0.5, ...base);
  const dur = cycle * reps;
  const events = [];
  loopsLines.forEach((ls, li) => {
    let t = 0;
    let guard = 0;
    while (t < dur - 0.001 && guard++ < 40) {
      const c = compile(ls, bpm);
      if (!c.events.length || c.total <= 0.01) break;
      c.events.forEach((ev, k) => {
        if (t + ev.time < dur + 0.001) events.push({ ...ev, time: t + ev.time, loopIdx: li, id: `${li}-${guard}-${k}` });
      });
      t += c.total;
    }
  });
  events.sort((a, b) => a.time - b.time);
  return { events, total: dur };
}

/* A wrong chip in a `sleep` blank can compile to a minute of near-silence.
   Truncating the preview keeps every attempt a few seconds long, so the
   player can hear the mistake and try again straight away. */
const MAX_PREVIEW = 10;

function capPreview(compiled, maxDur) {
  if (!maxDur || !Number.isFinite(compiled.total) || compiled.total <= maxDur) return compiled;
  return { events: compiled.events.filter((ev) => ev.time <= maxDur), total: maxDur, truncated: true };
}

function laneOf(ev) {
  if (ev.kind === "bd_haus") return 0;
  if (ev.kind === "sn_dolf") return 2;
  if (ev.kind === "drum_cymbal_closed") return 4;
  const n = ev.note;
  if (n < 42) return 0;
  if (n < 56) return 1;
  if (n < 63) return 2;
  if (n < 69) return 3;
  return 4;
}

/* ---------- code rendering ---------- */

function lineTokens(L) {
  if (L.t === "play") return [["play ", "kw"], [String(L.v), "num"]];
  if (L.t === "playChoose") return [["play choose(", "kw"], ["[" + L.v.join(", ") + "]", "num"], [")", "kw"]];
  if (L.t === "sleep") return [["sleep ", "kw"], [String(L.v), "num"]];
  if (L.t === "sleepRand") return [["sleep rrand(", "kw"], [L.v[0] + ", " + L.v[1], "num"], [")", "kw"]];
  if (L.t === "sample") return [["sample ", "kw"], [":" + L.v, "sym"]];
  if (L.t === "sampleChoose") return [["sample choose(", "kw"], ["[" + L.v.map((x) => ":" + x).join(", ") + "]", "sym"], [")", "kw"]];
  if (L.t === "synth") return [["use_synth ", "kw"], [":" + L.v, "sym"]];
  if (L.t === "bpm") return [["use_bpm ", "kw"], [String(L.v), "num"]];
  if (L.t === "loop") return [[String(L.v), "num"], [".times do", "kw"]];
  if (L.t === "end") return [["end", "kw"]];
  return [["", "kw"]];
}
const tokColor = { kw: "#B7A9FF", num: C.yellow, sym: C.aqua };

/* Phase screens split in two on a large screen. A phone keeps the single
   stacked column it always had; from lg up, the parts a player watches — the
   mentor, the note highway, the goals — sit beside the parts they edit, so
   nobody has to scroll between hearing a change and making one. The watch
   column sticks, because the highway is what you look at while typing. */
const PHASE = {
  "gap-3": {
    grid: "flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5",
    watch: "flex flex-col gap-3 lg:sticky lg:top-4",
    edit: "flex flex-col gap-3 lg:min-w-0",
  },
  "gap-2": {
    grid: "flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5",
    watch: "flex flex-col gap-2 lg:sticky lg:top-4",
    edit: "flex flex-col gap-2 lg:min-w-0",
  },
};

/* A chip has to read as the code it writes: a choose(...) chip used to show
   `:sn_dolf,drum_cymbal_closed` instead of `[:sn_dolf, :drum_cymbal_closed]`. */
const symOrNum = (x) => (isNaN(parseFloat(x)) ? ":" + x : String(x));
const chipLabel = (c) =>
  String(c).includes(",") ? "[" + String(c).split(",").map(symOrNum).join(", ") + "]" : symOrNum(c);
const lineText = (L) => lineTokens(L).map(([t]) => t).join("");

/* ---------- typing bridge: text back into line objects ----------
   The exact inverse of lineText above, so anything the game can show, a
   student can type — and anything they type round-trips to the same code the
   chips would have built. Every message here is written for a ten-year-old:
   no "unexpected token", no "NaN", no line numbers, and always a worked
   example of the fixed line. Being wrong is never framed as failure. */

const SYNTH_NAMES = ["tb303", "saw", "square", "prophet", "pretty_bell", "beep"];
const COMMANDS = ["play", "sleep", "sample", "use_synth", "use_bpm", "end"];

/* A child reaching for a drum types the word they know — "snare", "kick",
   "hat" — not a misspelling of Sonic Pi's name for it. Edit distance cannot
   bridge snare -> sn_dolf, so the words themselves are mapped. This is the
   difference between "I don't know that" and a hint that teaches the real
   name, which is the whole point of the typing bridge. */
const DRUM_WORDS = {
  snare: "sn_dolf", sn: "sn_dolf", clap: "sn_dolf", rim: "sn_dolf",
  kick: "bd_haus", bd: "bd_haus", bass_drum: "bd_haus", bassdrum: "bd_haus", boom: "bd_haus",
  hat: "drum_cymbal_closed", hihat: "drum_cymbal_closed", hi_hat: "drum_cymbal_closed",
  cymbal: "drum_cymbal_closed", tick: "drum_cymbal_closed", closed_hat: "drum_cymbal_closed",
};
const SYNTH_WORDS = {
  bass: "tb303", acid: "tb303", lead: "saw", buzz: "saw", game: "square",
  chip: "square", bell: "pretty_bell", bells: "pretty_bell", pad: "prophet", chord: "prophet",
};
/* A known word wins over a spelling guess, then edit distance covers typos. */
const suggest = (word, words, list) => words[word.toLowerCase()] || nearest(word, list);

/* Levenshtein, so `plai` can be recognised as `play` and `:snare` as `:sn_dolf`. */
function editDistance(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
function nearest(word, list, max = 3) {
  let best = null, bestD = Infinity;
  for (const w of list) {
    const d = editDistance(word.toLowerCase(), w.toLowerCase());
    if (d < bestD) { bestD = d; best = w; }
  }
  return bestD <= max ? best : null;
}

const num = (t) => {
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const ok = (line) => ({ ok: true, line });
const no = (msg) => ({ ok: false, msg });

/* A decimal typed with a comma is the single most common slip. */
function commaDecimal(t) {
  return /^\d+,\d+$/.test(t) ? t.replace(",", ".") : null;
}

function parseLine(raw) {
  const text = String(raw).replace(/\s+/g, " ").trim();
  if (!text || text.startsWith("#")) return ok(null); // blank lines and notes to self are fine

  if (text === "end") return ok({ t: "end" });

  // n.times do
  const times = text.match(/^([0-9.]+)\s*\.?\s*times(\s+do)?$/);
  if (times) {
    if (!text.includes(".")) return no(`Nearly — put a dot in it: \`${times[1]}.times do\``);
    if (!times[2]) return no(`\`${times[1]}.times\` needs \`do\` on the end: \`${times[1]}.times do\``);
    const n = num(times[1]);
    if (n === null || n < 1) return no(`\`.times\` needs a whole number, like \`4.times do\``);
    if (!Number.isInteger(n)) return no(`You can only repeat a whole number of times — try \`${Math.max(1, Math.round(n))}.times do\``);
    return ok({ t: "loop", v: n });
  }
  if (/^live_loop\b/.test(text)) return no("You're already inside a loop here — just write the notes, and the game wraps them in the `live_loop` for you.");

  const sp = text.indexOf(" ");
  const cmd = sp === -1 ? text : text.slice(0, sp);
  const rest = sp === -1 ? "" : text.slice(sp + 1).trim();

  if (!COMMANDS.includes(cmd)) {
    const near = nearest(cmd, COMMANDS);
    if (near) return no(`So close — \`${cmd}\` should be \`${near}\` 🙂`);
    return no(`I don't know \`${cmd}\`. You can use: play, sleep, sample, use_synth, use_bpm, or 4.times do`);
  }

  // ---- play ----
  if (cmd === "play") {
    if (!rest) return no("`play` needs a note number after it, like `play 60`");
    const ch = rest.match(/^choose\s*\(\s*\[(.*)\]\s*\)$/);
    if (ch) {
      const parts = ch[1].split(",").map((x) => x.trim()).filter(Boolean);
      if (!parts.length) return no("`choose` needs some notes to pick from, like `play choose([60, 64, 67])`");
      const nums = parts.map(num);
      if (nums.some((n) => n === null)) return no("`play choose` takes note numbers, like `play choose([60, 64, 67])`");
      return ok({ t: "playChoose", v: nums });
    }
    if (/^choose/.test(rest)) return no("`choose` needs square brackets inside the round ones: `play choose([60, 64, 67])`");
    const fixed = commaDecimal(rest);
    if (fixed) return no(`Use a dot for decimals: \`play ${fixed}\``);
    const n = num(rest);
    if (n === null) return no(`\`play\` needs a number, like \`play 60\` — I don't know what \`${rest}\` means`);
    return ok({ t: "play", v: n });
  }

  // ---- sleep ----
  if (cmd === "sleep") {
    if (!rest) return no("`sleep` needs a number after it, like `sleep 0.5`");
    const rr = rest.match(/^rrand\s*\(([^)]*)\)$/);
    if (rr) {
      const parts = rr[1].split(",").map((x) => x.trim()).filter(Boolean);
      if (parts.length !== 2) return no("`rrand` needs two numbers — a smallest and a biggest: `sleep rrand(0.25, 0.5)`");
      const nums = parts.map(num);
      if (nums.some((n) => n === null)) return no("`rrand` needs two numbers, like `sleep rrand(0.25, 0.5)`");
      if (nums[0] > nums[1]) return no(`Put the smaller number first: \`sleep rrand(${nums[1]}, ${nums[0]})\``);
      return ok({ t: "sleepRand", v: nums });
    }
    if (/^rrand/.test(rest)) return no("`rrand` needs round brackets: `sleep rrand(0.25, 0.5)`");
    const fixed = commaDecimal(rest);
    if (fixed) return no(`Use a dot for decimals: \`sleep ${fixed}\``);
    const n = num(rest);
    if (n === null) return no(`\`sleep\` needs a number, like \`sleep 0.5\` — I don't know what \`${rest}\` means`);
    if (n < 0) return no("`sleep` can't be less than zero — time only goes forwards!");
    return ok({ t: "sleep", v: n });
  }

  // ---- sample ----
  if (cmd === "sample") {
    if (!rest) return no("`sample` needs a drum after it, like `sample :bd_haus`");
    const ch = rest.match(/^choose\s*\(\s*\[(.*)\]\s*\)$/);
    if (ch) {
      const parts = ch[1].split(",").map((x) => x.trim()).filter(Boolean);
      if (!parts.length) return no("`choose` needs some drums to pick from, like `sample choose([:sn_dolf, :bd_haus])`");
      const names = [];
      for (const p of parts) {
        if (!p.startsWith(":")) return no(`Drums need a colon in front: \`:${p}\``);
        const nm = p.slice(1);
        if (!DRUMS.includes(nm)) {
          const near = suggest(nm, DRUM_WORDS, DRUMS);
          return no(near ? `I don't know \`:${nm}\` — did you mean \`:${near}\`?` : `I don't know \`:${nm}\`. The drums are :bd_haus, :sn_dolf and :drum_cymbal_closed`);
        }
        names.push(nm);
      }
      return ok({ t: "sampleChoose", v: names });
    }
    if (!rest.startsWith(":")) {
      const near = suggest(rest, DRUM_WORDS, DRUMS);
      return no(near ? `Drums need a colon in front: \`sample :${near}\`` : `Drums need a colon in front, like \`sample :bd_haus\``);
    }
    const nm = rest.slice(1);
    if (!DRUMS.includes(nm)) {
      const near = suggest(nm, DRUM_WORDS, DRUMS);
      return no(near ? `I don't know \`:${nm}\` — did you mean \`:${near}\`?` : `I don't know \`:${nm}\`. The drums are :bd_haus, :sn_dolf and :drum_cymbal_closed`);
    }
    return ok({ t: "sample", v: nm });
  }

  // ---- use_synth ----
  if (cmd === "use_synth") {
    if (!rest) return no("`use_synth` needs a sound after it, like `use_synth :tb303`");
    if (!rest.startsWith(":")) {
      const near = suggest(rest, SYNTH_WORDS, SYNTH_NAMES);
      return no(near ? `Sounds need a colon in front: \`use_synth :${near}\`` : "Sounds need a colon in front, like `use_synth :tb303`");
    }
    const nm = rest.slice(1);
    if (!SYNTH_NAMES.includes(nm)) {
      const near = suggest(nm, SYNTH_WORDS, SYNTH_NAMES);
      return no(near ? `I don't know \`:${nm}\` — did you mean \`:${near}\`?` : `I don't know \`:${nm}\`. Try :tb303, :saw, :square, :prophet or :pretty_bell`);
    }
    return ok({ t: "synth", v: nm });
  }

  // ---- use_bpm ----
  if (cmd === "use_bpm") {
    if (!rest) return no("`use_bpm` needs a speed after it, like `use_bpm 128`");
    const fixed = commaDecimal(rest);
    if (fixed) return no(`Use a dot for decimals: \`use_bpm ${fixed}\``);
    const n = num(rest);
    if (n === null) return no(`\`use_bpm\` needs a number, like \`use_bpm 128\` — I don't know what \`${rest}\` means`);
    if (n < 20 || n > 300) return no("Dance music lives between about 100 and 160 BPM — try `use_bpm 128`");
    return ok({ t: "bpm", v: n });
  }

  return no(`I don't know \`${text}\` yet.`);
}

/* Parse a whole editor's worth of text. Reports every bad line at once, each
   with the line it came from, so nothing is hidden behind a first error. */
function parseCode(text) {
  const rows = String(text).split("\n");
  const lines = [];
  const errors = [];
  rows.forEach((row, i) => {
    const r = parseLine(row);
    if (!r.ok) errors.push({ row: i, text: row.trim(), msg: r.msg });
    else if (r.line) lines.push(r.line);
  });
  let depth = 0;
  for (const L of lines) {
    if (L.t === "loop") depth++;
    else if (L.t === "end") {
      depth--;
      if (depth < 0) return { lines, errors: [...errors, { row: -1, text: "end", msg: "There's an extra `end` here — every `end` needs a `.times do` above it." }] };
    }
  }
  if (depth > 0) errors.push({ row: -1, text: "", msg: depth === 1 ? "One loop is still open — add `end` on its own line to close it." : `${depth} loops are still open — each one needs its own \`end\`.` });
  return { lines, errors };
}

/* Text for the editor, so switching modes never loses a student's work. */
const codeToText = (lines) => {
  const ind = indents(lines);
  return lines.map((L, i) => "  ".repeat(ind[i]) + lineText(L)).join("\n");
};

function indents(lines) {
  const out = [];
  let d = 0;
  for (const L of lines) {
    if (L.t === "end") d = Math.max(0, d - 1);
    out.push(d);
    if (L.t === "loop") d++;
  }
  return out;
}

function toSonicPi(lines, bpm) {
  const ind = indents(lines);
  const body = lines.map((L, i) => "  ".repeat(ind[i]) + lineText(L)).join("\n");
  return (bpm ? `use_bpm ${bpm}\n` : "") + body;
}

function trackToSonicPi(track, loopLines) {
  const parts = track.loops.map((lp, i) => {
    const lines = loopLines[i];
    return `live_loop :${lp.name} do\n` + lines.map((L) => "  " + lineText(L)).join("\n") + `\nend`;
  });
  return `use_bpm ${track.bpm}\n\n` + parts.join("\n\n");
}

function CodeLine({ L, indent, active, warn, onTap, selected, small, children }) {
  const inner = (
    <div
      className="flex items-center rounded-lg px-2 py-1 font-mono transition-colors"
      style={{
        fontSize: small ? 12 : 14,
        paddingLeft: 8 + indent * 16,
        background: selected ? "rgba(255,211,77,0.16)" : active ? "rgba(255,92,168,0.18)" : "transparent",
        boxShadow: active ? `inset 3px 0 0 ${C.pink}` : selected ? `inset 3px 0 0 ${C.yellow}` : "none",
        color: C.ink,
        minHeight: small ? 24 : 30,
      }}
    >
      {children ||
        lineTokens(L).map(([txt, k], i) => (
          <span key={i} style={{ color: tokColor[k] || C.ink, whiteSpace: "pre" }}>
            {txt}
          </span>
        ))}
      {warn && <span className="ml-1">⚠️</span>}
    </div>
  );
  return onTap ? (
    <button onClick={onTap} className="block w-full text-left">
      {inner}
    </button>
  ) : (
    inner
  );
}

function CodeView({ lines, activeLine, small }) {
  const ind = indents(lines);
  return (
    <div className="rounded-2xl p-2" style={{ background: "#151233", border: `1px solid ${C.line}` }}>
      {lines.map((L, i) => (
        <CodeLine key={i} L={L} indent={ind[i]} active={activeLine === i} small={small} />
      ))}
    </div>
  );
}

/* ---------- note highway ---------- */

function NoteHighway({ playInfo, elapsed, height = 200, idleText = "Press ▶ Play to see your notes fly!" }) {
  const H = height;
  const hitY = H - 30;
  const events = playInfo ? playInfo.events : [];
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ height: H, background: "linear-gradient(180deg,#171335 0%,#100D28 100%)", border: `1px solid ${C.line}` }}
    >
      {LANES.map((c, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0"
          style={{ left: `${(i / 5) * 100}%`, width: "20%", borderLeft: i ? "1px solid rgba(255,255,255,0.05)" : "none" }}
        />
      ))}
      <div
        className="absolute left-2 right-2 rounded-full"
        style={{
          top: hitY,
          height: 5,
          background: `linear-gradient(90deg,${C.pink},${C.yellow},${C.aqua},${C.violet})`,
          opacity: playInfo ? 0.95 : 0.35,
          boxShadow: playInfo ? "0 0 14px rgba(255,92,168,0.55)" : "none",
        }}
      />
      {!playInfo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ color: C.dim }}>
          <div style={{ fontSize: 24 }}>🎵 🥁 🎹</div>
          <div className="mt-1 px-4 text-center text-sm font-semibold">{idleText}</div>
        </div>
      )}
      {playInfo && elapsed !== null && elapsed < 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-lg font-extrabold" style={{ color: C.yellow }}>
          🎬 Ready…
        </div>
      )}
      {playInfo &&
        elapsed !== null &&
        events.map((ev, i) => {
          const dt = ev.time - elapsed;
          if (dt > LEAD || dt < -0.45) return null;
          const lane = laneOf(ev);
          const x = ((lane + 0.5) / 5) * 100;
          const isDrum = ev.kind !== "note";
          const color = LANES[lane];
          if (dt >= 0) {
            const y = (1 - dt / LEAD) * hitY;
            return (
              <div
                key={ev.id || i}
                className="absolute flex items-center justify-center font-bold"
                style={{
                  left: `calc(${x}% - 14px)`,
                  top: y - 14,
                  width: 28,
                  height: 28,
                  borderRadius: isDrum ? 8 : 999,
                  background: color,
                  color: "#1A1735",
                  fontSize: 10,
                  boxShadow: `0 0 10px ${color}66`,
                }}
              >
                {ev.kind === "note" ? ev.note : DRUM_EMOJI[ev.kind]}
              </div>
            );
          }
          const p = -dt / 0.45;
          return (
            <div
              key={"b" + (ev.id || i)}
              className="absolute rounded-full"
              style={{
                left: `calc(${x}% - 16px)`,
                top: hitY - 16,
                width: 32,
                height: 32,
                border: `3px solid ${color}`,
                opacity: 1 - p,
                transform: `scale(${1 + p * 1.3})`,
              }}
            />
          );
        })}
    </div>
  );
}

/* ---------- shared UI ---------- */

function Mentor({ text }) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="flex items-center justify-center rounded-full text-xl"
        style={{ width: 42, height: 42, background: C.panel2, border: `2px solid ${C.violet}`, flexShrink: 0 }}
      >
        🤖
      </div>
      <div className="rounded-2xl rounded-tl-sm px-3 py-2 text-sm font-medium" style={{ background: C.panel2, color: C.ink, border: `1px solid ${C.line}` }}>
        <span style={{ color: C.violet, fontWeight: 800 }}>DJ Loop: </span>
        {text}
      </div>
    </div>
  );
}

function BigButton({ onClick, disabled, color = C.pink, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl px-4 py-3 text-sm font-extrabold transition-transform active:scale-95"
      style={{
        background: disabled ? C.line : color,
        color: disabled ? C.dim : "#1A1030",
        boxShadow: disabled ? "none" : "0 4px 0 rgba(0,0,0,0.35)",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Chip({ onClick, active, children, small, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={`rounded-xl font-mono font-bold transition-transform ${disabled ? "" : "active:scale-90"}`}
      style={{
        padding: small ? "6px 10px" : "8px 12px",
        fontSize: small ? 12 : 14,
        background: active ? C.yellow : C.panel2,
        color: active ? "#1A1030" : C.ink,
        border: `2px solid ${active ? C.yellow : C.line}`,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* ---------- the typing bridge, on screen ----------
   One editor serves all three modes, with progressively less scaffolding:

     chips   tap only, no typing            (levels 1-4, first club tracks)
     hybrid  type, and chips type FOR you   (level 5, Piano Sunrise)
     typed   type, chips hidden behind a tap (level 6, Rave Siren onward)

   In hybrid the chip does not add a line object — it inserts its text at the
   cursor. The child watches the syntax appear, then starts typing it himself.
   That is the bridge: the same editor throughout, the scaffolding falling away.
   Dropping back to the chips is always one tap and is never called failure. */

function CodeEditor({ value, onChange, errors, chipGroups, mode, disabled, minRows = 8 }) {
  const ref = useRef(null);
  const [showChips, setShowChips] = useState(mode !== "typed");

  function insert(text) {
    const el = ref.current;
    const cur = value ?? "";
    let at = cur.length;
    if (el && typeof el.selectionStart === "number") at = el.selectionStart;
    // land on a line of its own, the way the line would have been added
    const before = cur.slice(0, at);
    const after = cur.slice(at);
    const needsNL = before.length && !before.endsWith("\n");
    const next = before + (needsNL ? "\n" : "") + text + (after.startsWith("\n") || !after.length ? "" : "\n") + after;
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = before.length + (needsNL ? 1 : 0) + text.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  const rows = Math.max(minRows, (value ?? "").split("\n").length + 1);

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl p-2" style={{ background: "#151233", border: `1px solid ${errors.length ? C.orange : C.line}` }}>
        <textarea
          ref={ref}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          rows={rows}
          aria-label="Your Sonic Pi code"
          placeholder={"Write your code here…\nplay 60\nsleep 0.5"}
          className="w-full resize-none bg-transparent font-mono outline-none"
          style={{ color: C.ink, fontSize: 14, lineHeight: 1.7, minHeight: 120 }}
        />
      </div>

      {errors.length > 0 && (
        <div className="flex flex-col gap-1" aria-live="polite">
          {errors.map((e, i) => (
            <div key={i} className="rounded-xl px-3 py-2 text-xs font-bold" style={{ background: "rgba(255,154,87,0.14)", color: C.orange }}>
              {e.row >= 0 && <span style={{ color: C.dim }}>line {e.row + 1}: </span>}
              {e.msg}
            </div>
          ))}
        </div>
      )}

      {mode === "typed" && !showChips && (
        <button
          onClick={() => setShowChips(true)}
          className="self-start rounded-xl px-3 py-2 text-xs font-extrabold"
          style={{ background: C.panel2, border: `1px solid ${C.line}`, color: C.aqua }}
        >
          Stuck? Show me the blocks 🧱
        </button>
      )}

      {showChips && chipGroups.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-extrabold uppercase" style={{ color: C.dim }}>
            {mode === "chips" ? "Tap to add a line" : "Tap to type it for you"}
          </div>
          {chipGroups.map(([k, g]) => (
            <div key={k} className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold uppercase" style={{ color: C.dim, minWidth: 62 }}>
                {g.label}
              </span>
              {g.items.map((it) => (
                <Chip key={it.label} small disabled={disabled} onClick={() => insert(lineText(it.make()))}>
                  {it.label}
                </Chip>
              ))}
            </div>
          ))}
          {mode === "typed" && (
            <button
              onClick={() => setShowChips(false)}
              className="self-start rounded-xl px-2 py-1 text-[11px] font-extrabold"
              style={{ color: C.dim }}
            >
              Hide the blocks — I've got this ✍️
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReportScreen({ stars, records, name, onName, onBack }) {
  const [copied, setCopied] = useState(null);
  const [saved, setSaved] = useState(null);
  const text = buildReport({ name, stars, records });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="rounded-xl px-3 py-2 font-extrabold" style={{ background: C.panel2, border: `1px solid ${C.line}` }} aria-label="Back to the level map">
          ←
        </button>
        <div className="text-base font-extrabold">📋 My progress</div>
      </div>

      <Mentor text="This is everything you've done so far. Put your name on it, then copy it into Google Classroom or save it for your folder. 🎓" />

      <div className="rounded-2xl p-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        <label className="text-xs font-extrabold uppercase" style={{ color: C.dim }} htmlFor="looplab-name">
          Your name
        </label>
        <input
          id="looplab-name"
          value={name}
          onChange={(e) => onName(e.target.value.slice(0, 16))}
          placeholder="first name or nickname"
          maxLength={16}
          autoCapitalize="words"
          className="mt-1 w-full rounded-xl px-3 py-2 font-bold outline-none"
          style={{ background: "#151233", color: C.ink, border: `1px solid ${C.line}`, fontSize: 16 }}
        />
        <div className="mt-1 text-[11px] font-semibold" style={{ color: C.dim }}>
          First name only — this stays on this device and is never sent anywhere.
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-2xl p-3" style={{ background: "#151233", border: `1px solid ${C.line}` }}>
        <pre className="whitespace-pre-wrap font-mono" style={{ color: C.aqua, fontSize: 11, lineHeight: 1.6 }}>{text}</pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <BigButton
          color={C.aqua}
          onClick={() => {
            const manual = () => setCopied("manual");
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => setCopied("yes"), manual);
              else manual();
            } catch (e) {
              manual();
            }
          }}
        >
          {copied === "yes" ? "✅ Copied!" : copied === "manual" ? "☝️ Select the text above" : "📋 Copy for Classroom"}
        </BigButton>
        <BigButton color={C.violet} onClick={() => setSaved(downloadReport(text, name) ? "yes" : "no")}>
          {saved === "yes" ? "✅ Saved!" : saved === "no" ? "Couldn't save — copy instead" : "⬇ Save my evidence"}
        </BigButton>
      </div>
      {saved === "no" && (
        <div className="rounded-xl px-3 py-2 text-xs font-bold" style={{ background: "rgba(255,154,87,0.14)", color: C.orange }}>
          This device wouldn't let the file save. Use 📋 Copy instead — it has exactly the same words in it.
        </div>
      )}
    </div>
  );
}

function CopyCodeModal({ text, onClose }) {
  const [copied, setCopied] = useState(null); // null | "yes" | "manual"
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,8,25,0.9)" }}>
      <div className="w-full max-w-sm rounded-3xl p-4" style={{ background: C.panel, border: `2px solid ${C.aqua}` }}>
        <div className="text-lg font-extrabold">🎹 Your real Sonic Pi code</div>
        <div className="mt-1 text-xs font-semibold" style={{ color: C.dim }}>
          Paste this into the free Sonic Pi app (sonic-pi.net) and press Run — it's the real thing!
        </div>
        <textarea
          readOnly
          value={text}
          onFocus={(e) => e.target.select()}
          className="mt-2 w-full rounded-xl p-2 font-mono text-xs"
          style={{ background: "#151233", color: C.aqua, border: `1px solid ${C.line}`, height: 180 }}
        />
        <div className="mt-2 flex gap-2">
          <BigButton
            color={C.aqua}
            onClick={() => {
              // writeText returns a promise, so the old try/catch caught nothing
              // and "✅ Copied!" appeared even when the copy had failed. On a
              // phone without clipboard permission, point at the box instead.
              const manual = () => setCopied("manual");
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(text).then(() => setCopied("yes"), manual);
                } else manual();
              } catch (e) {
                manual();
              }
            }}
          >
            {copied === "yes" ? "✅ Copied!" : copied === "manual" ? "☝️ Tap the code, then copy" : "📋 Copy"}
          </BigButton>
          <BigButton color={C.violet} onClick={onClose}>
            Close
          </BigButton>
        </div>
      </div>
    </div>
  );
}

/* ---------- learning levels ---------- */

const LEVELS = [
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

const PHASES = [
  { key: "watch", label: "I do", sub: "Watch", icon: "👀" },
  { key: "together", label: "We do", sub: "Together", icon: "🤝" },
  { key: "yourTurn", label: "You do", sub: "Your turn", icon: "🚀" },
];

/* ---------- The Club: track crate ----------
   Original tracks in classic EDM styles, 125–140 BPM.
   Every loop is exactly 4 beats (one bar) of real Sonic Pi code. */

const HOUSE_DRUMS = seq(null, [
  ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5],
  ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5],
  ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5],
  ["bd_haus", 0.5], ["drum_cymbal_closed", 0.5],
]);
const CLAPS = seq(null, [[null, 1], ["sn_dolf", 1], [null, 1], ["sn_dolf", 1]]);

const TRACKS = [
  {
    id: "warehouse",
    codeMode: "chips",
    title: "Warehouse 909",
    style: "Classic House",
    bpm: 128,
    emoji: "🏭",
    blurb: "Four-on-the-floor and offbeat stabs — the sound that started it all.",
    loops: [
      { name: "drums", icon: "🥁", lines: HOUSE_DRUMS, pool: null, startOn: true },
      { name: "claps", icon: "👏", lines: CLAPS, pool: null, startOn: false },
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
      { name: "claps", icon: "👏", lines: CLAPS, pool: null, startOn: false },
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
      { name: "drums", icon: "🥁", lines: HOUSE_DRUMS, pool: null, startOn: true },
      { name: "claps", icon: "👏", lines: CLAPS, pool: null, startOn: false },
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
      { name: "claps", icon: "👏", lines: CLAPS, pool: null, startOn: false },
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
      { name: "drums", icon: "🥁", lines: HOUSE_DRUMS, pool: null, startOn: true },
      { name: "claps", icon: "👏", lines: CLAPS, pool: null, startOn: false },
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

function applyBugs(track) {
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

function optionsFor(L, pool) {
  if (L.t === "play") return (pool || [48, 52, 55, 60, 64, 67, 72]).map(String);
  if (L.t === "sleep") return ["0.25", "0.5", "0.75", "1", "1.5", "2"];
  if (L.t === "sample") return DRUMS;
  if (L.t === "synth") return ["beep", "saw", "square", "tb303", "prophet", "pretty_bell"];
  return [];
}

/* ---------- clock hook ---------- */

function useClock(playInfo) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!playInfo) return;
    let raf;
    const loop = () => {
      force((x) => x + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playInfo]);
  return playInfo ? (performance.now() - playInfo.startedAt) / 1000 - LEAD : null;
}

function useActiveLine(playInfo, elapsed) {
  if (!playInfo || elapsed === null) return null;
  let line = null;
  for (const ev of playInfo.events) {
    if (ev.time <= elapsed && elapsed - ev.time < 0.4) line = ev.line;
    if (ev.time > elapsed) break;
  }
  return line;
}

/* ---------- the teacher's copy ----------
   Nothing leaves the device on its own, so the report has to leave by hand:
   copied into Google Classroom in the lesson, or saved as a file for the
   evidence folder later. Both produce the same markdown, so a teacher
   collecting thirty of them gets thirty identical shapes.

   The "I can" lines are derived from what the student actually finished
   rather than self-reported, so a teacher can defend every tick in it. */

const CAN_DO = [
  { key: "notes", level: 0, text: "I can use `play` to turn numbers into notes" },
  { key: "loops", level: 1, text: "I can use a loop to repeat music instead of writing it out" },
  { key: "drums", level: 2, text: "I can use `sample` to play drum sounds" },
  { key: "jam", level: 3, text: "I can change the instrument with `use_synth`" },
  { key: "liveloops", level: 4, text: "I can run two `live_loop`s at the same time" },
  { key: "random", level: 5, text: "I can use `choose` and `rrand` so it never plays the same twice" },
];
const MODE_WORD = { chips: "blocks", hybrid: "blocks + typing", typed: "typed it myself" };

function levelMode(i) {
  const b = LEVELS[i] && LEVELS[i].build;
  return b && b.codeMode ? b.codeMode : "chips";
}

function buildReport({ name, stars, records, when }) {
  const date = (when || new Date()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const star = (n) => (n > 0 ? "★".repeat(n) + "☆".repeat(3 - n) : "not started");
  const who = (name || "").trim() || "(no name given)";

  const studio = LEVELS.map((lv, i) => `| ${i + 1}. ${lv.title} | ${star(stars[i] || 0)} | ${MODE_WORD[levelMode(i)]} |`).join("\n");
  const club = TRACKS.map((t) => {
    const r = records[t.id];
    return `| ${t.title} | ${r ? r : "not yet"} | ${MODE_WORD[t.codeMode || "chips"]} |`;
  }).join("\n");
  const can = CAN_DO.map((c) => `- [${(stars[c.level] || 0) > 0 ? "x" : " "}] ${c.text}`).join("\n");
  const debugged = Object.keys(records).length;
  const canDebug = `- [${debugged > 0 ? "x" : " "}] I can find a bug in code by listening to it`;
  const canPerform = `- [${Object.values(records).some((r) => r === "gold" || r === "silver") ? "x" : " "}] I can keep a live set going and answer the crowd`;

  const levelsDone = stars.filter((n) => n > 0).length;
  const typedDone = LEVELS.filter((lv, i) => (stars[i] || 0) > 0 && levelMode(i) === "typed").length;

  return `# LoopLab — ${who}
**Date:** ${date}
**Finished:** ${levelsDone} of ${LEVELS.length} studio levels · ${debugged} of ${TRACKS.length} club tracks
${typedDone > 0 ? "**Typed real Sonic Pi:** yes — completed " + typedDone + " level(s) by typing the code\n" : ""}
## Studio

| Level | Stars | How they wrote it |
|---|---|---|
${studio}

## The Club

| Track | Record | How they wrote it |
|---|---|---|
${club}

## I can…

${can}
${canDebug}
${canPerform}

---
*Made in LoopLab. Everything above was done on this device — LoopLab has no
accounts and sends nothing anywhere. This report was copied or saved by the
student themselves.*
`;
}

/* Handing the file to the student. A Claude artifact blocks page-initiated
   downloads, so this reports whether it actually happened rather than
   pretending — the copy button is always the fallback that works. */
function downloadReport(text, name) {
  const safe = (name || "student").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "student";
  const stamp = new Date().toISOString().slice(0, 10);
  try {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `looplab-${safe}-${stamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- progress persistence ----------
   The artifact host provides `window.storage`; a plain browser does not, so
   fall back to localStorage and report which one actually worked — the map
   used to promise "saved automatically" even when nothing was being saved. */

const PROGRESS_KEY = "looplab:progress";
const NAME_KEY = "looplab:name";
/* This shipped under an earlier name before the rename. A player who already
   has stars saved under the old key keeps them: load falls through to it, and
   the next save writes the new key. Do not remove until it is safe to assume
   nobody is carrying old progress. */
const LEGACY_PROGRESS_KEY = "codebeat:progress";
const hasWindow = () => typeof window !== "undefined";

const progressStore = {
  async load() {
    if (!hasWindow()) return null;
    try {
      if (window.storage && window.storage.get) {
        for (const k of [PROGRESS_KEY, LEGACY_PROGRESS_KEY]) {
          const r = await window.storage.get(k);
          if (r && r.value != null) return r.value;
        }
      }
    } catch (e) {
      /* host storage missing or refused — try the browser next */
    }
    try {
      return (
        window.localStorage.getItem(PROGRESS_KEY) ?? window.localStorage.getItem(LEGACY_PROGRESS_KEY)
      );
    } catch (e) {
      /* private mode, or site data blocked */
    }
    return null;
  },
  async save(value) {
    if (!hasWindow()) return false;
    let ok = false;
    try {
      if (window.storage && window.storage.set) {
        await window.storage.set(PROGRESS_KEY, value);
        ok = true;
      }
    } catch (e) {}
    try {
      window.localStorage.setItem(PROGRESS_KEY, value);
      ok = true;
    } catch (e) {}
    return ok;
  },
};

/* ---------- main app ---------- */

export default function LoopLab() {
  const [screen, setScreen] = useState("map");
  const [levelIdx, setLevelIdx] = useState(0);
  const [phase, setPhase] = useState(0);
  const [stars, setStars] = useState(() => LEVELS.map(() => 0));
  const [records, setRecords] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [persist, setPersist] = useState(null); // null = not tried yet, false = nothing can store it
  /* A name only so the teacher's copy has one on it. Device-local, never sent
     anywhere, and the obvious thing for T-1 profiles to take over. */
  const [name, setName] = useState("");

  // load saved progress once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        try {
          const n = window.localStorage.getItem(NAME_KEY);
          if (alive && n) setName(n);
        } catch (e) {}
        const raw = await progressStore.load();
        const d = raw ? JSON.parse(raw) : null;
        if (alive && d) {
          if (Array.isArray(d.stars)) setStars(LEVELS.map((_, i) => d.stars[i] || 0));
          if (d.records && typeof d.records === "object") setRecords(d.records);
        }
      } catch (e) {
        /* first run, or a corrupt save — start fresh */
      }
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // save whenever progress changes, and remember whether it really landed
  useEffect(() => {
    if (!loaded) return;
    let alive = true;
    progressStore.save(JSON.stringify({ stars, records })).then((ok) => {
      if (alive) setPersist(ok);
    });
    return () => {
      alive = false;
    };
  }, [stars, records, loaded]);
  const [trackIdx, setTrackIdx] = useState(0);
  const [playInfo, setPlayInfo] = useState(null);
  const [playTag, setPlayTag] = useState(null);
  const [celebrate, setCelebrate] = useState(false);

  const synthsRef = useRef(null);
  const endTimer = useRef(null);
  const onEndRef = useRef(null);
  const silentRef = useRef(null);

  // iPhone trick: playing a (silent) HTML5 audio element switches the phone
  // into "media playback" mode, so web audio works even with the mute switch on.
  function unlockMedia() {
    try {
      if (!silentRef.current) {
        const a = document.createElement("audio");
        a.setAttribute("playsinline", "");
        a.loop = true;
        a.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA";
        silentRef.current = a;
      }
      const p = silentRef.current.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  async function ensureAudio() {
    await Tone.start();
    try {
      if (Tone.context.state !== "running") await Tone.context.resume();
    } catch (e) {}
    if (!synthsRef.current) {
      const master = new Tone.Limiter(-1).toDestination();
      const mk = (type, vol) =>
        new Tone.PolySynth(Tone.Synth, {
          oscillator: { type },
          envelope: { attack: 0.01, decay: 0.18, sustain: 0.25, release: 0.3 },
        }).connect(new Tone.Volume(vol).connect(master));
      const pretty_bell = new Tone.PolySynth(Tone.FMSynth).connect(new Tone.Volume(-6).connect(master));
      const prophet = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth", spread: 25, count: 3 },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.4 },
      }).connect(new Tone.Filter(1400, "lowpass").connect(new Tone.Volume(-9).connect(master)));
      const tb303 = new Tone.MonoSynth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.005, decay: 0.15, sustain: 0.15, release: 0.1 },
        filter: { type: "lowpass", rolloff: -24, Q: 6 },
        filterEnvelope: { attack: 0.005, decay: 0.18, sustain: 0.1, release: 0.1, baseFrequency: 120, octaves: 3.2 },
      }).connect(new Tone.Volume(-4).connect(master));
      const kick = new Tone.MembraneSynth().connect(new Tone.Volume(0).connect(master));
      const snare = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.17, sustain: 0 } }).connect(
        new Tone.Volume(-6).connect(master)
      );
      const hatFilter = new Tone.Filter(7000, "highpass").connect(new Tone.Volume(-12).connect(master));
      const hat = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 } }).connect(hatFilter);
      synthsRef.current = {
        beep: mk("triangle", -3),
        saw: mk("sawtooth", -7),
        square: mk("square", -8),
        pretty_bell,
        prophet,
        tb303,
        kick,
        snare,
        hat,
      };
    }
    return synthsRef.current;
  }

  function trigger(s, ev, t) {
    try {
      if (ev.kind === "note") {
        const syn = s[ev.synth] || s.beep;
        syn.triggerAttackRelease(Tone.Frequency(ev.note, "midi"), ev.synth === "tb303" ? 0.15 : 0.3, t);
      } else if (ev.kind === "bd_haus") s.kick.triggerAttackRelease("C2", "8n", t);
      else if (ev.kind === "sn_dolf") s.snare.triggerAttackRelease("16n", t);
      else if (ev.kind === "drum_cymbal_closed") s.hat.triggerAttackRelease(0.05, t);
    } catch (e) {}
  }

  function stopAll() {
    clearTimeout(endTimer.current);
    try {
      transport().stop();
      transport().cancel();
    } catch (e) {}
    onEndRef.current = null;
    setPlayInfo(null);
    setPlayTag(null);
  }

  function schedule(compiled, tag, onEnd) {
    // Belt and braces: compile() sanitises its inputs, but nothing non-finite
    // may reach Tone.Transport or the end timer (setTimeout coerces NaN to 0).
    const events = compiled.events.filter((ev) => Number.isFinite(ev.time));
    const total = Number.isFinite(compiled.total) ? compiled.total : 0;
    if (!events.length) return;
    ensureAudio().then((s) => {
      stopAll();
      transport().cancel();
      transport().position = 0;
      events.forEach((ev) => transport().schedule((t) => trigger(s, ev, t), LEAD + ev.time));
      transport().start();
      setPlayInfo({ events, total, startedAt: performance.now() });
      setPlayTag(tag);
      onEndRef.current = onEnd || null;
      endTimer.current = setTimeout(() => {
        try {
          transport().stop();
          transport().cancel();
        } catch (e) {}
        setPlayInfo(null);
        setPlayTag(null);
        const cb = onEndRef.current;
        onEndRef.current = null;
        if (cb) cb();
      }, (LEAD + total + 0.7) * 1000);
    });
  }

  async function playLines(lines, tag, onEnd, bpm = 60, maxDur = 0) {
    unlockMedia();
    schedule(capPreview(compile(lines, bpm), maxDur), tag, onEnd);
  }

  async function playMulti(loopsLines, tag, onEnd, bpm = 60, reps = 2, maxDur = 0) {
    unlockMedia();
    schedule(capPreview(compileLoops(loopsLines.filter((ls) => ls && ls.length), bpm, reps), maxDur), tag, onEnd);
  }

  useEffect(() => () => stopAll(), []);

  const elapsed = useClock(playInfo);
  const level = LEVELS[levelIdx];

  function completePhase(p) {
    setStars((st) => {
      const n = [...st];
      n[levelIdx] = Math.max(n[levelIdx], p + 1);
      return n;
    });
    if (p < 2) setPhase(p + 1);
    else setCelebrate(true);
  }

  function openLevel(i) {
    stopAll();
    setLevelIdx(i);
    setPhase(Math.min(stars[i], 2));
    setCelebrate(false);
    setScreen("level");
  }

  const shared = { playInfo, playTag, elapsed, playLines, playMulti, stopAll, ensureAudio, trigger, unlockMedia, synthsRef };

  return (
    <div className="min-h-screen w-full" style={{ background: C.bg, color: C.ink, fontFamily: "ui-rounded, 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @keyframes cb-pop { 0%{transform:scale(0) rotate(0)} 70%{transform:scale(1.25) rotate(10deg)} 100%{transform:scale(1) rotate(0)} }
        @keyframes cb-fall { 0%{transform:translateY(-40px); opacity:1} 100%{transform:translateY(340px) rotate(200deg); opacity:0} }
        @keyframes cb-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @media (prefers-reduced-motion: reduce){ *{animation:none !important; transition:none !important} }
      `}</style>
      {/* Mobile-first: a phone gets the same single column it always had.
         Wider screens just get more room for the same layout, so a laptop
         or a classroom projector is not showing a phone-shaped sliver. */}
      <div className="mx-auto max-w-md px-3 pb-10 pt-4 md:max-w-2xl lg:max-w-6xl">
        {screen === "map" && (
          <MapScreen
            stars={stars}
            records={records}
            loaded={loaded}
            persist={persist}
            onOpen={openLevel}
            onReport={() => setScreen("report")}
            onClub={() => {
              stopAll();
              setScreen("club");
            }}
            onUnlockAll={() => setStars(LEVELS.map(() => 3))}
            onReset={() => {
              setStars(LEVELS.map(() => 0));
              setRecords({});
            }}
          />
        )}
        {screen === "level" && (
          <LevelScreen
            level={level}
            levelIdx={levelIdx}
            phase={phase}
            setPhase={setPhase}
            stars={stars[levelIdx]}
            completePhase={completePhase}
            back={() => {
              stopAll();
              setScreen("map");
            }}
            {...shared}
          />
        )}
        {screen === "report" && (
          <ReportScreen
            stars={stars}
            records={records}
            name={name}
            onName={(n) => {
              setName(n);
              try {
                window.localStorage.setItem(NAME_KEY, n);
              } catch (e) {
                /* private mode — the report still works, the name just won't stick */
              }
            }}
            onBack={() => setScreen("map")}
          />
        )}

        {screen === "club" && (
          <ClubScreen
            records={records}
            onPick={(i) => {
              stopAll();
              setTrackIdx(i);
              setScreen("dj");
            }}
            back={() => setScreen("map")}
          />
        )}
        {screen === "dj" && (
          <DJScreen
            track={TRACKS[trackIdx]}
            record={records[TRACKS[trackIdx].id]}
            onRecord={(r) =>
              setRecords((prev) => {
                const rank = { bronze: 1, silver: 2, gold: 3 };
                const cur = prev[TRACKS[trackIdx].id];
                if (!r || (cur && rank[cur] >= rank[r])) return prev;
                return { ...prev, [TRACKS[trackIdx].id]: r };
              })
            }
            back={() => {
              stopAll();
              setScreen("club");
            }}
            {...shared}
          />
        )}
        {celebrate && (
          <CelebrateOverlay
            level={level}
            hasNext={levelIdx < LEVELS.length - 1}
            onMap={() => {
              setCelebrate(false);
              setScreen("map");
            }}
            onNext={() => {
              setCelebrate(false);
              openLevel(levelIdx + 1);
            }}
            onStay={() => setCelebrate(false)}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- map ---------- */

function MapScreen({ stars, records, loaded, persist, onOpen, onClub, onReport, onUnlockAll, onReset }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const clubOpen = stars[1] >= 3;
  const golds = Object.values(records).filter((r) => r === "gold").length;
  return (
    <div className="flex flex-col gap-4">
      <div className="pt-3 text-center">
        <div className="text-4xl font-extrabold tracking-tight">
          Loop<span style={{ color: C.pink }}>Lab</span> 🎧
        </div>
        <div className="mt-1 text-sm font-semibold" style={{ color: C.dim }}>
          Learn to code music — then DJ the club
        </div>
      </div>
      <Mentor text="Train in the Studio, then take the booth in The Club: fix real dance tracks, then perform them live and keep the crowd jumping. Let's go!" />
      <div className="text-xs font-extrabold uppercase tracking-widest" style={{ color: C.dim }}>
        🎓 The Studio — learn the moves
      </div>
      <div className="flex flex-col gap-3">
        {LEVELS.map((lv, i) => {
          const unlocked = i === 0 || stars[i - 1] >= 3;
          const st = stars[i];
          return (
            <button
              key={lv.id}
              onClick={() => unlocked && onOpen(i)}
              className="flex items-center gap-3 rounded-2xl p-3 text-left transition-transform active:scale-95"
              style={{
                background: unlocked ? C.panel : "#17142F",
                border: `2px solid ${st >= 3 ? C.green : unlocked ? C.line : "#221E45"}`,
                opacity: unlocked ? 1 : 0.55,
              }}
            >
              <div className="flex items-center justify-center rounded-xl text-2xl" style={{ width: 52, height: 52, background: C.panel2 }}>
                {unlocked ? lv.emoji : "🔒"}
              </div>
              <div className="flex-1">
                <div className="font-extrabold">
                  Level {i + 1}: {lv.title}
                </div>
                <div className="text-xs font-semibold" style={{ color: C.dim }}>
                  {unlocked ? lv.blurb : "Finish the level above to unlock"}
                </div>
              </div>
              <div className="text-sm" style={{ color: C.yellow }}>
                {"⭐".repeat(st)}
                <span style={{ opacity: 0.25 }}>{"⭐".repeat(3 - st)}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-xs font-extrabold uppercase tracking-widest" style={{ color: C.dim }}>
        🪩 The Club — become the DJ
      </div>
      <button
        onClick={() => clubOpen && onClub()}
        className="rounded-2xl p-4 text-left transition-transform active:scale-95"
        style={{
          background: clubOpen ? `linear-gradient(135deg, ${C.panel2}, #2E1B4E)` : "#17142F",
          border: `2px solid ${clubOpen ? C.pink : "#221E45"}`,
          opacity: clubOpen ? 1 : 0.55,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl">{clubOpen ? "🪩" : "🔒"}</div>
          <div className="flex-1">
            <div className="text-lg font-extrabold">Enter The Club</div>
            <div className="text-xs font-semibold" style={{ color: C.dim }}>
              {clubOpen
                ? `6 tracks · 125–140 BPM · fix them, then perform them live · ${golds} gold record${golds === 1 ? "" : "s"}`
                : "Finish Level 2 (Loop Magic) to get past the bouncer"}
            </div>
          </div>
        </div>
      </button>
      <div className="rounded-2xl p-3 text-center text-xs font-semibold" style={{ background: C.panel, color: C.dim, border: `1px solid ${C.line}` }}>
        🎹 Everything here is real <span style={{ color: C.aqua }}>Sonic Pi</span> code — real synth names, real sample names, real live loops. Copy any
        track and run it in the free desktop app!
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-[11px] font-bold" style={{ color: !loaded ? C.dim : persist === false ? C.orange : C.green }}>
          {!loaded
            ? "💾 Loading your progress…"
            : persist === false
            ? "⚠️ This browser won't let the game save — your stars will vanish on reload"
            : "💾 Progress saved automatically"}
        </span>
        <Chip small onClick={onReport}>
          📋 My progress
        </Chip>
        {stars.some((s) => s < 3) && (
          <Chip small onClick={onUnlockAll}>
            ⏩ Skip to The Club
          </Chip>
        )}
        <Chip
          small
          onClick={() => {
            if (confirmReset) {
              onReset();
              setConfirmReset(false);
            } else setConfirmReset(true);
          }}
        >
          {confirmReset ? "⚠️ Tap again to erase" : "↺ Start over"}
        </Chip>
      </div>
    </div>
  );
}

/* ---------- learning level screen (unchanged flow) ---------- */

function LevelScreen(props) {
  const { level, levelIdx, phase, setPhase, stars, back } = props;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button onClick={back} className="rounded-xl px-3 py-2 font-extrabold" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
          ←
        </button>
        <div className="flex-1">
          <div className="text-lg font-extrabold">
            {level.emoji} Level {levelIdx + 1}: {level.title}
          </div>
        </div>
        <div className="text-sm" style={{ color: C.yellow }}>
          {"⭐".repeat(stars)}
          <span style={{ opacity: 0.25 }}>{"⭐".repeat(3 - stars)}</span>
        </div>
      </div>
      <div className="flex gap-2">
        {PHASES.map((p0, i) => {
          const p = i === 2 && level.build ? { ...p0, sub: "Build it", icon: "🧱" } : p0;
          const unlocked = i <= stars;
          const current = i === phase;
          return (
            <button
              key={p.key}
              onClick={() => unlocked && setPhase(i)}
              className="flex-1 rounded-2xl px-1 py-2 text-center"
              style={{
                background: current ? C.violet : C.panel,
                color: current ? "#1A1030" : unlocked ? C.ink : C.dim,
                border: `2px solid ${current ? C.violet : C.line}`,
                opacity: unlocked ? 1 : 0.45,
              }}
            >
              <div className="text-base">{i < stars ? "✅" : p.icon}</div>
              <div className="text-[11px] font-extrabold leading-tight">
                {p.label}
                <div style={{ opacity: 0.75 }}>{p.sub}</div>
              </div>
            </button>
          );
        })}
      </div>
      {phase === 0 && <WatchPhase {...props} key={`w${levelIdx}`} />}
      {phase === 1 && <TogetherPhase {...props} key={`t${levelIdx}`} />}
      {phase === 2 && (level.build ? <BuildPhase {...props} key={`b${levelIdx}`} /> : <YourTurnPhase {...props} key={`y${levelIdx}`} />)}
      <div className="text-center text-[11px] font-semibold" style={{ color: C.dim }}>
        🔇 No sound? Turn the volume up, switch off silent mode, and tap ▶ again.
      </div>
    </div>
  );
}

function WatchPhase({ level, playInfo, playTag, elapsed, playLines, playMulti, stopAll, completePhase }) {
  const [done, setDone] = useState(false);
  const w = level.watch;
  const activeLine = useActiveLine(playInfo, elapsed);
  const multi = !!w.loops;
  return (
    <div className={PHASE["gap-3"].grid}>
      <div className={PHASE["gap-3"].watch}>
      <Mentor text={done ? w.after : w.mentor} />
      <NoteHighway playInfo={playInfo} elapsed={elapsed} />
      </div>
      <div className={PHASE["gap-3"].edit}>
      {multi ? (
        <div className="flex flex-col gap-2">
          {w.loops.map((lp) => (
            <div key={lp.name}>
              <div className="mb-1 font-mono text-xs font-bold" style={{ color: C.violet }}>
                live_loop :{lp.name} do
              </div>
              <CodeView lines={lp.lines} small />
              <div className="mt-1 font-mono text-xs font-bold" style={{ color: C.violet }}>
                end
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CodeView lines={w.lines} activeLine={playTag === "demo" ? activeLine : null} />
      )}
      <div className="flex gap-2">
        <BigButton
          color={C.aqua}
          onClick={() =>
            playInfo
              ? stopAll()
              : multi
              ? playMulti(w.loops.map((l) => l.lines), "demo", () => setDone(true), w.bpm || 60, 2)
              : playLines(w.lines, "demo", () => setDone(true))
          }
        >
          {playInfo ? "■ Stop" : "▶ Play DJ Loop's code"}
        </BigButton>
        <BigButton disabled={!done} onClick={() => completePhase(0)}>
          Got it! Next 🤝
        </BigButton>
      </div>
      </div>
    </div>
  );
}

function TogetherPhase({ level, playInfo, playTag, elapsed, playLines, playMulti, stopAll, completePhase }) {
  const tg = level.together;
  const bpm = tg.bpm || 60;
  const play = (lines, tag, onEnd, maxDur = 0) =>
    tg.overLoop ? playMulti([tg.overLoop, lines], tag, onEnd, bpm, 2, maxDur) : playLines(lines, tag, onEnd, bpm, maxDur);
  const blanksMeta = useMemo(() => tg.lines.map((L, i) => (L.blank !== undefined ? i : null)).filter((x) => x !== null), [tg]);
  const [fills, setFills] = useState(() => blanksMeta.map(() => null));
  const [msg, setMsg] = useState(null);
  const [won, setWon] = useState(false);
  const ind = indents(tg.lines);
  const activeLine = useActiveLine(playInfo, elapsed);

  function substituted(useAnswers) {
    let b = 0;
    return tg.lines.map((L) => {
      if (L.blank === undefined) return L;
      const raw = useAnswers ? L.blank : fills[b++];
      let v = raw;
      // Blanks fill left to right, so any chip can reach any blank. Fall back
      // to a harmless value rather than NaN — the answer is wrong either way,
      // and the hint below is what actually tells the player so.
      if (L.t === "play") v = safeNum(raw, 60);
      else if (L.t === "sleep") v = safeNum(raw, 0.5);
      else if (L.t === "bpm") v = safeNum(raw, 120);
      else if (L.t === "loop") v = safeNum(raw, 1);
      else if (L.t === "playChoose") v = String(raw).split(",").map((x) => safeNum(x, 60));
      else if (L.t === "sampleChoose") v = String(raw).split(",");
      return { t: L.t, v };
    });
  }

  function tapChip(chip) {
    const idx = fills.findIndex((f) => f === null);
    if (idx === -1) return;
    const n = [...fills];
    n[idx] = chip;
    setFills(n);
    setMsg(null);
  }
  function clearBlank(bIdx) {
    const n = [...fills];
    n[bIdx] = null;
    setFills(n);
    setMsg(null);
  }

  function playMine() {
    if (fills.some((f) => f === null)) {
      setMsg("Fill every ❓ blank first!");
      return;
    }
    const correct = tg.lines.filter((L) => L.blank !== undefined).every((L, i) => String(fills[i]) === String(L.blank));
    // Show the hint straight away instead of at the end of playback: a wrong
    // chip in a `sleep` blank meant 30-70 seconds of silence before the player
    // was told anything. They still hear their attempt, capped to MAX_PREVIEW.
    if (!correct) setMsg(tg.hint);
    play(substituted(false), "mine", () => {
      if (correct) setWon(true);
    }, MAX_PREVIEW);
  }

  let bCounter = -1;
  return (
    <div className={PHASE["gap-3"].grid}>
      <div className={PHASE["gap-3"].watch}>
      <Mentor text={won ? "PERFECT! 🎉 You fixed the track — that star is yours!" : tg.mentor} />
      <NoteHighway playInfo={playInfo} elapsed={elapsed} />
      </div>
      <div className={PHASE["gap-3"].edit}>
      <div className="rounded-2xl p-2" style={{ background: "#151233", border: `1px solid ${C.line}` }}>
        {tg.lines.map((L, i) => {
          const isBlank = L.blank !== undefined;
          if (isBlank) bCounter++;
          const bIdx = bCounter;
          return (
            <CodeLine key={i} L={L} indent={ind[i]} active={activeLine === i}>
              {isBlank ? (
                <>
                  {L.t !== "loop" && (
                    <span style={{ color: tokColor.kw, whiteSpace: "pre" }}>{lineTokens({ t: L.t, v: "" })[0][0]}</span>
                  )}
                  <button
                    onClick={() => fills[bIdx] !== null && clearBlank(bIdx)}
                    className="mx-0.5 rounded-lg px-2 py-0.5 font-mono font-bold"
                    style={{
                      border: `2px dashed ${fills[bIdx] !== null ? C.yellow : C.pink}`,
                      background: fills[bIdx] !== null ? "rgba(255,211,77,0.15)" : "rgba(255,92,168,0.1)",
                      color: fills[bIdx] !== null ? C.yellow : C.pink,
                    }}
                  >
                    {fills[bIdx] !== null ? (L.t === "sample" || L.t === "synth" ? ":" + fills[bIdx] : fills[bIdx]) : "❓"}
                  </button>
                  {L.t === "loop" && <span style={{ color: tokColor.kw }}>.times do</span>}
                </>
              ) : null}
            </CodeLine>
          );
        })}
      </div>
      {!won && (
        <div className="flex flex-wrap gap-2">
          {tg.chips.map((c) => (
            <Chip key={c} onClick={() => tapChip(c)}>
              {chipLabel(c)}
            </Chip>
          ))}
          <Chip
            small
            onClick={() => {
              setFills(blanksMeta.map(() => null));
              setMsg(null);
            }}
          >
            ↺ reset
          </Chip>
        </div>
      )}
      {msg && (
        <div className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: "rgba(255,154,87,0.15)", color: C.orange }}>
          {msg}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <BigButton color={C.violet} onClick={() => (playTag === "target" ? stopAll() : play(substituted(true), "target"))}>
          {playTag === "target" ? "■ Stop" : "🎧 Hear the goal"}
        </BigButton>
        {!won ? (
          <BigButton color={C.aqua} onClick={() => (playTag === "mine" ? stopAll() : playMine())}>
            {playTag === "mine" ? "■ Stop" : "▶ Play & check"}
          </BigButton>
        ) : (
          <BigButton onClick={() => completePhase(1)}>⭐ Next: Your turn 🚀</BigButton>
        )}
      </div>
      </div>
    </div>
  );
}

function YourTurnPhase({ level, playInfo, playTag, elapsed, playLines, stopAll, completePhase }) {
  const yt = level.yourTurn;
  const pal = yt.palette;
  const [inner, setInner] = useState([]);
  const [loopCount, setLoopCount] = useState(1);
  const [synth, setSynth] = useState("beep");
  const [playedOnce, setPlayedOnce] = useState(false);
  const [showCopy, setShowCopy] = useState(false);

  const effective = useMemo(() => {
    const body = loopCount > 1 ? [LOOP(loopCount), ...inner, END()] : [...inner];
    return synth !== "beep" ? [SY(synth), ...body] : body;
  }, [inner, loopCount, synth]);

  const stats = useMemo(() => {
    const plays = inner.filter((l) => l.t === "play").length;
    const sleeps = inner.filter((l) => l.t === "sleep").length;
    const drumLines = inner.filter((l) => l.t === "sample").length;
    const distinctNotes = new Set(inner.filter((l) => l.t === "play").map((l) => l.v)).size;
    const distinctDrums = new Set(inner.filter((l) => l.t === "sample").map((l) => l.v)).size;
    const drumEvents = compile(effective).events.filter((e) => e.kind !== "note").length;
    return { plays, sleeps, drumLines, distinctNotes, distinctDrums, drumEvents, loopCount, synth };
  }, [inner, effective, loopCount, synth]);

  const goalsMet = yt.goals.map((g) => g.test(stats));
  const allMet = goalsMet.every(Boolean);
  const activeLine = useActiveLine(playInfo, elapsed);
  const ind = indents(effective);

  const add = (line) => inner.length < 24 && setInner([...inner, line]);

  return (
    <div className={PHASE["gap-3"].grid}>
      <div className={PHASE["gap-3"].watch}>
      <Mentor text={allMet ? "All goals unlocked — press play and take a bow! 🌟" : yt.mentor} />
      <div className="rounded-2xl p-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        {yt.goals.map((g, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5 text-sm font-bold" style={{ color: goalsMet[i] ? C.green : C.dim }}>
            <span>{goalsMet[i] ? "✅" : "⬜"}</span> {g.label}
          </div>
        ))}
      </div>
      <NoteHighway playInfo={playInfo} elapsed={elapsed} />
      </div>
      <div className={PHASE["gap-3"].edit}>
      <div className="rounded-2xl p-2" style={{ background: "#151233", border: `1px solid ${C.line}` }}>
        {effective.length === 0 && (
          <div className="px-2 py-3 text-center text-sm font-semibold" style={{ color: C.dim }}>
            Your code goes here — tap chips below to add lines! 👇
          </div>
        )}
        {effective.map((L, i) => {
          const isInner = inner.includes(L);
          return (
            <div key={i} className="flex items-center">
              <div className="flex-1">
                <CodeLine L={L} indent={ind[i]} active={playTag === "mine" && activeLine === i} />
              </div>
              {isInner && !playInfo && (
                <button
                  onClick={() => setInner(inner.filter((x) => x !== L))}
                  className="ml-1 rounded-lg px-2 text-xs font-extrabold"
                  style={{ color: C.pink, background: "rgba(255,92,168,0.12)", height: 26 }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pal.loop && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold" style={{ color: C.dim }}>
            🔁 Repeat:
          </span>
          {[1, 2, 3, 4].map((n) => (
            <Chip key={n} small active={loopCount === n} onClick={() => setLoopCount(n)}>
              {n === 1 ? "off" : "×" + n}
            </Chip>
          ))}
        </div>
      )}
      {pal.synth && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold" style={{ color: C.dim }}>
            🎹 Sound:
          </span>
          {["beep", "saw", "square", "pretty_bell"].map((s) => (
            <Chip key={s} small active={synth === s} onClick={() => setSynth(s)}>
              :{s}
            </Chip>
          ))}
        </div>
      )}
      {pal.notes && (
        <div className="flex flex-wrap gap-1.5">
          {pal.notes.map((n) => (
            <Chip key={n} small onClick={() => add(P(n))}>
              play {n}
            </Chip>
          ))}
        </div>
      )}
      {pal.drums && (
        <div className="flex flex-wrap gap-1.5">
          {pal.drums.map((d) => (
            <Chip key={d} small onClick={() => add(D(d))}>
              :{d}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {pal.sleeps.map((t) => (
          <Chip key={t} small onClick={() => add(S(t))}>
            sleep {t}
          </Chip>
        ))}
        {inner.length > 0 && (
          <Chip small onClick={() => setInner([])}>
            🗑 clear
          </Chip>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <BigButton
          color={C.aqua}
          disabled={inner.length === 0}
          onClick={() => (playInfo ? stopAll() : playLines(effective, "mine", () => setPlayedOnce(true)))}
        >
          {playInfo ? "■ Stop" : "▶ Play my track"}
        </BigButton>
        <BigButton disabled={!(allMet && playedOnce)} onClick={() => completePhase(2)}>
          Finish level ⭐
        </BigButton>
        {inner.length > 0 && (
          <BigButton color={C.violet} onClick={() => setShowCopy(true)}>
            📋
          </BigButton>
        )}
      </div>
      {allMet && !playedOnce && (
        <div className="text-center text-xs font-bold" style={{ color: C.yellow }}>
          Goals done — now play your track to finish! 🎵
        </div>
      )}
      {showCopy && <CopyCodeModal text={toSonicPi(effective)} onClose={() => setShowCopy(false)} />}
      </div>
    </div>
  );
}

/* ---------- Build Lab: write the code yourself, stage by stage ---------- */

const CHIP_GROUPS = {
  drums: { label: "Drums", items: DRUMS.map((d) => ({ label: ":" + d, make: () => D(d) })) },
  notes: {
    label: "Notes",
    items: [33, 38, 40, 48, 55, 60, 64, 67, 72].map((n) => ({ label: "play " + n, make: () => P(n) })),
  },
  sleeps: {
    label: "Sleeps",
    items: [0.25, 0.5, 1].map((t) => ({ label: "sleep " + t, make: () => S(t) })),
  },
  synth: {
    label: "Sounds",
    items: ["tb303", "saw", "prophet", "pretty_bell"].map((s) => ({ label: "use_synth :" + s, make: () => SY(s) })),
  },
  bpm: { label: "Tempo", items: [126, 130, 134].map((b) => ({ label: "use_bpm " + b, make: () => ({ t: "bpm", v: b }) })) },
  chooseNote: {
    label: "Random notes",
    items: [
      { label: "choose([60,64,67,72])", make: () => ({ t: "playChoose", v: [60, 64, 67, 72] }) },
      { label: "choose([33,38,40])", make: () => ({ t: "playChoose", v: [33, 38, 40] }) },
    ],
  },
  chooseDrum: {
    label: "Random drums",
    items: [
      { label: "choose([:sn_dolf,:hat])", make: () => ({ t: "sampleChoose", v: ["sn_dolf", "drum_cymbal_closed"] }) },
      { label: "choose([:bd_haus,:hat])", make: () => ({ t: "sampleChoose", v: ["bd_haus", "drum_cymbal_closed"] }) },
    ],
  },
  rand: { label: "Random timing", items: [{ label: "sleep rrand(0.25,0.5)", make: () => ({ t: "sleepRand", v: [0.25, 0.5] }) }] },
};

function BuildPhase({ level, playInfo, playTag, elapsed, playMulti, stopAll, completePhase }) {
  const b = level.build;
  const [code, setCode] = useState(() => b.loops.map(() => []));
  const [stageIdx, setStageIdx] = useState(0);
  const [plays, setPlays] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [justDone, setJustDone] = useState(false);

  const [loopOverride, setLoopOverride] = useState(null);
  const stage = b.stages[stageIdx];
  const finished = stageIdx >= b.stages.length;
  const activeLoop = loopOverride !== null ? loopOverride : stage ? stage.loop : 0;
  useEffect(() => setLoopOverride(null), [stageIdx]);

  const ctx = useMemo(
    () => ({
      count: (li, t) => code[li].filter((l) => l.t === t).length,
      beats: (li) =>
        code[li].reduce((s, l) => s + (l.t === "sleep" ? l.v : l.t === "sleepRand" ? (l.v[0] + l.v[1]) / 2 : 0), 0),
      lines: (li) => code[li].length,
    }),
    [code]
  );

  /* Chips and loop tabs unlock stage by stage. With the whole palette live
     from stage 1, a player who explored the chips could satisfy three or four
     stage checks before the 1.1s advance timer caught up, clearing them in a
     chain of banner flashes without ever reading a brief. */
  const unlocked = useMemo(() => {
    const groups = new Set();
    const loops = new Set();
    const upTo = finished ? b.stages.length : stageIdx + 1;
    for (let i = 0; i < upTo; i++) {
      (b.stages[i].allow || []).forEach((g) => groups.add(g));
      loops.add(b.stages[i].loop);
    }
    return { groups, loops };
  }, [b, stageIdx, finished]);

  const structureOk = stage ? stage.check(ctx) : true;
  const playsOk = !stage || !stage.requirePlay || plays >= stage.requirePlay;
  const stageOk = structureOk && playsOk;

  useEffect(() => {
    if (!finished && stageOk) {
      setJustDone(true);
      const t = setTimeout(() => {
        setJustDone(false);
        setStageIdx((s) => s + 1);
        setPlays(0); // "play it twice" means twice in THIS stage
        setShowHint(false);
      }, 1100);
      return () => clearTimeout(t);
    }
  }, [stageOk, finished]);

  /* In a typing mode the text is what the student owns and the line objects are
     derived from it, so every stage check downstream keeps working unchanged. */
  const codeMode = b.codeMode || "chips";
  const [texts, setTexts] = useState(() => b.loops.map(() => ""));
  const [errors, setErrors] = useState(() => b.loops.map(() => []));

  const setText = (t) => {
    const parsed = parseCode(t);
    setTexts(texts.map((x, i) => (i === activeLoop ? t : x)));
    setErrors(errors.map((x, i) => (i === activeLoop ? parsed.errors : x)));
    // only lines that actually parse reach the checker — a half-typed line
    // must never count as progress, and must never be treated as a mistake
    setCode(code.map((ls, i) => (i === activeLoop ? parsed.lines : ls)));
  };

  const add = (mk) => {
    if (code[activeLoop].length >= 20) return;
    setCode(code.map((ls, i) => (i === activeLoop ? [...ls, mk()] : ls)));
  };
  const removeAt = (i) => setCode(code.map((ls, li) => (li === activeLoop ? ls.filter((_, x) => x !== i) : ls)));

  const lines = code[activeLoop];
  const ind = indents(lines);
  const beats = ctx.beats(activeLoop);
  const allowed = b.loops[activeLoop].allow;

  return (
    <div className={PHASE["gap-3"].grid}>
      <div className={PHASE["gap-3"].watch}>
      <Mentor text={finished ? "Every stage complete — you wrote that whole thing yourself. That's real live-coding! 🏆" : b.mentor} />

      {/* stage checklist */}
      <div className="rounded-2xl p-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        {b.stages.map((st, i) => (
          <div
            key={i}
            className="flex items-start gap-2 py-0.5 text-sm font-bold"
            style={{ color: i < stageIdx ? C.green : i === stageIdx ? C.ink : C.dim, opacity: i > stageIdx ? 0.6 : 1 }}
          >
            <span>{i < stageIdx ? "✅" : i === stageIdx ? "🔨" : "🔒"}</span>
            <span>
              Stage {i + 1}: {st.title}
            </span>
          </div>
        ))}
      </div>

      {!finished && (
        <div
          className="rounded-2xl p-3"
          style={{ background: justDone ? "rgba(92,224,126,0.15)" : C.panel2, border: `2px solid ${justDone ? C.green : C.violet}` }}
        >
          <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: justDone ? C.green : C.violet }}>
            {justDone ? "✅ Stage complete!" : `Stage ${stageIdx + 1} · write it in :${b.loops[activeLoop].name}`}
          </div>
          <div className="mt-1 text-sm font-semibold">{stage.brief}</div>
          {stage.requirePlay && (
            <div className="mt-1 text-xs font-bold" style={{ color: plays >= stage.requirePlay ? C.green : C.yellow }}>
              ▶ Played {Math.min(plays, stage.requirePlay)}/{stage.requirePlay}
            </div>
          )}
          {showHint && (
            <div className="mt-2 rounded-xl px-2 py-1 text-xs font-bold" style={{ background: "rgba(255,154,87,0.15)", color: C.orange }}>
              💡 {stage.hint}
            </div>
          )}
        </div>
      )}

      <NoteHighway playInfo={playInfo} elapsed={elapsed} height={140} idleText="Write some code, then press ▶ to hear it" />
      </div>
      <div className={PHASE["gap-3"].edit}>

      {/* loop tabs */}
      {b.loops.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {b.loops.map((lp, i) =>
            unlocked.loops.has(i) ? (
              <Chip key={lp.name} small active={activeLoop === i} onClick={() => setLoopOverride(i)}>
                {lp.icon} :{lp.name}
              </Chip>
            ) : (
              <Chip key={lp.name} small disabled>
                🔒 :{lp.name}
              </Chip>
            )
          )}
        </div>
      )}

      {/* editor */}
      <div>
        <div className="mb-1 flex items-center justify-between font-mono text-xs font-bold" style={{ color: C.violet }}>
          <span>live_loop :{b.loops[activeLoop].name} do</span>
          {b.showBeats && (
            <span style={{ color: Math.abs(beats - 4) < 0.01 ? C.green : C.dim }}>
              {beats} / 4 beats {Math.abs(beats - 4) < 0.01 ? "✅" : ""}
            </span>
          )}
        </div>
        {codeMode === "chips" ? (
          <div className="max-h-52 overflow-y-auto rounded-2xl p-2" style={{ background: "#151233", border: `1px solid ${C.line}` }}>
            {lines.length === 0 && (
              <div className="px-2 py-3 text-center text-sm font-semibold" style={{ color: C.dim }}>
                Empty — tap the chips below to write your first line 👇
              </div>
            )}
            {lines.map((L, i) => (
              <div key={i} className="flex items-center">
                <div className="flex-1">
                  <CodeLine L={L} small indent={ind[i]} />
                </div>
                {!playInfo && (
                  <button
                    onClick={() => removeAt(i)}
                    className="ml-1 rounded-lg px-2 text-xs font-extrabold"
                    style={{ color: C.pink, background: "rgba(255,92,168,0.12)", height: 24 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <CodeEditor
            value={texts[activeLoop]}
            onChange={setText}
            errors={errors[activeLoop]}
            mode={codeMode}
            disabled={!!playInfo}
            chipGroups={Object.entries(CHIP_GROUPS).filter(([k]) => allowed.includes(k) && unlocked.groups.has(k))}
          />
        )}
        <div className="mt-1 font-mono text-xs font-bold" style={{ color: C.violet }}>
          end
        </div>
      </div>

      {/* palette — in a typing mode the chips live inside the editor, where
          they type the line rather than append it */}
      {codeMode === "chips" &&
        Object.entries(CHIP_GROUPS)
          .filter(([k]) => allowed.includes(k) && unlocked.groups.has(k))
          .map(([k, g]) => (
            <div key={k} className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold uppercase" style={{ color: C.dim, minWidth: 62 }}>
                {g.label}
              </span>
              {g.items.map((it) => (
                <Chip key={it.label} small onClick={() => add(it.make)}>
                  {it.label}
                </Chip>
              ))}
            </div>
          ))}

      <div className="flex flex-wrap gap-2">
        <BigButton
          color={C.aqua}
          disabled={code.every((ls) => !ls.length)}
          onClick={() =>
            playInfo ? stopAll() : playMulti(code, "mine", () => setPlays((p) => p + 1), b.bpm || 60, 2)
          }
        >
          {playInfo ? "■ Stop" : b.loops.length > 1 ? "▶ Play both loops" : "▶ Play my loop"}
        </BigButton>
        {!finished && (
          <BigButton color={C.orange} onClick={() => setShowHint(true)}>
            💡 Hint
          </BigButton>
        )}
        {code.some((ls) => ls.length) && (
          <BigButton color={C.violet} onClick={() => setShowCopy(true)}>
            📋
          </BigButton>
        )}
        {finished && <BigButton onClick={() => completePhase(2)}>Finish level ⭐</BigButton>}
        {lines.length > 0 && !finished && (
          <Chip small onClick={() => setCode(code.map((ls, i) => (i === activeLoop ? [] : ls)))}>
            🗑 clear loop
          </Chip>
        )}
      </div>

      {showCopy && (
        <CopyCodeModal
          text={trackToSonicPi({ bpm: b.bpm || 120, loops: b.loops }, code)}
          onClose={() => setShowCopy(false)}
        />
      )}
      </div>
    </div>
  );
}

/* ---------- The Club: track select ---------- */

function ClubScreen({ records, onPick, back }) {
  const medal = { bronze: "🥉", silver: "🥈", gold: "🥇" };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button onClick={back} className="rounded-xl px-3 py-2 font-extrabold" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
          ←
        </button>
        <div className="flex-1">
          <div className="text-lg font-extrabold">🪩 The Club — pick a record</div>
        </div>
      </div>
      <Mentor text="Here's the crate: six dance-floor tracks written in real live loops. Each one arrived from the studio with bugs — soundcheck it, fix it, then play it LIVE and keep the crowd hyped!" />
      <div className="flex flex-col gap-3">
        {TRACKS.map((tr, i) => {
          const unlocked = i < 2 || records[TRACKS[i - 1].id];
          return (
            <button
              key={tr.id}
              onClick={() => unlocked && onPick(i)}
              className="flex items-center gap-3 rounded-2xl p-3 text-left transition-transform active:scale-95"
              style={{
                background: unlocked ? C.panel : "#17142F",
                border: `2px solid ${records[tr.id] === "gold" ? C.yellow : unlocked ? C.line : "#221E45"}`,
                opacity: unlocked ? 1 : 0.55,
              }}
            >
              <div className="flex items-center justify-center rounded-full text-2xl" style={{ width: 52, height: 52, background: "#151233", border: `3px solid ${C.panel2}` }}>
                {unlocked ? tr.emoji : "🔒"}
              </div>
              <div className="flex-1">
                <div className="font-extrabold">
                  {tr.title} {records[tr.id] ? medal[records[tr.id]] : ""}
                </div>
                <div className="text-xs font-semibold" style={{ color: C.aqua }}>
                  {tr.style} · {tr.bpm} BPM · {tr.bugs.length} bugs
                </div>
                <div className="text-xs font-semibold" style={{ color: C.dim }}>
                  {unlocked ? tr.blurb : "Earn a record on the track above to unlock"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- DJ screen: soundcheck → live set → results ---------- */

function DJScreen(props) {
  const { track, back } = props;
  const [stage, setStage] = useState("soundcheck");
  const [fixedLines, setFixedLines] = useState(null);
  const [result, setResult] = useState(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button onClick={back} className="rounded-xl px-3 py-2 font-extrabold" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
          ←
        </button>
        <div className="flex-1">
          <div className="text-base font-extrabold">
            {track.emoji} {track.title}
          </div>
          <div className="text-xs font-semibold" style={{ color: C.aqua }}>
            {track.style} · {track.bpm} BPM
          </div>
        </div>
      </div>
      {stage === "soundcheck" && (
        <Soundcheck
          {...props}
          onDone={(lines) => {
            props.stopAll();
            setFixedLines(lines);
            setStage("live");
          }}
        />
      )}
      {stage === "live" && (
        <LiveSet
          {...props}
          startLines={fixedLines}
          onFinish={(res) => {
            setResult(res);
            if (res.record) props.onRecord(res.record);
            setStage("results");
          }}
        />
      )}
      {stage === "results" && (
        <SetResults
          track={track}
          result={result}
          finalLines={result.lines}
          onReplay={() => setStage("live")}
          onBack={back}
        />
      )}
      <div className="text-center text-[11px] font-semibold" style={{ color: C.dim }}>
        🔇 No sound? Turn the volume up, switch off silent mode, and tap ▶ again.
      </div>
    </div>
  );
}

/* ---------- Soundcheck: fix the track ---------- */

function Soundcheck({ track, playInfo, playTag, elapsed, playLines, stopAll, onDone }) {
  const [loopLines, setLoopLines] = useState(() => applyBugs(track));
  /* The club runs the same ramp as the studio: tap to debug on the first
     tracks, chips-that-type in the middle, typing alone by Rave Siren. */
  const codeMode = track.codeMode || "chips";
  const [texts, setTexts] = useState(() => applyBugs(track).map((ls) => codeToText(ls)));
  const [errors, setErrors] = useState(() => track.loops.map(() => []));
  const [sel, setSel] = useState(0);
  const [selLine, setSelLine] = useState(null);
  const [hints, setHints] = useState(false);
  const activeLine = useActiveLine(playInfo, elapsed);

  /* Soundcheck passes only when every loop matches the studio version again.
     The old check counted the designated bug lines alone, so a player who
     repaired all three bugs and then knocked a different note out of place
     still passed — and carried that wrong note into the live set. Lines the
     player changed themselves are counted separately so the mentor can say
     which of the two is going on. */
  /* Typing lets a student add or delete lines, so this can no longer assume the
     two sides are the same length — indexing past the end used to throw. A
     length change is itself a mismatch: the studio version is the target. */
  const diffs = track.loops.map((lp, li) => {
    const mine = loopLines[li] || [];
    const n = Math.max(lp.lines.length, mine.length);
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = lp.lines[i], b = mine[i];
      if (!a || !b || String(a.v ?? "") !== String(b.v ?? "") || a.t !== b.t) out.push(i);
    }
    return out;
  });
  const fixedPerLoop = diffs.map((d) => d.length === 0);
  const isBugLine = (li, i) => !!(loopLines[li] && loopLines[li][i] && loopLines[li][i].bug);
  const bugsLeft = diffs.reduce((n, d, li) => n + d.filter((i) => isBugLine(li, i)).length, 0);
  const strayLines = diffs.reduce((n, d, li) => n + d.filter((i) => !isBugLine(li, i)).length, 0);
  const allFixed = bugsLeft === 0 && strayLines === 0;

  const lines = loopLines[sel];
  const orig = track.loops[sel].lines;
  const ind = indents(lines);

  function setLineValue(i, raw) {
    const L = lines[i];
    const v = L.t === "play" || L.t === "sleep" ? parseFloat(raw) : raw;
    const next = loopLines.map((ls, li) => (li === sel ? ls.map((x, xi) => (xi === i ? { ...x, v } : x)) : ls));
    setLoopLines(next);
    setSelLine(null);
  }

  return (
    <div className={PHASE["gap-3"].grid}>
      <div className={PHASE["gap-3"].watch}>
      <Mentor
        text={
          allFixed
            ? "Soundcheck complete — this track SLAPS again! The booth is yours. 🎛"
            : bugsLeft === 0
              ? `All ${track.bugs.length} bugs fixed — nice ears! ${strayLines === 1 ? "One line" : `${strayLines} lines`} still ${strayLines === 1 ? "doesn't" : "don't"} match the studio version though. Hit 💡 Hints to see which, or put it back and we're away. 🎧`
              : `This track came back from the studio with ${track.bugs.length} bugs. Solo each loop, compare with the fixed version, and repair it by ear. ${bugsLeft} bug${bugsLeft === 1 ? "" : "s"} left!`
        }
      />
      <NoteHighway playInfo={playInfo} elapsed={elapsed} height={150} idleText="Solo a loop to hunt the bugs 🐛" />
      </div>
      <div className={PHASE["gap-3"].edit}>
      <div className="flex flex-wrap gap-2">
        {track.loops.map((lp, i) => {
          const clean = fixedPerLoop[i];
          return (
            <Chip key={lp.name} small active={sel === i} onClick={() => { setSel(i); setSelLine(null); }}>
              {lp.icon} {lp.name} {clean ? "✅" : "🐛"}
            </Chip>
          );
        })}
      </div>
      {codeMode === "chips" ? (
        <div className="max-h-56 overflow-y-auto rounded-2xl p-2" style={{ background: "#151233", border: `1px solid ${C.line}` }}>
          {lines.map((L, i) => (
            <CodeLine
              key={i}
              L={L}
              small
              indent={ind[i]}
              active={playTag === "mine" && activeLine === i + 1}
              selected={selLine === i}
              warn={hints && orig[i] && String(L.v) !== String(orig[i].v)}
              onTap={L.t === "synth" ? null : () => setSelLine(selLine === i ? null : i)}
            />
          ))}
        </div>
      ) : (
        <CodeEditor
          value={texts[sel]}
          onChange={(t) => {
            const parsed = parseCode(t);
            setTexts(texts.map((x, i) => (i === sel ? t : x)));
            setErrors(errors.map((x, i) => (i === sel ? parsed.errors : x)));
            // keep the bug marker on lines the student has not retyped, so the
            // mentor can still tell a planted bug from their own edit
            const prev = loopLines[sel] || [];
            const tagged = parsed.lines.map((L, i) => (prev[i] && prev[i].bug && prev[i].t === L.t ? { ...L, bug: true } : L));
            setLoopLines(loopLines.map((ls, i) => (i === sel ? tagged : ls)));
          }}
          errors={errors[sel]}
          mode={codeMode}
          disabled={!!playInfo}
          minRows={10}
          chipGroups={Object.entries(CHIP_GROUPS).filter(([k]) => ["drums", "notes", "sleeps", "synth"].includes(k))}
        />
      )}
      {codeMode === "chips" && selLine !== null && (
        <div className="flex flex-wrap gap-1.5 rounded-2xl p-2" style={{ background: C.panel, border: `1px solid ${C.yellow}` }}>
          <span className="w-full text-xs font-extrabold" style={{ color: C.yellow }}>
            Change line to:
          </span>
          {optionsFor(lines[selLine], track.loops[sel].pool).map((o) => (
            <Chip key={o} small active={String(lines[selLine].v) === o} onClick={() => setLineValue(selLine, o)}>
              {lines[selLine].t === "sample" ? ":" + o : o}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <BigButton
          color={C.aqua}
          onClick={() => (playTag === "mine" ? stopAll() : playLines([LOOP(2), ...lines, END()], "mine", null, track.bpm))}
        >
          {playTag === "mine" ? "■ Stop" : "▶ Solo this loop"}
        </BigButton>
        <BigButton
          color={C.violet}
          onClick={() => (playTag === "target" ? stopAll() : playLines([LOOP(2), ...orig, END()], "target", null, track.bpm))}
        >
          {playTag === "target" ? "■ Stop" : "🎧 Hear it fixed"}
        </BigButton>
        <BigButton color={C.orange} onClick={() => setHints(true)}>
          💡 Hints
        </BigButton>
      </div>
      {hints && !allFixed && (
        <div className="rounded-xl px-3 py-2 text-xs font-bold" style={{ background: "rgba(255,154,87,0.12)", color: C.orange }}>
          {track.bugs.map((b, i) => (
            <div key={i}>• {b.hint}</div>
          ))}
          {strayLines > 0 && <div>• {strayLines === 1 ? "One line you changed doesn't" : `${strayLines} lines you changed don't`} match the studio version — they're the highlighted ones.</div>}
        </div>
      )}
      <BigButton disabled={!allFixed} onClick={() => onDone(loopLines.map((ls) => ls.map((x) => ({ ...x }))))}>
        🎛 Soundcheck done — take the booth!
      </BigButton>
      </div>
    </div>
  );
}

/* ---------- Live Set: perform to the crowd ---------- */

const SET_BARS = 48;

/* How far ahead of the sound a bar is committed. Held deliberately tight so a
   mute, a BPM nudge or a live glitch fix is heard almost immediately — that
   responsiveness is the point of the booth.
   The cost, accepted knowingly: LEAD is 1.6s, so a note only exists 0.45s
   before it lands and enters the highway about three-quarters of the way down
   rather than at the top. Raising this towards LEAD would fix the visual and
   push every player action out to the next bar; the trade was made the other
   way round. */
const SCHED_AHEAD = 0.45;
/* Backstop for a tab that was hidden: never burn more than a few bars in one
   tick, however far behind the clock has drifted. */
const MAX_BARS_PER_TICK = 4;

function LiveSet({ track, startLines, ensureAudio, trigger, unlockMedia, stopAll, onFinish }) {
  const [running, setRunning] = useState(false);
  const [, force] = useState(0);
  const [sel, setSel] = useState(0);
  const [selLine, setSelLine] = useState(null);
  const [editNote, setEditNote] = useState(false);

  const eng = useRef(null); // engine state lives in a ref

  function initEngine() {
    eng.current = {
      lines: startLines.map((ls) => ls.map((x) => ({ ...x }))),
      muted: track.loops.map((lp) => !lp.startOn),
      bpm: track.bpm,
      bar: 0,
      hype: 40,
      score: 0,
      request: null,
      glitch: null,
      visEvents: [],
      audioStart: 0,
      perfStart: 0,
      nextBarTime: 0,
      queued: 0,      // bars handed to the scheduler
      barTimes: [],   // set-relative start time of each queued bar
      interval: null,
      msg: "Drums are rolling — build it up! Unmute loops to bring parts in. 🔊",
    };
  }

  async function startSet() {
    unlockMedia();
    const s = await ensureAudio();
    stopAll();
    initEngine();
    const e = eng.current;
    // Same short lead-in as every other bar, so the set opens the way it runs.
    e.audioStart = Tone.now() + SCHED_AHEAD;
    e.perfStart = performance.now() + SCHED_AHEAD * 1000;
    e.nextBarTime = 0;
    e.interval = setInterval(() => conduct(s), 90);
    setRunning(true);
    let raf;
    const loop = () => {
      force((x) => x + 1);
      if (eng.current && eng.current.interval) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function conduct(s) {
    const e = eng.current;
    if (!e) return;
    const now = Tone.now();
    const barDur = 4 * (60 / e.bpm);

    /* A hidden tab freezes this interval while the audio clock keeps running.
       The catch-up below would then schedule every missed bar in one tick with
       every note already in the past — silent, but still paying out hype and
       score for bars nobody heard, burning a third of the set on a tab switch.
       Slide both clocks forward instead and resume from here. */
    const behind = now - (e.audioStart + e.nextBarTime);
    if (behind > 2 * barDur) {
      e.audioStart += behind + 0.1;
      e.perfStart += (behind + 0.1) * 1000;
      e.visEvents.length = 0;
      e.msg = "👋 Welcome back — picking the set up from here.";
    }

    // ---- scheduler: hand bars to Tone and to the highway, LEAD ahead ----
    let n = 0;
    while (e.queued < SET_BARS && e.audioStart + e.nextBarTime < now + SCHED_AHEAD && n++ < MAX_BARS_PER_TICK) {
      const barStart = e.nextBarTime;
      e.lines.forEach((ls, li) => {
        if (e.muted[li]) return;
        const { events } = compile(ls, e.bpm);
        events.forEach((ev, k) => {
          trigger(s, ev, e.audioStart + barStart + ev.time);
          e.visEvents.push({ ...ev, time: barStart + ev.time, id: `${e.queued}-${li}-${k}` });
        });
      });
      if (e.visEvents.length > 260) e.visEvents.splice(0, e.visEvents.length - 260);
      e.barTimes.push(barStart);
      e.queued++;
      e.nextBarTime += barDur;
    }

    /* ---- crowd: runs on the audible playhead, one bar behind the scheduler,
       so hype, requests and messages land with the music rather than a bar in
       front of it. ---- */
    while (e.bar < e.queued && e.audioStart + e.barTimes[e.bar] <= now) {
      const active = e.muted.filter((m) => !m).length;
      e.hype += active >= 3 ? 2 : active === 2 ? 1 : active === 1 ? 0 : -3;
      if (e.glitch) e.hype -= 3;
      // request lifecycle
      if (e.request) {
        e.request.left--;
        if (requestMet(e)) {
          e.hype += 15;
          e.msg = "🙌 The crowd LOVED that! Hype up!";
          e.request = null;
        } else if (e.request.left <= 0) {
          e.hype -= 10;
          e.msg = "😕 The crowd gave up on that request…";
          e.request = null;
        }
      } else if (e.bar >= 4 && (e.bar - 4) % 8 === 0 && e.bar < SET_BARS - 6) {
        e.request = makeRequest(e, track);
        if (e.request) e.msg = `🗣 "${e.request.text}"`;
      }
      // glitch lifecycle
      if (!e.glitch && (e.bar === 10 || e.bar === 24 || e.bar === 38)) {
        e.glitch = makeGlitch(e, track);
        if (e.glitch) e.msg = `⚠️ GLITCH in the ${track.loops[e.glitch.loop].name} loop — fix it live!`;
      }
      if (e.glitch) {
        e.glitch.age++;
        const gl = e.lines[e.glitch.loop][e.glitch.line];
        if (String(gl.v) === String(e.glitch.orig)) {
          e.glitch = null;
          e.hype += 12;
          e.msg = "🔧 Live fix! The floor goes wild!";
        }
      }
      e.hype = Math.max(0, Math.min(100, e.hype));
      e.score += e.hype;
      e.bar++;
    }
    // Let the 48th bar ring out before the results card — the playhead reaches
    // bar 48 as the last bar *starts*, not as it finishes.
    if (e.bar >= SET_BARS && now >= e.audioStart + e.barTimes[SET_BARS - 1] + barDur) endSet();
  }

  function requestMet(e) {
    const r = e.request;
    if (!r) return false;
    if (r.type === "unmute") return !e.muted[r.loop];
    if (r.type === "mute") return e.muted[r.loop];
    if (r.type === "bpm") return Math.abs(e.bpm - r.v) <= 1;
    return false;
  }

  function makeRequest(e, track) {
    const mutedIdx = e.muted.map((m, i) => (m ? i : null)).filter((x) => x !== null);
    const activeIdx = e.muted.map((m, i) => (!m ? i : null)).filter((x) => x !== null);
    const roll = Math.random();
    if (mutedIdx.length && roll < 0.6) {
      const i = mutedIdx[Math.floor(Math.random() * mutedIdx.length)];
      return { type: "unmute", loop: i, left: 8, text: `Drop the ${track.loops[i].name}! Bring it IN!` };
    }
    if (roll < 0.85 || !activeIdx.length) {
      const v = Math.min(146, Math.max(120, track.bpm + (Math.random() < 0.5 ? -4 : 4)));
      return { type: "bpm", v, left: 8, text: `Take it to ${v} BPM!` };
    }
    const i = activeIdx[Math.floor(Math.random() * activeIdx.length)];
    if (track.loops[i].name === "drums") return { type: "bpm", v: track.bpm + 4, left: 8, text: `Take it to ${track.bpm + 4} BPM!` };
    return { type: "mute", loop: i, left: 8, text: `Strip it back — cut the ${track.loops[i].name}!` };
  }

  function makeGlitch(e, track) {
    const candidates = [];
    e.lines.forEach((ls, li) => {
      if (e.muted[li]) return;
      ls.forEach((L, i) => {
        if (L.t === "play" || L.t === "sample" || L.t === "sleep") candidates.push([li, i]);
      });
    });
    if (!candidates.length) return null;
    const [li, i] = candidates[Math.floor(Math.random() * candidates.length)];
    const L = e.lines[li][i];
    const orig = L.v;
    if (L.t === "play") L.v = L.v + 1;
    else if (L.t === "sleep") L.v = L.v === 0.25 ? 0.5 : 0.25;
    else L.v = DRUMS[(DRUMS.indexOf(L.v) + 1) % DRUMS.length];
    return { loop: li, line: i, orig, age: 0 };
  }

  function endSet() {
    const e = eng.current;
    clearInterval(e.interval);
    e.interval = null;
    setRunning(false);
    const avg = e.bar ? e.score / e.bar : 0;
    const record = e.bar < 16 ? null : avg >= 70 ? "gold" : avg >= 50 ? "silver" : avg >= 30 ? "bronze" : null;
    onFinish({ avg: Math.round(avg), bars: e.bar, record, lines: e.lines });
  }

  useEffect(
    () => () => {
      if (eng.current && eng.current.interval) clearInterval(eng.current.interval);
    },
    []
  );

  const e = eng.current;
  const elapsed = running && e ? (performance.now() - e.perfStart) / 1000 : null;
  const windowEvents = running && e ? e.visEvents.filter((ev) => ev.time - elapsed <= LEAD && ev.time - elapsed > -0.5) : [];
  const lines = e ? e.lines[sel] : startLines[sel];
  const ind = indents(lines);
  const glitchHere = e && e.glitch && e.glitch.loop === sel;

  if (!running && !e)
    return (
      <div className="flex flex-col gap-3">
        <Mentor text="The floor is packed and the lights are down. Start with the drums, build the track up loop by loop, answer the crowd's requests, and fix any glitches LIVE — your edits drop in on the next loop, just like a real live_loop. Ready?" />
        <BigButton onClick={startSet}>🔴 START THE SET</BigButton>
      </div>
    );

  return (
    <div className={PHASE["gap-2"].grid}>
      <div className={PHASE["gap-2"].watch}>
      {/* crowd */}
      <div className="rounded-2xl p-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between text-xs font-extrabold" style={{ color: C.dim }}>
          <span>
            Bar {Math.min(e.bar, SET_BARS)}/{SET_BARS}
          </span>
          <span>CROWD HYPE</span>
          <span style={{ color: e.hype >= 70 ? C.green : e.hype >= 35 ? C.yellow : C.red }}>{Math.round(e.hype)}%</span>
        </div>
        <div className="mt-1 h-3 w-full overflow-hidden rounded-full" style={{ background: "#151233" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${e.hype}%`,
              background: e.hype >= 70 ? C.green : e.hype >= 35 ? C.yellow : C.red,
            }}
          />
        </div>
        <div className="mt-1 overflow-hidden whitespace-nowrap text-center" style={{ fontSize: 15 }}>
          {Array.from({ length: Math.max(2, Math.round(e.hype / 9)) }, (_, i) => (
            <span key={i} className="inline-block" style={{ animation: e.hype > 55 ? `cb-bounce ${0.5 + (i % 3) * 0.12}s infinite` : "none" }}>
              {["🙌", "🕺", "💃", "🎉", "🙋"][i % 5]}
            </span>
          ))}
        </div>
        <div className="mt-1 text-center text-xs font-bold" style={{ color: e.request ? C.yellow : C.dim }}>
          {e.msg} {e.request ? `(${e.request.left} bars left)` : ""}
        </div>
      </div>

      <NoteHighway playInfo={{ events: windowEvents, startedAt: e.perfStart }} elapsed={elapsed} height={140} />
      </div>
      <div className={PHASE["gap-2"].edit}>

      {/* BPM + end */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-extrabold" style={{ color: C.dim }}>
          ⏱ BPM
        </span>
        <Chip small onClick={() => (e.bpm = Math.max(118, e.bpm - 2))}>
          −
        </Chip>
        <span className="font-mono text-sm font-extrabold" style={{ color: C.yellow }}>
          {e.bpm}
        </span>
        <Chip small onClick={() => (e.bpm = Math.min(148, e.bpm + 2))}>
          +
        </Chip>
        <div className="flex-1" />
        <Chip small onClick={endSet}>
          ⏹ End set
        </Chip>
      </div>

      {/* loop mixer */}
      <div className="flex flex-wrap gap-2">
        {track.loops.map((lp, i) => (
          <button
            key={lp.name}
            onClick={() => {
              setSel(i);
              setSelLine(null);
            }}
            className="rounded-xl px-2 py-1.5 text-xs font-extrabold"
            style={{
              background: sel === i ? C.yellow : C.panel2,
              color: sel === i ? "#1A1030" : e.muted[i] ? C.dim : C.ink,
              border: `2px solid ${e.glitch && e.glitch.loop === i ? C.red : sel === i ? C.yellow : C.line}`,
            }}
          >
            {lp.icon} {lp.name} {e.glitch && e.glitch.loop === i ? "⚠️" : e.muted[i] ? "🔇" : "🔊"}
          </button>
        ))}
      </div>
      <BigButton
        color={e.muted[sel] ? C.green : C.orange}
        onClick={() => {
          e.muted[sel] = !e.muted[sel];
          e.msg = e.muted[sel] ? `Cut the ${track.loops[sel].name}. 🔇` : `${track.loops[sel].name} drops next bar! 🔊`;
        }}
      >
        {e.muted[sel] ? `🔊 Bring in the ${track.loops[sel].name} (next bar)` : `🔇 Cut the ${track.loops[sel].name}`}
      </BigButton>

      {/* live code editor */}
      <div className="max-h-44 overflow-y-auto rounded-2xl p-2" style={{ background: "#151233", border: `1px solid ${glitchHere ? C.red : C.line}` }}>
        {lines.map((L, i) => (
          <CodeLine
            key={i}
            L={L}
            small
            indent={ind[i]}
            selected={selLine === i}
            warn={glitchHere && e.glitch.line === i && e.glitch.age >= 4}
            onTap={L.t === "synth" ? null : () => setSelLine(selLine === i ? null : i)}
          />
        ))}
      </div>
      {selLine !== null && (
        <div className="flex flex-wrap gap-1.5 rounded-2xl p-2" style={{ background: C.panel, border: `1px solid ${C.yellow}` }}>
          <span className="w-full text-xs font-extrabold" style={{ color: C.yellow }}>
            Remix live — change drops next loop 🔁
          </span>
          {optionsFor(lines[selLine], track.loops[sel].pool).map((o) => (
            <Chip
              key={o}
              small
              active={String(lines[selLine].v) === o}
              onClick={() => {
                const L = lines[selLine];
                L.v = L.t === "play" || L.t === "sleep" ? parseFloat(o) : o;
                setEditNote(true);
                setTimeout(() => setEditNote(false), 1500);
              }}
            >
              {lines[selLine].t === "sample" ? ":" + o : o}
            </Chip>
          ))}
        </div>
      )}
      {editNote && (
        <div className="text-center text-xs font-bold" style={{ color: C.aqua }}>
          🔁 Edit locked in — it drops on the next loop!
        </div>
      )}
      </div>
    </div>
  );
}

/* ---------- results ---------- */

function SetResults({ track, result, finalLines, onReplay, onBack }) {
  const [showCopy, setShowCopy] = useState(false);
  const medal = { gold: ["🥇 GOLD RECORD!", C.yellow], silver: ["🥈 Silver record!", "#C9CCE8"], bronze: ["🥉 Bronze record!", C.orange] };
  const m = result.record ? medal[result.record] : ["The crowd wants more practice…", C.dim];
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl p-5 text-center" style={{ background: C.panel, border: `2px solid ${m[1]}` }}>
      <div className="text-4xl">{result.record === "gold" ? "🏆" : result.record ? "🎉" : "🎧"}</div>
      <div className="text-2xl font-extrabold" style={{ color: m[1] }}>
        {m[0]}
      </div>
      <div className="text-sm font-semibold" style={{ color: C.dim }}>
        {track.title} · average crowd hype <span style={{ color: C.ink }}>{result.avg}%</span> over {result.bars} bars
      </div>
      <div className="text-xs font-semibold" style={{ color: C.dim }}>
        {result.record === "gold"
          ? "You built it up, answered the crowd, and fixed bugs without dropping the beat. That's DJing with code!"
          : "Tip: keep 3+ loops running, answer requests fast, and squash glitches the moment you hear them."}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <BigButton onClick={onReplay}>🔴 Play it again</BigButton>
        <BigButton color={C.aqua} onClick={() => setShowCopy(true)}>
          📋 Take this track to Sonic Pi
        </BigButton>
        <BigButton color={C.violet} onClick={onBack}>
          Back to the crate
        </BigButton>
      </div>
      {showCopy && <CopyCodeModal text={trackToSonicPi(track, finalLines)} onClose={() => setShowCopy(false)} />}
    </div>
  );
}

/* ---------- level celebration ---------- */

function CelebrateOverlay({ level, hasNext, onMap, onNext, onStay }) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 8) * 0.16,
        emoji: ["🎵", "⭐", "🎶", "✨", "🎧"][i % 5],
      })),
    []
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(10,8,25,0.88)" }}>
      {confetti.map((c, i) => (
        <span key={i} className="absolute text-xl" style={{ left: `${c.left}%`, top: 0, animation: `cb-fall 2.2s ${c.delay}s ease-in infinite` }}>
          {c.emoji}
        </span>
      ))}
      <div className="relative w-full max-w-sm rounded-3xl p-5 text-center" style={{ background: C.panel, border: `2px solid ${C.yellow}`, animation: "cb-pop 0.5s ease-out" }}>
        <div className="text-4xl">{level.emoji}</div>
        <div className="mt-1 text-2xl font-extrabold">Level complete!</div>
        <div className="my-2 text-3xl" style={{ color: C.yellow }}>
          ⭐⭐⭐
        </div>
        <div className="text-sm font-semibold" style={{ color: C.dim }}>
          {level.id === "jam"
            ? "You're officially a LoopLab DJ! 🎓 The Club is waiting — go bring the house down."
            : "DJ Loop is impressed. Your music-code powers are growing!"}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {hasNext && <BigButton onClick={onNext}>Next level →</BigButton>}
          <BigButton color={C.aqua} onClick={onStay}>
            Keep jamming here 🎶
          </BigButton>
          <BigButton color={C.violet} onClick={onMap}>
            Level map
          </BigButton>
        </div>
      </div>
    </div>
  );
}

import { indents, lineText } from "./sonicpi.js";
import { DRUMS } from "../theme.js";

export const SYNTH_NAMES = ["tb303", "saw", "square", "prophet", "pretty_bell", "beep"];

export const COMMANDS = ["play", "sleep", "sample", "use_synth", "use_bpm", "end"];

/* A child reaching for a drum types the word they know — "snare", "kick",
   "hat" — not a misspelling of Sonic Pi's name for it. Edit distance cannot
   bridge snare -> sn_dolf, so the words themselves are mapped. This is the
   difference between "I don't know that" and a hint that teaches the real
   name, which is the whole point of the typing bridge. */
export const DRUM_WORDS = {
  snare: "sn_dolf", sn: "sn_dolf", clap: "sn_dolf", rim: "sn_dolf",
  kick: "bd_haus", bd: "bd_haus", bass_drum: "bd_haus", bassdrum: "bd_haus", boom: "bd_haus",
  hat: "drum_cymbal_closed", hihat: "drum_cymbal_closed", hi_hat: "drum_cymbal_closed",
  cymbal: "drum_cymbal_closed", tick: "drum_cymbal_closed", closed_hat: "drum_cymbal_closed",
};

export const SYNTH_WORDS = {
  bass: "tb303", acid: "tb303", lead: "saw", buzz: "saw", game: "square",
  chip: "square", bell: "pretty_bell", bells: "pretty_bell", pad: "prophet", chord: "prophet",
};

/* A known word wins over a spelling guess, then edit distance covers typos. */
export const suggest = (word, words, list) => words[word.toLowerCase()] || nearest(word, list);

/* Levenshtein, so `plai` can be recognised as `play` and `:snare` as `:sn_dolf`. */
export function editDistance(a, b) {
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

export function nearest(word, list, max = 3) {
  let best = null, bestD = Infinity;
  for (const w of list) {
    const d = editDistance(word.toLowerCase(), w.toLowerCase());
    if (d < bestD) { bestD = d; best = w; }
  }
  return bestD <= max ? best : null;
}

export const num = (t) => {
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export const ok = (line) => ({ ok: true, line });

export const no = (msg) => ({ ok: false, msg });

/* A decimal typed with a comma is the single most common slip. */
export function commaDecimal(t) {
  return /^\d+,\d+$/.test(t) ? t.replace(",", ".") : null;
}

export function parseLine(raw) {
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
export function parseCode(text) {
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
export const codeToText = (lines) => {
  const ind = indents(lines);
  return lines.map((L, i) => "  ".repeat(ind[i]) + lineText(L)).join("\n");
};

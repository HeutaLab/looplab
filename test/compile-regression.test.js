/* Every correct answer still compiles exactly as it did before the safeNum
   change, and loop repetition counts behave like Ruby rather than like JS. */
import { compile, compileLoops, capPreview, MAX_PREVIEW } from "../src/engine/interpreter.js";
import { LEVELS } from "../src/data/levels.js";

// The pre-fix path for a CORRECT answer: raw strings through parseFloat.
const PICK = (a) => a[0];
function compileOld(lines, bpm = 60) {
  let spb = 60 / parseFloat(bpm);
  const events = []; let time = 0; let synth = "beep";
  const findEnd = (ls, i) => { let d = 0; for (let j = i; j < ls.length; j++) { if (ls[j].t === "loop") d++; else if (ls[j].t === "end") { d--; if (!d) return j; } } return ls.length - 1; };
  (function run(i, stop) {
    while (i < stop && events.length < 500) {
      const L = lines[i];
      if (L.t === "play") events.push({ time, kind: "note", note: parseFloat(L.v), synth, line: i });
      else if (L.t === "playChoose") events.push({ time, kind: "note", note: PICK(L.v), synth, line: i });
      else if (L.t === "sampleChoose") events.push({ time, kind: PICK(L.v), line: i });
      else if (L.t === "sleepRand") time += (L.v[0] + 0.5 * (L.v[1] - L.v[0])) * spb;
      else if (L.t === "sleep") time += parseFloat(L.v) * spb;
      else if (L.t === "sample") events.push({ time, kind: L.v, line: i });
      else if (L.t === "synth") synth = L.v;
      else if (L.t === "bpm") spb = 60 / parseFloat(L.v);
      else if (L.t === "loop") { const e = findEnd(lines, i); for (let k = 0; k < parseFloat(L.v); k++) run(i + 1, e); i = e; }
      i++;
    }
  })(0, lines.length);
  return { events, total: Math.max(time, events.length ? events[events.length - 1].time + 0.4 : 0) };
}
const sn = (x, f) => { const n = typeof x === "number" ? x : parseFloat(x); return Number.isFinite(n) ? n : f; };
function substituted(tg, useNew) {
  return tg.lines.map((L) => {
    if (L.blank === undefined) return L;
    const raw = L.blank;
    if (!useNew) return { t: L.t, v: L.t === "playChoose" ? String(raw).split(",").map(Number) : L.t === "sampleChoose" ? String(raw).split(",") : raw };
    let v = raw;
    if (L.t === "play") v = sn(raw, 60);
    else if (L.t === "sleep") v = sn(raw, 0.5);
    else if (L.t === "bpm") v = sn(raw, 120);
    else if (L.t === "loop") v = sn(raw, 1);
    else if (L.t === "playChoose") v = String(raw).split(",").map((x) => sn(x, 60));
    else if (L.t === "sampleChoose") v = String(raw).split(",");
    return { t: L.t, v };
  });
}
let diffs = 0, checked = 0;
for (const lv of LEVELS) {
  const tg = lv.together; if (!tg) continue;
  const bpm = tg.bpm || 60;
  // deterministic levels only for event-by-event compare (choose/rrand are random)
  const hasRandom = tg.lines.some((L) => ["playChoose", "sampleChoose", "sleepRand"].includes(L.t));
  const oldC = compileOld(substituted(tg, false), bpm);
  const newC = compile(substituted(tg, true), bpm);
  checked++;
  if (hasRandom) {
    const same = Math.abs(oldC.total - newC.total) < 1e-9 && oldC.events.length === newC.events.length;
    if (!same) { diffs++; console.log(`  DIFF (shape) ${lv.id}: total ${oldC.total} -> ${newC.total}, events ${oldC.events.length} -> ${newC.events.length}`); }
    else console.log(`  same shape  ${lv.id.padEnd(12)} total=${newC.total.toFixed(3)} events=${newC.events.length} (random content, compared by shape)`);
    continue;
  }
  const a = JSON.stringify(oldC), b = JSON.stringify(newC);
  if (a !== b) { diffs++; console.log(`  DIFF ${lv.id}\n   old ${a.slice(0,180)}\n   new ${b.slice(0,180)}`); }
  else console.log(`  identical   ${lv.id.padEnd(12)} total=${newC.total.toFixed(3)} events=${newC.events.length}`);
  // and the cap must be a no-op on a correct answer
  const cp = capPreview(newC, MAX_PREVIEW);
  if (cp.truncated) { diffs++; console.log(`  CAP TRUNCATED correct answer for ${lv.id}`); }
}
console.log(`\n${checked} correct answers compared, ${diffs} regressions`);

/* Ruby has no Float#times, so `0.25.times do` is not valid code in the first
   place. It used to slip through the interpreter and run the body exactly
   once, which meant the exported snippet behaved differently in real Sonic Pi
   than it did in the game. */
console.log("\nloop repetition counts:");
const noteCount = (reps) =>
  compile([{ t: "loop", v: reps }, { t: "play", v: 60 }, { t: "end" }], 60).events.length;
const repCases = [
  [3, 3, "3.times plays three notes"],
  [1, 1, "1.times plays one"],
  [0, 0, "0.times plays none"],
  [0.25, 0, "0.25.times plays none — it is not valid Ruby, so it must not sound like 1.times"],
  [2.9, 2, "2.9.times floors to two rather than rounding up"],
];
let repFail = 0;
for (const [v, want, label] of repCases) {
  const got = noteCount(v);
  const ok = got === want;
  if (!ok) repFail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}  — got ${got}, want ${want}`);
}

process.exit(diffs + repFail ? 1 : 0);

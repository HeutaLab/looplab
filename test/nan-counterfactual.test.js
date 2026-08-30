/* Pre-fix vs current: proves the NaN guard is doing work rather than the test being toothless. */
import { engine, levels, grab } from "./helpers/source.js";

const mod = new Function(`${engine}\n${levels}\nreturn { compile, compileLoops, LEVELS, safeNum };`)();
const { compile, compileLoops, LEVELS } = mod;

/* The current path has to be the shipping one. When this was a hand-copy, the
   comparison proved nothing: reverting safeNum in the component left this test
   green because the copy still coerced. */
const substitutedSrc = grab("function substituted(useAnswers)");
const substitutedNow = (tg, fills) =>
  new Function("tg", "fills", "safeNum", `${substitutedSrc}\nreturn substituted;`)(tg, fills, mod.safeNum)(false);

// PRE-FIX substituted(): raw chip strings passed straight through, no coercion.
function substitutedOld(tg, fills) {
  let b = 0;
  return tg.lines.map((L) => {
    if (L.blank === undefined) return L;
    const raw = fills[b++];
    let v = raw;
    if (L.t === "playChoose") v = String(raw).split(",").map(Number);
    else if (L.t === "sampleChoose") v = String(raw).split(",");
    return { t: L.t, v };
  });
}
// PRE-FIX compile(): parseFloat with no finite guard.
function compileOld(lines, bpm = 60) {
  let spb = 60 / parseFloat(bpm);
  const events = []; let time = 0; let synth = "beep";
  const findEnd = (ls, i) => { let d = 0; for (let j = i; j < ls.length; j++) { if (ls[j].t === "loop") d++; else if (ls[j].t === "end") { d--; if (!d) return j; } } return ls.length - 1; };
  (function run(i, stop) {
    while (i < stop && events.length < 500) {
      const L = lines[i];
      if (L.t === "play") events.push({ time, kind: "note", note: parseFloat(L.v), synth, line: i });
      else if (L.t === "sleep") time += parseFloat(L.v) * spb;
      else if (L.t === "sample") events.push({ time, kind: L.v, line: i });
      else if (L.t === "synth") synth = L.v;
      else if (L.t === "bpm") spb = 60 / parseFloat(L.v);
      else if (L.t === "loop") { const e = findEnd(lines, i); for (let k = 0; k < parseFloat(L.v); k++) run(i + 1, e); i = e; }
      i++;
    }
  })(0, lines.length);
  const total = Math.max(time, events.length ? events[events.length - 1].time + 0.4 : 0);
  return { events, total };
}
function combos(chips, k) { if (!k) return [[]]; const r = combos(chips, k - 1); const o = []; for (const c of chips) for (const x of r) o.push([c, ...x]); return o; }

const result = {};
for (const label of ["PRE-FIX", "CURRENT"]) {
  let nan = 0, tested = 0;
  for (const lv of LEVELS) {
    const tg = lv.together; if (!tg) continue;
    const blanks = tg.lines.filter((L) => L.blank !== undefined);
    for (const fills of combos(tg.chips, blanks.length)) {
      tested++;
      let c;
      if (label === "PRE-FIX") c = compileOld(substitutedOld(tg, fills), tg.bpm || 60);
      else {
        const sub = substitutedNow(tg, fills);
        c = tg.overLoop ? compileLoops([tg.overLoop, sub], tg.bpm || 60, 2) : compile(sub, tg.bpm || 60);
      }
      if (!Number.isFinite(c.total) || c.events.some((e) => !Number.isFinite(e.time)) || c.events.some((e) => e.kind === "note" && !Number.isFinite(e.note))) nan++;
    }
  }
  console.log(`${label}: ${nan} of ${tested} combinations produce NaN`);
  result[label] = nan;
}

/* Both halves matter. CURRENT at zero is the fix; PRE-FIX above zero is the
   proof that this comparison can still detect the bug at all — if the pre-fix
   model ever stops reproducing it, the test is measuring nothing. */
let fail = 0;
if (result.CURRENT !== 0) {
  console.log(`FAIL  the shipping path produces NaN in ${result.CURRENT} combinations`);
  fail++;
}
if (!(result["PRE-FIX"] > 0)) {
  console.log("FAIL  the pre-fix model no longer reproduces the bug, so this test proves nothing");
  fail++;
}
console.log(fail ? "\nFAIL" : "\nPASS");
process.exit(fail ? 1 : 0);

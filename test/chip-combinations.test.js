/* Every chip combination in every We-do phase: no NaN reaches the scheduler, no preview outruns the cap, no correct answer is truncated. */
import { engine, levels, grab } from "./helpers/source.js";

// Build a sandbox module out of the real source text.
const mod = new Function(`
  ${engine}
  ${levels}
  return { compile, compileLoops, capPreview, safeNum, MAX_PREVIEW, LEVELS, findEndIdx };
`)();
const { compile, compileLoops, capPreview, MAX_PREVIEW, LEVELS } = mod;

/* TogetherPhase.substituted() executed from source. A hand-copy here would let
   the component's coercion change without any test noticing. */
const substitutedSrc = grab("function substituted(useAnswers)");
const makeSubstituted = (tg, fills) =>
  new Function("tg", "fills", "safeNum", `${substitutedSrc}\nreturn substituted;`)(tg, fills, mod.safeNum);
const substituted = (tg, fills, useAnswers) => makeSubstituted(tg, fills)(useAnswers);

/* The cap is a product decision, so the expected value is written down here.
   Reading it from the source would make this assertion self-fulfilling — the
   test would follow the constant anywhere it moved. */
const EXPECTED_MAX_PREVIEW = 10;

function playCompile(tg, lines) {
  const bpm = tg.bpm || 60;
  return tg.overLoop ? compileLoops([tg.overLoop, lines], bpm, 2) : compile(lines, bpm);
}

// every combination WITH replacement — chips are not consumed in the UI
function combos(chips, k) {
  if (k === 0) return [[]];
  const rest = combos(chips, k - 1);
  const out = [];
  for (const c of chips) for (const r of rest) out.push([c, ...r]);
  return out;
}

let total = 0, nanFail = 0, capFail = 0, truncFail = 0;
let constFail = 0;
if (MAX_PREVIEW !== EXPECTED_MAX_PREVIEW) {
  constFail = 1;
  console.log(`  MAX_PREVIEW is ${MAX_PREVIEW}s, expected ${EXPECTED_MAX_PREVIEW}s — a wrong answer now plays for ${MAX_PREVIEW}s before the child gets feedback`);
}
const rows = [];

for (const lv of LEVELS) {
  const tg = lv.together;
  if (!tg) continue;
  const blanks = tg.lines.filter((L) => L.blank !== undefined);
  const all = combos(tg.chips, blanks.length);

  // 1. the correct answer must never be truncated by the preview cap
  const good = playCompile(tg, substituted(tg, [], true));
  const capped = capPreview(good, EXPECTED_MAX_PREVIEW);
  if (capped.truncated) { truncFail++; console.log(`  TRUNCATED CORRECT ANSWER: ${lv.id} total=${good.total}`); }

  let worst = 0, bad = 0;
  for (const fills of all) {
    total++;
    const c = playCompile(tg, substituted(tg, fills, false));
    const cp = capPreview(c, EXPECTED_MAX_PREVIEW);

    // 2. nothing NaN may reach the scheduler
    const nan = !Number.isFinite(c.total) || c.events.some((e) => !Number.isFinite(e.time)) ||
                c.events.some((e) => e.kind === "note" && !Number.isFinite(e.note));
    if (nan) { nanFail++; console.log(`  NaN: ${lv.id} fills=${JSON.stringify(fills)} total=${c.total}`); }

    // 3. no attempt may run longer than the cap
    if (!Number.isFinite(cp.total) || cp.total > EXPECTED_MAX_PREVIEW + 1e-9) {
      capFail++; console.log(`  OVER CAP: ${lv.id} fills=${JSON.stringify(fills)} total=${cp.total}`);
    }
    worst = Math.max(worst, Number.isFinite(c.total) ? c.total : Infinity);
    const correct = blanks.every((L, i) => String(fills[i]) === String(L.blank));
    if (!correct) bad++;
  }
  rows.push({ level: lv.id, blanks: blanks.length, chips: tg.chips.length, combos: all.length,
              wrong: bad, correctDur: +good.total.toFixed(2), worstUncapped: +worst.toFixed(1) });
}

console.table(rows);
console.log(`\ncombinations tested: ${total}`);
console.log(`NaN reaching scheduler : ${nanFail}`);
console.log(`previews over ${EXPECTED_MAX_PREVIEW}s cap : ${capFail}`);
console.log(`correct answers truncated: ${truncFail}`);
console.log(`MAX_PREVIEW constant       : ${constFail ? "CHANGED" : "as expected (" + EXPECTED_MAX_PREVIEW + "s)"}`);
console.log(nanFail + capFail + truncFail + constFail === 0 ? "\nPASS" : "\nFAIL");
process.exit(nanFail + capFail + truncFail + constFail === 0 ? 0 : 1);

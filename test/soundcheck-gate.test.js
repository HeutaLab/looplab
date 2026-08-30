/* The booth unlocks only when every loop matches the studio version, across all six tracks. */
import { engine, src, grabBlock } from "./helpers/source.js";

// pull TRACKS + applyBugs + optionsFor out of the source
const tracksSrc = src.slice(src.indexOf("const HOUSE_DRUMS = seq("), src.indexOf("function applyBugs"));
const applySrc = src.slice(src.indexOf("function applyBugs"), src.indexOf("function applyBugs") + 700);
const applyEnd = applySrc.indexOf("\n}\n") + 2;
const mod = new Function(`${engine}\n${tracksSrc}\n${applySrc.slice(0, applyEnd)}\nreturn { TRACKS, applyBugs };`)();
const { TRACKS, applyBugs } = mod;

/* The gate itself, executed straight from Soundcheck's body. Copying these
   lines into the test would mean a change to the component could never fail
   here — which is exactly what happened before this was rewired. */
const gateSrc = grabBlock("const diffs = track.loops.map(", "const allFixed =");
const gate = new Function("track", "loopLines", `${gateSrc}\nreturn { allFixed, bugsLeft, strayLines, fixedPerLoop };`);

const clone = (ll) => ll.map((ls) => ls.map((x) => ({ ...x })));
const repairAll = (track, ll) => {
  track.loops.forEach((lp, li) => lp.lines.forEach((L, i) => { ll[li][i].v = L.v; }));
  return ll;
};

let fail = 0;
const check = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); if (!c) fail++; };

for (const track of TRACKS) {
  const fresh = applyBugs(track);
  const g0 = gate(track, fresh);
  check(`${track.id}: starts locked with ${track.bugs.length} bugs`,
        !g0.allFixed && g0.bugsLeft === track.bugs.length && g0.strayLines === 0,
        `bugsLeft=${g0.bugsLeft} stray=${g0.strayLines}`);

  const repaired = repairAll(track, clone(fresh));
  const g1 = gate(track, repaired);
  check(`${track.id}: unlocks when every bug is repaired`, g1.allFixed,
        `bugsLeft=${g1.bugsLeft} stray=${g1.strayLines}`);

  // the actual regression: fix everything, then break a DIFFERENT line
  let tested = 0, leaked = 0;
  for (let li = 0; li < track.loops.length; li++) {
    for (let i = 0; i < track.loops[li].lines.length; i++) {
      const ll = repairAll(track, clone(fresh));
      if (ll[li][i].bug) continue;                       // that's a planted bug line
      const L = ll[li][i];
      if (L.t === "play") L.v = L.v + 7;
      else if (L.t === "sleep") L.v = L.v === 0.25 ? 0.5 : 0.25;
      else if (L.t === "sample") L.v = L.v === "bd_haus" ? "sn_dolf" : "bd_haus";
      else continue;                                      // synth/end lines aren't editable
      tested++;
      const g = gate(track, ll);
      if (g.allFixed) { leaked++; console.log(`    LEAK ${track.id} loop${li} line${i} (${L.t})`); }
    }
  }
  check(`${track.id}: a self-inflicted wrong note blocks the booth`, leaked === 0,
        `${tested} single-line changes tested, ${leaked} passed the gate`);
}
console.log(`\n${fail === 0 ? "ALL PASS" : fail + " FAILURES"}`);
process.exit(fail ? 1 : 0);

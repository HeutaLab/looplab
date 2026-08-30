/* No Build Lab stage can be cleared with chips unlocked by an earlier stage,
   and each stage stays completable with what it does unlock. */
import { LEVELS } from "../src/data/levels.js";
import { CHIP_GROUPS } from "../src/data/chipGroups.js";

// the ctx the stage checks are handed, lifted from BuildPhase
const makeCtx = (code) => ({
  count: (li, t) => code[li].filter((l) => l.t === t).length,
  beats: (li) => code[li].reduce((s, l) => s + (l.t === "sleep" ? l.v : l.t === "sleepRand" ? (l.v[0] + l.v[1]) / 2 : 0), 0),
  lines: (li) => code[li].length,
});
const unlockedAt = (b, stageIdx) => {
  const groups = new Set(), loops = new Set();
  for (let i = 0; i <= stageIdx && i < b.stages.length; i++) {
    (b.stages[i].allow || []).forEach((g) => groups.add(g));
    loops.add(b.stages[i].loop);
  }
  return { groups, loops };
};

let fail = 0;
const check = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); if (!c) fail++; };

for (const lv of LEVELS.filter((l) => l.build)) {
  const b = lv.build;
  console.log(`\n${lv.id} — ${b.stages.length} stages, ${b.loops.length} loop(s)`);

  // every stage must declare an allow list
  check(`  every stage declares allow`, b.stages.every((st) => Array.isArray(st.allow)));

  // ---- the regression: at stage N, spam every unlocked chip into every
  //      unlocked loop up to the 20-line cap. Can a LATER stage's check pass?
  for (let n = 0; n < b.stages.length; n++) {
    const u = unlockedAt(b, n);
    const code = b.loops.map(() => []);
    b.loops.forEach((lp, li) => {
      if (!u.loops.has(li)) return;
      const groups = Object.keys(CHIP_GROUPS).filter((k) => lp.allow.includes(k) && u.groups.has(k));
      // 20-line cap per loop, cycling every available chip
      const items = groups.flatMap((k) => CHIP_GROUPS[k].items);
      for (let i = 0; i < 20 && items.length; i++) code[li].push(items[i % items.length].make());
    });
    const ctx = makeCtx(code);
    // plays reset per stage, so any requirePlay stage cannot pass on entry
    const laterPassable = [];
    for (let m = n + 1; m < b.stages.length; m++) {
      const st = b.stages[m];
      const structural = st.check(ctx);
      const needsPlay = !!st.requirePlay;
      if (structural && !needsPlay) laterPassable.push(m + 1);
    }
    check(`  stage ${n + 1}: chips available cannot clear a later stage`, laterPassable.length === 0,
          laterPassable.length ? `stages ${laterPassable.join(", ")} already satisfied` : `${[...u.groups].join(",") || "none"}`);
  }

  // ---- and the stage's own check must still be reachable with what it unlocks
  for (let n = 0; n < b.stages.length; n++) {
    const st = b.stages[n];
    const u = unlockedAt(b, n);
    const code = b.loops.map(() => []);
    b.loops.forEach((lp, li) => {
      if (!u.loops.has(li)) return;
      const groups = Object.keys(CHIP_GROUPS).filter((k) => lp.allow.includes(k) && u.groups.has(k));
      const items = groups.flatMap((k) => CHIP_GROUPS[k].items);
      for (let i = 0; i < 20 && items.length; i++) code[li].push(items[i % items.length].make());
    });
    // beats checks need an exact total, so solve those separately below
    const reachable = st.check(makeCtx(code)) || st.check(makeCtx(solveBeats(b, st, u)));
    check(`  stage ${n + 1} "${st.title}" is completable with its own chips`, reachable);
  }
}

// build a code state that hits exactly 4 beats where a stage demands it
function solveBeats(b, st, u) {
  const code = b.loops.map(() => []);
  b.loops.forEach((lp, li) => {
    if (!u.loops.has(li)) return;
    const has = (k) => lp.allow.includes(k) && u.groups.has(k);
    for (let i = 0; i < 8; i++) {
      if (has("drums")) code[li].push({ t: "sample", v: "bd_haus" });
      else if (has("notes")) code[li].push({ t: "play", v: 33 });
      if (has("sleeps")) code[li].push({ t: "sleep", v: 0.5 });
    }
  });
  return code;
}

console.log(`\n${fail === 0 ? "ALL PASS" : fail + " FAILURES"}`);
process.exit(fail ? 1 : 0);

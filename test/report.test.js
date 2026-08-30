/* The teacher's copy. A report that quietly overstates what a child did is
   worse than no report, so this checks the ticks and the tables against the
   progress they were built from — including the empty case a teacher will see
   from a student who barely started. */
import { buildReport } from "../src/state/report.js";
import { LEVELS } from "../src/data/levels.js";
import { TRACKS } from "../src/data/tracks.js";

let fail = 0;
const check = (n, c, d = "") => { if (!c) { fail++; console.log(`FAIL  ${n}${d ? "  — " + d : ""}`); } };
const when = new Date("2026-03-12T10:00:00Z");

// ---------- a student who has barely started ----------
const empty = buildReport({ name: "", stars: [0, 0, 0, 0, 0, 0], records: {}, when });
check("empty report still names the student slot", /no name given/.test(empty));
check("empty report claims nothing finished", /Finished:\*\* 0 of 6 studio levels · 0 of 6 club tracks/.test(empty), empty.match(/Finished.*/)?.[0]);
check("empty report ticks nothing", !/- \[x\]/.test(empty), (empty.match(/- \[x\].*/g) || []).join(" | "));
check("empty report shows every level as not started", (empty.match(/not started/g) || []).length === LEVELS.length);
check("empty report does not claim typing", !/Typed real Sonic Pi/.test(empty));

// ---------- a student partway through ----------
const mid = buildReport({ name: "Sam", stars: [3, 3, 2, 0, 0, 0], records: { warehouse: "gold" }, when });
check("name appears", /# LoopLab — Sam/.test(mid));
check("date is human, not an ISO stamp", /12 March 2026/.test(mid), mid.match(/\*\*Date:.*/)?.[0]);
check("counts only started levels", /Finished:\*\* 3 of 6 studio levels · 1 of 6 club tracks/.test(mid), mid.match(/Finished.*/)?.[0]);
check("ticks exactly the levels reached", (mid.match(/- \[x\]/g) || []).length === 5, `${(mid.match(/- \[x\]/g) || []).length} ticks`);
check("debugging tick follows a club record", /- \[x\] I can find a bug in code by listening/.test(mid));
check("performing tick follows a silver or gold", /- \[x\] I can keep a live set going/.test(mid));
check("stars render as stars", /★★☆/.test(mid), mid.match(/\| 3\. .*/)?.[0]);

// a bronze record is not a performance claim
const bronze = buildReport({ name: "Jo", stars: [3, 0, 0, 0, 0, 0], records: { warehouse: "bronze" }, when });
check("bronze does not claim they kept a set going", /- \[ \] I can keep a live set going/.test(bronze));
check("bronze still counts as debugging", /- \[x\] I can find a bug in code by listening/.test(bronze));

// ---------- typing is reported honestly ----------
const typedNo = buildReport({ name: "A", stars: [3, 3, 3, 3, 3, 0], records: {}, when });
check("no typing claim before the typed level is done", !/Typed real Sonic Pi/.test(typedNo));
const typedYes = buildReport({ name: "A", stars: [3, 3, 3, 3, 3, 3], records: {}, when });
check("typing is claimed once the typed level is done", /Typed real Sonic Pi:\*\* yes/.test(typedYes));

// ---------- how each item was written must match the configured ramp ----------
const full = buildReport({ name: "B", stars: [3, 3, 3, 3, 3, 3], records: {}, when });
for (const t of TRACKS) {
  const row = full.split("\n").find((l) => l.startsWith(`| ${t.title} `));
  const expect = { chips: "blocks", hybrid: "blocks + typing", typed: "typed it myself" }[t.codeMode || "chips"];
  check(`club row for ${t.id} reports the real mode`, row && row.includes(expect), row || "row missing");
}
for (let i = 0; i < LEVELS.length; i++) {
  const row = full.split("\n").find((l) => l.startsWith(`| ${i + 1}. ${LEVELS[i].title} `));
  check(`studio row for ${LEVELS[i].id} exists`, !!row);
}

// ---------- it must say what it is ----------
check("report states nothing was sent anywhere", /no\s*\naccounts and sends nothing anywhere|sends nothing anywhere/.test(full));
check("report is markdown a teacher can paste", /^# LoopLab/.test(full) && /\| Level \| Stars \|/.test(full));

console.log(`${fail === 0 ? "ALL PASS" : fail + " FAILURES"}  (${LEVELS.length} levels, ${TRACKS.length} tracks)`);
process.exit(fail ? 1 : 0);

/* Progress codes carry a child's stars from school to home by hand, so the
   two things that matter are that a correct code round-trips exactly, and that
   a mistyped one is rejected rather than silently restoring the wrong thing. */
import { encodeProgress, decodeProgress, mergeProgress, B32 } from "../src/state/progressCode.js";
import { LEVELS } from "../src/data/levels.js";
import { TRACKS } from "../src/data/tracks.js";

let fail = 0;
const check = (n, c, d = "") => { if (!c) { fail++; console.log(`FAIL  ${n}${d ? "  — " + d : ""}`); } };
const g = (n) => console.log(`\n${n}`);
const RANKS = ["bronze", "silver", "gold"];

// ---------- 1. exhaustive round-trip over every star combination ----------
g("round-trip");
let tested = 0, bad = 0;
// every star value on every level (4^6 = 4096), records held constant
for (let n = 0; n < 4096; n++) {
  const stars = [0, 1, 2, 3, 4, 5].map((i) => (n >> (i * 2)) & 3);
  const code = encodeProgress(stars, {});
  const back = decodeProgress(code);
  tested++;
  if (!back || JSON.stringify(back.stars) !== JSON.stringify(stars)) { bad++; if (bad < 3) console.log(`  ${code} -> ${JSON.stringify(back && back.stars)} want ${JSON.stringify(stars)}`); }
}
check(`all ${tested} star combinations round-trip`, bad === 0, `${bad} failed`);

// every record value on every track (4^6 = 4096)
let rbad = 0;
for (let n = 0; n < 4096; n++) {
  const records = {};
  TRACKS.forEach((t, i) => { const r = (n >> (i * 2)) & 3; if (r) records[t.id] = RANKS[r - 1]; });
  const back = decodeProgress(encodeProgress([0, 0, 0, 0, 0, 0], records));
  const canon = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
  if (!back || canon(back.records) !== canon(records)) { rbad++; if (rbad < 3) console.log(`  records ${JSON.stringify(records)} -> ${JSON.stringify(back && back.records)}`); }
}
check("all 4096 record combinations round-trip", rbad === 0, `${rbad} failed`);

// a full house
const full = encodeProgress([3, 3, 3, 3, 3, 3], Object.fromEntries(TRACKS.map((t) => [t.id, "gold"])));
const fullBack = decodeProgress(full);
check("a finished game round-trips", fullBack && fullBack.stars.every((s) => s === 3) && Object.keys(fullBack.records).length === TRACKS.length, full);
check("records round-trip regardless of key order", JSON.stringify(Object.keys(fullBack.records).sort()) === JSON.stringify(TRACKS.map((t) => t.id).sort()));

// ---------- 2. what the code looks like to a child ----------
g("shape");
check("formatted LL-XXXX-XXXX", /^LL-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(full), full);
check("no confusable letters anywhere in the alphabet", !/[ILOU]/.test(B32));
const sample = encodeProgress([3, 2, 1, 0, 0, 0], { warehouse: "gold" });
check("short enough to write in a book", sample.replace(/-/g, "").length <= 11, `${sample} (${sample.length} chars)`);

// ---------- 3. typed by a ten-year-old off a whiteboard ----------
g("tolerance");
const canonical = encodeProgress([3, 3, 2, 0, 0, 0], { warehouse: "silver" });
const expect = decodeProgress(canonical);
const variants = {
  "lower case": canonical.toLowerCase(),
  "no dashes": canonical.replace(/-/g, ""),
  "no LL prefix": canonical.replace(/^LL-/, ""),
  "spaces instead of dashes": canonical.replace(/-/g, " "),
  "extra spaces": "  " + canonical + "  ",
  "I typed for 1": canonical.replace(/1/g, "I"),
  "O typed for 0": canonical.replace(/0/g, "O"),
};
for (const [label, v] of Object.entries(variants)) {
  const got = decodeProgress(v);
  check(`accepts ${label}`, got && JSON.stringify(got) === JSON.stringify(expect), `${v} -> ${JSON.stringify(got)}`);
}

// ---------- 4. a wrong code must change nothing ----------
g("rejection");
const rejects = {
  empty: "",
  gibberish: "LL-ZZZZ-ZZZZZ",
  "too short": canonical.slice(0, -1),
  "too long": canonical + "A",
  "one character wrong": (() => {
    const t = canonical.split("");
    const i = 4;
    t[i] = t[i] === "A" ? "B" : "A";
    return t.join("");
  })(),
};
for (const [label, v] of Object.entries(rejects)) {
  check(`rejects ${label}`, decodeProgress(v) === null, `${v} -> ${JSON.stringify(decodeProgress(v))}`);
}
// a single wrong character anywhere should nearly always fail the check digit
let slipped = 0, mutations = 0;
for (let i = 0; i < 7; i++) {
  for (const c of B32) {
    const body = canonical.replace(/[^0-9A-Z]/g, "").replace(/^LL/, "");
    if (body[i] === c) continue;
    const t = body.split(""); t[i] = c;
    mutations++;
    if (decodeProgress(t.join("")) !== null) slipped++;
  }
}
check("single-character typos are caught", slipped === 0, `${slipped} of ${mutations} slipped through`);
console.log(`  ${mutations} single-character typos, ${mutations - slipped} caught`);

// a code from a future version must be refused, not misread
{
  const forge = (version) => {
    let bits = 0n;
    bits = (bits << 4n) | BigInt(version & 0xf);
    for (let i = 0; i < 6; i++) bits = (bits << 2n) | 3n;          // full stars
    for (let i = 0; i < TRACKS.length; i++) bits = (bits << 2n) | 3n; // all gold
    bits = (bits << 4n) | 0n;
    let body = "";
    for (let i = 6; i >= 0; i--) body += B32[Number((bits >> BigInt(i * 5)) & 31n)];
    let sum = 0;
    for (const c of body) sum += B32.indexOf(c);
    return `LL-${body.slice(0, 4)}-${body.slice(4)}${B32[sum % 32]}`; // valid check digit
  };
  check("a version-1 forgery still decodes", decodeProgress(forge(1)) !== null, forge(1));
  check("a version-2 code is refused, not misread", decodeProgress(forge(2)) === null, `${forge(2)} -> ${JSON.stringify(decodeProgress(forge(2)))}`);
  check("a version-0 code is refused", decodeProgress(forge(0)) === null);
}

// ---------- 5. restoring can only ever give more ----------
g("merge upward");
const cur = { stars: [3, 1, 0, 0, 0, 0], records: { warehouse: "gold" } };
const home = { stars: [1, 3, 2, 0, 0, 0], records: { warehouse: "bronze", acid: "silver" } };
const m = mergeProgress(cur, home);
check("takes the higher star per level", JSON.stringify(m.stars) === JSON.stringify([3, 3, 2, 0, 0, 0]), JSON.stringify(m.stars));
check("never downgrades a record", m.records.warehouse === "gold", m.records.warehouse);
check("adds records it did not have", m.records.acid === "silver");
const empty = mergeProgress(cur, { stars: [0, 0, 0, 0, 0, 0], records: {} });
check("an empty code takes nothing away", JSON.stringify(empty) === JSON.stringify(cur), JSON.stringify(empty));

console.log(`\n${fail === 0 ? "ALL PASS" : fail + " FAILURES"}`);
process.exit(fail ? 1 : 0);

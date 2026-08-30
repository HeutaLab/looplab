/* The typing bridge. Two things have to hold: every message a child can trigger
   is written in their language (no developer jargon, always a worked example),
   and anything the chips can build round-trips through text unchanged — so
   moving from tapping to typing never loses or alters their music. */
import { parseLine, parseCode, codeToText } from "../src/engine/parser.js";
import { lineText } from "../src/engine/sonicpi.js";
import { LEVELS } from "../src/data/levels.js";
import { TRACKS } from "../src/data/tracks.js";
import { CHIP_GROUPS } from "../src/data/chipGroups.js";

let fail = 0;
const check = (name, cond, detail = "") => {
  if (!cond) { fail++; console.log(`FAIL  ${name}${detail ? "  — " + detail : ""}`); }
  return cond;
};
const group = (n) => console.log(`\n${n}`);

// ---------- 1. everything the game can render, a student can type ----------
group("round-trip: chips -> text -> chips");
const allChipLines = Object.values(CHIP_GROUPS).flatMap((g) => g.items.map((it) => it.make()));
let rtFail = 0;
for (const L of allChipLines) {
  const text = lineText(L);
  const back = parseLine(text);
  const same = back.ok && back.line && JSON.stringify(back.line) === JSON.stringify(L);
  if (!same) { rtFail++; console.log(`  FAIL  ${text}  ->  ${back.ok ? JSON.stringify(back.line) : back.msg}`); }
}
check(`every chip round-trips (${allChipLines.length} chips)`, rtFail === 0);
console.log(`  ${allChipLines.length - rtFail}/${allChipLines.length} chip lines round-trip exactly`);

// every line of every level and every club track
let contentLines = 0, contentFail = 0;
const walk = (lines) => {
  const text = codeToText(lines);
  const back = parseCode(text);
  contentLines += lines.length;
  const same = JSON.stringify(back.lines) === JSON.stringify(lines) && back.errors.length === 0;
  if (!same) {
    contentFail++;
    console.log(`  FAIL round-trip:\n${text}\n  errors: ${JSON.stringify(back.errors)}`);
  }
};
for (const lv of LEVELS) {
  // levels 5-6 demo several loops at once, so watch holds `loops` not `lines`
  if (lv.watch && lv.watch.lines) walk(lv.watch.lines);
  if (lv.watch && lv.watch.loops) lv.watch.loops.forEach((lp) => walk(lp.lines));
  if (lv.together && lv.together.overLoop) walk(lv.together.overLoop);
  if (lv.together) walk(lv.together.lines.map((L) => (L.blank !== undefined ? { t: L.t, v: L.t === "playChoose" ? String(L.blank).split(",").map(Number) : L.t === "sampleChoose" ? String(L.blank).split(",") : (isNaN(parseFloat(L.blank)) ? L.blank : parseFloat(L.blank)) } : L)));
}
for (const t of TRACKS) for (const lp of t.loops) walk(lp.lines);
check(`every level and track round-trips (${contentLines} lines)`, contentFail === 0);
console.log(`  ${contentLines} content lines across ${LEVELS.length} levels and ${TRACKS.length} tracks`);

// ---------- 2. the mistakes a ten-year-old actually makes ----------
group("real slips get a real answer");
const slips = [
  ["plai 60",                 /should be .?play/i,        "misspelled command"],
  ["Play 60",                 /should be .?play/i,        "capitalised"],
  ["play",                    /needs a note number/i,     "missing argument"],
  ["play sixty",              /needs a number/i,          "word instead of number"],
  ["sleep 0,5",               /dot for decimals.*0\.5/i,  "comma decimal"],
  ["use_bpm 12,5",            /dot for decimals/i,        "comma decimal in bpm"],
  ["sleep",                   /needs a number/i,          "sleep with no argument"],
  ["sleep -1",                /can't be less than zero/i, "negative sleep"],
  ["sample snare",            /colon in front/i,          "missing colon"],
  ["sample :snare",           /did you mean .?:sn_dolf/i, "near-miss drum name"],
  ["sample :kick",            /did you mean .?:bd_haus|don't know/i, "unknown drum"],
  ["use_synth saw",           /colon in front/i,          "synth without colon"],
  ["use_synth :sawww",        /did you mean .?:saw/i,     "near-miss synth"],
  ["4 times do",              /put a dot in it/i,         "missing dot"],
  ["4.times",                 /needs .?do/i,              "missing do"],
  ["0.25.times do",           /whole number/i,            "fractional repeat"],
  ["play choose(60, 64)",     /square brackets/i,         "choose without brackets"],
  ["sleep rrand 0.25, 0.5",   /round brackets/i,          "rrand without brackets"],
  ["sleep rrand(0.5, 0.25)",  /smaller number first/i,    "backwards range"],
  ["wibble 60",               /don't know .?wibble/i,     "nonsense command"],
  ["live_loop :drums do",     /already inside a loop/i,   "typed the wrapper"],
  ["sample :kick",            /did you mean .?:bd_haus/i, "musical word: kick"],
  ["sample :hat",             /did you mean .?:drum_cymbal_closed/i, "musical word: hat"],
  ["sample :hihat",           /did you mean .?:drum_cymbal_closed/i, "musical word: hihat"],
  ["use_synth :bass",         /did you mean .?:tb303/i,   "musical word: bass"],
  ["use_synth :bell",         /did you mean .?:pretty_bell/i, "musical word: bell"],
  ["sample kick",             /colon in front.*bd_haus/i, "musical word without colon"],
];
for (const [input, pattern, label] of slips) {
  const r = parseLine(input);
  const got = r.ok ? `accepted as ${JSON.stringify(r.line)}` : r.msg;
  check(`${label}: "${input}"`, !r.ok && pattern.test(r.msg), got);
}
console.log(`  ${slips.length} common slips, each answered specifically`);

// ---------- 3. no message may contain developer jargon ----------
group("messages stay in a child's language");
const jargon = /unexpected token|undefined|NaN|null|syntax error|parse|exception|stack|invalid|TypeError|regex|index \d/i;
const collected = new Set();
for (const [input] of slips) { const r = parseLine(input); if (!r.ok) collected.add(r.msg); }
for (const bad of ["play {", "sample ::", "use_bpm 9999", "end end", "5.5.times do", "play choose([])", "sample choose([])", "play choose([a,b])"]) {
  const r = parseLine(bad); if (!r.ok) collected.add(r.msg);
}
let jargonHits = 0;
for (const m of collected) if (jargon.test(m)) { jargonHits++; console.log(`  FAIL  jargon in: "${m}"`); }
check(`no jargon in any of ${collected.size} messages`, jargonHits === 0);

// every message should show the child what right looks like
let noExample = 0;
for (const m of collected) if (!/`/.test(m)) { noExample++; console.log(`  FAIL  no example in: "${m}"`); }
check("every message shows a worked example", noExample === 0);
console.log(`  ${collected.size} distinct messages, all plain-language and all with an example`);

// ---------- 4. whole-editor parsing ----------
group("whole-editor behaviour");
const prog = parseCode(`# my drums\nsample :bd_haus\nsleep 0.5\n\n4.times do\n  play 60\n  sleep 0.25\nend`);
check("comments and blank lines are ignored", prog.errors.length === 0, JSON.stringify(prog.errors));
check("a full program parses to the right shape",
  prog.lines.length === 6 && prog.lines.map((l) => l.t).join(",") === "sample,sleep,loop,play,sleep,end",
  prog.lines.map((l) => l.t).join(","));

const unclosed = parseCode("4.times do\n  play 60");
check("an unclosed loop is explained, not ignored", unclosed.errors.some((e) => /still open/i.test(e.msg)), JSON.stringify(unclosed.errors));

const extraEnd = parseCode("play 60\nend");
check("a stray end is explained", extraEnd.errors.some((e) => /extra .?end/i.test(e.msg)), JSON.stringify(extraEnd.errors));

const multi = parseCode("plai 60\nsleep 0,5\nsample :snare");
check("every bad line is reported, not just the first", multi.errors.length === 3, `${multi.errors.length} errors`);
check("errors carry the row they came from", multi.errors.every((e) => typeof e.row === "number"));

console.log(`\n${fail === 0 ? "ALL PASS" : fail + " FAILURES"}`);
process.exit(fail ? 1 : 0);

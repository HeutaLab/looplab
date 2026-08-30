/* The worst bug in the original build lived here: a wrong chip in a `sleep`
   blank produced `sleep 67`, and the hint only fired in the onEnd callback —
   so a child sat in silence for up to 70 seconds before being told anything.
   Two things fix it, and both must hold: the hint is set BEFORE playback
   starts, and the preview is capped so the attempt cannot run long.
   playMine() is executed from source, with its collaborators stubbed. */
import { engine, levels, grab } from "./helpers/source.js";

const mod = new Function(`${engine}\n${levels}\nreturn { LEVELS, MAX_PREVIEW, safeNum };`)();
const { LEVELS, MAX_PREVIEW } = mod;

const EXPECTED_CAP = 10; // written down, not read from source — see chip-combinations
const playMineSrc = grab("function playMine()");
const substitutedSrc = grab("function substituted(useAnswers)");

function runPlayMine(tg, fills) {
  const calls = [];
  const stubs = {
    tg,
    fills,
    setMsg: (m) => calls.push({ fn: "setMsg", arg: m }),
    setWon: (v) => calls.push({ fn: "setWon", arg: v }),
    play: (lines, tag, onEnd, maxDur) => {
      calls.push({ fn: "play", tag, maxDur });
      if (onEnd) onEnd();
    },
    MAX_PREVIEW,
    safeNum: mod.safeNum,
  };
  const fn = new Function(
    "tg", "fills", "setMsg", "setWon", "play", "MAX_PREVIEW", "safeNum",
    `${substitutedSrc}\n${playMineSrc}\nreturn playMine;`
  )(stubs.tg, stubs.fills, stubs.setMsg, stubs.setWon, stubs.play, stubs.MAX_PREVIEW, stubs.safeNum);
  fn();
  return calls;
}

let fail = 0;
const check = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) fail++;
};

for (const lv of LEVELS) {
  const tg = lv.together;
  if (!tg) continue;
  const blanks = tg.lines.filter((L) => L.blank !== undefined);
  const answers = blanks.map((L) => L.blank);

  // --- a wrong answer must be told so before a note is played ---
  const wrong = [...answers];
  wrong[0] = tg.chips.find((c) => String(c) !== String(answers[0]));
  const wc = runPlayMine(tg, wrong);
  const msgAt = wc.findIndex((c) => c.fn === "setMsg");
  const playAt = wc.findIndex((c) => c.fn === "play");
  check(`${lv.id}: wrong answer gets the hint`, msgAt >= 0 && wc[msgAt].arg === tg.hint);
  check(`${lv.id}: hint arrives before playback, not after it`, msgAt >= 0 && playAt >= 0 && msgAt < playAt,
        msgAt < 0 ? "no hint at all" : `setMsg at ${msgAt}, play at ${playAt}`);
  check(`${lv.id}: attempt is capped at ${EXPECTED_CAP}s`, playAt >= 0 && wc[playAt].maxDur === EXPECTED_CAP,
        playAt >= 0 ? `maxDur=${wc[playAt].maxDur}` : "play never called");
  check(`${lv.id}: a wrong answer does not win the star`, !wc.some((c) => c.fn === "setWon"));

  // --- the right answer must still win, and never be nagged ---
  const rc = runPlayMine(tg, answers);
  check(`${lv.id}: correct answer wins`, rc.some((c) => c.fn === "setWon" && c.arg === true));
  check(`${lv.id}: correct answer gets no hint`, !rc.some((c) => c.fn === "setMsg"));

  // --- an unfinished board asks for the blanks and plays nothing ---
  const uc = runPlayMine(tg, answers.map((a, i) => (i === 0 ? null : a)));
  check(`${lv.id}: empty blank is asked for, nothing played`,
        uc.some((c) => c.fn === "setMsg" && /blank/i.test(String(c.arg))) && !uc.some((c) => c.fn === "play"));
}

console.log(`\n${fail === 0 ? "ALL PASS" : fail + " FAILURES"}`);
process.exit(fail ? 1 : 0);

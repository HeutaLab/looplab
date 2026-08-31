/* The crate opens on finished Studio levels, and never ahead of them.

   The rule this replaced was a chain of records, which opened tracks in an
   order that had nothing to do with what a child could do yet. The rule now is
   strict: a track opens only once the Studio has taught the way that track is
   written. These checks derive the teaching level from levels.js rather than
   restating the constant, so reordering the Studio without moving the crate
   fails here rather than in a classroom. */
import { LEVELS } from "../src/data/levels.js";
import { TRACKS, TRACK_LEVELS, levelsDone, trackOpen } from "../src/data/tracks.js";

let fail = 0;
const check = (n, c, d = "") => {
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`);
  if (!c) fail++;
};

/* the 1-based level number that first teaches a way of writing code */
const teaches = (mode) => {
  const i = LEVELS.findIndex((l) => l.build && l.build.codeMode === mode);
  return i < 0 ? 0 : i + 1;
};

const none = [0, 0, 0, 0, 0, 0];
const allSix = [3, 3, 3, 3, 3, 3];
const justInside = [3, 3, 0, 0, 0, 0]; /* the two levels that get you past the door */

check("a level only counts when it is worth all three stars",
      levelsDone([3, 2, 3, 0, 0, 0]) === 2,
      `got ${levelsDone([3, 2, 3, 0, 0, 0])}`);

check("the chip tracks are open the moment the Club is",
      trackOpen(0, justInside, {}) && trackOpen(1, justInside, {}));

check("a finished Studio card opens every track",
      TRACKS.every((_, i) => trackOpen(i, allSix, {})));

check("nothing is finished, so nothing past the first two is open",
      !trackOpen(2, none, {}) && !trackOpen(5, none, {}));

/* the strict promise: never hand a child a track written a way nobody has
   shown them yet */
for (const [i, tr] of TRACKS.entries()) {
  const mode = tr.codeMode || "chips";
  const needed = mode === "chips" ? 0 : teaches(mode);
  check(`${tr.id} (${mode}) does not open before the Studio teaches ${mode}`,
        TRACK_LEVELS[i] >= needed,
        `opens at ${TRACK_LEVELS[i]}, taught at ${needed || "the start"}`);
}

/* the old chain still works, so nobody loses a track they already earned */
check("a record on the track above still opens the next one",
      trackOpen(2, none, { [TRACKS[1].id]: "bronze" }),
      "nothing finished, one bronze");

check("thresholds rise and stay inside the six Studio levels",
      TRACK_LEVELS.every((n, i) => (i === 0 || n >= TRACK_LEVELS[i - 1]) && n <= LEVELS.length),
      TRACK_LEVELS.join(", "));

check("one threshold per track", TRACK_LEVELS.length === TRACKS.length);

process.exit(fail ? 1 : 0);

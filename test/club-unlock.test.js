/* The crate opens on finished Studio levels, not on a chain of records.

   The rule this replaced meant a child who had three-starred all six Studio
   levels still found four padlocks in the Club, because they had not yet
   earned a record on each track in turn. These checks pin what matters: a
   finished Studio card opens everything, the last level is never the thing
   standing between a child and the finale, and nobody who had a track before
   loses it. */
import { TRACKS, TRACK_LEVELS, levelsDone, trackOpen } from "../src/data/tracks.js";

let fail = 0;
const check = (n, c, d = "") => {
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`);
  if (!c) fail++;
};

const none = [0, 0, 0, 0, 0, 0];
const allSix = [3, 3, 3, 3, 3, 3];
const justInside = [3, 3, 0, 0, 0, 0]; /* the two levels that get you past the door */

check("a level only counts when it is worth all three stars",
      levelsDone([3, 2, 3, 0, 0, 0]) === 2,
      `got ${levelsDone([3, 2, 3, 0, 0, 0])}`);

check("the first two tracks are open the moment the Club is",
      trackOpen(0, justInside, {}) && trackOpen(1, justInside, {}));

check("a finished Studio card opens every track",
      TRACKS.every((_, i) => trackOpen(i, allSix, {})));

check("the last Studio level is never what locks the finale",
      trackOpen(TRACKS.length - 1, [3, 3, 3, 3, 3, 0], {}),
      "five of six finished");

check("no finished levels leaves the later tracks shut",
      !trackOpen(2, none, {}) && !trackOpen(5, none, {}));

/* the old chain still works, so this can only ever open more than before */
check("a record on the track above still opens the next one",
      trackOpen(2, none, { [TRACKS[1].id]: "bronze" }),
      "nothing finished, one bronze");

check("thresholds rise and stay inside the six Studio levels",
      TRACK_LEVELS.every((n, i) => (i === 0 || n >= TRACK_LEVELS[i - 1]) && n <= TRACKS.length),
      TRACK_LEVELS.join(", "));

check("every threshold is reachable before a perfect card",
      TRACK_LEVELS[TRACK_LEVELS.length - 1] < 6);

check("one threshold per track", TRACK_LEVELS.length === TRACKS.length);

process.exit(fail ? 1 : 0);

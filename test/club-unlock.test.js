/* The crate opens on Studio stars, not on a chain of records.

   The rule this replaced meant a child who had three-starred all six Studio
   levels still found four padlocks in the Club, because they had not yet
   earned a record on each track in turn. These checks pin the two things that
   matter: a full Studio card opens everything, and nobody who had a track
   before loses it. */
import { TRACKS, TRACK_STARS, trackOpen } from "../src/data/tracks.js";

let fail = 0;
const check = (n, c, d = "") => {
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`);
  if (!c) fail++;
};

const none = TRACKS.map(() => 0);
const allSix = [3, 3, 3, 3, 3, 3];
const justInside = [3, 3, 0, 0, 0, 0]; /* the 6 stars that get you past the door */

check("the first two tracks are open the moment the Club is", 
      trackOpen(0, justInside, {}) && trackOpen(1, justInside, {}));

check("a Studio card of three-starred levels opens every track",
      TRACKS.every((_, i) => trackOpen(i, allSix, {})),
      `stars=${allSix.reduce((a, b) => a + b, 0)}`);

check("three missing stars still opens the finale",
      trackOpen(TRACKS.length - 1, [3, 3, 3, 3, 2, 1], {}),
      "15 of 18");

check("no stars leaves the later tracks shut",
      !trackOpen(2, none, {}) && !trackOpen(5, none, {}));

/* the old chain still works, so this can only ever open more than before */
check("a record on the track above still opens the next one",
      trackOpen(2, none, { [TRACKS[1].id]: "bronze" }),
      "no stars, one bronze");

check("thresholds rise and never exceed a full Studio card",
      TRACK_STARS.every((n, i) => (i === 0 || n >= TRACK_STARS[i - 1]) && n <= 18),
      TRACK_STARS.join(", "));

check("every threshold is reachable before a perfect card",
      TRACK_STARS[TRACK_STARS.length - 1] < 18);

process.exit(fail ? 1 : 0);

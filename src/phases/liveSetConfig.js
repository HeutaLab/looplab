/* Tuning for the live set. Kept out of the component file so it can be
   imported by a test in plain Node — pure values in .js, components in .jsx. */
export const SET_BARS = 48;

/* How far ahead of the sound a bar is committed. Held deliberately tight so a
   mute, a BPM nudge or a live glitch fix is heard almost immediately — that
   responsiveness is the point of the booth.
   The cost, accepted knowingly: LEAD is 1.6s, so a note only exists 0.45s
   before it lands and enters the highway about three-quarters of the way down
   rather than at the top. Raising this towards LEAD would fix the visual and
   push every player action out to the next bar; the trade was made the other
   way round. */
export const SCHED_AHEAD = 0.45;

/* Backstop for a tab that was hidden: never burn more than a few bars in one
   tick, however far behind the clock has drifted. */
export const MAX_BARS_PER_TICK = 4;

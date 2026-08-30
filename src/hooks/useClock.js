import { LEAD } from "../theme.js";
import { useState, useEffect } from "react";

export function useClock(playInfo) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!playInfo) return;
    let raf;
    const loop = () => {
      force((x) => x + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playInfo]);
  return playInfo ? (performance.now() - playInfo.startedAt) / 1000 - LEAD : null;
}

export function useActiveLine(playInfo, elapsed) {
  if (!playInfo || elapsed === null) return null;
  let line = null;
  for (const ev of playInfo.events) {
    if (ev.time <= elapsed && elapsed - ev.time < 0.4) line = ev.line;
    if (ev.time > elapsed) break;
  }
  return line;
}

/* ---------- progress codes ----------
   A child who plays at school starts from zero at home. No accounts and no
   network, so the progress travels the only way left: a short code they can
   copy into their book and type in at the other end.

   32 bits: version(4) + stars 6x2 + records 6x2 + reserved(4), rendered in
   Crockford base32 (no I, L, O or U, so nothing reads as a 1 or a 0) with a
   check character, formatted LL-XXXX-XXXX. Restoring merges upward — it can
   only ever give a child more than they had, never less. */

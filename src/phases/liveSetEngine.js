/* What the crowd wants and what breaks mid-set. Pure functions over the engine
   state and the track — no component, no React — so a test can drive them
   directly and the component file stays about rendering. */
import { DRUMS } from "../theme.js";

export function requestMet(e) {
  const r = e.request;
  if (!r) return false;
  if (r.type === "unmute") return !e.muted[r.loop];
  if (r.type === "mute") return e.muted[r.loop];
  if (r.type === "bpm") return Math.abs(e.bpm - r.v) <= 1;
  return false;
}

export function makeRequest(e, track) {
  const mutedIdx = e.muted.map((m, i) => (m ? i : null)).filter((x) => x !== null);
  const activeIdx = e.muted.map((m, i) => (!m ? i : null)).filter((x) => x !== null);
  const roll = Math.random();
  if (mutedIdx.length && roll < 0.6) {
    const i = mutedIdx[Math.floor(Math.random() * mutedIdx.length)];
    return { type: "unmute", loop: i, left: 8, text: `Drop the ${track.loops[i].name}! Bring it IN!` };
  }
  if (roll < 0.85 || !activeIdx.length) {
    const v = Math.min(146, Math.max(120, track.bpm + (Math.random() < 0.5 ? -4 : 4)));
    return { type: "bpm", v, left: 8, text: `Take it to ${v} BPM!` };
  }
  const i = activeIdx[Math.floor(Math.random() * activeIdx.length)];
  if (track.loops[i].name === "drums") return { type: "bpm", v: track.bpm + 4, left: 8, text: `Take it to ${track.bpm + 4} BPM!` };
  return { type: "mute", loop: i, left: 8, text: `Strip it back — cut the ${track.loops[i].name}!` };
}

export function makeGlitch(e, track) {
  const candidates = [];
  e.lines.forEach((ls, li) => {
    if (e.muted[li]) return;
    ls.forEach((L, i) => {
      if (L.t === "play" || L.t === "sample" || L.t === "sleep") candidates.push([li, i]);
    });
  });
  if (!candidates.length) return null;
  const [li, i] = candidates[Math.floor(Math.random() * candidates.length)];
  const L = e.lines[li][i];
  const orig = L.v;
  if (L.t === "play") L.v = L.v + 1;
  else if (L.t === "sleep") L.v = L.v === 0.25 ? 0.5 : 0.25;
  else L.v = DRUMS[(DRUMS.indexOf(L.v) + 1) % DRUMS.length];
  return { loop: li, line: i, orig, age: 0 };
}

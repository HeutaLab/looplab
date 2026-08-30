import { LEVELS } from "../data/levels.js";
import { TRACKS } from "../data/tracks.js";

export const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford: no I, L, O, U

export const CODE_V = 1;

export const RECORD_RANK = { bronze: 1, silver: 2, gold: 3 };

export const RANK_RECORD = { 1: "bronze", 2: "silver", 3: "gold" };

/* Crockford's confusable set, so a code copied by hand off a whiteboard still
   works: I and L read as 1, O reads as 0. */
export const B32_FIX = { I: "1", L: "1", O: "0", U: "V" };

export function normaliseCode(raw) {
  // Strip everything that is not a letter or digit FIRST: a leading space used
  // to defeat the prefix strip, so " LL-..." read as a bad code.
  const t = String(raw ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  // Drop the LL prefix only when doing so leaves a full-length code, so a body
  // that happens to start with those characters is not silently truncated.
  const body = t.length === 10 && t.startsWith("LL") ? t.slice(2) : t;
  return body
    .split("")
    .map((c) => B32_FIX[c] ?? c)
    .join("");
}

export function encodeProgress(stars, records) {
  let bits = 0n;
  bits = (bits << 4n) | BigInt(CODE_V & 0xf);
  for (let i = 0; i < 6; i++) bits = (bits << 2n) | BigInt(Math.max(0, Math.min(3, stars[i] || 0)));
  for (const t of TRACKS) bits = (bits << 2n) | BigInt(RECORD_RANK[records[t.id]] || 0);
  bits = (bits << 4n) | 0n; // reserved for whatever comes next
  let body = "";
  for (let i = 6; i >= 0; i--) body += B32[Number((bits >> BigInt(i * 5)) & 31n)];
  let sum = 0;
  for (const c of body) sum += B32.indexOf(c);
  return `LL-${body.slice(0, 4)}-${body.slice(4)}${B32[sum % 32]}`;
}

export function decodeProgress(raw) {
  const t = normaliseCode(raw);
  if (t.length !== 8) return null;
  const body = t.slice(0, 7);
  let sum = 0;
  for (const c of body) {
    const i = B32.indexOf(c);
    if (i < 0) return null;
    sum += i;
  }
  if (B32[sum % 32] !== t[7]) return null; // a mistyped letter fails here
  let bits = 0n;
  for (const c of body) bits = (bits << 5n) | BigInt(B32.indexOf(c));
  const reserved = Number(bits & 15n);
  bits >>= 4n;
  const records = {};
  for (let i = TRACKS.length - 1; i >= 0; i--) {
    const r = Number(bits & 3n);
    bits >>= 2n;
    if (r) records[TRACKS[i].id] = RANK_RECORD[r];
  }
  const stars = [];
  for (let i = 5; i >= 0; i--) {
    stars[i] = Number(bits & 3n);
    bits >>= 2n;
  }
  const v = Number(bits & 15n);
  if (v !== CODE_V) return null;
  return { stars, records, reserved };
}

/* Merge upward only: bringing a code home can add stars, never take them. A
   child who did more at home than at school does not get punished for it. */
export function mergeProgress(cur, incoming) {
  const stars = LEVELS.map((_, i) => Math.max(cur.stars[i] || 0, incoming.stars[i] || 0));
  const records = { ...cur.records };
  for (const [id, r] of Object.entries(incoming.records)) {
    if ((RECORD_RANK[records[id]] || 0) < (RECORD_RANK[r] || 0)) records[id] = r;
  }
  return { stars, records };
}

/* ---------- the teacher's copy ----------
   Nothing leaves the device on its own, so the report has to leave by hand:
   copied into Google Classroom in the lesson, or saved as a file for the
   evidence folder later. Both produce the same markdown, so a teacher
   collecting thirty of them gets thirty identical shapes.

   The "I can" lines are derived from what the student actually finished
   rather than self-reported, so a teacher can defend every tick in it. */

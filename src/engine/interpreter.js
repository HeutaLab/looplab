export const P = (v) => ({ t: "play", v });

export const S = (v) => ({ t: "sleep", v });

export const D = (v) => ({ t: "sample", v });

export const SY = (v) => ({ t: "synth", v });

export const LOOP = (v) => ({ t: "loop", v });

export const END = () => ({ t: "end" });

export function seq(synth, steps) {
  const out = [];
  if (synth) out.push(SY(synth));
  for (const [s, d] of steps) {
    if (s !== null) {
      if (Array.isArray(s)) s.forEach((n) => out.push(P(n)));
      else if (typeof s === "number") out.push(P(s));
      else out.push(D(s));
    }
    out.push(S(d));
  }
  return out;
}

export function findEndIdx(lines, i) {
  let d = 0;
  for (let j = i; j < lines.length; j++) {
    if (lines[j].t === "loop") d++;
    else if (lines[j].t === "end") {
      d--;
      if (d === 0) return j;
    }
  }
  return lines.length - 1;
}

export const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* Chips fill blanks left-to-right, so a chip can land in a blank it doesn't
   fit — a drum-list chip in a `use_bpm` blank used to make spb NaN, which
   poisoned every event time and the track duration with it. Every number
   that reaches the scheduler goes through here first. */
export const safeNum = (v, fallback = 0) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

export function compile(lines, bpm = 60) {
  let spb = 60 / safeNum(bpm, 60);
  const events = [];
  let time = 0;
  let synth = "beep";
  function run(i, stop) {
    while (i < stop && events.length < 500) {
      const L = lines[i];
      if (L.t === "play") events.push({ time, kind: "note", note: safeNum(L.v, 60), synth, line: i });
      else if (L.t === "playChoose") events.push({ time, kind: "note", note: safeNum(pick(L.v), 60), synth, line: i });
      else if (L.t === "sleep") time += safeNum(L.v, 0.5) * spb;
      else if (L.t === "sleepRand") time += (L.v[0] + Math.random() * (L.v[1] - L.v[0])) * spb;
      else if (L.t === "sample") events.push({ time, kind: L.v, line: i });
      else if (L.t === "sampleChoose") events.push({ time, kind: pick(L.v), line: i });
      else if (L.t === "synth") synth = L.v;
      else if (L.t === "bpm") spb = 60 / safeNum(L.v, 60);
      else if (L.t === "loop") {
        const e = findEndIdx(lines, i);
        // Ruby has no Float#times, so a fractional count is never valid code —
        // it used to slip through and run the body exactly once.
        const reps = Math.max(0, Math.floor(safeNum(L.v, 1)));
        for (let k = 0; k < reps; k++) run(i + 1, e);
        i = e;
      }
      i++;
    }
  }
  run(0, lines.length);
  events.sort((a, b) => a.time - b.time);
  const total = Math.max(time, events.length ? events[events.length - 1].time + 0.4 : 0);
  return { events, total };
}

/* Runs several loops at once, each repeating on its own length — like
   real live_loops. Recompiled every cycle so `choose`/`rrand` stay random. */
export function compileLoops(loopsLines, bpm = 60, reps = 2) {
  const base = loopsLines.map((ls) => compile(ls, bpm).total);
  const cycle = Math.max(0.5, ...base);
  const dur = cycle * reps;
  const events = [];
  loopsLines.forEach((ls, li) => {
    let t = 0;
    let guard = 0;
    while (t < dur - 0.001 && guard++ < 40) {
      const c = compile(ls, bpm);
      if (!c.events.length || c.total <= 0.01) break;
      c.events.forEach((ev, k) => {
        if (t + ev.time < dur + 0.001) events.push({ ...ev, time: t + ev.time, loopIdx: li, id: `${li}-${guard}-${k}` });
      });
      t += c.total;
    }
  });
  events.sort((a, b) => a.time - b.time);
  return { events, total: dur };
}

/* A wrong chip in a `sleep` blank can compile to a minute of near-silence.
   Truncating the preview keeps every attempt a few seconds long, so the
   player can hear the mistake and try again straight away. */
export const MAX_PREVIEW = 10;

export function capPreview(compiled, maxDur) {
  if (!maxDur || !Number.isFinite(compiled.total) || compiled.total <= maxDur) return compiled;
  return { events: compiled.events.filter((ev) => ev.time <= maxDur), total: maxDur, truncated: true };
}

export function laneOf(ev) {
  if (ev.kind === "bd_haus") return 0;
  if (ev.kind === "sn_dolf") return 2;
  if (ev.kind === "drum_cymbal_closed") return 4;
  const n = ev.note;
  if (n < 42) return 0;
  if (n < 56) return 1;
  if (n < 63) return 2;
  if (n < 69) return 3;
  return 4;
}

/* ---------- code rendering ---------- */

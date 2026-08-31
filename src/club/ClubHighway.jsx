import React, { useEffect, useMemo, useRef } from "react";
import { compileLoops } from "../engine/interpreter.js";
import { CLUB } from "../theme.js";

/* The highway is the ear. It shows what the track is about to sound, one lane
   per live_loop, tokens written as the Sonic Pi that makes them. It is not a
   scoring game: nothing is tapped here, and the now-line is only ever "this is
   the moment you hear it".

   What crosses the line is what sounds, so sleeps get no token — a sleep is
   silence. The one exception is the hole, which has to be visible because it
   is the thing being written. */

function tint(col, a) {
  const c = rgbOf(col);
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

/* Colour has to say which channel this is without shouting over the rhythm.
   A lane you are only listening to gets its hue pulled most of the way
   towards a neutral: still identifiably blue or violet, no longer competing
   with position and size for the eye. The lane you are writing keeps its
   colour at full strength, so the loudest thing in the pit is always the
   thing you are working on. */
/* What tells you which channel a token belongs to.

   Colour alone cannot do this job here, and that is a measured result rather
   than an opinion. Amber already means "you write this", red means "this is
   the fault" and mint means finished, which claims the warm half of the
   wheel; everything left that is legible on a near-black floor sits in the
   blue-violet wedge — and that wedge is exactly what blue-blindness
   collapses. Two lane colours picked from it came out 1.8 apart in Lab under
   tritanopia. There is no palette that fixes that.

   So identity is carried three ways and colour is only the fastest of them:
   a SHAPE that no colour deficiency and no washed-out projector can take
   away, a LIGHTNESS step, and the channel's own name printed under its lane.
   Colour makes it quick; shape makes it certain. */

const PERC_INK = ["#EDE6D8", "#8E96A8"]; /* drums, then any further percussion */
const PITCH_INK = ["#A78BFF", "#5AA8F0", "#4FE3F5"]; /* deep, middle, bright */

/* one shape per lane, in track order — five is more than any record uses */
const SHAPES = ["circle", "square", "diamond", "hexagon", "triangle"];
export const channelShape = (idx) => SHAPES[idx % SHAPES.length];

function meanNote(loop) {
  const n = loop.lines.filter((L) => L.t === "play" && typeof L.v === "number").map((L) => L.v);
  return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
}

/* Pitch decides WHICH colour, but by rank inside this track rather than by
   interpolation: the lowest melodic loop always takes the deep end and the
   highest always takes the bright one. Interpolating put six of the six bass
   lanes within a few units of the same violet, which looked principled and
   measured worse than the arbitrary palette it replaced. */
export function channelInk(track, idx) {
  const means = track.loops.map(meanNote);
  if (means[idx] === null) {
    const rank = means.slice(0, idx).filter((m) => m === null).length;
    return PERC_INK[rank % PERC_INK.length];
  }
  const melodic = means.map((m, i) => ({ m, i })).filter((x) => x.m !== null).sort((a, b) => a.m - b.m);
  const rank = melodic.findIndex((x) => x.i === idx);
  const slot = melodic.length === 1 ? 0 : Math.round((rank * (PITCH_INK.length - 1)) / (melodic.length - 1));
  return PITCH_INK[slot];
}

/* the lane's shape, traced at radius r — the certainty channel */
function tracePath(ctx, shape, x, y, r) {
  ctx.beginPath();
  if (shape === "circle") { ctx.arc(x, y, r, 0, Math.PI * 2); return; }
  if (shape === "square") {
    const a = r * 0.86, k = Math.min(3, r * 0.22);
    ctx.moveTo(x - a + k, y - a);
    ctx.arcTo(x + a, y - a, x + a, y + a, k);
    ctx.arcTo(x + a, y + a, x - a, y + a, k);
    ctx.arcTo(x - a, y + a, x - a, y - a, k);
    ctx.arcTo(x - a, y - a, x + a, y - a, k);
    ctx.closePath();
    return;
  }
  const sides = shape === "diamond" ? 4 : shape === "triangle" ? 3 : 6;
  const turn = shape === "hexagon" ? Math.PI / 6 : -Math.PI / 2;
  const R = shape === "diamond" ? r * 1.16 : r * 1.06;
  for (let i = 0; i < sides; i++) {
    const a = turn + (i * 2 * Math.PI) / sides;
    const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

function rgbOf(col) {
  if (col[0] === "#") {
    const n = parseInt(col.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return col.match(/\d+/g).slice(0, 3).map(Number);
}

function mute(col, amount) {
  const g = [0x8f, 0x8a, 0x9c];
  const c = rgbOf(col).map((v, i) => Math.round(v + (g[i] - v) * amount));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/* Simultaneous notes in one loop are a chord — the track data writes those as
   consecutive `play` lines with no sleep between, which is real Sonic Pi and
   would otherwise stack three tokens on the same spot. */
function groupEvents(events) {
  const by = new Map();
  for (const ev of events) {
    const k = `${ev.loopIdx}:${ev.time.toFixed(4)}`;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(ev);
  }
  return [...by.values()];
}

function labelFor(group) {
  const first = group[0];
  if (first.kind !== "note") return ["sample", ":" + first.kind];
  if (group.length > 1) return ["play", group.map((e) => e.note).join(" ")];
  return ["play " + first.note];
}

export function ClubHighway({ track, loopLines, playInfo, elapsed, focus, hole, sour, solo }) {
  const cv = useRef(null);
  const wrap = useRef(null);

  /* Standing still, the pit shows the top of the loop rather than an empty
     black box — a booth with the lights on but nothing playing yet. */
  const idle = useMemo(() => compileLoops(loopLines, track.bpm, 1), [loopLines, track.bpm]);

  const state = useRef({});
  state.current = { track, loopLines, playInfo, elapsed, focus, hole, sour, solo, idle };
  const drawRef = useRef(null);

  useEffect(() => {
    let raf;
    const ctx = cv.current.getContext("2d");

    function draw() {
      const s = state.current;
      const box = wrap.current;
      if (!box) return;
      const W = box.clientWidth;
      const H = box.clientHeight;
      if (!W || !H) return;

      const dpr = Math.min(3, window.devicePixelRatio || 1);
      if (cv.current.width !== Math.round(W * dpr) || cv.current.height !== Math.round(H * dpr)) {
        cv.current.width = Math.round(W * dpr);
        cv.current.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = CLUB.void;
      ctx.fillRect(0, 0, W, H);

      const lanes = s.solo ? [s.focus] : s.loopLines.map((_, i) => i);
      const hitY = H - 36; /* a clear band below the line for the channel names */
      const topY = 4;
      const vx = W / 2;
      const laneW = s.solo ? W * 0.66 : W / lanes.length;
      const pad = s.solo ? (W - laneW) / 2 : 0;
      const CONV = s.solo ? 0.34 : 0.6;
      /* A flatter road. The steep curve made a token crawl at the far end
         and whip past the line, which is the moment you most need to read
         it. */
      const K = s.solo ? 1.3 : 1.5;

      /* The pit is measured in beats, not seconds, so it holds the same
         musical distance at 125 and at 140 — the road is a bar and a half of
         the track you are actually listening to. It is also how long a token
         takes to reach the line, so this is the speed control. */
      const beat = 60 / s.track.bpm;
      const VIEW = beat * (s.solo ? 4 : 6);

      const gOf = (u) => (1 - 1 / (1 + u * K)) / (1 - 1 / (1 + K));
      const xOf = (cx, g) => cx + (vx - cx) * CONV * g;
      const yOf = (g) => hitY - (hitY - topY) * g;

      /* each lane in its channel's colour, the one being written filled faintly */
      const fi = lanes.indexOf(s.focus);
      lanes.forEach((li, k) => {
        const lx = pad + k * laneW;
        const rx = lx + laneW;
        const ink = channelInk(s.track, li);
        const on = k === fi;
        ctx.beginPath();
        ctx.moveTo(lx, hitY);
        ctx.lineTo(xOf(lx, 1), topY);
        ctx.lineTo(xOf(rx, 1), topY);
        ctx.lineTo(rx, hitY);
        ctx.closePath();
        ctx.fillStyle = tint(ink, on ? 0.075 : 0.015);
        ctx.fill();
        ctx.strokeStyle = tint(ink, on ? 0.45 : 0.12);
        ctx.lineWidth = on ? 1.5 : 1;
        ctx.stroke();

        /* the channel says its own name, in its own colour */
        const ls = Math.min(12, Math.max(9, laneW * 0.11));
        ctx.font = `700 ${ls.toFixed(1)}px "Atkinson Hyperlegible Mono", ui-monospace, Menlo, "Courier New", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = on ? tint(ink, 0.95) : mute(ink, 0.55);
        const label = ":" + s.track.loops[li].name;
        const lw = ctx.measureText(label).width;
        ctx.fillText(label, lx + laneW / 2 + 7, hitY + 23);
        /* the name wears the lane's own shape, so the key to the pit is
           always on screen next to the thing it explains */
        tracePath(ctx, channelShape(li), lx + laneW / 2 - lw / 2 - 2, hitY + 23 + ls * 0.55, ls * 0.42);
        ctx.fill();
      });

      const live = !!s.playInfo && s.elapsed !== null;
      const t0 = live ? s.elapsed : 0;

      /* The pulse.

         Nothing in the pit carried the beat before: tokens floated up a plain
         black lane, so the one thing a dance track is actually made of was
         the one thing you could not see. These are the bar lines a DJ counts,
         flowing towards the now-line at the same speed as the music, with the
         downbeat brighter. They also do the teaching that the numbers cannot:
         the gap between two tokens is `sleep 0.5`, and now you can see that it
         is half a beat wide. */
      const lastX = pad + lanes.length * laneW;
      for (let b = Math.ceil(t0 / beat) * beat; b - t0 <= VIEW; b += beat) {
        const bg = gOf(Math.min(1, (b - t0) / VIEW));
        const by = yOf(bg);
        const down = Math.round(b / beat) % 4 === 0;
        ctx.beginPath();
        ctx.moveTo(xOf(pad, bg), by);
        ctx.lineTo(xOf(lastX, bg), by);
        ctx.strokeStyle = `rgba(243,238,228,${((down ? 0.38 : 0.14) * (1 - 0.45 * bg)).toFixed(3)})`;
        ctx.lineWidth = down ? 2 : 1;
        ctx.stroke();
      }

      /* The now-line keeps the beat. It was a static rule that only told you
         WHERE the moment was; it now tells you WHEN as well, thickening on
         every beat and hardest on the one. That is the count a DJ works to,
         and it is the thing the pit was missing. */
      const sinceBeat = live ? t0 - Math.floor(t0 / beat) * beat : beat;
      const onDown = live && Math.floor(t0 / beat) % 4 === 0;
      const pulse = Math.max(0, 1 - sinceBeat / 0.14) * (onDown ? 1 : 0.55);
      ctx.beginPath();
      ctx.moveTo(2, hitY);
      ctx.lineTo(W - 2, hitY);
      ctx.strokeStyle = CLUB.ink;
      ctx.lineWidth = 2.5 + pulse * 3.5;
      ctx.globalAlpha = live ? 0.75 + pulse * 0.25 : 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const events = live ? s.playInfo.events : s.idle.events;
      const t = t0;

      const toks = [];
      for (const group of groupEvents(events)) {
        const ev = group[0];
        const lane = lanes.indexOf(ev.loopIdx);
        if (lane < 0) continue;
        const dt = ev.time - t;
        if (dt < -0.06 || dt > VIEW) continue;
        /* a chord arrives as three play lines at one instant, and the hole
           may be any of the three — keying the token off the first note alone
           left Piano Sunrise's hole unmarked on the highway */
        const keys = group.map((g) => `${g.loopIdx}:${g.line}`);
        /* Where this note falls in the bar. A note on the beat is the one the
           room is moving to, so it arrives bigger and brighter; the 16ths in
           between are all still there, just quieter. That is what stops a
           dense acid line reading as noise without hiding a single note. */
        const offBeat = Math.abs(ev.time / beat - Math.round(ev.time / beat));
        const onBeat = offBeat < 0.06;
        const onBar = onBeat && Math.round(ev.time / beat) % 4 === 0;
        toks.push({
          dt,
          lane,
          li: ev.loopIdx,
          lines: labelFor(group),
          hole: keys.some((k) => s.hole === k),
          sour: keys.some((k) => s.sour.has(k)),
          weight: onBar ? 1 : onBeat ? 0.82 : 0.42,
        });
      }
      toks.sort((a, b) => b.dt - a.dt); /* far first */

      for (const tok of toks) {
        const u = Math.min(1, Math.max(0, tok.dt) / VIEW);
        const g = gOf(u);
        const shrink = 1 - CONV * g;
        const x = xOf(pad + (tok.lane + 0.5) * laneW, g);
        const y = yOf(g);
        const full = Math.min(21, H * 0.1);
        const r = full * tok.weight * (tok.hole ? 1.4 : 1) * shrink;
        if (r < 4) continue;

        const onFocus = tok.li === s.focus;
        const base = channelInk(s.track, tok.li);
        const ink = onFocus ? base : mute(base, 0.5);
        ctx.globalAlpha = (1 - 0.45 * g) * (onFocus ? 1 : 0.66) * (live ? 1 : 0.85) * (0.42 + 0.58 * tok.weight);
        const shape = channelShape(tok.li);
        tracePath(ctx, shape, x, y, r);

        if (tok.hole) {
          ctx.setLineDash([4.5 * shrink + 1.5, 3.5 * shrink + 1.5]);
          ctx.strokeStyle = CLUB.amber;
          ctx.lineWidth = Math.max(1, 2 * shrink);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (tok.sour) {
          ctx.fillStyle = CLUB.sour;
          ctx.fill();
          /* a halo, so the fault is never just a hue among hues */
          tracePath(ctx, shape, x, y, r + Math.max(2, 3 * shrink));
          ctx.strokeStyle = tint(CLUB.sour, 0.55);
          ctx.lineWidth = Math.max(1, 1.5 * shrink);
          ctx.stroke();
        } else {
          ctx.fillStyle = ink;
          ctx.fill();
        }

        /* the statement, written on the token — shrunk to fit, never clipped */
        if (r >= 8.5) {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = tok.hole ? CLUB.amber : "#0c0910";
          const rows = tok.lines;
          let size = r * (rows.length > 1 ? 0.4 : 0.46);
          const font = (px) => `700 ${px.toFixed(2)}px "Atkinson Hyperlegible Mono", ui-monospace, Menlo, "Courier New", monospace`;
          ctx.font = font(size);
          let widest = 0;
          for (const l of rows) widest = Math.max(widest, ctx.measureText(l).width);
          const room = r * (rows.length > 1 ? 1.6 : 1.7);
          if (widest > room) {
            size *= room / widest;
            ctx.font = font(size);
          }
          if (rows.length > 1) {
            ctx.fillText(rows[0], x, y - size * 0.62);
            ctx.fillText(rows[1], x, y + size * 0.62);
          } else {
            ctx.fillText(rows[0], x, y);
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    /* Reduced motion: the pit holds still as a diagram, the track still runs. */
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    drawRef.current = draw;
    function frame() {
      draw();
      raf = requestAnimationFrame(frame);
    }
    if (still) {
      draw();
      window.addEventListener("resize", draw);
      return () => window.removeEventListener("resize", draw);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* With motion off there is no animation loop, so a change of phase, hole or
     arrangement has to repaint the diagram itself. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches && drawRef.current) drawRef.current();
  });

  return (
    <div className="booth-pit" ref={wrap}>
      <canvas ref={cv} />
    </div>
  );
}

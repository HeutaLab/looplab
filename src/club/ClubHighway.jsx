import React, { useEffect, useMemo, useRef } from "react";
import { compileLoops } from "../engine/interpreter.js";
import { CHANNEL, CLUB, LEAD } from "../theme.js";

/* The highway is the ear. It shows what the track is about to sound, one lane
   per live_loop, tokens written as the Sonic Pi that makes them. It is not a
   scoring game: nothing is tapped here, and the now-line is only ever "this is
   the moment you hear it".

   What crosses the line is what sounds, so sleeps get no token — a sleep is
   silence. The one exception is the hole, which has to be visible because it
   is the thing being written. */

function tint(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
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
      const K = s.solo ? 1.8 : 2.4; /* a short pit needs a flatter road, or the far half stacks */

      /* How far ahead the pit shows. This is also how long a token takes to
         reach the now-line, so it is the speed control — and on one narrow
         lane a shorter view keeps a 16th-note riff from stacking up. It can
         never exceed the engine's own lookahead. */
      const VIEW = Math.min(LEAD, s.solo ? 0.7 : 1.5);

      const gOf = (u) => (1 - 1 / (1 + u * K)) / (1 - 1 / (1 + K));
      const xOf = (cx, g) => cx + (vx - cx) * CONV * g;
      const yOf = (g) => hitY - (hitY - topY) * g;

      /* each lane in its channel's colour, the one being written filled faintly */
      const fi = lanes.indexOf(s.focus);
      lanes.forEach((li, k) => {
        const lx = pad + k * laneW;
        const rx = lx + laneW;
        const ink = CHANNEL[li % CHANNEL.length];
        const on = k === fi;
        ctx.beginPath();
        ctx.moveTo(lx, hitY);
        ctx.lineTo(xOf(lx, 1), topY);
        ctx.lineTo(xOf(rx, 1), topY);
        ctx.lineTo(rx, hitY);
        ctx.closePath();
        ctx.fillStyle = tint(ink, on ? 0.07 : 0.022);
        ctx.fill();
        ctx.strokeStyle = tint(ink, on ? 0.5 : 0.18);
        ctx.lineWidth = on ? 1.5 : 1;
        ctx.stroke();

        /* the channel says its own name, in its own colour */
        const ls = Math.min(12, Math.max(9, laneW * 0.11));
        ctx.font = `700 ${ls.toFixed(1)}px "Atkinson Hyperlegible Mono", ui-monospace, Menlo, "Courier New", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = tint(ink, on ? 0.95 : 0.6);
        ctx.fillText(":" + s.track.loops[li].name, lx + laneW / 2, hitY + 23);
      });

      /* the now-line — this is when the statement sounds */
      const live = !!s.playInfo && s.elapsed !== null;
      ctx.beginPath();
      ctx.moveTo(2, hitY);
      ctx.lineTo(W - 2, hitY);
      ctx.strokeStyle = CLUB.ink;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = live ? 1 : 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const events = live ? s.playInfo.events : s.idle.events;
      const t = live ? s.elapsed : 0;

      const toks = [];
      for (const group of groupEvents(events)) {
        const ev = group[0];
        const lane = lanes.indexOf(ev.loopIdx);
        if (lane < 0) continue;
        const dt = ev.time - t;
        if (dt < -0.06 || dt > VIEW) continue;
        const key = `${ev.loopIdx}:${ev.line}`;
        toks.push({
          dt,
          lane,
          li: ev.loopIdx,
          lines: labelFor(group),
          hole: s.hole === key,
          sour: s.sour.has(key),
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
        const r = full * (tok.hole ? 1.28 : 1) * shrink;
        if (r < 4) continue;

        const ink = CHANNEL[tok.li % CHANNEL.length];
        ctx.globalAlpha = (1 - 0.5 * g) * (tok.li === s.focus ? 1 : 0.72) * (live ? 1 : 0.85);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);

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
          ctx.beginPath();
          ctx.arc(x, y, r + Math.max(2, 3 * shrink), 0, Math.PI * 2);
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

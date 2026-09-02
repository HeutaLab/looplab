import React, { useEffect, useMemo, useRef } from "react";
import { compileLoops } from "../engine/interpreter.js";
import { CHANNEL, CHANNEL_EDGE, CHANNEL_SHADOW, CLUB } from "../theme.js";

/* The highway is the ear.

   One lane per live_loop, notes written as the Sonic Pi that makes them,
   falling to a hit line. It is not a scoring game: nothing is tapped here and
   the hit line only ever means "this is the moment you hear it". Only the
   amber hole asks for anything.

   Flat vertical columns, per the In-the-Club handoff (3a). The previous
   version drew a perspective road with a vanishing point; that made a note
   crawl at the far end and whip past the line at the exact moment you needed
   to read it, and it is gone. */

export const channelInk = (track, idx) => CHANNEL[idx % CHANNEL.length];
const edgeOf = (idx) => CHANNEL_EDGE[idx % CHANNEL_EDGE.length];
const shadowOf = (idx) => CHANNEL_SHADOW[idx % CHANNEL_SHADOW.length];

function rgbOf(col) {
  const n = parseInt(col.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const tint = (col, a) => {
  const c = rgbOf(col);
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
};

/* roundRect is not on every school iPad yet, so trace it by hand. */
function roundRect(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/* Simultaneous notes in one loop are a chord — the track data writes those as
   consecutive `play` lines with no sleep between, which is real Sonic Pi and
   would otherwise stack three tiles on the same spot. */
function groupEvents(events) {
  const by = new Map();
  for (const ev of events) {
    const k = `${ev.loopIdx}:${ev.time.toFixed(4)}`;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(ev);
  }
  return [...by.values()];
}

/* A sample tile prints two lines; a play or a sleep prints one. */
function labelFor(group) {
  const first = group[0];
  if (first.kind !== "note") return ["sample", ":" + first.kind];
  if (group.length > 1) return ["play", group.map((e) => e.note).join(" ")];
  return ["play " + first.note];
}

export function ClubHighway({ track, loopLines, playInfo, elapsed, focus, hole, hit, sour, solo }) {
  const cv = useRef(null);
  const wrap = useRef(null);

  /* Standing still, the pit shows the top of the loop rather than an empty
     black box — a booth with the lights on but nothing playing yet. */
  const idle = useMemo(() => compileLoops(loopLines, track.bpm, 1), [loopLines, track.bpm]);

  /* The tightest gap between two notes, per lane, in beats.

     This used to be one number for the whole record, which was wrong in a way
     that hurt: a single 16th-note gap anywhere — Deep Down has one in :chords
     — collapsed the road for every lane, so the sparse :sub line the player
     was actually reading fell past in under two seconds. Density is a
     property of a lane, not of a track, so it is measured per lane and only
     ever shrinks that lane's own tiles. */
  const tightPerLane = useMemo(
    () =>
      loopLines.map((ls) => {
        let min = 4;
        let t = 0;
        let last = null;
        for (const L of ls) {
          if (L.t === "sleep") t += L.v;
          else if (L.t === "play" || L.t === "sample") {
            if (last !== null && t - last > 0.001) min = Math.min(min, t - last);
            last = t;
          }
        }
        return Math.max(0.2, min);
      }),
    [loopLines]
  );

  const state = useRef({});
  state.current = { track, loopLines, playInfo, elapsed, focus, hole, hit, sour, solo, idle, tightPerLane };
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

      const live = !!s.playInfo && s.elapsed !== null;
      const t0 = live ? s.elapsed : 0;
      const beat = 60 / s.track.bpm;

      /* The moment a line lands: 120ms to arrive, then 400ms to settle. Held
         as a 0..1 curve the tile, the lane and the hit line all read from, so
         the whole pit reacts to one event rather than three timers. */
      const age = s.hit ? performance.now() - s.hit.at : Infinity;
      const flash = age < 120 ? age / 120 : age < 520 ? 1 - (age - 120) / 400 : 0;

      const lanes = s.solo ? [s.focus] : s.loopLines.map((_, i) => i);
      const GAP = 7;
      const LABEL = 26; /* the band under the columns that names each lane */
      const colTop = 12; /* room for the YOUR LANE badge to sit on the edge */
      const colBottom = H - LABEL;
      const hitY = colTop + (colBottom - colTop) * 0.82;
      const laneW = (W - GAP * (lanes.length - 1)) / lanes.length;
      const laneX = (k) => k * (laneW + GAP);

      const span = hitY - colTop;
      const tileW = Math.min(laneW - 12, 68);

      /* Six beats of road — a bar and a half, the same musical distance at 125
         as at 140, and long enough that a tile can be read on the way down.
         It is fixed rather than derived: deriving it from density meant the
         busiest lane set the speed for all of them, which is how a sparse
         bassline ended up falling past in a second and a half. */
      const VIEWB = 6;
      const VIEW = beat * VIEWB;

      /* A busy lane gives way in tile size rather than making everything
         faster. Its own tightest gap has to leave a tile's worth of air. */
      const tileHOf = (li) =>
        Math.max(13, Math.min(34, laneW * 0.42, ((s.tightPerLane[li] || 1) / VIEWB) * span * 0.85));
      const yOf = (dt) => hitY - (dt / VIEW) * span;

      /* ---- equalizer floor: decorative, rising from the foot of the
             columns and drawn behind them, so it never fights the lane
             names in the band below ---- */
      const bars = 13;
      const bw = (W - GAP * (bars - 1)) / bars;
      ctx.globalAlpha = 0.16;
      for (let i = 0; i < bars; i++) {
        const wob = live ? 0.5 + 0.5 * Math.sin(t0 * 5 + i * 0.9) : 0.35;
        const bh = 10 + wob * 34;
        ctx.fillStyle = CHANNEL[i % CHANNEL.length];
        roundRect(ctx, i * (bw + GAP), colBottom - bh, bw, bh, 3);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* ---- the lane columns ---- */
      lanes.forEach((li, k) => {
        const x = laneX(k);
        const ink = channelInk(s.track, li);
        const on = li === s.focus;
        const g = ctx.createLinearGradient(0, colTop, 0, colBottom);
        g.addColorStop(0, tint(ink, on ? 0.06 : 0.03));
        g.addColorStop(1, tint(ink, on ? 0.24 : 0.16));
        if (on) {
          ctx.shadowColor = tint(ink, 0.3 + 0.2 * flash);
          ctx.shadowBlur = 20 + 10 * flash;
        }
        roundRect(ctx, x, colTop, laneW, colBottom - colTop, 13);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = tint(ink, on ? Math.min(1, 0.8 + 0.2 * flash) : 0.4);
        ctx.lineWidth = on ? 2.5 : 2;
        ctx.stroke();

        /* the lane says its own name, under its column */
        ctx.font = `700 10px ${MONO}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = tint(ink, on ? 1 : 0.75);
        ctx.fillText(":" + s.track.loops[li].name, x + laneW / 2, colBottom + LABEL / 2);
      });

      /* ---- the hit line ---- */
      const sinceBeat = live ? t0 - Math.floor(t0 / beat) * beat : beat;
      const pulse = live ? Math.max(0, 1 - sinceBeat / 0.16) : 0;
      ctx.shadowColor = tint(CLUB.ink, 0.7);
      ctx.shadowBlur = 14 + pulse * 12 + 14 * flash;
      ctx.beginPath();
      ctx.moveTo(0, hitY);
      ctx.lineTo(W, hitY);
      ctx.strokeStyle = CLUB.ink;
      ctx.lineWidth = 3 + pulse * 2;
      ctx.globalAlpha = live ? 1 : 0.55;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      /* ---- the notes ---- */
      const events = live ? s.playInfo.events : s.idle.events;
      const toks = [];
      for (const group of groupEvents(events)) {
        const ev = group[0];
        const k = lanes.indexOf(ev.loopIdx);
        if (k < 0) continue;
        const dt = ev.time - t0;
        if (dt < -0.08 || dt > VIEW) continue;
        const keys = group.map((g2) => `${g2.loopIdx}:${g2.line}`);
        toks.push({
          dt,
          k,
          li: ev.loopIdx,
          line: ev.line,
          lines: labelFor(group),
          sample: ev.kind !== "note",
          hole: keys.some((key) => s.hole === key),
          sour: keys.some((key) => s.sour.has(key)),
          landed: !!s.hit && keys.some((key) => s.hit.key === key),
        });
      }
      /* A sleep makes no sound, so it produces no event and never reached the
         pit — which meant that on the records whose We-do hole is a sleep, the
         one thing the player is being asked to write was the one thing not on
         the highway. Place it by walking the loop to find when that sleep
         falls, and repeat it on the loop's own cycle. */
      if (s.hole) {
        const [hl, hi] = s.hole.split(":").map(Number);
        const ls = s.loopLines[hl];
        const k = lanes.indexOf(hl);
        if (ls && ls[hi] && ls[hi].t === "sleep" && k >= 0) {
          let at = 0;
          let total = 0;
          for (let i = 0; i < ls.length; i++) {
            if (i === hi) at = total;
            if (ls[i].t === "sleep") total += ls[i].v;
          }
          const cycle = total * beat;
          if (cycle > 0.01) {
            const first = at * beat;
            const n0 = Math.floor((t0 - first) / cycle);
            for (let n = n0; n <= n0 + 2; n++) {
              const dt = first + n * cycle - t0;
              if (dt < -0.08 || dt > VIEW) continue;
              toks.push({ dt, k, li: hl, line: hi, lines: ["sleep ?"], hole: true, sour: false });
            }
          }
        }
      }

      /* Far first so near tiles sit on top, and the hole last of all: it is
         the one tile that must never be behind anything. */
      toks.sort((a, b) => (a.hole ? 1 : 0) - (b.hole ? 1 : 0) || b.dt - a.dt);
      let landedAt = null;

      for (const tk of toks) {
        const ink = channelInk(s.track, tk.li);
        const grow = tk.landed ? 1 + 0.12 * flash : 1;
        const tw = tileW * grow;
        /* A 16th-note lane shrinks to markers, which is right for percussion
           texture — but not for the hole. Warehouse writes into :bass, and
           :bass is 16ths, so the one tile the player has to read was the one
           being shrunk. It keeps full size and sits on top; a little overlap
           on the tile that matters beats a legible one nobody can read. */
        const th = (tk.hole ? Math.max(26, tileHOf(tk.li)) : tileHOf(tk.li)) * grow;
        const x = laneX(tk.k) + (laneW - tw) / 2;
        const y = yOf(tk.dt) - th / 2;
        const near = Math.max(0, 1 - tk.dt / (beat * 1.2));

        /* the hard drop shadow that makes a tile a tile */
        roundRect(ctx, x, y + 3, tw, th, 11);
        ctx.fillStyle = tk.hole ? tint(CLUB.write, 0.35) : shadowOf(tk.li);
        ctx.fill();

        if (near > 0.02 && !tk.hole) {
          ctx.shadowColor = tint(ink, 0.6 * near);
          ctx.shadowBlur = 16 * near;
        }
        roundRect(ctx, x, y, tw, th, 11);

        if (tk.hole) {
          /* the thing you write: absent, so it is dashed and hollow */
          ctx.fillStyle = tint(CLUB.write, 0.08);
          ctx.fill();
          ctx.shadowColor = tint(CLUB.write, 0.4);
          ctx.shadowBlur = 18;
          ctx.setLineDash([6, 5]);
          ctx.strokeStyle = CLUB.write;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (tk.landed && flash > 0) {
          /* the line just landed: it goes green and lights up, and it now
             reads the finished token instead of the question */
          landedAt = { cx: x + tw / 2, top: y };
          ctx.fillStyle = CLUB.ok;
          ctx.fill();
          ctx.shadowColor = tint(CLUB.ok, 0.9);
          ctx.shadowBlur = 26 * flash;
          ctx.strokeStyle = CLUB.okBorder;
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          ctx.fillStyle = tk.sour ? CLUB.sour : ink;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = tk.sour ? "#ff8a7a" : edgeOf(tk.li);
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        /* the token, printed on the tile */
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const cx = x + tw / 2;
        const cy = y + th / 2;
        if (tk.hole) {
          /* The hole is blank in the writing even though the record still
             plays its sour value — so the tile asks the question the script
             is asking, rather than showing the answer it has not been given. */
          const L = s.loopLines[tk.li] && s.loopLines[tk.li][tk.line];
          ctx.fillStyle = CLUB.write;
          ctx.font = `700 11px ${MONO}`;
          ctx.fillText((L ? L.t : "play") + " ?", cx, cy);
        } else if (tk.lines.length > 1 && th >= 24) {
          ctx.fillStyle = tint(CLUB.noteInk, 0.65);
          ctx.font = `700 ${Math.max(7, Math.min(8, th * 0.24)).toFixed(1)}px ${MONO}`;
          ctx.fillText(tk.lines[0], cx, cy - th * 0.17);
          ctx.fillStyle = CLUB.noteInk;
          const s2 = Math.max(8, Math.min(10, th * 0.3));
          ctx.font = `700 ${s2.toFixed(1)}px ${MONO}`;
          ctx.fillText(fit(ctx, tk.lines[1], tw - 10, s2), cx, cy + th * 0.17);
                } else if (th >= 16) {
          ctx.fillStyle = CLUB.noteInk;
          const s1 = Math.max(8, Math.min(11, th * 0.34));
          ctx.font = `700 ${s1.toFixed(1)}px ${MONO}`;
          ctx.fillText(fit(ctx, tk.lines[tk.lines.length - 1], tw - 10, s1), cx, cy);
        }
      }

      /* ---- the moment it lands ----

         A burst of amber light and one word, above the tile that just went
         green. It fires on a correct write and never on a wrong one: there
         is no failure state on this floor, a wrong answer simply plays sour
         and the room quietens a little. */
      if (flash > 0) {
        /* Anchored to the tile that landed when it happens to be on screen.
           The handoff assumes the line is committed as its note reaches the
           hit line; here it is committed whenever the player presses Write,
           so the note can be anywhere in the loop — and a celebration you
           cannot see is not a celebration. Falling back to the hit line in
           the lane being written means the moment always lands somewhere the
           eye already is. */
        const fb = lanes.indexOf(s.focus);
        const raw = landedAt ? landedAt.cx : laneX(Math.max(0, fb)) + laneW / 2;
        /* the word is wider than a lane, so keep it inside the canvas rather
           than letting it run off the first or last column */
        const bx = Math.max(58, Math.min(W - 58, raw));
        const by = (landedAt ? landedAt.top : hitY - tileHOf(s.focus) / 2) - 22;
        const burst = ctx.createRadialGradient(bx, by, 0, bx, by, 100 * (0.6 + 0.4 * flash));
        burst.addColorStop(0, tint(CLUB.write, 0.5 * flash));
        burst.addColorStop(0.7, tint(CLUB.write, 0));
        ctx.fillStyle = burst;
        ctx.fillRect(bx - 110, by - 110, 220, 220);

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate((-4 * Math.PI) / 180);
        ctx.scale(0.86 + 0.14 * Math.min(1, flash * 1.6), 0.86 + 0.14 * Math.min(1, flash * 1.6));
        ctx.font = `600 20px ${UI}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = tint(CLUB.ok, 0.9);
        ctx.shadowBlur = 16;
        ctx.globalAlpha = flash;
        ctx.fillStyle = CLUB.ok;
        /* canvas has no letter-spacing, so the word is drawn letter by letter
           to open the tracking Fredoka's heavy weight needs on a dark ground */
        const word = "PERFECT!";
        const track = 1.1;
        const widths = [...word].map((ch) => ctx.measureText(ch).width);
        const total = widths.reduce((a, b) => a + b, 0) + track * (word.length - 1);
        let wx = -total / 2;
        ctx.textAlign = "left";
        [...word].forEach((ch, i) => {
          ctx.fillText(ch, wx, 0);
          wx += widths[i] + track;
        });
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      /* ---- YOUR LANE, pinned to the top edge of the lane you write ---- */
      const fk = lanes.indexOf(s.focus);
      if (fk >= 0) {
        const label = "YOUR LANE";
        ctx.font = `700 9px ${UI}`;
        const tw = ctx.measureText(label).width + 18;
        const bx = laneX(fk) + (laneW - tw) / 2;
        roundRect(ctx, bx, colTop - 8, tw, 17, 99);
        ctx.fillStyle = CLUB.write;
        ctx.fill();
        ctx.fillStyle = CLUB.writeInk;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, bx + tw / 2, colTop + 0.5);
      }
    }

    /* shrink a token to fit its tile rather than let it run over the edge */
    function fit(c, text, room, size) {
      if (c.measureText(text).width <= room) return text;
      let out = text;
      while (out.length > 2 && c.measureText(out + "…").width > room) out = out.slice(0, -1);
      return out + "…";
    }

    const MONO = '"JetBrains Mono", ui-monospace, Menlo, "Courier New", monospace';
    const UI = '"Fredoka", system-ui, sans-serif';

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

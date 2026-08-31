import { SET_BARS, SCHED_AHEAD, MAX_BARS_PER_TICK } from "./liveSetConfig.js";
import { makeGlitch, makeRequest, requestMet } from "./liveSetEngine.js";
import React, { useState, useRef, useEffect } from "react";
import * as Tone from "tone";
import { optionsFor } from "../data/tracks.js";
import { compile } from "../engine/interpreter.js";
import { indents } from "../engine/sonicpi.js";
import { C, LEAD, PHASE } from "../theme.js";
import { CodeLine } from "../ui/CodeLine.jsx";
import { NoteHighway } from "../ui/NoteHighway.jsx";
import { BigButton, Chip, Crowd, Mentor } from "../ui/controls.jsx";

export function LiveSet({ track, startLines, ensureAudio, trigger, unlockMedia, stopAll, onFinish }) {
  const [running, setRunning] = useState(false);
  const [, force] = useState(0);
  const [sel, setSel] = useState(0);
  const [selLine, setSelLine] = useState(null);
  const [editNote, setEditNote] = useState(false);

  const eng = useRef(null); // engine state lives in a ref

  function initEngine() {
    eng.current = {
      lines: startLines.map((ls) => ls.map((x) => ({ ...x }))),
      muted: track.loops.map((lp) => !lp.startOn),
      bpm: track.bpm,
      bar: 0,
      hype: 40,
      score: 0,
      request: null,
      glitch: null,
      visEvents: [],
      audioStart: 0,
      perfStart: 0,
      nextBarTime: 0,
      queued: 0,      // bars handed to the scheduler
      barTimes: [],   // set-relative start time of each queued bar
      interval: null,
      msg: "Drums are rolling — build it up. Turn loops on to bring parts in.",
    };
  }

  async function startSet() {
    unlockMedia();
    const s = await ensureAudio();
    stopAll();
    initEngine();
    const e = eng.current;
    // Same short lead-in as every other bar, so the set opens the way it runs.
    e.audioStart = Tone.now() + SCHED_AHEAD;
    e.perfStart = performance.now() + SCHED_AHEAD * 1000;
    e.nextBarTime = 0;
    e.interval = setInterval(() => conduct(s), 90);
    setRunning(true);
    let raf;
    const loop = () => {
      force((x) => x + 1);
      if (eng.current && eng.current.interval) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function conduct(s) {
    const e = eng.current;
    if (!e) return;
    const now = Tone.now();
    const barDur = 4 * (60 / e.bpm);

    /* A hidden tab freezes this interval while the audio clock keeps running.
       The catch-up below would then schedule every missed bar in one tick with
       every note already in the past — silent, but still paying out hype and
       score for bars nobody heard, burning a third of the set on a tab switch.
       Slide both clocks forward instead and resume from here. */
    const behind = now - (e.audioStart + e.nextBarTime);
    if (behind > 2 * barDur) {
      e.audioStart += behind + 0.1;
      e.perfStart += (behind + 0.1) * 1000;
      e.visEvents.length = 0;
      e.msg = "Welcome back — picking the set up from here.";
    }

    // ---- scheduler: hand bars to Tone and to the highway, LEAD ahead ----
    let n = 0;
    while (e.queued < SET_BARS && e.audioStart + e.nextBarTime < now + SCHED_AHEAD && n++ < MAX_BARS_PER_TICK) {
      const barStart = e.nextBarTime;
      e.lines.forEach((ls, li) => {
        if (e.muted[li]) return;
        const { events } = compile(ls, e.bpm);
        events.forEach((ev, k) => {
          trigger(s, ev, e.audioStart + barStart + ev.time);
          e.visEvents.push({ ...ev, time: barStart + ev.time, id: `${e.queued}-${li}-${k}` });
        });
      });
      if (e.visEvents.length > 260) e.visEvents.splice(0, e.visEvents.length - 260);
      e.barTimes.push(barStart);
      e.queued++;
      e.nextBarTime += barDur;
    }

    /* ---- crowd: runs on the audible playhead, one bar behind the scheduler,
       so hype, requests and messages land with the music rather than a bar in
       front of it. ---- */
    while (e.bar < e.queued && e.audioStart + e.barTimes[e.bar] <= now) {
      const active = e.muted.filter((m) => !m).length;
      e.hype += active >= 3 ? 2 : active === 2 ? 1 : active === 1 ? 0 : -3;
      if (e.glitch) e.hype -= 3;
      // request lifecycle
      if (e.request) {
        e.request.left--;
        if (requestMet(e)) {
          e.hype += 15;
          e.msg = "The crowd loved that. Hype up!";
          e.request = null;
        } else if (e.request.left <= 0) {
          e.hype -= 10;
          e.msg = "The crowd gave up on that request.";
          e.request = null;
        }
      } else if (e.bar >= 4 && (e.bar - 4) % 8 === 0 && e.bar < SET_BARS - 6) {
        e.request = makeRequest(e, track);
        if (e.request) e.msg = `"${e.request.text}"`;
      }
      // glitch lifecycle
      if (!e.glitch && (e.bar === 10 || e.bar === 24 || e.bar === 38)) {
        e.glitch = makeGlitch(e, track);
        if (e.glitch) e.msg = `Glitch in the ${track.loops[e.glitch.loop].name} loop — fix it live!`;
      }
      if (e.glitch) {
        e.glitch.age++;
        const gl = e.lines[e.glitch.loop][e.glitch.line];
        if (String(gl.v) === String(e.glitch.orig)) {
          e.glitch = null;
          e.hype += 12;
          e.msg = "Live fix — the floor goes wild!";
        }
      }
      e.hype = Math.max(0, Math.min(100, e.hype));
      e.score += e.hype;
      e.bar++;
    }
    // Let the 48th bar ring out before the results card — the playhead reaches
    // bar 48 as the last bar *starts*, not as it finishes.
    if (e.bar >= SET_BARS && now >= e.audioStart + e.barTimes[SET_BARS - 1] + barDur) endSet();
  }

  function endSet() {
    const e = eng.current;
    clearInterval(e.interval);
    e.interval = null;
    setRunning(false);
    const avg = e.bar ? e.score / e.bar : 0;
    const record = e.bar < 16 ? null : avg >= 70 ? "gold" : avg >= 50 ? "silver" : avg >= 30 ? "bronze" : null;
    onFinish({ avg: Math.round(avg), bars: e.bar, record, lines: e.lines });
  }

  useEffect(
    () => () => {
      if (eng.current && eng.current.interval) clearInterval(eng.current.interval);
    },
    []
  );

  const e = eng.current;
  const elapsed = running && e ? (performance.now() - e.perfStart) / 1000 : null;
  const windowEvents = running && e ? e.visEvents.filter((ev) => ev.time - elapsed <= LEAD && ev.time - elapsed > -0.5) : [];
  const lines = e ? e.lines[sel] : startLines[sel];
  const ind = indents(lines);
  const glitchHere = e && e.glitch && e.glitch.loop === sel;

  if (!running && !e)
    return (
      <div className="flex flex-col gap-3">
        <Mentor text="The floor is packed and the lights are down. Start with the drums, build the track up loop by loop, answer the crowd's requests, and fix any glitches LIVE — your edits drop in on the next loop, just like a real live_loop. Ready?" />
        <BigButton onClick={startSet}>Start the set</BigButton>
      </div>
    );

  return (
    <div className={PHASE["gap-2"].grid}>
      <div className={PHASE["gap-2"].watch}>
      {/* crowd */}
      <div className="rounded-[4px] p-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between text-xs font-extrabold" style={{ color: C.dim }}>
          <span>
            Bar {Math.min(e.bar, SET_BARS)}/{SET_BARS}
          </span>
          <span>CROWD HYPE</span>
          <span style={{ color: e.hype >= 70 ? C.green : e.hype >= 35 ? C.yellow : C.red }}>{Math.round(e.hype)}%</span>
        </div>
        <div className="mt-1 h-3 w-full overflow-hidden rounded-full" style={{ background: "#151233" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${e.hype}%`,
              background: e.hype >= 70 ? C.green : e.hype >= 35 ? C.yellow : C.red,
            }}
          />
        </div>
        <div className="mt-1">
          <Crowd hype={e.hype} />
        </div>
        <div className="mt-1 text-center text-xs font-bold" role="status" aria-live="polite" style={{ color: e.request ? C.yellow : C.dim }}>
          {e.msg} {e.request ? `(${e.request.left} bars left)` : ""}
        </div>
      </div>

      <NoteHighway playInfo={{ events: windowEvents, startedAt: e.perfStart }} elapsed={elapsed} height={140} />
      </div>
      <div className={PHASE["gap-2"].edit}>

      {/* BPM + end */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-extrabold" style={{ color: C.dim }}>
          BPM
        </span>
        <Chip small onClick={() => (e.bpm = Math.max(118, e.bpm - 2))}>
          −
        </Chip>
        <span className="font-mono text-sm font-extrabold" style={{ color: C.yellow }}>
          {e.bpm}
        </span>
        <Chip small onClick={() => (e.bpm = Math.min(148, e.bpm + 2))}>
          +
        </Chip>
        <div className="flex-1" />
        <Chip small onClick={endSet}>
          End set
        </Chip>
      </div>

      {/* loop mixer */}
      <div className="flex flex-wrap gap-2">
        {track.loops.map((lp, i) => (
          <button
            key={lp.name}
            onClick={() => {
              setSel(i);
              setSelLine(null);
            }}
            className="rounded-[4px] px-2 py-1.5 text-xs font-extrabold"
            style={{
              background: sel === i ? C.yellow : C.panel2,
              color: sel === i ? "#1A1030" : e.muted[i] ? C.dim : C.ink,
              border: `2px solid ${e.glitch && e.glitch.loop === i ? C.red : sel === i ? C.yellow : C.line}`,
            }}
          >
            {lp.name}
            <span style={{ opacity: 0.75 }}>
              {e.glitch && e.glitch.loop === i ? " glitch" : e.muted[i] ? " off" : " on"}
            </span>
          </button>
        ))}
      </div>
      <BigButton
        color={e.muted[sel] ? C.green : C.orange}
        onClick={() => {
          e.muted[sel] = !e.muted[sel];
          e.msg = e.muted[sel] ? `Cut the ${track.loops[sel].name}.` : `${track.loops[sel].name} drops next bar.`;
        }}
      >
        {e.muted[sel] ? `Bring in the ${track.loops[sel].name} (next bar)` : `Cut the ${track.loops[sel].name}`}
      </BigButton>

      {/* live code editor */}
      <div className="max-h-44 overflow-y-auto rounded-[4px] p-2" style={{ background: "#151233", border: `1px solid ${glitchHere ? C.red : C.line}` }}>
        {lines.map((L, i) => (
          <CodeLine
            key={i}
            L={L}
            small
            indent={ind[i]}
            selected={selLine === i}
            warn={glitchHere && e.glitch.line === i && e.glitch.age >= 4}
            onTap={L.t === "synth" ? null : () => setSelLine(selLine === i ? null : i)}
          />
        ))}
      </div>
      {selLine !== null && (
        <div className="flex flex-wrap gap-1.5 rounded-[4px] p-2" style={{ background: C.panel, border: `1px solid ${C.yellow}` }}>
          <span className="w-full text-xs font-extrabold" style={{ color: C.yellow }}>
            Remix live — the change drops next loop
          </span>
          {optionsFor(lines[selLine], track.loops[sel].pool).map((o) => (
            <Chip
              key={o}
              small
              active={String(lines[selLine].v) === o}
              onClick={() => {
                const L = lines[selLine];
                L.v = L.t === "play" || L.t === "sleep" ? parseFloat(o) : o;
                setEditNote(true);
                setTimeout(() => setEditNote(false), 1500);
              }}
            >
              {lines[selLine].t === "sample" ? ":" + o : o}
            </Chip>
          ))}
        </div>
      )}
      {editNote && (
        <div className="text-center text-xs font-bold" style={{ color: C.aqua }}>
          Edit locked in — it drops on the next loop
        </div>
      )}
      </div>
    </div>
  );
}

/* ---------- results ---------- */

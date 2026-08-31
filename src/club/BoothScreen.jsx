import React, { useEffect, useMemo, useRef, useState } from "react";
import { applyBugs, optionsFor } from "../data/tracks.js";
import { lineText, lineTokens } from "../engine/sonicpi.js";
import { ClubHighway } from "./ClubHighway.jsx";
import "./booth.css";

/* The booth: one screen where a track is both played and learned.

   The instrument is a live_loop the player writes. The highway is the ear —
   it shows what that loop is sounding, and it is never something to tap in
   time. I do / We do / You do is the same ladder as the Studio, so nothing
   here has to be explained twice. */

const PHASES = [
  { key: "i", name: "I do", sub: "Watch" },
  { key: "we", name: "We do", sub: "Together" },
  { key: "you", name: "You do", sub: "Your turn" },
];

const REPS = 4; /* bars per scheduled pass; the loop re-arms itself at the end */

function useSolo() {
  const [solo, setSolo] = useState(() => window.matchMedia("(max-width: 699px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 699px)");
    const on = () => setSolo(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return solo;
}

/* Where each bug sits: the nth statement of its type, and what belongs there. */
function bugSitesOf(track) {
  return track.bugs
    .map((b) => {
      const [type, nth] = b.find;
      const lines = track.loops[b.loop].lines;
      let c = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].t !== type) continue;
        c++;
        if (c === nth) return { loop: b.loop, line: i, type, clean: lines[i].v, hint: b.hint };
      }
      return null;
    })
    .filter(Boolean);
}

export function BoothScreen({
  track,
  playInfo,
  playTag,
  elapsed,
  playMulti,
  stopAll,
  muted,
  setMuted,
  playerName,
  draft,
  saveDraft,
  onDone,
  back,
}) {
  const saved = (draft && draft.club && draft.club[track.id]) || null;
  const [fills, setFills] = useState(() => (saved && saved.boothFills) || {});
  const [phase, setPhase] = useState("we");
  const [hint, setHint] = useState("");
  const solo = useSolo();
  const want = useRef(null);
  const bodyRef = useRef(null);

  const sites = useMemo(() => bugSitesOf(track), [track]);
  const bugged = useMemo(() => applyBugs(track), [track]);

  const keyOf = (s) => `${s.loop}:${s.line}`;
  const solved = sites.map((s) => {
    const v = fills[keyOf(s)];
    return v !== undefined && String(v) === String(s.clean);
  });

  useEffect(() => {
    try {
      saveDraft("club", track.id, { boothFills: fills });
    } catch (e) {}
  }, [fills, track.id]);

  /* Which hole is open. We do is the first bug; You do is the rest. */
  let openHole = null;
  if (phase === "we") openHole = solved[0] ? null : 0;
  else if (phase === "you") {
    for (let i = 1; i < sites.length; i++)
      if (!solved[i]) {
        openHole = i;
        break;
      }
  }
  const site = openHole === null ? null : sites[openHole];
  const focus = site ? site.loop : sites[phase === "you" ? sites.length - 1 : 0].loop;
  const holeKey = site ? keyOf(site) : null;
  /* A blank is We do's move — You do shows the sour value to be changed. */
  const blank = !!site && phase === "we" && fills[holeKey] === undefined;
  const complete = solved.every(Boolean);

  const sour = useMemo(() => {
    const set = new Set();
    sites.forEach((s, i) => {
      if (!solved[i]) set.add(keyOf(s));
    });
    return set;
  }, [sites, fills]);

  /* What the record sounds like right now. The hole is a hole in the writing,
     not in the record: until they write over it, the sour note still plays —
     which is the whole point of being able to hear the fault. */
  const loopLines = useMemo(
    () =>
      bugged.map((ls, li) =>
        ls.map((L, i) => (fills[`${li}:${i}`] !== undefined ? { ...L, v: fills[`${li}:${i}`] } : L))
      ),
    [bugged, fills]
  );

  /* ---------- playback ---------- */

  const arrangement = (tag) => (tag === "goal" ? track.loops.map((l) => l.lines) : loopLines);
  function start(tag) {
    if (playTag === tag) {
      want.current = null;
      stopAll();
      return;
    }
    want.current = tag;
    setMuted(false);
    const go = () =>
      playMulti(
        arrangement(tag),
        tag,
        () => {
          /* a live_loop does not stop — re-arm unless they pressed stop */
          if (want.current === tag) go();
        },
        track.bpm,
        REPS
      );
    go();
  }
  useEffect(() => () => (want.current = null), []);

  /* ---------- writing ---------- */

  function tapChip(c) {
    if (!site) return;
    const v = c.t === "sample" ? c.v : parseFloat(c.v);
    setFills({ ...fills, [holeKey]: v });
    setHint(c.t === site.type && String(c.v) === String(site.clean) ? "" : site.hint);
  }

  /* The chips stay on screen when there is no hole open — locked, not gone, so
     the row never collapses and the writing tools never vanish mid-lesson. */
  const lastSite = useRef(sites[0]);
  if (site) lastSite.current = site;
  const chipSite = site || (phase === "i" ? sites[0] : lastSite.current);

  const chips = useMemo(() => {
    const site = chipSite;
    if (!site) return [];
    const loop = track.loops[site.loop];
    const house = loop.pool
      ? loop.pool.map((n) => ({ t: "play", v: String(n) }))
      : optionsFor({ t: "sample" }, null).map((d) => ({ t: "sample", v: d }));
    const used = loop.lines.filter((l) => l.t === "sleep").map((l) => String(l.v));
    const wrong = track.bugs
      .filter((b) => b.loop === site.loop && b.find[0] === "sleep")
      .map((b) => String(b.v));
    const sleeps = [...new Set(used.concat(wrong))]
      .sort((a, b) => a - b)
      .map((v) => ({ t: "sleep", v }));
    return [...house, ...sleeps];
  }, [chipSite, track]);

  /* ---------- the loop they write ---------- */

  const lines = loopLines[focus];
  const head = lines.filter((L) => L.t === "synth");
  const body = lines.map((L, i) => ({ L, i })).filter(({ L }) => L.t !== "synth");

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const row = el.querySelector('[data-hole="true"]') || el.querySelector("[data-bug]");
    if (row) el.scrollTop = Math.max(0, row.offsetTop - el.clientHeight / 2 + row.offsetHeight / 2);
  }, [focus, holeKey, phase]);

  /* the amber bar walks the loop as it plays */
  const nowLine =
    playInfo && elapsed !== null
      ? (() => {
          let line = null;
          for (const ev of playInfo.events) {
            if (ev.loopIdx !== focus) continue;
            if (ev.time <= elapsed && elapsed - ev.time < 0.35) line = ev.line;
            if (ev.time > elapsed) break;
          }
          return line;
        })()
      : null;

  function statement(L, i) {
    const key = `${focus}:${i}`;
    const toks = lineTokens(L);
    const word = toks[0][0];
    const value = toks.length > 1 ? toks[1][0] : "";
    if (key === holeKey && blank)
      return (
        <>
          {word}
          <span className="booth-hole">?</span>
        </>
      );
    if (sour.has(key)) return <>{word}<span className="booth-sour">{value}</span></>;
    if (fills[key] !== undefined) return <>{word}<span className="booth-fill">{value}</span></>;
    return lineText(L);
  }

  const phaseState = (k) => {
    const done = k === "i" ? phase !== "i" : k === "we" ? solved[0] : complete;
    if (k === phase) return done ? "on-done" : "on";
    return done ? "done" : "next";
  };

  return (
    <div className="booth">
      <header className="booth-hdr">
        <button type="button" className="booth-back" onClick={back} aria-label="Back to the crate">
          &larr;
        </button>
        <h1 className="booth-who">
          {playerName} &middot; <b>{track.title}</b> &middot; {track.bpm} BPM
        </h1>
        <button
          type="button"
          className="booth-silence"
          data-muted={muted ? "true" : "false"}
          onClick={() => setMuted(!muted)}
        >
          {muted ? "Sound is off" : "Silence the room"}
        </button>
      </header>

      <nav className="booth-phases" aria-label="Lesson phase">
        {PHASES.map((p) => (
          <button
            key={p.key}
            type="button"
            className="booth-phase"
            data-state={phaseState(p.key)}
            aria-current={p.key === phase ? "step" : undefined}
            onClick={() => {
              setPhase(p.key);
              setHint("");
            }}
          >
            <span className="n">{p.name}</span>
            <span className="s">{p.sub}</span>
          </button>
        ))}
      </nav>

      <main className="booth-stage">
        <ClubHighway
          track={track}
          loopLines={playTag === "goal" ? track.loops.map((l) => l.lines) : loopLines}
          playInfo={playInfo}
          elapsed={elapsed}
          focus={focus}
          hole={blank ? holeKey : null}
          sour={playTag === "goal" ? new Set() : sour}
          solo={solo}
        />

        <section className="booth-write">
          <pre className="booth-code">
            {head.map((L, i) => (
              <div className="booth-ln" key={`h${i}`}>
                <span className="bar" />
                <span className="booth-kw">{lineText(L)}</span>
              </div>
            ))}
            <div className="booth-ln">
              <span className="bar" />
              <span className="booth-kw">live_loop :{track.loops[focus].name} do</span>
            </div>
            <div className="booth-body" ref={bodyRef}>
              {body.map(({ L, i }) => {
                const key = `${focus}:${i}`;
                const isHole = key === holeKey;
                return (
                  <div
                    className="booth-ln"
                    key={i}
                    data-now={nowLine === i ? "true" : undefined}
                    data-hole={isHole ? "true" : undefined}
                    data-bug={sour.has(key) || fills[key] !== undefined ? "" : undefined}
                  >
                    <span className="bar" />
                    {"  "}
                    {statement(L, i)}
                  </div>
                );
              })}
            </div>
            <div className="booth-ln">
              <span className="bar" />
              <span className="booth-kw">end</span>
            </div>
          </pre>

          <p className="booth-hint" role="status" aria-live="polite" data-show={hint ? "true" : "false"}>
            {hint}
          </p>

          <div className="booth-chips">
            <span className="booth-legend">Write with these</span>
            {chips.map((c, i) => (
              <button
                key={i}
                type="button"
                className="booth-chip"
                disabled={phase === "i" || !site}
                onClick={() => tapChip(c)}
              >
                {lineText({ t: c.t, v: c.t === "sample" ? c.v : c.v })}
              </button>
            ))}
          </div>

          <div className="booth-actions">
            <button
              type="button"
              className="booth-btn ghost"
              data-on={playTag === "goal" ? "true" : undefined}
              onClick={() => start("goal")}
            >
              {playTag === "goal" ? "Stop" : "Hear the goal"}
            </button>
            <button
              type="button"
              className="booth-btn solid"
              data-on={playTag === "mine" ? "true" : undefined}
              onClick={() => start("mine")}
            >
              {playTag === "mine" ? "Stop" : "Play this loop"}
            </button>
            {complete && (
              <button
                type="button"
                className="booth-btn solid"
                onClick={() => {
                  want.current = null;
                  stopAll();
                  onDone(loopLines.map((ls) => ls.map((x) => ({ ...x }))));
                }}
              >
                Take the booth
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

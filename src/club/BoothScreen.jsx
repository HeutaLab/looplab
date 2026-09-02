import React, { useEffect, useMemo, useRef, useState } from "react";
import { applyBugs, optionsFor } from "../data/tracks.js";
import { lineText, lineTokens } from "../engine/sonicpi.js";
import { ClubHighway, channelInk } from "./ClubHighway.jsx";
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
  const [typed, setTyped] = useState("");
  /* The room's opinion. A clean fix raises it, a wrong one costs a little,
     and it never empties — nothing in the booth is allowed to read as
     failure. Combo counts clean fixes in a row. */
  const [combo, setCombo] = useState(0);
  const [crowd, setCrowd] = useState(0.35);
  /* The moment a line lands. Held for just over a second so the tile can go
     green, the room can react and the script can say it is locked in — then
     it clears and the loop carries on. Only ever fires on a correct write:
     a wrong one is not a failure state, it is just a sour note. */
  const [hit, setHit] = useState(null);
  const hitTimer = useRef(null);
  useEffect(() => () => clearTimeout(hitTimer.current), []);
  const solo = useSolo();
  const mode = track.codeMode || "chips";
  const [showChips, setShowChips] = useState(false);
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

  function write(kind, raw) {
    if (!site) return;
    const v = kind === "sample" ? String(raw).replace(/^:/, "") : parseFloat(raw);
    if (kind !== "sample" && !Number.isFinite(v)) {
      /* never an error message — the hole simply has not been written yet */
      setHint(site.hint);
      return;
    }
    const right = kind === site.type && String(v) === String(site.clean);
    setFills({ ...fills, [holeKey]: v });
    setHint(right ? "" : site.hint);
    setTyped("");
    setCombo((c) => (right ? c + 1 : 0));
    setCrowd((c) => Math.max(0.15, Math.min(1, c + (right ? 0.25 : -0.1))));
    if (right) {
      setHit({ key: holeKey, at: performance.now() });
      clearTimeout(hitTimer.current);
      hitTimer.current = setTimeout(() => setHit(null), 1150);
    }
  }
  const tapChip = (c) => write(c.t, c.v);

  /* The chips stay on screen when there is no hole open — locked, not gone, so
     the row never collapses and the writing tools never vanish mid-lesson. */
  const lastSite = useRef(sites[0]);
  if (site) lastSite.current = site;
  const chipSite = site || (phase === "i" ? sites[0] : lastSite.current);

  const laneInk = channelInk(track, chipSite ? chipSite.loop : 0);

  /* The ring fills towards the next star rather than towards a high score:
     three holes to a star on most records, so a full ring is a clean phase. */
  const comboPct = Math.min(100, (combo % 3 === 0 && combo > 0 ? 3 : combo % 3) * 33.4);
  const crowdWord = crowd >= 0.85 ? "Hyped!" : crowd >= 0.6 ? "Going off" : crowd >= 0.35 ? "Moving" : "Warming up";
  /* A star per hole fixed. Being on a tab is not an achievement — the first
     version handed one out for simply landing on We do, which is where the
     booth opens. */
  const starsEarned = Math.min(3, solved.filter(Boolean).length);
  /* one box per character of the answer — short values get boxes, a long
     sample name gets a field, because eighteen boxes is not a scaffold */
  const answerLen = site ? String(site.clean).length : 0;

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
    if (fills[key] !== undefined)
      return (
        <>
          {word}
          <span className="booth-fill">{value}</span>
          {hit && hit.key === key && <span className="booth-locked"> &#10003; locked in</span>}
        </>
      );
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
        <span className="booth-stars" aria-label={`${starsEarned} of 3 stars`}>
          {[0, 1, 2].map((i) => (
            <svg key={i} width="15" height="15" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M10 1.6l2.5 5.4 5.9.7-4.4 4 1.2 5.8L10 14.6 4.8 17.5 6 11.7 1.6 7.7l5.9-.7z"
                fill={i < starsEarned ? "#ffb703" : "rgba(243,238,228,.25)"}
              />
            </svg>
          ))}
        </span>
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
          hit={hit}
          sour={playTag === "goal" ? new Set() : sour}
          solo={solo}
        />

        <aside className="booth-rail">
          <div
            className="booth-combo"
            data-hot={hit || combo >= 2 ? "true" : undefined}
            style={{
              background: `conic-gradient(var(--ok) 0 ${comboPct}%, rgba(243,238,228,.12) ${comboPct}% 100%)`,
            }}
          >
            <div className="booth-combo-in">
              <span className="booth-combo-n">&times;{combo}</span>
              <span className="booth-combo-l">COMBO</span>
            </div>
          </div>

          <div className="booth-crowd">
            <span className="booth-crowd-l">CROWD</span>
            <div
              className="booth-crowd-track"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(crowd * 100)}
              aria-label={`Crowd: ${crowdWord}`}
            >
              <div className="booth-crowd-fill" style={{ height: `${crowd * 100}%`, "--w": `${crowd * 100}%` }} />
            </div>
            <span className="booth-crowd-cap" data-up={hit ? "true" : undefined}>
              {hit ? "Crowd goes up!" : crowdWord}
            </span>
          </div>
        </aside>

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
                    data-locked={fills[key] !== undefined && !sour.has(key) ? "true" : undefined}
                    data-hit={hit && hit.key === key ? "true" : undefined}
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

          {/* How you write depends on the record, the same ramp the Studio
              runs: tap a chip on the first tracks, type it by Rave Siren.
              Dropping back to the chips is always one tap and is never
              called failure. */}
          <div className="booth-chips">
            {mode !== "chips" && site && (
              <form
                className="booth-type"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (typed.trim()) write(site.type, typed.trim());
                }}
              >
                <div>
                  <label className="booth-type-label" htmlFor="booth-input">
                    TYPE IT &mdash; {site.type} ?
                  </label>
                  {answerLen <= 8 ? (
                    <div className="booth-boxes">
                      <input
                        id="booth-input"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value.slice(0, answerLen))}
                        disabled={phase === "i"}
                        inputMode={site.type === "sample" ? "text" : "decimal"}
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck="false"
                        aria-label={`Type the ${site.type} value, ${answerLen} characters`}
                      />
                      {Array.from({ length: answerLen }, (_, i) => {
                        const on = i < typed.length ? "filled" : i === typed.length ? "current" : "empty";
                        return (
                          <span key={i} className="booth-box" data-on={on} aria-hidden="true">
                            {typed[i] || (on === "current" ? <span className="booth-caret" /> : "")}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      id="booth-input"
                      className="booth-type-wide"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      disabled={phase === "i"}
                      placeholder={site.type === "sample" ? ":bd_haus" : "0.5"}
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck="false"
                      aria-label={`Type the ${site.type} value`}
                    />
                  )}
                </div>
                <button type="submit" className="booth-chip" disabled={phase === "i" || !typed.trim()}>
                  Write
                </button>
              </form>
            )}
            {(mode !== "typed" || showChips) && (
              <>
                <span className="booth-legend">Write with these</span>
                {chips.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className="booth-chip"
                    /* A chip is coloured by what it writes. A note or a sample
                       takes the colour of the lane it is going into, so the
                       pill and the lane in the pit are visibly the same thing.
                       A sleep is silence — it takes no colour, because it makes
                       no sound, and that is the difference the row was hiding
                       when every pill looked identical. */
                    data-kind={c.t}
                    style={c.t === "sleep" ? undefined : { color: laneInk, borderColor: laneInk }}
                    disabled={phase === "i" || !site}
                    onClick={() => tapChip(c)}
                  >
                    {lineText({ t: c.t, v: c.v })}
                  </button>
                ))}
              </>
            )}
            {mode === "typed" && site && (
              <button type="button" className="booth-chip booth-ghost" onClick={() => setShowChips((v) => !v)}>
                {showChips ? "Hide the chips" : "Stuck? Show the chips"}
              </button>
            )}
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

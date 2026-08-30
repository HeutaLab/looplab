import React, { useState, useMemo } from "react";
import { D, END, LOOP, P, S, SY, compile } from "../engine/interpreter.js";
import { indents, toSonicPi } from "../engine/sonicpi.js";
import { useActiveLine } from "../hooks/useClock.js";
import { C, PHASE } from "../theme.js";
import { CodeLine } from "../ui/CodeLine.jsx";
import { CopyCodeModal } from "../ui/CopyCodeModal.jsx";
import { NoteHighway } from "../ui/NoteHighway.jsx";
import { BigButton, Chip, Mentor } from "../ui/controls.jsx";

export function YourTurnPhase({ level, playInfo, playTag, elapsed, playLines, stopAll, completePhase }) {
  const yt = level.yourTurn;
  const pal = yt.palette;
  const [inner, setInner] = useState([]);
  const [loopCount, setLoopCount] = useState(1);
  const [synth, setSynth] = useState("beep");
  const [playedOnce, setPlayedOnce] = useState(false);
  const [showCopy, setShowCopy] = useState(false);

  const effective = useMemo(() => {
    const body = loopCount > 1 ? [LOOP(loopCount), ...inner, END()] : [...inner];
    return synth !== "beep" ? [SY(synth), ...body] : body;
  }, [inner, loopCount, synth]);

  const stats = useMemo(() => {
    const plays = inner.filter((l) => l.t === "play").length;
    const sleeps = inner.filter((l) => l.t === "sleep").length;
    const drumLines = inner.filter((l) => l.t === "sample").length;
    const distinctNotes = new Set(inner.filter((l) => l.t === "play").map((l) => l.v)).size;
    const distinctDrums = new Set(inner.filter((l) => l.t === "sample").map((l) => l.v)).size;
    const drumEvents = compile(effective).events.filter((e) => e.kind !== "note").length;
    return { plays, sleeps, drumLines, distinctNotes, distinctDrums, drumEvents, loopCount, synth };
  }, [inner, effective, loopCount, synth]);

  const goalsMet = yt.goals.map((g) => g.test(stats));
  const allMet = goalsMet.every(Boolean);
  const activeLine = useActiveLine(playInfo, elapsed);
  const ind = indents(effective);

  const add = (line) => inner.length < 24 && setInner([...inner, line]);

  return (
    <div className={PHASE["gap-3"].grid}>
      <div className={PHASE["gap-3"].watch}>
      <Mentor text={allMet ? "All goals unlocked — press play and take a bow! 🌟" : yt.mentor} />
      <div className="rounded-2xl p-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        {yt.goals.map((g, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5 text-sm font-bold" style={{ color: goalsMet[i] ? C.green : C.dim }}>
            <span>{goalsMet[i] ? "✅" : "⬜"}</span> {g.label}
          </div>
        ))}
      </div>
      <NoteHighway playInfo={playInfo} elapsed={elapsed} />
      </div>
      <div className={PHASE["gap-3"].edit}>
      <div className="rounded-2xl p-2" style={{ background: "#151233", border: `1px solid ${C.line}` }}>
        {effective.length === 0 && (
          <div className="px-2 py-3 text-center text-sm font-semibold" style={{ color: C.dim }}>
            Your code goes here — tap chips below to add lines! 👇
          </div>
        )}
        {effective.map((L, i) => {
          const isInner = inner.includes(L);
          return (
            <div key={i} className="flex items-center">
              <div className="flex-1">
                <CodeLine L={L} indent={ind[i]} active={playTag === "mine" && activeLine === i} />
              </div>
              {isInner && !playInfo && (
                <button
                  onClick={() => setInner(inner.filter((x) => x !== L))}
                  className="ml-1 rounded-lg px-2 text-xs font-extrabold"
                  style={{ color: C.pink, background: "rgba(255,92,168,0.12)", height: 26 }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pal.loop && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold" style={{ color: C.dim }}>
            🔁 Repeat:
          </span>
          {[1, 2, 3, 4].map((n) => (
            <Chip key={n} small active={loopCount === n} onClick={() => setLoopCount(n)}>
              {n === 1 ? "off" : "×" + n}
            </Chip>
          ))}
        </div>
      )}
      {pal.synth && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold" style={{ color: C.dim }}>
            🎹 Sound:
          </span>
          {["beep", "saw", "square", "pretty_bell"].map((s) => (
            <Chip key={s} small active={synth === s} onClick={() => setSynth(s)}>
              :{s}
            </Chip>
          ))}
        </div>
      )}
      {pal.notes && (
        <div className="flex flex-wrap gap-1.5">
          {pal.notes.map((n) => (
            <Chip key={n} small onClick={() => add(P(n))}>
              play {n}
            </Chip>
          ))}
        </div>
      )}
      {pal.drums && (
        <div className="flex flex-wrap gap-1.5">
          {pal.drums.map((d) => (
            <Chip key={d} small onClick={() => add(D(d))}>
              :{d}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {pal.sleeps.map((t) => (
          <Chip key={t} small onClick={() => add(S(t))}>
            sleep {t}
          </Chip>
        ))}
        {inner.length > 0 && (
          <Chip small onClick={() => setInner([])}>
            🗑 clear
          </Chip>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <BigButton
          color={C.aqua}
          disabled={inner.length === 0}
          onClick={() => (playInfo ? stopAll() : playLines(effective, "mine", () => setPlayedOnce(true)))}
        >
          {playInfo ? "■ Stop" : "▶ Play my track"}
        </BigButton>
        <BigButton disabled={!(allMet && playedOnce)} onClick={() => completePhase(2)}>
          Finish level ⭐
        </BigButton>
        {inner.length > 0 && (
          <BigButton color={C.violet} onClick={() => setShowCopy(true)}>
            📋
          </BigButton>
        )}
      </div>
      {allMet && !playedOnce && (
        <div className="text-center text-xs font-bold" style={{ color: C.yellow }}>
          Goals done — now play your track to finish! 🎵
        </div>
      )}
      {showCopy && <CopyCodeModal text={toSonicPi(effective)} onClose={() => setShowCopy(false)} />}
      </div>
    </div>
  );
}

/* ---------- Build Lab: write the code yourself, stage by stage ---------- */

import React, { useState, useMemo } from "react";
import { MAX_PREVIEW, safeNum } from "../engine/interpreter.js";
import { chipLabel, indents, lineTokens } from "../engine/sonicpi.js";
import { useActiveLine } from "../hooks/useClock.js";
import { C, PHASE, tokColor } from "../theme.js";
import { CodeLine } from "../ui/CodeLine.jsx";
import { NoteHighway } from "../ui/NoteHighway.jsx";
import { BigButton, Chip, Mentor } from "../ui/controls.jsx";

export function TogetherPhase({ level, playInfo, playTag, elapsed, playLines, playMulti, stopAll, completePhase }) {
  const tg = level.together;
  const bpm = tg.bpm || 60;
  const play = (lines, tag, onEnd, maxDur = 0) =>
    tg.overLoop ? playMulti([tg.overLoop, lines], tag, onEnd, bpm, 2, maxDur) : playLines(lines, tag, onEnd, bpm, maxDur);
  const blanksMeta = useMemo(() => tg.lines.map((L, i) => (L.blank !== undefined ? i : null)).filter((x) => x !== null), [tg]);
  const [fills, setFills] = useState(() => blanksMeta.map(() => null));
  const [msg, setMsg] = useState(null);
  const [won, setWon] = useState(false);
  const ind = indents(tg.lines);
  const activeLine = useActiveLine(playInfo, elapsed);

  function substituted(useAnswers) {
    let b = 0;
    return tg.lines.map((L) => {
      if (L.blank === undefined) return L;
      const raw = useAnswers ? L.blank : fills[b++];
      let v = raw;
      // Blanks fill left to right, so any chip can reach any blank. Fall back
      // to a harmless value rather than NaN — the answer is wrong either way,
      // and the hint below is what actually tells the player so.
      if (L.t === "play") v = safeNum(raw, 60);
      else if (L.t === "sleep") v = safeNum(raw, 0.5);
      else if (L.t === "bpm") v = safeNum(raw, 120);
      else if (L.t === "loop") v = safeNum(raw, 1);
      else if (L.t === "playChoose") v = String(raw).split(",").map((x) => safeNum(x, 60));
      else if (L.t === "sampleChoose") v = String(raw).split(",");
      return { t: L.t, v };
    });
  }

  function tapChip(chip) {
    const idx = fills.findIndex((f) => f === null);
    if (idx === -1) return;
    const n = [...fills];
    n[idx] = chip;
    setFills(n);
    setMsg(null);
  }
  function clearBlank(bIdx) {
    const n = [...fills];
    n[bIdx] = null;
    setFills(n);
    setMsg(null);
  }

  function playMine() {
    if (fills.some((f) => f === null)) {
      setMsg("Fill every ❓ blank first!");
      return;
    }
    const correct = tg.lines.filter((L) => L.blank !== undefined).every((L, i) => String(fills[i]) === String(L.blank));
    // Show the hint straight away instead of at the end of playback: a wrong
    // chip in a `sleep` blank meant 30-70 seconds of silence before the player
    // was told anything. They still hear their attempt, capped to MAX_PREVIEW.
    if (!correct) setMsg(tg.hint);
    play(substituted(false), "mine", () => {
      if (correct) setWon(true);
    }, MAX_PREVIEW);
  }

  let bCounter = -1;
  return (
    <div className={PHASE["gap-3"].grid}>
      <div className={PHASE["gap-3"].watch}>
      <Mentor text={won ? "PERFECT! 🎉 You fixed the track — that star is yours!" : tg.mentor} />
      <NoteHighway playInfo={playInfo} elapsed={elapsed} />
      </div>
      <div className={PHASE["gap-3"].edit}>
      <div className="rounded-2xl p-2" style={{ background: "#151233", border: `1px solid ${C.line}` }}>
        {tg.lines.map((L, i) => {
          const isBlank = L.blank !== undefined;
          if (isBlank) bCounter++;
          const bIdx = bCounter;
          return (
            <CodeLine key={i} L={L} indent={ind[i]} active={activeLine === i}>
              {isBlank ? (
                <>
                  {L.t !== "loop" && (
                    <span style={{ color: tokColor.kw, whiteSpace: "pre" }}>{lineTokens({ t: L.t, v: "" })[0][0]}</span>
                  )}
                  <button
                    onClick={() => fills[bIdx] !== null && clearBlank(bIdx)}
                    className="mx-0.5 rounded-lg px-2 py-0.5 font-mono font-bold"
                    style={{
                      border: `2px dashed ${fills[bIdx] !== null ? C.yellow : C.pink}`,
                      background: fills[bIdx] !== null ? "rgba(255,211,77,0.15)" : "rgba(255,92,168,0.1)",
                      color: fills[bIdx] !== null ? C.yellow : C.pink,
                    }}
                  >
                    {fills[bIdx] !== null ? (L.t === "sample" || L.t === "synth" ? ":" + fills[bIdx] : fills[bIdx]) : "❓"}
                  </button>
                  {L.t === "loop" && <span style={{ color: tokColor.kw }}>.times do</span>}
                </>
              ) : null}
            </CodeLine>
          );
        })}
      </div>
      {!won && (
        <div className="flex flex-wrap gap-2">
          {tg.chips.map((c) => (
            <Chip key={c} onClick={() => tapChip(c)}>
              {chipLabel(c)}
            </Chip>
          ))}
          <Chip
            small
            onClick={() => {
              setFills(blanksMeta.map(() => null));
              setMsg(null);
            }}
          >
            ↺ reset
          </Chip>
        </div>
      )}
      {msg && (
        <div className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: "rgba(255,154,87,0.15)", color: C.orange }}>
          {msg}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <BigButton color={C.violet} onClick={() => (playTag === "target" ? stopAll() : play(substituted(true), "target"))}>
          {playTag === "target" ? "■ Stop" : "🎧 Hear the goal"}
        </BigButton>
        {!won ? (
          <BigButton color={C.aqua} onClick={() => (playTag === "mine" ? stopAll() : playMine())}>
            {playTag === "mine" ? "■ Stop" : "▶ Play & check"}
          </BigButton>
        ) : (
          <BigButton onClick={() => completePhase(1)}>⭐ Next: Your turn 🚀</BigButton>
        )}
      </div>
      </div>
    </div>
  );
}

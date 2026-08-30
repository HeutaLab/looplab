import React, { useState } from "react";
import { useActiveLine } from "../hooks/useClock.js";
import { C, PHASE } from "../theme.js";
import { CodeView } from "../ui/CodeLine.jsx";
import { NoteHighway } from "../ui/NoteHighway.jsx";
import { BigButton, Mentor } from "../ui/controls.jsx";

export function WatchPhase({ level, playInfo, playTag, elapsed, playLines, playMulti, stopAll, completePhase }) {
  const [done, setDone] = useState(false);
  const w = level.watch;
  const activeLine = useActiveLine(playInfo, elapsed);
  const multi = !!w.loops;
  return (
    <div className={PHASE["gap-3"].grid}>
      <div className={PHASE["gap-3"].watch}>
      <Mentor text={done ? w.after : w.mentor} />
      <NoteHighway playInfo={playInfo} elapsed={elapsed} />
      </div>
      <div className={PHASE["gap-3"].edit}>
      {multi ? (
        <div className="flex flex-col gap-2">
          {w.loops.map((lp) => (
            <div key={lp.name}>
              <div className="mb-1 font-mono text-xs font-bold" style={{ color: C.violet }}>
                live_loop :{lp.name} do
              </div>
              <CodeView lines={lp.lines} small />
              <div className="mt-1 font-mono text-xs font-bold" style={{ color: C.violet }}>
                end
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CodeView lines={w.lines} activeLine={playTag === "demo" ? activeLine : null} />
      )}
      <div className="flex gap-2">
        <BigButton
          color={C.aqua}
          onClick={() =>
            playInfo
              ? stopAll()
              : multi
              ? playMulti(w.loops.map((l) => l.lines), "demo", () => setDone(true), w.bpm || 60, 2)
              : playLines(w.lines, "demo", () => setDone(true))
          }
        >
          {playInfo ? "■ Stop" : "▶ Play DJ Loop's code"}
        </BigButton>
        <BigButton disabled={!done} onClick={() => completePhase(0)}>
          Got it! Next 🤝
        </BigButton>
      </div>
      </div>
    </div>
  );
}

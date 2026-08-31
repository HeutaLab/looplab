import React from "react";
import { PHASES } from "../data/levels.js";
import { BuildPhase } from "../phases/BuildPhase.jsx";
import { TogetherPhase } from "../phases/TogetherPhase.jsx";
import { WatchPhase } from "../phases/WatchPhase.jsx";
import { YourTurnPhase } from "../phases/YourTurnPhase.jsx";
import { C } from "../theme.js";
import { Stars } from "../ui/controls.jsx";

export function LevelScreen(props) {
  const { level, levelIdx, phase, setPhase, stars, back } = props;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button onClick={back} aria-label="Back to the map" className="text-xl" style={{ color: C.dim, minWidth: 44, minHeight: 44 }}>
          ←
        </button>
        <div className="flex-1">
          <div className="text-[11px] font-bold uppercase" style={{ color: C.dim, letterSpacing: "0.16em" }}>
            Level {levelIdx + 1}
          </div>
          <h1 className="text-lg font-bold">{level.title}</h1>
        </div>
        <Stars n={stars} size={15} />
      </div>
      {/* The same three tabs as the booth: a word, its job underneath, and a
          rule under the one you are on. They were three filled violet slabs,
          which made the phase you were in look like a pressed button rather
          than the place you are. */}
      <div className="grid grid-cols-3" style={{ borderBottom: `1px solid ${C.line}` }}>
        {PHASES.map((p0, i) => {
          const p = i === 2 && level.build ? { ...p0, sub: "Build it" } : p0;
          const unlocked = i <= stars;
          const current = i === phase;
          const done = i < stars;
          return (
            <button
              key={p.key}
              onClick={() => unlocked && setPhase(i)}
              /* A locked tab used to be a live button that swallowed the tap
                 and said nothing. Now it reads as locked to a screen reader
                 too, and the padlock says why to everyone else. */
              disabled={!unlocked}
              aria-disabled={!unlocked || undefined}
              aria-current={current ? "step" : undefined}
              className="flex flex-col items-center gap-0.5 px-1 pb-2 pt-1"
              style={{
                minHeight: 48,
                marginBottom: -1,
                borderBottom: `2px solid ${current ? (done ? C.green : C.ink) : "transparent"}`,
                color: done ? C.green : current ? C.ink : C.dim,
                opacity: unlocked ? 1 : 0.45,
              }}
            >
              <span className="text-base font-bold">
                {p.label}
                {!unlocked && <span className="sr-only"> (locked)</span>}
              </span>
              <span className="text-[10px] font-bold uppercase" style={{ letterSpacing: "0.14em" }}>
                {p.sub}
              </span>
            </button>
          );
        })}
      </div>
      {phase === 0 && <WatchPhase {...props} key={`w${levelIdx}`} />}
      {phase === 1 && <TogetherPhase {...props} key={`t${levelIdx}`} />}
      {phase === 2 && (level.build ? <BuildPhase {...props} key={`b${levelIdx}`} /> : <YourTurnPhase {...props} key={`y${levelIdx}`} />)}
      {/* Advice for a real problem, not a permanent footer on every screen —
          it shows once, on the phase where they have not yet heard anything. */}
      {phase === 0 && stars === 0 && (
        <div className="text-[11px]" style={{ color: C.dim }}>
          No sound? Turn the volume up, switch off silent mode, and tap play again.
        </div>
      )}
    </div>
  );
}

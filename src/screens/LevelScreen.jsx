import React from "react";
import { PHASES } from "../data/levels.js";
import { BuildPhase } from "../phases/BuildPhase.jsx";
import { TogetherPhase } from "../phases/TogetherPhase.jsx";
import { WatchPhase } from "../phases/WatchPhase.jsx";
import { YourTurnPhase } from "../phases/YourTurnPhase.jsx";
import { C } from "../theme.js";

export function LevelScreen(props) {
  const { level, levelIdx, phase, setPhase, stars, back } = props;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button onClick={back} className="rounded-xl px-3 py-2 font-extrabold" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
          ←
        </button>
        <div className="flex-1">
          <div className="text-lg font-extrabold">
            {level.emoji} Level {levelIdx + 1}: {level.title}
          </div>
        </div>
        <div className="text-sm" style={{ color: C.yellow }}>
          {"⭐".repeat(stars)}
          <span style={{ opacity: 0.25 }}>{"⭐".repeat(3 - stars)}</span>
        </div>
      </div>
      <div className="flex gap-2">
        {PHASES.map((p0, i) => {
          const p = i === 2 && level.build ? { ...p0, sub: "Build it", icon: "🧱" } : p0;
          const unlocked = i <= stars;
          const current = i === phase;
          return (
            <button
              key={p.key}
              onClick={() => unlocked && setPhase(i)}
              className="flex-1 rounded-2xl px-1 py-2 text-center"
              style={{
                background: current ? C.violet : C.panel,
                color: current ? "#1A1030" : unlocked ? C.ink : C.dim,
                border: `2px solid ${current ? C.violet : C.line}`,
                opacity: unlocked ? 1 : 0.45,
              }}
            >
              <div className="text-base">{i < stars ? "✅" : p.icon}</div>
              <div className="text-[11px] font-extrabold leading-tight">
                {p.label}
                <div style={{ opacity: 0.75 }}>{p.sub}</div>
              </div>
            </button>
          );
        })}
      </div>
      {phase === 0 && <WatchPhase {...props} key={`w${levelIdx}`} />}
      {phase === 1 && <TogetherPhase {...props} key={`t${levelIdx}`} />}
      {phase === 2 && (level.build ? <BuildPhase {...props} key={`b${levelIdx}`} /> : <YourTurnPhase {...props} key={`y${levelIdx}`} />)}
      <div className="text-center text-[11px] font-semibold" style={{ color: C.dim }}>
        🔇 No sound? Turn the volume up, switch off silent mode, and tap ▶ again.
      </div>
    </div>
  );
}

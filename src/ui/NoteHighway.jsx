import React from "react";
import { laneOf } from "../engine/interpreter.js";
import { C, DRUM_EMOJI, LANES, LEAD } from "../theme.js";

export function NoteHighway({ playInfo, elapsed, height = 200, idleText = "Press play — your notes appear here" }) {
  const H = height;
  const hitY = H - 30;
  const events = playInfo ? playInfo.events : [];
  return (
    <div
      className="relative w-full overflow-hidden rounded-[4px]"
      style={{ height: H, background: "linear-gradient(180deg,#171335 0%,#100D28 100%)", border: `1px solid ${C.line}` }}
    >
      {LANES.map((c, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0"
          style={{ left: `${(i / 5) * 100}%`, width: "20%", borderLeft: i ? "1px solid rgba(255,255,255,0.05)" : "none" }}
        />
      ))}
      <div
        className="absolute left-2 right-2 rounded-full"
        style={{
          top: hitY,
          height: 2,
          borderRadius: 0,
          /* one line, the same one the booth draws — the rainbow bar read as
             decoration, and this is the moment a note sounds */
          background: C.ink,
          opacity: playInfo ? 1 : 0.4,
        }}
      />
      {!playInfo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ color: C.dim }}>
          <div className="px-4 text-center text-sm">{idleText}</div>
        </div>
      )}
      {playInfo && elapsed !== null && elapsed < 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color: C.yellow }}>
          Ready
        </div>
      )}
      {playInfo &&
        elapsed !== null &&
        events.map((ev, i) => {
          const dt = ev.time - elapsed;
          if (dt > LEAD || dt < -0.45) return null;
          const lane = laneOf(ev);
          const x = ((lane + 0.5) / 5) * 100;
          const isDrum = ev.kind !== "note";
          const color = LANES[lane];
          if (dt >= 0) {
            const y = (1 - dt / LEAD) * hitY;
            return (
              <div
                key={ev.id || i}
                className="absolute flex items-center justify-center font-bold"
                style={{
                  left: `calc(${x}% - 14px)`,
                  top: y - 14,
                  width: 28,
                  height: 28,
                  borderRadius: isDrum ? 8 : 999,
                  background: color,
                  color: "#1A1735",
                  fontSize: 10,
                  boxShadow: `0 0 10px ${color}66`,
                }}
              >
                {ev.kind === "note" ? ev.note : DRUM_EMOJI[ev.kind]}
              </div>
            );
          }
          const p = -dt / 0.45;
          return (
            <div
              key={"b" + (ev.id || i)}
              className="absolute rounded-full"
              style={{
                left: `calc(${x}% - 16px)`,
                top: hitY - 16,
                width: 32,
                height: 32,
                border: `3px solid ${color}`,
                opacity: 1 - p,
                transform: `scale(${1 + p * 1.3})`,
              }}
            />
          );
        })}
    </div>
  );
}

/* ---------- shared UI ---------- */

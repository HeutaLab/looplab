import React, { useMemo } from "react";
import { C } from "../theme.js";
import { BigButton } from "./controls.jsx";

export function CelebrateOverlay({ level, hasNext, onMap, onNext, onStay }) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 8) * 0.16,
        emoji: ["🎵", "⭐", "🎶", "✨", "🎧"][i % 5],
      })),
    []
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(10,8,25,0.88)" }}>
      {confetti.map((c, i) => (
        <span key={i} className="absolute text-xl" style={{ left: `${c.left}%`, top: 0, animation: `cb-fall 2.2s ${c.delay}s ease-in infinite` }}>
          {c.emoji}
        </span>
      ))}
      <div className="relative w-full max-w-sm rounded-3xl p-5 text-center" style={{ background: C.panel, border: `2px solid ${C.yellow}`, animation: "cb-pop 0.5s ease-out" }}>
        <div className="text-4xl">{level.emoji}</div>
        <div className="mt-1 text-2xl font-extrabold">Level complete!</div>
        <div className="my-2 text-3xl" style={{ color: C.yellow }}>
          ⭐⭐⭐
        </div>
        <div className="text-sm font-semibold" style={{ color: C.dim }}>
          {level.id === "jam"
            ? "You're officially a LoopLab DJ! 🎓 The Club is waiting — go bring the house down."
            : "DJ Loop is impressed. Your music-code powers are growing!"}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {hasNext && <BigButton onClick={onNext}>Next level →</BigButton>}
          <BigButton color={C.aqua} onClick={onStay}>
            Keep jamming here 🎶
          </BigButton>
          <BigButton color={C.violet} onClick={onMap}>
            Level map
          </BigButton>
        </div>
      </div>
    </div>
  );
}

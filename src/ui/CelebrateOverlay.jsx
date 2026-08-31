import React, { useMemo } from "react";
import { C, CHANNEL } from "../theme.js";
import { BigButton, Stars } from "./controls.jsx";

/* Finishing a level should feel like something. It used to feel like it by
   raining ["🎵","⭐","🎶","✨","🎧"] down the screen, which is the same
   celebration every app on the tablet does and which renders as a column of
   empty boxes on half the machines in a school. Same moment, made of shapes:
   confetti in the channel colours, and the three stars they actually earned,
   drawn at a size you can see from the next table. The global
   prefers-reduced-motion rule stops all of it moving for anyone who asked. */
export function CelebrateOverlay({ level, hasNext, onMap, onNext, onStay }) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 8) * 0.16,
        colour: CHANNEL[i % CHANNEL.length],
        size: 5 + (i % 3) * 3,
        tall: i % 3 === 0,
      })),
    []
  );
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(10,8,25,0.9)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Level complete"
    >
      {confetti.map((c, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute"
          style={{
            left: `${c.left}%`,
            top: 0,
            width: c.size,
            height: c.tall ? c.size * 2.4 : c.size,
            borderRadius: 1,
            background: c.colour,
            animation: `cb-fall 2.2s ${c.delay}s ease-in infinite`,
          }}
        />
      ))}
      <div
        className="relative w-full max-w-sm p-6 text-center"
        style={{ background: C.panel, border: `1px solid ${C.yellow}`, borderRadius: 4, animation: "cb-pop 0.5s ease-out" }}
      >
        <div className="text-[11px] font-bold uppercase" style={{ color: C.dim, letterSpacing: "0.18em" }}>
          Level {level.title}
        </div>
        <h2 className="mt-1 text-2xl font-bold">Level complete</h2>
        <div className="my-3 flex justify-center">
          <Stars n={3} size={30} />
        </div>
        <p className="text-sm" style={{ color: C.dim, lineHeight: 1.45 }}>
          {level.id === "jam"
            ? "You're a LoopLab DJ now. The Club is waiting — go and bring the house down."
            : "DJ Loop is impressed. Your music-code powers are growing."}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {hasNext && <BigButton onClick={onNext}>Next level</BigButton>}
          <BigButton color={C.aqua} onClick={onStay}>
            Keep jamming here
          </BigButton>
          <BigButton color={C.violet} onClick={onMap}>
            Level map
          </BigButton>
        </div>
      </div>
    </div>
  );
}

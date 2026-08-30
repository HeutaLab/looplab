import React from "react";
import { LEVELS } from "../data/levels.js";
import { C } from "../theme.js";
import { Chip, Mentor } from "../ui/controls.jsx";

export function MapScreen({ stars, records, loaded, persist, playerName, onOpen, onClub, onReport, onSwitch, onHoldStart, onHoldEnd }) {
  const clubOpen = stars[1] >= 3;
  const golds = Object.values(records).filter((r) => r === "gold").length;
  return (
    <div className="flex flex-col gap-4">
      <div className="pt-3 text-center">
        <div className="text-4xl font-extrabold tracking-tight">
<div
          onPointerDown={onHoldStart}
          onPointerUp={onHoldEnd}
          onPointerLeave={onHoldEnd}
          onPointerCancel={onHoldEnd}
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
        >
          Loop<span style={{ color: C.pink }}>Lab</span> 🎧
        </div>
        </div>
        <div className="mt-1 text-sm font-semibold" style={{ color: C.dim }}>
          Learn to code music — then DJ the club
        </div>
        <div className="mt-1 text-center text-xs font-extrabold" style={{ color: C.yellow }}>
          {playerName ? `🎧 ${playerName}` : ""}
        </div>
      </div>
      <Mentor text="Train in the Studio, then take the booth in The Club: fix real dance tracks, then perform them live and keep the crowd jumping. Let's go!" />
      <div className="text-xs font-extrabold uppercase tracking-widest" style={{ color: C.dim }}>
        🎓 The Studio — learn the moves
      </div>
      <div className="flex flex-col gap-3">
        {LEVELS.map((lv, i) => {
          const unlocked = i === 0 || stars[i - 1] >= 3;
          const st = stars[i];
          return (
            <button
              key={lv.id}
              onClick={() => unlocked && onOpen(i)}
              className="flex items-center gap-3 rounded-2xl p-3 text-left transition-transform active:scale-95"
              style={{
                background: unlocked ? C.panel : "#17142F",
                border: `2px solid ${st >= 3 ? C.green : unlocked ? C.line : "#221E45"}`,
                opacity: unlocked ? 1 : 0.55,
              }}
            >
              <div className="flex items-center justify-center rounded-xl text-2xl" style={{ width: 52, height: 52, background: C.panel2 }}>
                {unlocked ? lv.emoji : "🔒"}
              </div>
              <div className="flex-1">
                <div className="font-extrabold">
                  Level {i + 1}: {lv.title}
                </div>
                <div className="text-xs font-semibold" style={{ color: C.dim }}>
                  {unlocked ? lv.blurb : "Finish the level above to unlock"}
                </div>
              </div>
              <div className="text-sm" style={{ color: C.yellow }}>
                {"⭐".repeat(st)}
                <span style={{ opacity: 0.25 }}>{"⭐".repeat(3 - st)}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-xs font-extrabold uppercase tracking-widest" style={{ color: C.dim }}>
        🪩 The Club — become the DJ
      </div>
      <button
        onClick={() => clubOpen && onClub()}
        className="rounded-2xl p-4 text-left transition-transform active:scale-95"
        style={{
          background: clubOpen ? `linear-gradient(135deg, ${C.panel2}, #2E1B4E)` : "#17142F",
          border: `2px solid ${clubOpen ? C.pink : "#221E45"}`,
          opacity: clubOpen ? 1 : 0.55,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl">{clubOpen ? "🪩" : "🔒"}</div>
          <div className="flex-1">
            <div className="text-lg font-extrabold">Enter The Club</div>
            <div className="text-xs font-semibold" style={{ color: C.dim }}>
              {clubOpen
                ? `6 tracks · 125–140 BPM · fix them, then perform them live · ${golds} gold record${golds === 1 ? "" : "s"}`
                : "Finish Level 2 (Loop Magic) to get past the bouncer"}
            </div>
          </div>
        </div>
      </button>
      <div className="rounded-2xl p-3 text-center text-xs font-semibold" style={{ background: C.panel, color: C.dim, border: `1px solid ${C.line}` }}>
        🎹 Everything here is real <span style={{ color: C.aqua }}>Sonic Pi</span> code — real synth names, real sample names, real live loops. Copy any
        track and run it in the free desktop app!
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-[11px] font-bold" style={{ color: !loaded ? C.dim : persist === false ? C.orange : C.green }}>
          {!loaded
            ? "💾 Loading your progress…"
            : persist === false
            ? "⚠️ This browser won't let the game save — your stars will vanish on reload"
            : "💾 Progress saved automatically"}
        </span>
        <Chip small onClick={onReport}>
          📋 My progress
        </Chip>
        <Chip small onClick={onSwitch}>
          👤 Not you? Switch player
        </Chip>
      </div>
    </div>
  );
}

/* ---------- learning level screen (unchanged flow) ---------- */

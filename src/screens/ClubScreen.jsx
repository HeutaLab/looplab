import React from "react";
import { TRACKS } from "../data/tracks.js";
import { pick } from "../engine/interpreter.js";
import { C } from "../theme.js";
import { Mentor } from "../ui/controls.jsx";

export function ClubScreen({ records, onPick, back }) {
  const medal = { bronze: "🥉", silver: "🥈", gold: "🥇" };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button onClick={back} className="rounded-xl px-3 py-2 font-extrabold" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
          ←
        </button>
        <div className="flex-1">
          <div className="text-lg font-extrabold">🪩 The Club — pick a record</div>
        </div>
      </div>
      <Mentor text="Here's the crate: six dance-floor tracks written in real live loops. Each one arrived from the studio with bugs — soundcheck it, fix it, then play it LIVE and keep the crowd hyped!" />
      <div className="flex flex-col gap-3">
        {TRACKS.map((tr, i) => {
          const unlocked = i < 2 || records[TRACKS[i - 1].id];
          return (
            <button
              key={tr.id}
              onClick={() => unlocked && onPick(i)}
              className="flex items-center gap-3 rounded-2xl p-3 text-left transition-transform active:scale-95"
              style={{
                background: unlocked ? C.panel : "#17142F",
                border: `2px solid ${records[tr.id] === "gold" ? C.yellow : unlocked ? C.line : "#221E45"}`,
                opacity: unlocked ? 1 : 0.55,
              }}
            >
              <div className="flex items-center justify-center rounded-full text-2xl" style={{ width: 52, height: 52, background: "#151233", border: `3px solid ${C.panel2}` }}>
                {unlocked ? tr.emoji : "🔒"}
              </div>
              <div className="flex-1">
                <div className="font-extrabold">
                  {tr.title} {records[tr.id] ? medal[records[tr.id]] : ""}
                </div>
                <div className="text-xs font-semibold" style={{ color: C.aqua }}>
                  {tr.style} · {tr.bpm} BPM · {tr.bugs.length} bugs
                </div>
                <div className="text-xs font-semibold" style={{ color: C.dim }}>
                  {unlocked ? tr.blurb : "Earn a record on the track above to unlock"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- DJ screen: soundcheck → live set → results ---------- */

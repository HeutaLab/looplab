import React from "react";
import { TRACKS, TRACK_LEVELS, levelsDone, trackOpen } from "../data/tracks.js";
import { pick } from "../engine/interpreter.js";
import { C, CLUB, TYPE } from "../theme.js";
import { Mentor } from "../ui/controls.jsx";

export function ClubScreen({ records, stars, onPick, back }) {
  const done = levelsDone(stars);
  const medal = { bronze: "#c98a5b", silver: "#c9c3d4", gold: CLUB.ink };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button onClick={back} aria-label="Back to the map" className="text-xl" style={{ color: C.dim, minWidth: 44, minHeight: 44 }}>
          ←
        </button>
        <div className="flex-1">
          <div className="text-[11px] font-bold uppercase" style={{ color: C.dim, letterSpacing: "0.16em" }}>
            The Club
          </div>
          <h1 className="text-lg font-bold">Pick a record</h1>
        </div>
      </div>
      <Mentor text="Here's the crate: six dance-floor tracks written in real live loops. Each one came back from the studio with bugs. Find them by ear, fix them, then play the track live." />
      {/* The crate, in the floor's own colours: black sleeves, amber for the
          one you can play. It used to be six navy cards with an emoji in a
          circle, which is the same card every app on a school iPad uses. */}
      <div style={{ background: CLUB.void, borderRadius: 4, border: `1px solid ${C.line}` }}>
        {TRACKS.map((tr, i) => {
          const unlocked = trackOpen(i, stars, records);
          const rec = records[tr.id];
          return (
            <button
              key={tr.id}
              onClick={() => unlocked && onPick(i)}
              disabled={!unlocked}
              className="flex w-full items-center gap-4 px-4 py-3 text-left"
              style={{
                borderBottom: i < TRACKS.length - 1 ? `1px solid rgba(243,238,228,0.1)` : "none",
                opacity: unlocked ? 1 : 0.4,
                minHeight: 62,
              }}
            >
              <span
                className="text-xs font-bold tabular-nums"
                style={{ fontFamily: TYPE.code, color: unlocked ? CLUB.ink : CLUB.dim, minWidth: 44 }}
              >
                {tr.bpm}
              </span>
              <span className="flex-1">
                <span className="block font-bold" style={{ color: unlocked ? CLUB.ink : CLUB.dim }}>
                  {tr.title}
                </span>
                <span className="block text-xs" style={{ color: CLUB.dim }}>
                  {unlocked
                    ? `${tr.style} \u00b7 ${tr.bugs.length} bugs to find`
                    : `Opens when you finish ${TRACK_LEVELS[i]} Studio levels \u2014 you have finished ${done}`}
                </span>
              </span>
              {rec && (
                <span className="text-[10px] font-bold uppercase" style={{ letterSpacing: "0.14em", color: medal[rec] }}>
                  {rec}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- DJ screen: soundcheck → live set → results ---------- */

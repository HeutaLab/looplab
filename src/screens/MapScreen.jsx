import React from "react";
import { LEVELS } from "../data/levels.js";
import { TRACKS, trackOpen } from "../data/tracks.js";
import { C, CHANNEL, CLUB, TYPE } from "../theme.js";
import { Chip, Mentor, Rule, Stars } from "../ui/controls.jsx";

export function MapScreen({ stars, records, loaded, persist, playerName, onOpen, onClub, onReport, onSwitch, onHoldStart, onHoldEnd }) {
  const clubOpen = stars[1] >= 3;
  const golds = Object.values(records).filter((r) => r === "gold").length;
  /* The crate grows with the Studio, so the door says how much of it is
     open — a child can see that finishing a level opens a record. */
  const openTracks = TRACKS.filter((_, i) => trackOpen(i, stars, records)).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 pt-2">
        <div>
          <h1
            className="text-4xl font-semibold"
            style={{ letterSpacing: "-0.02em", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
            onPointerDown={onHoldStart}
            onPointerUp={onHoldEnd}
            onPointerLeave={onHoldEnd}
            onPointerCancel={onHoldEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            Loop<span style={{ color: C.pink }}>Lab</span>
          </h1>
          <div className="mt-0.5 text-sm" style={{ color: C.dim }}>
            Learn to code music — then DJ the club
          </div>
        </div>
        {playerName && (
          <div className="text-[11px] font-bold uppercase" style={{ color: C.yellow, letterSpacing: "0.16em" }}>
            Playing · {playerName}
          </div>
        )}
      </div>
      <Mentor text="Train in the Studio, then take the booth in The Club: fix real dance tracks, then perform them live and keep the crowd jumping. Let's go!" />
      <Rule>The Studio</Rule>
      {/* A list, not six identical cards with an emoji in a rounded square.
          What identifies a level is the code it teaches, so the code is what
          the row shows — set in the same monospace it will be written in. */}
      <div className="flex flex-col">
        {LEVELS.map((lv, i) => {
          const unlocked = i === 0 || stars[i - 1] >= 3;
          const st = stars[i];
          return (
            <button
              key={lv.id}
              onClick={() => unlocked && onOpen(i)}
              disabled={!unlocked}
              className="flex items-center gap-4 py-3 pl-4 pr-2 text-left"
              style={{
                borderLeft: `2px solid ${st >= 3 ? C.green : unlocked ? CHANNEL[i % CHANNEL.length] : C.line}`,
                borderBottom: `1px solid ${C.line}`,
                opacity: unlocked ? 1 : 0.45,
                minHeight: 60,
              }}
            >
              <span className="text-lg font-bold tabular-nums" style={{ fontFamily: TYPE.code, color: unlocked ? C.dim : C.line, minWidth: 22 }}>
                {i + 1}
              </span>
              <span className="flex-1">
                <span className="block font-semibold" style={{ letterSpacing: "0.006em" }}>{lv.title}</span>
                <span className="block text-xs" style={{ fontFamily: TYPE.code, color: C.dim }}>
                  {unlocked ? lv.blurb : "Finish the level above to unlock"}
                </span>
              </span>
              <Stars n={st} />
            </button>
          );
        })}
      </div>
      <Rule>The Club</Rule>
      {/* The door shows the room behind it: this is the only thing on the map
          painted in the floor's colours, so arriving at the booth is not a
          surprise. */}
      <button
        onClick={() => clubOpen && onClub()}
        disabled={!clubOpen}
        className="p-4 text-left"
        style={{
          background: clubOpen ? CLUB.void : "#17142F",
          border: `1px solid ${clubOpen ? CLUB.ink : C.line}`,
          borderRadius: 4,
          opacity: clubOpen ? 1 : 0.5,
        }}
      >
        <div className="text-lg font-semibold" style={{ color: clubOpen ? CLUB.ink : C.dim, letterSpacing: "0.006em" }}>
          Enter The Club
        </div>
        <div className="mt-0.5 text-xs" style={{ color: clubOpen ? CLUB.dim : C.dim }}>
          {clubOpen
            ? openTracks < TRACKS.length
              ? `${openTracks} of ${TRACKS.length} records open \u00b7 finish Studio levels to open more`
              : `All ${TRACKS.length} records open \u00b7 ${golds} gold${golds === 1 ? "" : "s"}`
            : "Finish Level 2 (Loop Magic) to get past the bouncer"}
        </div>
      </button>
      <div className="text-xs" style={{ color: C.dim, lineHeight: 1.5, maxWidth: "62ch" }}>
        Everything here is real <span style={{ color: C.aqua, fontFamily: TYPE.code }}>Sonic Pi</span> — real synth names, real sample names, real live
        loops. Copy any track and run it in the free desktop app.
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Chip small onClick={onReport}>
          My progress
        </Chip>
        <Chip small onClick={onSwitch}>
          Switch player
        </Chip>
        <span className="flex-1" />
        <span className="text-[11px]" style={{ color: !loaded ? C.dim : persist === false ? C.orange : C.dim }}>
          {!loaded
            ? "Loading your progress…"
            : persist === false
            ? "This browser won't let the game save — your stars will vanish on reload"
            : "Progress saved automatically"}
        </span>
      </div>
    </div>
  );
}

/* ---------- learning level screen (unchanged flow) ---------- */

import React, { useState } from "react";
import { MAX_PROFILES } from "../state/storage.js";
import { C } from "../theme.js";
import { BigButton, Chip, Mentor } from "../ui/controls.jsx";

export function PlayersScreen({ players, currentId, onOpen, onAdd, onRemove, onBack }) {
  const [adding, setAdding] = useState(players.length === 0);
  const [draft, setDraft] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const full = players.length >= MAX_PROFILES;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-xl" style={{ color: C.dim, minWidth: 44 }} aria-label="Back to the level map">
            ←
          </button>
        )}
        <h1 className="text-lg font-semibold">Who's playing?</h1>
      </div>

      <Mentor text={players.length ? "Tap your name to carry on where you left off." : "Add your name so the game keeps your stars for you — nobody else's." } />

      <ul className="flex flex-col" style={{ borderTop: `1px solid ${C.line}` }}>
        {players.map((p) => {
          const here = p.id === currentId;
          return (
            <li
              key={p.id}
              className="flex items-center gap-2"
              style={{ borderBottom: `1px solid ${C.line}`, borderLeft: `2px solid ${here ? C.yellow : "transparent"}` }}
            >
              <button onClick={() => onOpen(p.id)} className="flex-1 px-4 py-3 text-left font-semibold" style={{ color: C.ink, fontSize: 17, letterSpacing: "0.006em" }}>
                {p.name}
                {here && (
                  <span className="ml-2 text-[10px] font-bold uppercase" style={{ color: C.yellow, letterSpacing: "0.14em" }}>
                    you
                  </span>
                )}
              </button>
              {confirmId === p.id ? (
                <div className="flex items-center gap-2 pr-2">
                  <span className="text-xs" style={{ color: C.orange }}>
                    Erase {p.name}'s stars?
                  </span>
                  <Chip small onClick={() => { onRemove(p.id); setConfirmId(null); }}>
                    Erase
                  </Chip>
                  <Chip small onClick={() => setConfirmId(null)}>
                    Keep
                  </Chip>
                </div>
              ) : (
                <div className="pr-2">
                  <Chip small onClick={() => setConfirmId(p.id)}>
                    Remove
                  </Chip>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="p-3" style={{ borderLeft: `2px solid ${C.aqua}` }}>
          <label className="text-[11px] font-bold uppercase" style={{ color: C.dim, letterSpacing: "0.16em" }} htmlFor="new-player">
            Your first name
          </label>
          <input
            id="new-player"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 16))}
            placeholder="first name or nickname"
            maxLength={16}
            autoCapitalize="words"
            className="mt-1 w-full rounded-[4px] px-3 py-2 font-bold outline-none"
            style={{ background: "#151233", color: C.ink, border: `1px solid ${C.line}`, fontSize: 16 }}
          />
          <div className="mt-1 text-[11px] font-semibold" style={{ color: C.dim }}>
            First name only. This stays on this device and is never sent anywhere.
          </div>
          <div className="mt-2 flex gap-2">
            <BigButton
              color={C.aqua}
              disabled={!draft.trim()}
              why="Type your name first"
              onClick={() => {
                onAdd(draft);
                setDraft("");
                setAdding(false);
              }}
            >
              Let's go
            </BigButton>
            {players.length > 0 && (
              <BigButton color={C.violet} onClick={() => setAdding(false)}>
                Cancel
              </BigButton>
            )}
          </div>
        </div>
      ) : (
        <div>
          <BigButton color={C.aqua} disabled={full} onClick={() => setAdding(true)}>
            {full ? "This device is full (40 players)" : "New player"}
          </BigButton>
        </div>
      )}
    </div>
  );
}

/* ---------- teacher panel ----------
   Skip and reset used to sit on the map where any child could tap them, and
   "start over" erases a player. They live behind a long press and a PIN now:
   invisible in the student UI, and a wrong PIN reveals nothing at all. */

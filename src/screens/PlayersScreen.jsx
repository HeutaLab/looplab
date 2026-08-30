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
      <div className="flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="rounded-[4px] px-3 py-2 font-extrabold" style={{ background: C.panel2, border: `1px solid ${C.line}` }} aria-label="Back to the level map">
            ←
          </button>
        )}
        <div className="text-base font-extrabold">👋 Who's playing?</div>
      </div>

      <Mentor text={players.length ? "Tap your name to carry on where you left off." : "Add your name so the game keeps your stars for you — nobody else's." } />

      <div className="flex flex-col gap-2">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-[4px] p-2" style={{ background: p.id === currentId ? C.panel2 : C.panel, border: `1px solid ${p.id === currentId ? C.yellow : C.line}` }}>
            <button onClick={() => onOpen(p.id)} className="flex-1 rounded-[4px] px-3 py-3 text-left font-extrabold" style={{ color: C.ink, fontSize: 16 }}>
              {p.id === currentId ? "🎧 " : "👤 "}
              {p.name}
            </button>
            {confirmId === p.id ? (
              <>
                <Chip small onClick={() => { onRemove(p.id); setConfirmId(null); }}>
                  ⚠️ Erase {p.name}
                </Chip>
                <Chip small onClick={() => setConfirmId(null)}>
                  Keep
                </Chip>
              </>
            ) : (
              <Chip small onClick={() => setConfirmId(p.id)}>
                🗑
              </Chip>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="rounded-[4px] p-3" style={{ background: C.panel, border: `1px solid ${C.aqua}` }}>
          <label className="text-xs font-extrabold uppercase" style={{ color: C.dim }} htmlFor="new-player">
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
              onClick={() => {
                onAdd(draft);
                setDraft("");
                setAdding(false);
              }}
            >
              Let's go 🎧
            </BigButton>
            {players.length > 0 && (
              <BigButton color={C.violet} onClick={() => setAdding(false)}>
                Cancel
              </BigButton>
            )}
          </div>
        </div>
      ) : (
        <BigButton color={C.aqua} disabled={full} onClick={() => setAdding(true)}>
          {full ? "This device is full (40 players)" : "➕ New player"}
        </BigButton>
      )}
    </div>
  );
}

/* ---------- teacher panel ----------
   Skip and reset used to sit on the map where any child could tap them, and
   "start over" erases a player. They live behind a long press and a PIN now:
   invisible in the student UI, and a wrong PIN reveals nothing at all. */

import React, { useState } from "react";
import { D } from "../engine/interpreter.js";
import { device } from "../state/profiles.js";
import { DEFAULT_PIN } from "../state/storage.js";
import { C } from "../theme.js";
import { BigButton, Chip } from "../ui/controls.jsx";

export function TeacherPanel({ pin, onPin, onUnlockAll, onResetPlayer, onPlayers, onClose, playerName }) {
  const [entered, setEntered] = useState("");
  const [wrong, setWrong] = useState(false);
  const [inside, setInside] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [didReset, setDidReset] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,8,25,0.92)" }}>
      <div className="w-full max-w-sm rounded-3xl p-4" style={{ background: C.panel, border: `2px solid ${C.violet}` }}>
        {!inside ? (
          <>
            <div className="text-lg font-extrabold">🔐 Teacher panel</div>
            <div className="mt-1 text-xs font-semibold" style={{ color: C.dim }}>
              Enter the 4-digit code.
            </div>
            <input
              autoFocus
              value={entered}
              onChange={(e) => {
                setEntered(e.target.value.replace(/\D/g, "").slice(0, 4));
                setWrong(false);
              }}
              inputMode="numeric"
              aria-label="Teacher PIN"
              className="mt-2 w-full rounded-[4px] px-3 py-2 text-center font-mono font-extrabold outline-none"
              style={{ background: "#151233", color: C.ink, border: `1px solid ${wrong ? C.red : C.line}`, fontSize: 22, letterSpacing: 6 }}
            />
            {wrong && (
              <div className="mt-1 text-xs font-bold" style={{ color: C.red }}>
                Not that one.
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <BigButton
                color={C.violet}
                onClick={() => (entered === String(pin) ? setInside(true) : (setWrong(true), setEntered("")))}
              >
                Unlock
              </BigButton>
              <BigButton color={C.aqua} onClick={onClose}>
                Close
              </BigButton>
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-extrabold">🔐 Teacher panel</div>
            <div className="mt-1 text-xs font-semibold" style={{ color: C.dim }}>
              Current player: <span style={{ color: C.yellow }}>{playerName || "nobody"}</span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <BigButton color={C.aqua} onClick={onPlayers}>
                👥 Manage players
              </BigButton>
              <BigButton color={C.violet} onClick={onUnlockAll}>
                ⏩ Unlock every level
              </BigButton>
              <BigButton
                color={C.orange}
                onClick={() => {
                  if (didReset) {
                    onResetPlayer();
                    setDidReset(false);
                  } else setDidReset(true);
                }}
              >
                {didReset ? "⚠️ Tap again to erase this player's stars" : "↺ Reset this player"}
              </BigButton>
            </div>
            <div className="mt-3 rounded-[4px] p-2" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
              <div className="text-xs font-extrabold uppercase" style={{ color: C.dim }}>
                Change the code
              </div>
              <div className="mt-1 flex gap-2">
                <input
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  placeholder="new 4 digits"
                  aria-label="New teacher PIN"
                  className="flex-1 rounded-[4px] px-3 py-2 text-center font-mono font-bold outline-none"
                  style={{ background: "#151233", color: C.ink, border: `1px solid ${C.line}`, fontSize: 16, letterSpacing: 4 }}
                />
                <Chip small disabled={newPin.length !== 4} onClick={() => { onPin(newPin); setNewPin(""); }}>
                  Save
                </Chip>
              </div>
              <div className="mt-1 text-[11px] font-semibold" style={{ color: C.dim }}>
                Stored on this device, not with a player. Default is {DEFAULT_PIN}.
              </div>
            </div>
            <div className="mt-3">
              <BigButton onClick={onClose}>Done</BigButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

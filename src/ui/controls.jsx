import React from "react";
import { C } from "../theme.js";

export function Mentor({ text }) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="flex items-center justify-center rounded-full text-xl"
        style={{ width: 42, height: 42, background: C.panel2, border: `2px solid ${C.violet}`, flexShrink: 0 }}
      >
        🤖
      </div>
      <div className="rounded-2xl rounded-tl-sm px-3 py-2 text-sm font-medium" style={{ background: C.panel2, color: C.ink, border: `1px solid ${C.line}` }}>
        <span style={{ color: C.violet, fontWeight: 800 }}>DJ Loop: </span>
        {text}
      </div>
    </div>
  );
}

export function BigButton({ onClick, disabled, color = C.pink, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl px-4 py-3 text-sm font-extrabold transition-transform active:scale-95"
      style={{
        background: disabled ? C.line : color,
        color: disabled ? C.dim : "#1A1030",
        boxShadow: disabled ? "none" : "0 4px 0 rgba(0,0,0,0.35)",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function Chip({ onClick, active, children, small, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={`rounded-xl font-mono font-bold transition-transform ${disabled ? "" : "active:scale-90"}`}
      style={{
        padding: small ? "6px 10px" : "8px 12px",
        fontSize: small ? 12 : 14,
        background: active ? C.yellow : C.panel2,
        color: active ? "#1A1030" : C.ink,
        border: `2px solid ${active ? C.yellow : C.line}`,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* ---------- the typing bridge, on screen ----------
   One editor serves all three modes, with progressively less scaffolding:

     chips   tap only, no typing            (levels 1-4, first club tracks)
     hybrid  type, and chips type FOR you   (level 5, Piano Sunrise)
     typed   type, chips hidden behind a tap (level 6, Rave Siren onward)

   In hybrid the chip does not add a line object — it inserts its text at the
   cursor. The child watches the syntax appear, then starts typing it himself.
   That is the bridge: the same editor throughout, the scaffolding falling away.
   Dropping back to the chips is always one tap and is never called failure. */

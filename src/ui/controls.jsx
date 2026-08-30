import React from "react";
import { C } from "../theme.js";

/* DJ Loop still talks, but not out of a chat bubble with a robot avatar —
   that is every assistant on the internet. The voice is typographic now: a
   named speaker and a rule, the way a script marks who is talking. */
export function Mentor({ text }) {
  return (
    <div style={{ borderLeft: `2px solid ${C.violet}`, paddingLeft: 12 }}>
      <div
        className="text-[10px] font-bold uppercase"
        style={{ color: C.violet, letterSpacing: "0.16em" }}
      >
        DJ Loop
      </div>
      <div className="text-sm" style={{ color: C.ink, lineHeight: 1.45, maxWidth: "62ch" }}>
        {text}
      </div>
    </div>
  );
}

/* `why` is not optional in spirit: a button that is dim for a reason the
   player cannot see is a dead end, and a ten-year-old with four minutes has
   no way out of one. Every disabled BigButton in the game says its condition
   underneath itself, in the fewest words that still name the next move. */
export function BigButton({ onClick, disabled, color = C.pink, why, children }) {
  /* Two shapes, the same two the booth uses: filled for the thing you do, and
     that is it. The old button was a rounded slab with a hard offset shadow
     under it — the default "game button" — and every action in the app wore
     it, so nothing looked more important than anything else. */
  const btn = (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-5 text-sm font-bold"
      style={{
        minHeight: 48,
        borderRadius: 999,
        background: disabled ? "transparent" : color,
        border: `1.5px solid ${disabled ? C.line : color}`,
        color: disabled ? C.dim : "#14102A",
        opacity: disabled ? 0.85 : 1,
        letterSpacing: "0.01em",
      }}
    >
      {children}
    </button>
  );
  if (!disabled || !why) return btn;
  return (
    <div className="flex flex-col items-center gap-1">
      {btn}
      <span className="text-[11px] font-bold" style={{ color: C.yellow }}>
        {why}
      </span>
    </div>
  );
}

/* Stars are the reward and they stay — a Year 5 knows what three stars mean.
   What goes is the ⭐ emoji, which renders as somebody else's artwork at
   whatever size the platform feels like. This is a star we drew. */
export function Stars({ n, size = 13 }) {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={`${n} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M10 1.6l2.5 5.4 5.9.7-4.4 4 1.2 5.8L10 14.6 4.8 17.5 6 11.7 1.6 7.7l5.9-.7z"
            fill={i < n ? C.yellow : "none"}
            stroke={i < n ? C.yellow : C.line}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

/* A quiet section rule. The app used to mark sections with an emoji and a
   line of shouty caps; the caps do the job on their own. */
export function Rule({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-bold uppercase" style={{ color: C.dim, letterSpacing: "0.18em" }}>
        {children}
      </span>
      <span className="h-px flex-1" style={{ background: C.line }} />
    </div>
  );
}

export function Chip({ onClick, active, children, small, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className="font-mono font-bold"
      style={{
        padding: small ? "0 12px" : "0 14px",
        minHeight: small ? 38 : 44,
        borderRadius: 999,
        fontSize: small ? 13 : 14,
        background: active ? C.yellow : "transparent",
        color: active ? "#1A1030" : C.ink,
        border: `1px solid ${active ? C.yellow : C.line}`,
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "default" : "pointer",
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

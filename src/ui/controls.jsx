import React from "react";
import { C, CHANNEL, TYPE } from "../theme.js";

/* DJ Loop still talks, but not out of a chat bubble with a robot avatar —
   that is every assistant on the internet. The voice is typographic now: a
   named speaker and a rule, the way a script marks who is talking. */
export function Mentor({ text }) {
  return (
    <div role="status" aria-live="polite" style={{ borderLeft: `2px solid ${C.violet}`, paddingLeft: 12 }}>
      <div
        className="text-[10px] font-bold uppercase"
        style={{ color: C.violet, letterSpacing: "0.16em" }}
      >
        DJ Loop
      </div>
      <div className="text-sm" style={{ color: C.ink, lineHeight: 1.45, maxWidth: "62ch" }}>
        {/* DJ Loop names code in backticks. Those used to reach the screen as
            literal ` characters — a markdown habit leaking into what a child
            reads. Now they set the word in the code face, so the sentence
            shows the difference between talking about sleep and writing it. */}
        {String(text)
          .split(/`([^`]+)`/)
          .map((part, i) =>
            i % 2 ? (
              <code key={i} style={{ fontFamily: TYPE.code, color: C.yellow, fontSize: "0.94em" }}>
                {part}
              </code>
            ) : (
              part
            )
          )}
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

/* Done / doing / locked, drawn rather than spelled with emoji.

   An emoji is a picture of somebody else's making at whatever size the
   platform decides, it reads out loud as "white heavy check mark", and where
   it was the only difference between two states it was carrying meaning that
   colour alone cannot carry either. This mark scales with its text, takes the
   colour it is given, and always ships a word alongside it for the reader who
   cannot see it. */
export function Mark({ state, size = 14 }) {
  const stroke = state === "done" ? C.green : state === "now" ? C.yellow : C.line;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" fill={state === "done" ? C.green : "none"} stroke={stroke} strokeWidth="1.5" />
      {state === "done" && <path d="M4.5 8.2l2.4 2.4 4.6-5" fill="none" stroke="#14102A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {state === "now" && <circle cx="8" cy="8" r="2.6" fill={C.yellow} />}
      {state === "locked" && <path d="M5.5 8h5" stroke={C.line} strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );
}

/* The crowd, drawn.

   It was a row of ["🙌","🕺","💃","🎉","🙋"] — the single most generic thing
   in the app, and on a school Windows machine half of them render as boxes.
   This is the same idea made of shapes: more figures as the hype climbs,
   arms up once the floor is really going, in the channel colours so the
   room belongs to the same product as the track. */
export function Crowd({ hype }) {
  const n = Math.max(3, Math.round(hype / 7));
  const up = hype > 55;
  return (
    <div className="flex items-end justify-center gap-[3px] overflow-hidden" style={{ height: 34 }} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const c = CHANNEL[i % CHANNEL.length];
        const h = 14 + ((i * 5) % 9);
        return (
          <svg
            key={i}
            width="9"
            height="26"
            viewBox="0 0 9 26"
            style={{
              opacity: 0.35 + Math.min(0.65, hype / 140),
              animation: up ? `cb-bounce ${0.5 + (i % 3) * 0.12}s ease-in-out infinite` : "none",
            }}
          >
            <circle cx="4.5" cy={26 - h - 4} r="2.6" fill={c} />
            <rect x="2.6" y={26 - h} width="3.8" height={h} rx="1.6" fill={c} />
            {up && (
              <>
                <path d={`M2.4 ${26 - h + 2} L0.9 ${26 - h - 4}`} stroke={c} strokeWidth="1.6" strokeLinecap="round" />
                <path d={`M6.6 ${26 - h + 2} L8.1 ${26 - h - 4}`} stroke={c} strokeWidth="1.6" strokeLinecap="round" />
              </>
            )}
          </svg>
        );
      })}
    </div>
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
        minHeight: 44, /* small changes the padding and the type, never the target */
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

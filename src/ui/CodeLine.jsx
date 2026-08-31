import React from "react";
import { indents, lineTokens } from "../engine/sonicpi.js";
import { C, tokColor } from "../theme.js";

export function CodeLine({ L, indent, active, warn, onTap, selected, small, children }) {
  const inner = (
    <div
      className="flex items-center rounded-[4px] px-2 py-1 font-mono transition-colors"
      style={{
        fontSize: small ? 12 : 14,
        paddingLeft: 8 + indent * 16,
        background: selected ? "rgba(255,211,77,0.16)" : active ? "rgba(255,92,168,0.18)" : "transparent",
        boxShadow: active ? `inset 3px 0 0 ${C.pink}` : selected ? `inset 3px 0 0 ${C.yellow}` : "none",
        color: C.ink,
        minHeight: small ? 24 : 30,
      }}
    >
      {children ||
        lineTokens(L).map(([txt, k], i) => (
          <span key={i} style={{ color: tokColor[k] || C.ink, whiteSpace: "pre" }}>
            {txt}
          </span>
        ))}
      {warn && (
        <span className="ml-1 text-[10px] font-bold uppercase" style={{ color: C.orange, letterSpacing: "0.1em" }}>
          check
        </span>
      )}
    </div>
  );
  return onTap ? (
    <button onClick={onTap} className="block w-full text-left">
      {inner}
    </button>
  ) : (
    inner
  );
}

export function CodeView({ lines, activeLine, small }) {
  const ind = indents(lines);
  return (
    <div className="rounded-[4px] p-2" style={{ background: "#151233", border: `1px solid ${C.line}` }}>
      {lines.map((L, i) => (
        <CodeLine key={i} L={L} indent={ind[i]} active={activeLine === i} small={small} />
      ))}
    </div>
  );
}

/* ---------- note highway ---------- */

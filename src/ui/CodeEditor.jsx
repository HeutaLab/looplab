import React, { useState, useRef } from "react";
import { lineText } from "../engine/sonicpi.js";
import { C } from "../theme.js";
import { Chip } from "./controls.jsx";

export function CodeEditor({ value, onChange, errors, chipGroups, mode, disabled, minRows = 8 }) {
  const ref = useRef(null);
  const [showChips, setShowChips] = useState(mode !== "typed");

  function insert(text) {
    const el = ref.current;
    const cur = value ?? "";
    let at = cur.length;
    if (el && typeof el.selectionStart === "number") at = el.selectionStart;
    // land on a line of its own, the way the line would have been added
    const before = cur.slice(0, at);
    const after = cur.slice(at);
    const needsNL = before.length && !before.endsWith("\n");
    const next = before + (needsNL ? "\n" : "") + text + (after.startsWith("\n") || !after.length ? "" : "\n") + after;
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = before.length + (needsNL ? 1 : 0) + text.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  const rows = Math.max(minRows, (value ?? "").split("\n").length + 1);

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-[4px] p-2" style={{ background: "#151233", border: `1px solid ${errors.length ? C.orange : C.line}` }}>
        <textarea
          ref={ref}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          rows={rows}
          aria-label="Your Sonic Pi code"
          placeholder={"Write your code here…\nplay 60\nsleep 0.5"}
          className="w-full resize-none bg-transparent font-mono outline-none"
          style={{ color: C.ink, fontSize: 14, lineHeight: 1.7, minHeight: 120 }}
        />
      </div>

      {errors.length > 0 && (
        <div className="flex flex-col gap-1" aria-live="polite">
          {errors.map((e, i) => (
            <div key={i} className="rounded-[4px] px-3 py-2 text-xs font-bold" style={{ background: "rgba(255,154,87,0.14)", color: C.orange }}>
              {e.row >= 0 && <span style={{ color: C.dim }}>line {e.row + 1}: </span>}
              {e.msg}
            </div>
          ))}
        </div>
      )}

      {mode === "typed" && !showChips && (
        <button
          onClick={() => setShowChips(true)}
          className="self-start rounded-[4px] px-3 py-2 text-xs font-extrabold"
          style={{ background: C.panel2, border: `1px solid ${C.line}`, color: C.aqua }}
        >
          Stuck? Show me the blocks
        </button>
      )}

      {showChips && chipGroups.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-extrabold uppercase" style={{ color: C.dim }}>
            {mode === "chips" ? "Tap to add a line" : "Tap to type it for you"}
          </div>
          {chipGroups.map(([k, g]) => (
            <div key={k} className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold uppercase" style={{ color: C.dim, minWidth: 62 }}>
                {g.label}
              </span>
              {g.items.map((it) => (
                <Chip key={it.label} small disabled={disabled} onClick={() => insert(lineText(it.make()))}>
                  {it.label}
                </Chip>
              ))}
            </div>
          ))}
          {mode === "typed" && (
            <button
              onClick={() => setShowChips(false)}
              className="self-start rounded-[4px] px-2 py-1 text-[11px] font-extrabold"
              style={{ color: C.dim }}
            >
              Hide the blocks — I've got this
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- who is playing ----------
   Five children share one school login. Without this they share one set of
   stars too, and the last one to finish overwrites the rest. */

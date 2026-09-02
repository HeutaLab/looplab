import React, { useState } from "react";
import { C } from "../theme.js";
import { BigButton } from "./controls.jsx";

export function CopyCodeModal({ text, onClose }) {
  const [copied, setCopied] = useState(null); // null | "yes" | "manual"
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,8,25,0.9)" }}>
      <div className="w-full max-w-sm rounded-3xl p-4" style={{ background: C.panel, border: `2px solid ${C.aqua}` }}>
        <h2 className="text-lg font-semibold">Your real Sonic Pi code</h2>
        <div className="mt-1 text-xs font-semibold" style={{ color: C.dim }}>
          Paste this into the free Sonic Pi app (sonic-pi.net) and press Run — it's the real thing!
        </div>
        <textarea
          readOnly
          value={text}
          onFocus={(e) => e.target.select()}
          className="mt-2 w-full rounded-[4px] p-2 font-mono text-xs"
          style={{ background: "#151233", color: C.aqua, border: `1px solid ${C.line}`, height: 180 }}
        />
        <div className="mt-2 flex gap-2">
          <BigButton
            color={C.aqua}
            onClick={() => {
              // writeText returns a promise, so the old try/catch caught nothing
              // and "✅ Copied!" appeared even when the copy had failed. On a
              // phone without clipboard permission, point at the box instead.
              const manual = () => setCopied("manual");
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(text).then(() => setCopied("yes"), manual);
                } else manual();
              } catch (e) {
                manual();
              }
            }}
          >
            {copied === "yes" ? "Copied" : copied === "manual" ? "Tap the code, then copy" : "Copy"}
          </BigButton>
          <BigButton color={C.violet} onClick={onClose}>
            Close
          </BigButton>
        </div>
      </div>
    </div>
  );
}

/* ---------- learning levels ---------- */

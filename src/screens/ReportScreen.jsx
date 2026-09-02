import React, { useState } from "react";
import { device } from "../state/profiles.js";
import { decodeProgress, encodeProgress } from "../state/progressCode.js";
import { buildReport, downloadReport } from "../state/report.js";
import { C } from "../theme.js";
import { BigButton, Chip, Mentor } from "../ui/controls.jsx";

export function ReportScreen({ stars, records, name, onName, onRestore, onBack }) {
  const [copied, setCopied] = useState(null);
  const [saved, setSaved] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [entry, setEntry] = useState("");
  const [restoreMsg, setRestoreMsg] = useState(null);
  const text = buildReport({ name, stars, records });
  const myCode = encodeProgress(stars, records);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="rounded-[4px] px-3 py-2 font-bold" style={{ background: C.panel2, border: `1px solid ${C.line}` }} aria-label="Back to the level map">
          ←
        </button>
        <h1 className="text-lg font-semibold">My progress</h1>
      </div>

      <Mentor text="This is everything you've done so far. Put your name on it, then copy it into Google Classroom or save it for your folder." />

      <div className="rounded-[4px] p-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        <label className="text-xs font-bold uppercase" style={{ color: C.dim }} htmlFor="looplab-name">
          Your name
        </label>
        <input
          id="looplab-name"
          value={name}
          onChange={(e) => onName(e.target.value.slice(0, 16))}
          placeholder="first name or nickname"
          maxLength={16}
          autoCapitalize="words"
          className="mt-1 w-full rounded-[4px] px-3 py-2 font-bold outline-none"
          style={{ background: "#151233", color: C.ink, border: `1px solid ${C.line}`, fontSize: 16 }}
        />
        <div className="mt-1 text-[11px] font-semibold" style={{ color: C.dim }}>
          This is the name on your player. Changing it here renames you everywhere — it stays on this device and is never sent anywhere.
        </div>
      </div>

      {/* school -> home, by hand */}
      <div className="rounded-[4px] p-3" style={{ background: C.panel, border: `1px solid ${C.aqua}` }}>
        <div className="text-xs font-bold uppercase" style={{ color: C.aqua }}>
          My progress code
        </div>
        <div className="mt-1 select-all text-center font-mono font-bold" style={{ color: C.yellow, fontSize: 24, letterSpacing: 2 }}>
          {myCode}
        </div>
        <div className="mt-1 text-center text-[11px] font-semibold" style={{ color: C.dim }}>
          Write this in your book. Type it in at home to carry on there.
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip
            small
            onClick={() => {
              try {
                if (navigator.clipboard && navigator.clipboard.writeText)
                  navigator.clipboard.writeText(myCode).then(() => setCodeCopied(true), () => setCodeCopied(false));
              } catch (e) {}
            }}
          >
            {codeCopied ? "Copied" : "Copy code"}
          </Chip>
        </div>

        <div className="mt-3 border-t pt-2" style={{ borderColor: C.line }}>
          <label className="text-xs font-bold uppercase" style={{ color: C.dim }} htmlFor="restore-code">
            Got a code? Type it here
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="restore-code"
              value={entry}
              onChange={(e) => {
                setEntry(e.target.value.slice(0, 16));
                setRestoreMsg(null);
              }}
              placeholder="LL-XXXX-XXXX"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 rounded-[4px] px-3 py-2 font-mono font-bold outline-none"
              style={{ background: "#151233", color: C.ink, border: `1px solid ${C.line}`, fontSize: 16 }}
            />
            <Chip
              small
              disabled={!entry.trim()}
              onClick={() => {
                const got = decodeProgress(entry);
                if (!got) {
                  setRestoreMsg({ ok: false, text: "That code didn't work — check the letters and try again. Nothing has changed." });
                  return;
                }
                const added = onRestore(got);
                setRestoreMsg({
                  ok: true,
                  text: added ? "Got it — your progress is back." : "That code is already in here — nothing to add.",
                });
                setEntry("");
              }}
            >
              Restore
            </Chip>
          </div>
          {restoreMsg && (
            <div
              className="mt-2 rounded-[4px] px-3 py-2 text-xs font-bold"
              aria-live="polite"
              style={{
                background: restoreMsg.ok ? "rgba(92,224,126,0.14)" : "rgba(255,154,87,0.14)",
                color: restoreMsg.ok ? C.green : C.orange,
              }}
            >
              {restoreMsg.text}
            </div>
          )}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-[4px] p-3" style={{ background: "#151233", border: `1px solid ${C.line}` }}>
        <pre className="whitespace-pre-wrap font-mono" style={{ color: C.aqua, fontSize: 11, lineHeight: 1.6 }}>{text}</pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <BigButton
          color={C.aqua}
          onClick={() => {
            const manual = () => setCopied("manual");
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => setCopied("yes"), manual);
              else manual();
            } catch (e) {
              manual();
            }
          }}
        >
          {copied === "yes" ? "Copied" : copied === "manual" ? "Select the text above" : "Copy for Classroom"}
        </BigButton>
        <BigButton color={C.violet} onClick={() => setSaved(downloadReport(text, name) ? "yes" : "no")}>
          {saved === "yes" ? "Saved" : saved === "no" ? "Couldn't save — copy instead" : "Save my evidence"}
        </BigButton>
      </div>
      {saved === "no" && (
        <div className="rounded-[4px] px-3 py-2 text-xs font-bold" style={{ background: "rgba(255,154,87,0.14)", color: C.orange }}>
          This device wouldn't let the file save. Use Copy instead — it has exactly the same words in it.
        </div>
      )}
    </div>
  );
}

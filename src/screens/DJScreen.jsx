import React, { useState } from "react";
import { LiveSet } from "../phases/LiveSet.jsx";
import { Soundcheck } from "../phases/Soundcheck.jsx";
import { SetResults } from "./SetResults.jsx";
import { C } from "../theme.js";

export function DJScreen(props) {
  const { track, back } = props;
  const [stage, setStage] = useState("soundcheck");
  const [fixedLines, setFixedLines] = useState(null);
  const [result, setResult] = useState(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button onClick={back} className="rounded-xl px-3 py-2 font-extrabold" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
          ←
        </button>
        <div className="flex-1">
          <div className="text-base font-extrabold">
            {track.emoji} {track.title}
          </div>
          <div className="text-xs font-semibold" style={{ color: C.aqua }}>
            {track.style} · {track.bpm} BPM
          </div>
        </div>
      </div>
      {stage === "soundcheck" && (
        <Soundcheck
          {...props}
          onDone={(lines) => {
            props.stopAll();
            props.clearDraft("club", track.id); // banked — the set uses these now
            setFixedLines(lines);
            setStage("live");
          }}
        />
      )}
      {stage === "live" && (
        <LiveSet
          {...props}
          startLines={fixedLines}
          onFinish={(res) => {
            setResult(res);
            if (res.record) props.onRecord(res.record);
            setStage("results");
          }}
        />
      )}
      {stage === "results" && (
        <SetResults
          track={track}
          result={result}
          finalLines={result.lines}
          onReplay={() => setStage("live")}
          onBack={back}
        />
      )}
      <div className="text-center text-[11px] font-semibold" style={{ color: C.dim }}>
        🔇 No sound? Turn the volume up, switch off silent mode, and tap ▶ again.
      </div>
    </div>
  );
}

/* ---------- Soundcheck: fix the track ---------- */

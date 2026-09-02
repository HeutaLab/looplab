import React, { useState } from "react";
import { BoothScreen } from "../club/BoothScreen.jsx";
import { TRACKS } from "../data/tracks.js";
import { LiveSet } from "../phases/LiveSet.jsx";
import { Soundcheck } from "../phases/Soundcheck.jsx";
import { SetResults } from "./SetResults.jsx";
import { C } from "../theme.js";

/* Every record plays on the same floor. Half a redesign — one track in the
   booth and five in the old soundcheck — is worse than either one alone. */
const BOOTH_TRACKS = TRACKS.map((t) => t.id);

export function DJScreen(props) {
  const { track, back } = props;
  const [stage, setStage] = useState("soundcheck");
  const [fixedLines, setFixedLines] = useState(null);
  const [result, setResult] = useState(null);
  const booth = BOOTH_TRACKS.includes(track.id);
  const toLive = (lines) => {
    props.stopAll();
    props.clearDraft("club", track.id); // banked — the set uses these now
    setFixedLines(lines);
    setStage("live");
  };
  return (
    <div className="flex flex-col gap-3">
      {/* the booth carries its own header — a second one above it would just
          push the loop off the screen */}
      {!(booth && stage === "soundcheck") && (
        <div className="flex items-center gap-3">
          <button onClick={back} aria-label="Back to the crate" className="text-xl" style={{ color: C.dim, minWidth: 44 }}>
            ←
          </button>
          <div className="flex-1">
            <div className="text-[11px] font-bold uppercase" style={{ color: C.dim, letterSpacing: "0.16em" }}>
              {track.style} &middot; {track.bpm} BPM
            </div>
            <h1 className="text-lg font-semibold">{track.title}</h1>
          </div>
        </div>
      )}
      {stage === "soundcheck" &&
        (booth ? <BoothScreen {...props} onDone={toLive} /> : <Soundcheck {...props} onDone={toLive} />)}
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
      {!booth && (
        <div className="text-center text-[11px] font-semibold" style={{ color: C.dim }}>
          No sound? Turn the volume up, switch off silent mode, and tap play again.
        </div>
      )}
    </div>
  );
}

/* ---------- Soundcheck: fix the track ---------- */

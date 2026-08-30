import React, { useState } from "react";
import { trackToSonicPi } from "../engine/sonicpi.js";
import { C } from "../theme.js";
import { CopyCodeModal } from "../ui/CopyCodeModal.jsx";
import { BigButton } from "../ui/controls.jsx";

export function SetResults({ track, result, finalLines, onReplay, onBack }) {
  const [showCopy, setShowCopy] = useState(false);
  const medal = { gold: ["🥇 GOLD RECORD!", C.yellow], silver: ["🥈 Silver record!", "#C9CCE8"], bronze: ["🥉 Bronze record!", C.orange] };
  const m = result.record ? medal[result.record] : ["The crowd wants more practice…", C.dim];
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl p-5 text-center" style={{ background: C.panel, border: `2px solid ${m[1]}` }}>
      <div className="text-4xl">{result.record === "gold" ? "🏆" : result.record ? "🎉" : "🎧"}</div>
      <div className="text-2xl font-extrabold" style={{ color: m[1] }}>
        {m[0]}
      </div>
      <div className="text-sm font-semibold" style={{ color: C.dim }}>
        {track.title} · average crowd hype <span style={{ color: C.ink }}>{result.avg}%</span> over {result.bars} bars
      </div>
      <div className="text-xs font-semibold" style={{ color: C.dim }}>
        {result.record === "gold"
          ? "You built it up, answered the crowd, and fixed bugs without dropping the beat. That's DJing with code!"
          : "Tip: keep 3+ loops running, answer requests fast, and squash glitches the moment you hear them."}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <BigButton onClick={onReplay}>🔴 Play it again</BigButton>
        <BigButton color={C.aqua} onClick={() => setShowCopy(true)}>
          📋 Take this track to Sonic Pi
        </BigButton>
        <BigButton color={C.violet} onClick={onBack}>
          Back to the crate
        </BigButton>
      </div>
      {showCopy && <CopyCodeModal text={trackToSonicPi(track, finalLines)} onClose={() => setShowCopy(false)} />}
    </div>
  );
}

/* ---------- level celebration ---------- */

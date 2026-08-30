import { LEVELS } from "../data/levels.js";
import { TRACKS } from "../data/tracks.js";

export const CAN_DO = [
  { key: "notes", level: 0, text: "I can use `play` to turn numbers into notes" },
  { key: "loops", level: 1, text: "I can use a loop to repeat music instead of writing it out" },
  { key: "drums", level: 2, text: "I can use `sample` to play drum sounds" },
  { key: "jam", level: 3, text: "I can change the instrument with `use_synth`" },
  { key: "liveloops", level: 4, text: "I can run two `live_loop`s at the same time" },
  { key: "random", level: 5, text: "I can use `choose` and `rrand` so it never plays the same twice" },
];

export const MODE_WORD = { chips: "blocks", hybrid: "blocks + typing", typed: "typed it myself" };

export function levelMode(i) {
  const b = LEVELS[i] && LEVELS[i].build;
  return b && b.codeMode ? b.codeMode : "chips";
}

export function buildReport({ name, stars, records, when }) {
  const date = (when || new Date()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const star = (n) => (n > 0 ? "★".repeat(n) + "☆".repeat(3 - n) : "not started");
  const who = (name || "").trim() || "(no name given)";

  const studio = LEVELS.map((lv, i) => `| ${i + 1}. ${lv.title} | ${star(stars[i] || 0)} | ${MODE_WORD[levelMode(i)]} |`).join("\n");
  const club = TRACKS.map((t) => {
    const r = records[t.id];
    return `| ${t.title} | ${r ? r : "not yet"} | ${MODE_WORD[t.codeMode || "chips"]} |`;
  }).join("\n");
  const can = CAN_DO.map((c) => `- [${(stars[c.level] || 0) > 0 ? "x" : " "}] ${c.text}`).join("\n");
  const debugged = Object.keys(records).length;
  const canDebug = `- [${debugged > 0 ? "x" : " "}] I can find a bug in code by listening to it`;
  const canPerform = `- [${Object.values(records).some((r) => r === "gold" || r === "silver") ? "x" : " "}] I can keep a live set going and answer the crowd`;

  const levelsDone = stars.filter((n) => n > 0).length;
  const typedDone = LEVELS.filter((lv, i) => (stars[i] || 0) > 0 && levelMode(i) === "typed").length;

  return `# LoopLab — ${who}
**Date:** ${date}
**Finished:** ${levelsDone} of ${LEVELS.length} studio levels · ${debugged} of ${TRACKS.length} club tracks
${typedDone > 0 ? "**Typed real Sonic Pi:** yes — completed " + typedDone + " level(s) by typing the code\n" : ""}
## Studio

| Level | Stars | How they wrote it |
|---|---|---|
${studio}

## The Club

| Track | Record | How they wrote it |
|---|---|---|
${club}

## I can…

${can}
${canDebug}
${canPerform}

---
*Made in LoopLab. Everything above was done on this device — LoopLab has no
accounts and sends nothing anywhere. This report was copied or saved by the
student themselves.*
`;
}

/* Handing the file to the student. A Claude artifact blocks page-initiated
   downloads, so this reports whether it actually happened rather than
   pretending — the copy button is always the fallback that works. */
export function downloadReport(text, name) {
  const safe = (name || "student").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "student";
  const stamp = new Date().toISOString().slice(0, 10);
  try {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `looplab-${safe}-${stamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- progress persistence ----------
   The artifact host provides `window.storage`; a plain browser does not, so
   fall back to localStorage and report which one actually worked — the map
   used to promise "saved automatically" even when nothing was being saved. */

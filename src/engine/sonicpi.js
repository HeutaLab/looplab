export function lineTokens(L) {
  if (L.t === "play") return [["play ", "kw"], [String(L.v), "num"]];
  if (L.t === "playChoose") return [["play choose(", "kw"], ["[" + L.v.join(", ") + "]", "num"], [")", "kw"]];
  if (L.t === "sleep") return [["sleep ", "kw"], [String(L.v), "num"]];
  if (L.t === "sleepRand") return [["sleep rrand(", "kw"], [L.v[0] + ", " + L.v[1], "num"], [")", "kw"]];
  if (L.t === "sample") return [["sample ", "kw"], [":" + L.v, "sym"]];
  if (L.t === "sampleChoose") return [["sample choose(", "kw"], ["[" + L.v.map((x) => ":" + x).join(", ") + "]", "sym"], [")", "kw"]];
  if (L.t === "synth") return [["use_synth ", "kw"], [":" + L.v, "sym"]];
  if (L.t === "bpm") return [["use_bpm ", "kw"], [String(L.v), "num"]];
  if (L.t === "loop") return [[String(L.v), "num"], [".times do", "kw"]];
  if (L.t === "end") return [["end", "kw"]];
  return [["", "kw"]];
}

/* A chip has to read as the code it writes: a choose(...) chip used to show
   `:sn_dolf,drum_cymbal_closed` instead of `[:sn_dolf, :drum_cymbal_closed]`. */
export const symOrNum = (x) => (isNaN(parseFloat(x)) ? ":" + x : String(x));

export const chipLabel = (c) =>
  String(c).includes(",") ? "[" + String(c).split(",").map(symOrNum).join(", ") + "]" : symOrNum(c);

export const lineText = (L) => lineTokens(L).map(([t]) => t).join("");

/* ---------- typing bridge: text back into line objects ----------
   The exact inverse of lineText above, so anything the game can show, a
   student can type — and anything they type round-trips to the same code the
   chips would have built. Every message here is written for a ten-year-old:
   no "unexpected token", no "NaN", no line numbers, and always a worked
   example of the fixed line. Being wrong is never framed as failure. */

export function indents(lines) {
  const out = [];
  let d = 0;
  for (const L of lines) {
    if (L.t === "end") d = Math.max(0, d - 1);
    out.push(d);
    if (L.t === "loop") d++;
  }
  return out;
}

export function toSonicPi(lines, bpm) {
  const ind = indents(lines);
  const body = lines.map((L, i) => "  ".repeat(ind[i]) + lineText(L)).join("\n");
  return (bpm ? `use_bpm ${bpm}\n` : "") + body;
}

export function trackToSonicPi(track, loopLines) {
  const parts = track.loops.map((lp, i) => {
    const lines = loopLines[i];
    return `live_loop :${lp.name} do\n` + lines.map((L) => "  " + lineText(L)).join("\n") + `\nend`;
  });
  return `use_bpm ${track.bpm}\n\n` + parts.join("\n\n");
}

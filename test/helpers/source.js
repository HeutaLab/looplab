/* The suite runs the shipping code, not a paraphrase of it: each test pulls the
   real functions and data out of looplab.jsx as source text and evaluates
   them. That way a test cannot quietly drift from what actually ships — if a
   name or a structure changes, the extraction throws instead of passing. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC_PATH = path.resolve(here, "..", "..", "looplab.jsx");
export const src = fs.readFileSync(SRC_PATH, "utf8");

function slice(startRe, endRe) {
  const s = src.search(startRe);
  if (s < 0) throw new Error("start not found: " + startRe);
  const rest = src.slice(s);
  const e = rest.search(endRe);
  if (e < 0) throw new Error("end not found: " + endRe);
  return rest.slice(0, e);
}

/* the colour table through capPreview/laneOf — the whole pure engine */
export const engine = slice(/^const C = \{/m, /^\/\* ---------- code rendering/m);
/* the level definitions */
export const levels = slice(/^const LEVELS = \[/m, /^const TRACKS = \[/m);

/* Pull one named function out by brace matching, for tests that need to execute
   a specific function (conduct, requestMet, ...) rather than the whole engine. */
export function grab(header) {
  const i = src.indexOf(header);
  if (i < 0) throw new Error("not found: " + header);
  let d = 0;
  const j = src.indexOf("{", i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}") {
      d--;
      if (d === 0) return src.slice(i, k + 1);
    }
  }
  throw new Error("unbalanced: " + header);
}

/* Slice a contiguous run of statements out of a component body, from the line
   starting with `startPrefix` through the line starting with `endPrefix`.
   Used to execute logic that lives inside a React component, so a test cannot
   pass by re-implementing what it is supposed to be checking. */
export function grabBlock(startPrefix, endPrefix) {
  const lines = src.split("\n");
  const a = lines.findIndex((l) => l.trim().startsWith(startPrefix));
  if (a < 0) throw new Error("block start not found: " + startPrefix);
  const b = lines.findIndex((l, i) => i >= a && l.trim().startsWith(endPrefix));
  if (b < 0) throw new Error("block end not found: " + endPrefix);
  return lines.slice(a, b + 1).join("\n");
}

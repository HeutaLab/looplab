/* Modules are imported directly now — before the split every test sliced the
   one big file by text, which meant a test could pass simply because its slice
   no longer contained the code it was checking. Only the few tests that must
   execute logic living inside a React component still read source, and they
   read it from one named module rather than hunting through 4,000 lines. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC_DIR = path.resolve(here, "..", "..", "src");

export const read = (mod) => fs.readFileSync(path.join(SRC_DIR, mod), "utf8");

/* Pull one named function out of a module by brace matching, for logic that
   lives inside a component and cannot simply be imported. */
export function grab(mod, header) {
  const src = read(mod);
  const i = src.indexOf(header);
  if (i < 0) throw new Error(`${header} not found in ${mod}`);
  let d = 0;
  const j = src.indexOf("{", i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}") {
      d--;
      if (d === 0) return src.slice(i, k + 1);
    }
  }
  throw new Error(`unbalanced ${header} in ${mod}`);
}

/* A contiguous run of statements inside a component body. */
export function grabBlock(mod, startPrefix, endPrefix) {
  const lines = read(mod).split("\n");
  const a = lines.findIndex((l) => l.trim().startsWith(startPrefix));
  if (a < 0) throw new Error(`block start ${startPrefix} not found in ${mod}`);
  const b = lines.findIndex((l, i) => i >= a && l.trim().startsWith(endPrefix));
  if (b < 0) throw new Error(`block end ${endPrefix} not found in ${mod}`);
  return lines.slice(a, b + 1).join("\n");
}

/* Swap in a fake browser for the storage tests. The store reads `window` at
   call time, so assigning the global is enough and the real module runs. */
export function withWindow(w, fn) {
  const prev = globalThis.window;
  globalThis.window = w;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete globalThis.window;
    else globalThis.window = prev;
  }
}

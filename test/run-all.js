/* Runs every *.test.js in this directory as its own process, so one crashing
   test cannot take the rest down with it. Exits non-zero if any test fails. */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
const tests = fs
  .readdirSync(here)
  .filter((f) => f.endsWith(".test.js"))
  .filter((f) => !only || f.includes(only))
  .sort();

if (!tests.length) {
  console.error(only ? `no test matches "${only}"` : "no tests found");
  process.exit(1);
}

const verbose = process.env.VERBOSE === "1";
const failed = [];

for (const t of tests) {
  const r = spawnSync(process.execPath, [path.join(here, t)], { encoding: "utf8" });
  const ok = r.status === 0;
  if (!ok) failed.push(t);
  console.log(`${ok ? "  ok  " : "FAIL  "}${t.replace(".test.js", "")}`);
  if (!ok || verbose) {
    const out = ((r.stdout || "") + (r.stderr || "")).trimEnd();
    if (out) console.log(out.split("\n").map((l) => "        " + l).join("\n"));
  }
}

console.log(`\n${tests.length - failed.length}/${tests.length} test files passed`);
if (failed.length) {
  console.log("failed: " + failed.join(", "));
  process.exit(1);
}

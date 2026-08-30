/* The safeguarding position, enforced in code rather than trusted to memory:
   LoopLab has no accounts, makes no network calls after load, and sends
   nothing anywhere. That is what the privacy one-pager promises school IT, so
   a change that quietly breaks it should fail here rather than in a classroom.

   The beacon that prompted this was injected by the edge, not the build, and
   was invisible to curl — so the header that blocks it is checked too. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let fail = 0;
const check = (n, c, d = "") => { if (!c) { fail++; console.log(`FAIL  ${n}${d ? "  — " + d : ""}`); } };

// ---------- 1. no source file may reach off the origin ----------
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(jsx?|html|css)$/.test(p)) files.push(p);
  }
})(path.join(root, "src"));
files.push(path.join(root, "index.html"));

const OFFSITE = /\b(?:https?:)?\/\/(?!localhost|127\.0\.0\.1)[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi;
const ALLOWED = [/sonic-pi\.net/i]; // named in copy as somewhere to go, never fetched
const offenders = [];
for (const p of files) {
  const src = fs.readFileSync(p, "utf8");
  for (const m of src.match(OFFSITE) || []) {
    if (ALLOWED.some((a) => a.test(m))) continue;
    offenders.push(`${path.relative(root, p)}: ${m}`);
  }
}
check("no source file references an external host", offenders.length === 0, offenders.join(" | "));

// ---------- 2. nothing may call out at runtime ----------
const netCalls = [];
for (const p of files.filter((f) => /\.jsx?$/.test(f))) {
  const src = fs.readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  for (const api of ["fetch(", "XMLHttpRequest", "navigator.sendBeacon", "new WebSocket", "EventSource"]) {
    if (src.includes(api)) netCalls.push(`${path.relative(root, p)}: ${api}`);
  }
}
check("no network API is used anywhere", netCalls.length === 0, netCalls.join(" | "));

// ---------- 3. the header that stops edge injection must stay ----------
const headersPath = path.join(root, "public", "_headers");
check("public/_headers exists", fs.existsSync(headersPath));
if (fs.existsSync(headersPath)) {
  const h = fs.readFileSync(headersPath, "utf8");
  check("HTML responses carry no-transform", /\/\*[\s\S]*?Cache-Control:[^\n]*no-transform/.test(h), "the analytics beacon comes back without it");
  check("the reason is written down", /analytics|beacon/i.test(h));
}

// ---------- 4. and it must survive the build ----------
const dist = path.join(root, "dist");
if (fs.existsSync(dist)) {
  check("_headers is emitted into dist", fs.existsSync(path.join(dist, "_headers")));
  const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  check("built HTML has no external script", !/<script[^>]+src=["']https?:/i.test(html));
  check("built HTML has no analytics", !/cloudflareinsights|googletagmanager|analytics/i.test(html));
} else {
  console.log("  (dist not built — skipping build-output checks)");
}

console.log(fail === 0 ? "ALL PASS" : `${fail} FAILURES`);
process.exit(fail ? 1 : 0);

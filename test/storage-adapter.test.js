/* The progress store across eight host environments, including the ones where it must honestly report failure. */
import { src } from "./helpers/source.js";

const s = src.indexOf("const PROGRESS_KEY");
const e = src.indexOf("/* ---------- main app ----------");
const adapterSrc = src.slice(s, e);

function makeEnv({ host, local }) {
  const w = {};
  if (host === "works") { const m = {}; w.storage = { get: async (k) => ({ value: m[k] ?? null }), set: async (k, v) => { m[k] = v; } }; }
  else if (host === "throws") w.storage = { get: async () => { throw new Error("refused"); }, set: async () => { throw new Error("refused"); } };
  else if (host === "raw") { const m = {}; w.storage = { get: async (k) => m[k] ?? null, set: async (k, v) => { m[k] = v; } }; }
  // host === "absent": no window.storage at all
  if (local === "works") { const m = {}; w.localStorage = { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); } }; }
  else if (local === "throws") w.localStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  // local === "absent": no localStorage -> property access throws inside try
  return w;
}

async function run(label, envSpec, expectPersist, expectRoundTrip) {
  const window = makeEnv(envSpec);
  const store = new Function("window", `${adapterSrc}\nreturn progressStore;`)(window);
  const payload = JSON.stringify({ stars: [3, 2, 0, 0, 0, 0], records: { warehouse: "gold" } });
  const ok = await store.save(payload);
  const back = await store.load();
  const round = back === payload;
  const pass = ok === expectPersist && round === expectRoundTrip;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label.padEnd(38)} persist=${String(ok).padEnd(5)} roundTrip=${String(round).padEnd(5)} (want ${expectPersist}/${expectRoundTrip})`);
  return pass;
}

(async () => {
  const results = [];
  results.push(await run("artifact host (window.storage)",      { host: "works",  local: "absent" }, true,  true));
  results.push(await run("plain browser (localStorage only)",   { host: "absent", local: "works"  }, true,  true));
  results.push(await run("both available",                      { host: "works",  local: "works"  }, true,  true));
  results.push(await run("host throws, localStorage works",     { host: "throws", local: "works"  }, true,  true));
  results.push(await run("host returns raw string, not {value}",{ host: "raw",    local: "works"  }, true,  true));
  results.push(await run("private mode (both blocked)",         { host: "absent", local: "throws" }, false, false));
  results.push(await run("nothing available at all",            { host: "absent", local: "absent" }, false, false));

  // SSR: no window object at all
  const store = new Function("window", `${adapterSrc}\nreturn progressStore;`)(undefined);
  const ssrSave = await store.save("x");
  const ssrLoad = await store.load();
  const ssrPass = ssrSave === false && ssrLoad === null;
  console.log(`${ssrPass ? "PASS" : "FAIL"}  ${"no window (SSR / node)".padEnd(38)} persist=${ssrSave}  load=${ssrLoad}`);
  results.push(ssrPass);

  console.log(`\n${results.filter(Boolean).length}/${results.length} environments behave correctly`);
  process.exit(results.every(Boolean) ? 0 : 1);
})();

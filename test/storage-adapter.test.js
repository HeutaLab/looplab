/* Storage and players. Two things matter most here: the store must report
   honestly when it cannot save (the map used to promise "saved automatically"
   while nothing was), and two children on one school device must never see or
   overwrite each other's stars — the spec's Tier 1 acceptance criteria. */
import { src, engine, levels } from "./helpers/source.js";

const adapterSrc = src.slice(src.indexOf('const PROGRESS_KEY = "looplab:progress";'), src.indexOf("/* ---------- main app ---------- */"));
const make = (window) =>
  new Function("window", `${engine}\n${levels}\n${adapterSrc}\nreturn { store, profiles, device, emptyProgress, MAX_PROFILES };`)(window);

function browser(seed = {}) {
  const m = { ...seed };
  return { mem: m, localStorage: { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } } };
}
function host(seed = {}) {
  const m = { ...seed };
  return { mem: m, storage: { get: async (k) => ({ value: m[k] ?? null }), set: async (k, v) => { m[k] = String(v); }, delete: async (k) => { delete m[k]; } } };
}

let fail = 0;
const check = (n, c, d = "") => { if (!c) { fail++; console.log(`FAIL  ${n}${d ? "  — " + d : ""}`); } };
const g = (n) => console.log(`\n${n}`);

// ---------- 1. the environments it has to survive ----------
g("environments");
const envs = [
  ["artifact host (window.storage)", { ...host() }, true],
  ["plain browser (localStorage)", { ...browser() }, true],
  ["both available", { ...host(), ...browser() }, true],
  ["host throws, browser works", { storage: { get: async () => { throw new Error("no"); }, set: async () => { throw new Error("no"); } }, ...browser() }, true],
  ["private mode (both blocked)", { localStorage: { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } } }, false],
  ["nothing available", {}, false],
];
for (const [label, w, expect] of envs) {
  const { store } = make(w);
  const ok = await store.set("looplab:test", "hello");
  const back = await store.get("looplab:test");
  const good = ok === expect && (expect ? back === "hello" : back === null);
  check(label, good, `persist=${ok} read=${JSON.stringify(back)}`);
}
{
  const { store } = make(undefined); // SSR
  check("no window at all", (await store.set("k", "v")) === false && (await store.get("k")) === null);
}
console.log(`  ${envs.length + 1} environments`);

// ---------- 2. two children, one device ----------
g("players keep separate progress");
{
  const w = browser();
  const { profiles } = make(w);
  const sam = await profiles.create("Sam");
  const alex = await profiles.create("Alex");
  check("two players can exist", !!sam && !!alex && sam.id !== alex.id);

  await profiles.saveProgress(sam.id, { stars: [3, 3, 2, 0, 0, 0], records: { warehouse: "gold" } });
  await profiles.saveProgress(alex.id, { stars: [1, 0, 0, 0, 0, 0], records: {} });

  const s = await profiles.progress(sam.id);
  const a = await profiles.progress(alex.id);
  check("Sam keeps Sam's stars", JSON.stringify(s.stars) === JSON.stringify([3, 3, 2, 0, 0, 0]), JSON.stringify(s.stars));
  check("Alex keeps Alex's stars", JSON.stringify(a.stars) === JSON.stringify([1, 0, 0, 0, 0, 0]), JSON.stringify(a.stars));
  check("records do not bleed across players", !a.records.warehouse && s.records.warehouse === "gold");
  check("each player has their own key", !!w.mem[`looplab:profile:${sam.id}`] && !!w.mem[`looplab:profile:${alex.id}`]);

  // deleting one must not touch the other
  await profiles.remove(alex.id);
  const left = await profiles.list();
  check("deleting removes only that player", left.length === 1 && left[0].id === sam.id, JSON.stringify(left.map((p) => p.name)));
  check("the deleted player's key is gone", !w.mem[`looplab:profile:${alex.id}`]);
  check("the remaining player's progress is untouched", JSON.stringify((await profiles.progress(sam.id)).stars) === JSON.stringify([3, 3, 2, 0, 0, 0]));
}

// ---------- 3. nobody loses stars to a version change ----------
g("migration from the one-bucket era");
{
  const old = JSON.stringify({ stars: [3, 3, 1, 0, 0, 0], records: { warehouse: "silver" } });
  const w = browser({ "looplab:progress": old, "looplab:name": "Jo" });
  const { profiles } = make(w);
  const list = await profiles.migrate();
  check("a first player is created from the old bucket", list.length === 1, JSON.stringify(list));
  check("the old name is carried over", list[0] && list[0].name === "Jo", list[0] && list[0].name);
  const prog = await profiles.progress(list[0].id);
  check("the old stars survive", JSON.stringify(prog.stars) === JSON.stringify([3, 3, 1, 0, 0, 0]), JSON.stringify(prog.stars));
  check("the old record survives", prog.records.warehouse === "silver");
  // running twice must not duplicate
  const again = await profiles.migrate();
  check("migrating twice does not duplicate the player", again.length === 1);
}
{
  // the pre-rename key too
  const w = browser({ "codebeat:progress": JSON.stringify({ stars: [2, 0, 0, 0, 0, 0], records: {} }) });
  const { profiles } = make(w);
  const list = await profiles.migrate();
  check("pre-rename progress also migrates", list.length === 1 && (await profiles.progress(list[0].id)).stars[0] === 2);
}
{
  // a device that never played should not gain a phantom player
  const { profiles } = make(browser());
  check("a fresh device creates no phantom player", (await profiles.migrate()).length === 0);
  const w2 = browser({ "looplab:progress": JSON.stringify({ stars: [0, 0, 0, 0, 0, 0], records: {} }) });
  check("an untouched save creates no phantom player", (await make(w2).profiles.migrate()).length === 0);
}

// ---------- 4. corrupt data must not lock a child out ----------
g("robustness");
{
  const w = browser({ "looplab:profiles": "{{{not json", "looplab:profile:p_x": "also broken" });
  const { profiles, emptyProgress } = make(w);
  let threw = null;
  let list, prog;
  try { list = await profiles.list(); prog = await profiles.progress("p_x"); } catch (e) { threw = e.message; }
  check("a corrupt index does not throw", !threw, threw || "");
  check("a corrupt index reads as empty", Array.isArray(list) && list.length === 0);
  check("corrupt progress falls back to a fresh start", prog && Array.isArray(prog.stars) && prog.stars.every((n) => n === 0));
}

// ---------- 5. the PIN belongs to the device, not the player ----------
g("device settings");
{
  const w = browser();
  const { device, profiles } = make(w);
  const d = await device.read();
  check("there is a default PIN", d.pin === "2468", d.pin);
  await device.write({ pin: "1357" });
  check("the PIN persists", (await device.read()).pin === "1357");
  await profiles.create("Sam");
  check("the PIN is not stored under a player", !JSON.stringify(w.mem["looplab:profiles"]).includes("1357"));
  check("the PIN lives on its own device key", w.mem["looplab:device"].includes("1357"));
}

// ---------- 6. a class set has a ceiling ----------
g("limits");
{
  const { profiles, MAX_PROFILES } = make(browser());
  for (let i = 0; i < MAX_PROFILES + 5; i++) await profiles.create("P" + i);
  const list = await profiles.list();
  check(`no more than ${MAX_PROFILES} players`, list.length === MAX_PROFILES, `${list.length}`);
}

console.log(`\n${fail === 0 ? "ALL PASS" : fail + " FAILURES"}`);
process.exit(fail ? 1 : 0);

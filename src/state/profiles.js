import { LEVELS } from "../data/levels.js";
import { DEFAULT_PIN, DEVICE_KEY, LEGACY_PROGRESS_KEY, MAX_PROFILES, NAME_KEY, PROFILES_KEY, PROGRESS_KEY, parse, profileKey, store } from "./storage.js";

export const emptyProgress = () => ({ v: 1, stars: LEVELS.map(() => 0), records: {} });

export const cleanName = (n) => String(n ?? "").replace(/\s+/g, " ").trim().slice(0, 16);

/* Five children share one school login, so progress cannot be one bucket per
   device. Each player gets their own key, listed in an index the launch screen
   reads. Names are local to the device and never leave it. */
export const profiles = {
  async list() {
    const arr = parse(await store.get(PROFILES_KEY), []);
    return Array.isArray(arr) ? arr.filter((p) => p && p.id) : [];
  },
  async saveList(list) {
    return store.set(PROFILES_KEY, JSON.stringify(list.slice(0, MAX_PROFILES)));
  },
  async progress(id) {
    return parse(await store.get(profileKey(id)), emptyProgress());
  },
  async saveProgress(id, data) {
    return store.set(profileKey(id), JSON.stringify({ v: 1, ...data }));
  },
  async create(name) {
    const list = await profiles.list();
    if (list.length >= MAX_PROFILES) return null;
    const id = "p_" + Math.random().toString(36).slice(2, 8);
    const p = { id, name: cleanName(name) || "Player", lastPlayed: Date.now() };
    await profiles.saveList([p, ...list]);
    await profiles.saveProgress(id, emptyProgress());
    return p;
  },
  async touch(id) {
    const list = await profiles.list();
    const next = list.map((p) => (p.id === id ? { ...p, lastPlayed: Date.now() } : p));
    await profiles.saveList(next);
  },
  async rename(id, name) {
    const list = await profiles.list();
    await profiles.saveList(list.map((p) => (p.id === id ? { ...p, name: cleanName(name) || p.name } : p)));
  },
  /* Deleting removes that player's key and nobody else's. */
  async remove(id) {
    const list = await profiles.list();
    await profiles.saveList(list.filter((p) => p.id !== id));
    await store.del(profileKey(id));
  },
  /* One-time: a device that played before profiles existed has stars in a
     single bucket. Fold them into a first player rather than stranding them. */
  async migrate() {
    const list = await profiles.list();
    if (list.length) return list;
    const raw = (await store.get(PROGRESS_KEY)) ?? (await store.get(LEGACY_PROGRESS_KEY));
    if (!raw) return [];
    const old = parse(raw, null);
    if (!old || !Array.isArray(old.stars) || !old.stars.some((n) => n > 0)) return [];
    const name = cleanName(await store.get(NAME_KEY)) || "Player 1";
    const id = "p_" + Math.random().toString(36).slice(2, 8);
    const p = { id, name, lastPlayed: Date.now() };
    await profiles.saveList([p]);
    await profiles.saveProgress(id, { stars: old.stars, records: old.records || {} });
    return [p];
  },
};

/* Device settings, deliberately not per profile: the PIN belongs to the
   teacher and the machine, not to whoever is holding it. */
export const device = {
  async read() {
    return parse(await store.get(DEVICE_KEY), { pin: DEFAULT_PIN });
  },
  async write(d) {
    return store.set(DEVICE_KEY, JSON.stringify(d));
  },
};

/* ---------- main app ---------- */

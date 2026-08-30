
export const PROGRESS_KEY = "looplab:progress";

export const NAME_KEY = "looplab:name";

/* This shipped under an earlier name before the rename, and before that as one
   bucket per device rather than per player. Both are read once and folded into
   a profile, so nobody loses stars to a version change. */
export const LEGACY_PROGRESS_KEY = "codebeat:progress";

export const PROFILES_KEY = "looplab:profiles";

export const DEVICE_KEY = "looplab:device";

export const profileKey = (id) => `looplab:profile:${id}`;

export const MAX_PROFILES = 40;

export const DEFAULT_PIN = "2468";

export const hasWindow = () => typeof window !== "undefined";

/* One keyed store over both worlds: the artifact host provides window.storage,
   a plain browser does not. Every write reports whether it actually landed —
   the map used to promise "saved automatically" while nothing was saved. */
export const store = {
  async get(key) {
    if (!hasWindow()) return null;
    try {
      if (window.storage && window.storage.get) {
        const r = await window.storage.get(key);
        if (r && r.value != null) return r.value;
      }
    } catch (e) {
      /* host storage missing or refused — try the browser next */
    }
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      /* private mode, or site data blocked */
    }
    return null;
  },
  async set(key, value) {
    if (!hasWindow()) return false;
    let ok = false;
    try {
      if (window.storage && window.storage.set) {
        await window.storage.set(key, value);
        ok = true;
      }
    } catch (e) {}
    try {
      window.localStorage.setItem(key, value);
      ok = true;
    } catch (e) {}
    return ok;
  },
  async del(key) {
    if (!hasWindow()) return;
    try {
      if (window.storage && window.storage.delete) await window.storage.delete(key);
    } catch (e) {}
    try {
      window.localStorage.removeItem(key);
    } catch (e) {}
  },
};

export const parse = (raw, fallback) => {
  try {
    const d = raw ? JSON.parse(raw) : null;
    return d ?? fallback;
  } catch (e) {
    return fallback; // a corrupt save must not lock a child out of the game
  }
};

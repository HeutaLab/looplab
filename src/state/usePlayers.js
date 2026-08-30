import { useState, useRef, useEffect } from "react";
import { LEVELS } from "../data/levels.js";
import { profiles, device } from "./profiles.js";
import { DEFAULT_PIN } from "./storage.js";

/* Who is playing, what they have done, and what they had half-finished.

   All of it is per player and none of it leaves the device. `onNoPlayers` fires
   when this device has never been used, so the app can open the launch screen
   without this hook needing to know what a screen is. */
export function usePlayers({ onNoPlayers }) {
  const [stars, setStars] = useState(() => LEVELS.map(() => 0));
  const [records, setRecords] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [persist, setPersist] = useState(null); // null = not tried yet, false = nothing can store it
  const [players, setPlayers] = useState([]);
  const [playerId, setPlayerId] = useState(null);
  /* Work in progress, so a lesson ending or a tab closing does not throw away
     a loop a child spent ten minutes typing. Kept per player, alongside stars. */
  const [draft, setDraft] = useState({});
  const draftTimer = useRef(null);
  /* Volume belongs to the machine and the room, not to whoever is holding it,
     so it lives with the device settings beside the teacher PIN. */
  const [volume, setVolume] = useState(0.6);
  const [muted, setMuted] = useState(false);
  const [askHeadphones, setAskHeadphones] = useState(false);
  const [pin, setPin] = useState(DEFAULT_PIN);
  const player = players.find((p) => p.id === playerId) || null;
  const name = player ? player.name : "";

  /* On launch: fold any pre-profile progress into a first player, then open
     the most recent one. Nobody is asked "who are you?" twice in a lesson —
     the map header carries a visible "not you?" instead. */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await device.read();
        if (alive && d && d.pin) setPin(String(d.pin));
        // The refs that apply these live in useAudio; this hook only owns the
        // stored values and hands them over.
        if (alive && d && typeof d.volume === "number") setVolume(d.volume);
        if (alive && d && d.muted) setMuted(true);
        if (alive && !d.heardHeadphones) setAskHeadphones(true);
        await profiles.migrate();
        const list = await profiles.list();
        if (!alive) return;
        setPlayers(list);
        if (list.length) {
          const last = [...list].sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))[0];
          const prog = await profiles.progress(last.id);
          if (!alive) return;
          setPlayerId(last.id);
          setStars(LEVELS.map((_, i) => (prog.stars && prog.stars[i]) || 0));
          setRecords(prog.records && typeof prog.records === "object" ? prog.records : {});
          setDraft(prog.inProgress && typeof prog.inProgress === "object" ? prog.inProgress : {});
        } else {
          onNoPlayers(); // first run on this device
        }
      } catch (e) {
        /* first run, or a corrupt save — start fresh rather than lock anyone out */
      }
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // save whenever progress changes, and remember whether it really landed
  useEffect(() => {
    if (!loaded || !playerId) return;
    let alive = true;
    profiles.saveProgress(playerId, { stars, records, inProgress: draft }).then((ok) => {
      if (alive) setPersist(ok);
    });
    return () => {
      alive = false;
    };
  }, [stars, records, draft, loaded, playerId]);

  /* Persist the room's setting; applying it to the audio graph is the hook's job. */
  useEffect(() => {
    (async () => {
      try {
        const d = await device.read();
        await device.write({ ...d, volume, muted });
      } catch (e) {}
    })();
  }, [volume, muted]);

  /* Debounced, because this fires on every keystroke in the editor. A failed
     save must never interrupt play, so nothing here can throw into the UI. */
  function saveDraft(scope, id, data) {
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      setDraft((d) => ({ ...d, [scope]: { ...(d[scope] || {}), [id]: data } }));
    }, 500);
  }
  function clearDraft(scope, id) {
    clearTimeout(draftTimer.current);
    setDraft((d) => {
      const next = { ...(d[scope] || {}) };
      delete next[id];
      return { ...d, [scope]: next };
    });
  }

  /* Switching player swaps the whole progress state, so two children on one
     machine never see each other's stars. */
  async function openPlayer(id) {
    const prog = await profiles.progress(id);
    setPlayerId(id);
    setStars(LEVELS.map((_, i) => (prog.stars && prog.stars[i]) || 0));
    setRecords(prog.records && typeof prog.records === "object" ? prog.records : {});
    setDraft(prog.inProgress && typeof prog.inProgress === "object" ? prog.inProgress : {});
    await profiles.touch(id);
    setPlayers(await profiles.list());
  }
  async function addPlayer(n) {
    const p = await profiles.create(n);
    if (!p) return;
    setPlayers(await profiles.list());
    await openPlayer(p.id);
  }
  /* Renaming belongs here with the rest of the player data, rather than the
     app reaching in and setting the list itself. */
  async function renamePlayer(n) {
    if (!playerId) return;
    setPlayers((ps) => ps.map((p) => (p.id === playerId ? { ...p, name: n } : p)));
    await profiles.rename(playerId, n);
  }

  async function removePlayer(id) {
    await profiles.remove(id);
    const list = await profiles.list();
    setPlayers(list);
    if (id === playerId) {
      setPlayerId(null);
      setStars(LEVELS.map(() => 0));
      setRecords({});
      setDraft({});
      return true; // the caller sends them back to the launch screen
    }
    return false;
  }

  return {
    stars, setStars, records, setRecords, loaded, persist,
    players, playerId, player, name,
    draft, saveDraft, clearDraft, setDraft,
    volume, setVolume, muted, setMuted, askHeadphones, setAskHeadphones,
    pin, setPin,
    openPlayer, addPlayer, removePlayer, renamePlayer,
  };
}

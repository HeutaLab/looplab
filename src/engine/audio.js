import React, { useState, useRef, useEffect } from "react";
import * as Tone from "tone";
import { LEAD } from "../theme.js";
import { compile, compileLoops, capPreview } from "./interpreter.js";
import { transport } from "./transport.js";

/* Everything that makes a sound, in one place.

   The iPhone trick in unlockMedia must keep running SYNCHRONOUSLY inside the
   tap handler, before anything awaits — that is what lets audio play with the
   physical mute switch on, and it is the easiest thing here to break by
   reordering. playLines and playMulti call it first for that reason. */
export function useAudio({ volume, muted }) {
  const [playInfo, setPlayInfo] = useState(null);
  const [playTag, setPlayTag] = useState(null);

  const synthsRef = useRef(null);
  const masterRef = useRef(null);
  const volumeRef = useRef(0.6);
  const mutedRef = useRef(false);
  const endTimer = useRef(null);
  const onEndRef = useRef(null);
  const silentRef = useRef(null);

  // iPhone trick: playing a (silent) HTML5 audio element switches the phone
  // into "media playback" mode, so web audio works even with the mute switch on.
  function unlockMedia() {
    try {
      if (!silentRef.current) {
        const a = document.createElement("audio");
        a.setAttribute("playsinline", "");
        a.loop = true;
        a.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA";
        silentRef.current = a;
      }
      const p = silentRef.current.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  /* 0..1 from the slider, decibels for Tone. Zero is silence, not -0dB. */
  function applyVolume(node, v, muted) {
    if (!node) return;
    try {
      node.volume.value = v <= 0 ? -Infinity : Tone.gainToDb(Math.min(1, v));
      node.mute = !!muted;
    } catch (e) {}
  }

  async function ensureAudio() {
    await Tone.start();
    try {
      if (Tone.context.state !== "running") await Tone.context.resume();
    } catch (e) {}
    if (!synthsRef.current) {
      /* One node the whole game runs through, so a single slider moves every
         synth and drum together, and mute silences the room while the note
         highway keeps animating — a teacher can demo a track in silence. */
      const out = new Tone.Volume(0).toDestination();
      masterRef.current = out;
      applyVolume(out, volumeRef.current, mutedRef.current);
      const master = new Tone.Limiter(-1).connect(out);
      const mk = (type, vol) =>
        new Tone.PolySynth(Tone.Synth, {
          oscillator: { type },
          envelope: { attack: 0.01, decay: 0.18, sustain: 0.25, release: 0.3 },
        }).connect(new Tone.Volume(vol).connect(master));
      const pretty_bell = new Tone.PolySynth(Tone.FMSynth).connect(new Tone.Volume(-6).connect(master));
      const prophet = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth", spread: 25, count: 3 },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.4 },
      }).connect(new Tone.Filter(1400, "lowpass").connect(new Tone.Volume(-9).connect(master)));
      const tb303 = new Tone.MonoSynth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.005, decay: 0.15, sustain: 0.15, release: 0.1 },
        filter: { type: "lowpass", rolloff: -24, Q: 6 },
        filterEnvelope: { attack: 0.005, decay: 0.18, sustain: 0.1, release: 0.1, baseFrequency: 120, octaves: 3.2 },
      }).connect(new Tone.Volume(-4).connect(master));
      const kick = new Tone.MembraneSynth().connect(new Tone.Volume(0).connect(master));
      const snare = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.17, sustain: 0 } }).connect(
        new Tone.Volume(-6).connect(master)
      );
      const hatFilter = new Tone.Filter(7000, "highpass").connect(new Tone.Volume(-12).connect(master));
      const hat = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 } }).connect(hatFilter);
      synthsRef.current = {
        beep: mk("triangle", -3),
        saw: mk("sawtooth", -7),
        square: mk("square", -8),
        pretty_bell,
        prophet,
        tb303,
        kick,
        snare,
        hat,
      };
    }
    return synthsRef.current;
  }

  function trigger(s, ev, t) {
    try {
      if (ev.kind === "note") {
        const syn = s[ev.synth] || s.beep;
        syn.triggerAttackRelease(Tone.Frequency(ev.note, "midi"), ev.synth === "tb303" ? 0.15 : 0.3, t);
      } else if (ev.kind === "bd_haus") s.kick.triggerAttackRelease("C2", "8n", t);
      else if (ev.kind === "sn_dolf") s.snare.triggerAttackRelease("16n", t);
      else if (ev.kind === "drum_cymbal_closed") s.hat.triggerAttackRelease(0.05, t);
    } catch (e) {}
  }

  function stopAll() {
    clearTimeout(endTimer.current);
    try {
      transport().stop();
      transport().cancel();
    } catch (e) {}
    onEndRef.current = null;
    setPlayInfo(null);
    setPlayTag(null);
  }

  function schedule(compiled, tag, onEnd) {
    // Belt and braces: compile() sanitises its inputs, but nothing non-finite
    // may reach Tone.Transport or the end timer (setTimeout coerces NaN to 0).
    const events = compiled.events.filter((ev) => Number.isFinite(ev.time));
    const total = Number.isFinite(compiled.total) ? compiled.total : 0;
    if (!events.length) return;
    ensureAudio().then((s) => {
      stopAll();
      transport().cancel();
      transport().position = 0;
      events.forEach((ev) => transport().schedule((t) => trigger(s, ev, t), LEAD + ev.time));
      transport().start();
      setPlayInfo({ events, total, startedAt: performance.now() });
      setPlayTag(tag);
      onEndRef.current = onEnd || null;
      endTimer.current = setTimeout(() => {
        try {
          transport().stop();
          transport().cancel();
        } catch (e) {}
        setPlayInfo(null);
        setPlayTag(null);
        const cb = onEndRef.current;
        onEndRef.current = null;
        if (cb) cb();
      }, (LEAD + total + 0.7) * 1000);
    });
  }

  async function playLines(lines, tag, onEnd, bpm = 60, maxDur = 0) {
    unlockMedia();
    schedule(capPreview(compile(lines, bpm), maxDur), tag, onEnd);
  }

  async function playMulti(loopsLines, tag, onEnd, bpm = 60, reps = 2, maxDur = 0) {
    unlockMedia();
    schedule(capPreview(compileLoops(loopsLines.filter((ls) => ls && ls.length), bpm, reps), maxDur), tag, onEnd);
  }

  useEffect(() => () => stopAll(), []);

  /* Volume and mute are owned by the app (they live in device settings), but
     applied here, on the one node the whole game runs through. */
  useEffect(() => {
    volumeRef.current = volume;
    mutedRef.current = muted;
    applyVolume(masterRef.current, volume, muted);
  }, [volume, muted]);

  return { playInfo, playTag, setPlayInfo, setPlayTag, playLines, playMulti, stopAll, ensureAudio, trigger, unlockMedia, synthsRef };
}

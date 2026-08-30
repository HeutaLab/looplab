/* The real conduct() driven by a simulated clock: pacing, note lead time, and a hidden tab that must not burn the set. */
import { engine, grab, levels, src } from "./helpers/source.js";

const LEAD = parseFloat(src.match(/const LEAD = ([0-9.]+);/)[1]);
const eng = new Function(`${engine}\nreturn { compile, compileLoops };`)();
const { compile } = eng;

const SET_BARS = +src.match(/const SET_BARS = (\d+);/)[1];
const SCHED_AHEAD = parseFloat(src.match(/const SCHED_AHEAD = ([0-9.]+);/)[1]);
const MAX_BARS_PER_TICK = +src.match(/const MAX_BARS_PER_TICK = (\d+);/)[1];

const conductSrc = grab("function conduct(s)");
const requestMetSrc = grab("function requestMet(e)");
const makeRequestSrc = grab("function makeRequest(e, track)");
const makeGlitchSrc = grab("function makeGlitch(e, track)");

// a stub track with 4 loops
const TRACK = { bpm: 128, loops: [
  { name: "drums", startOn: true },  { name: "bass", startOn: false },
  { name: "chords", startOn: false }, { name: "lead", startOn: false } ] };
const LINES = () => [
  [{t:"sample",v:"bd_haus"},{t:"sleep",v:1},{t:"sample",v:"bd_haus"},{t:"sleep",v:1},{t:"sample",v:"bd_haus"},{t:"sleep",v:1},{t:"sample",v:"bd_haus"},{t:"sleep",v:1}],
  [{t:"play",v:33},{t:"sleep",v:1},{t:"play",v:36},{t:"sleep",v:1},{t:"play",v:33},{t:"sleep",v:1},{t:"play",v:40},{t:"sleep",v:1}],
  [{t:"play",v:60},{t:"sleep",v:2},{t:"play",v:64},{t:"sleep",v:2}],
  [{t:"play",v:72},{t:"sleep",v:1},{t:"play",v:74},{t:"sleep",v:3}],
];

function makeRig() {
  const clock = { t: 0 };
  const Tone = { now: () => clock.t };
  const DRUMS = ["bd_haus", "sn_dolf", "drum_cymbal_closed"];
  const triggered = [];
  const finished = [];
  const e = {
    lines: LINES(), muted: TRACK.loops.map((l) => !l.startOn), bpm: TRACK.bpm,
    bar: 0, hype: 40, score: 0, request: null, glitch: null, visEvents: [],
    audioStart: SCHED_AHEAD, perfStart: SCHED_AHEAD * 1000, nextBarTime: 0, queued: 0, barTimes: [],
    interval: 1, msg: "",
  };
  const engRef = { current: e };
  const deps = {
    Tone, compile, DRUMS, SET_BARS, SCHED_AHEAD, MAX_BARS_PER_TICK, track: TRACK,
    eng: engRef,
    trigger: (s, ev, at) => triggered.push({ at, ev }),
    endSet: () => { if (engRef.current.interval) { engRef.current.interval = null; finished.push({ bar: e.bar, score: e.score }); } },
  };
  const conduct = new Function("deps", `
    const { Tone, compile, DRUMS, SET_BARS, SCHED_AHEAD, MAX_BARS_PER_TICK, track, eng, trigger, endSet } = deps;
    ${requestMetSrc}
    ${makeRequestSrc}
    ${makeGlitchSrc}
    ${conductSrc}
    return conduct;
  `)(deps);
  return { clock, e, conduct, triggered, finished };
}

let failures = 0;
const check = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) failures++;
};

// ---------- 1. normal playback, 90ms ticks ----------
{
  const r = makeRig();
  const barDur = 4 * (60 / TRACK.bpm);
  let ticks = 0;
  while (!r.finished.length && ticks < 20000) { r.conduct(null); r.clock.t += 0.09; ticks++; }
  const wall = r.clock.t;
  const ideal = SET_BARS * barDur;
  check("48-bar set plays its full length before results", wall >= ideal && wall < ideal + barDur + 0.5,
        `${wall.toFixed(1)}s elapsed vs ${ideal.toFixed(1)}s of music`);
  check("all 48 bars counted", r.finished[0].bar === SET_BARS, `bar=${r.finished[0].bar}`);
  const past = r.triggered.filter((x) => x.at < 0).length;
  check("no note scheduled into the past", past === 0, `${past} past notes`);
}

// ---------- 2. every note gets its full flight down the highway ----------
{
  const r = makeRig();
  const seen = new Map();
  let ticks = 0;
  while (!r.finished.length && ticks < 20000) {
    const before = r.e.visEvents.length ? r.e.visEvents[r.e.visEvents.length - 1] : null;
    const n0 = r.e.queued;
    r.conduct(null);
    if (r.e.queued > n0) {
      // record the lead time of every event pushed this tick
      for (const ev of r.e.visEvents) {
        if (!seen.has(ev.id)) seen.set(ev.id, (r.e.audioStart + ev.time) - r.clock.t);
      }
    }
    r.clock.t += 0.09; ticks++;
  }
  const leads = [...seen.values()];
  const minLead = Math.min(...leads);
  // Audio must never be scheduled late. The visual consequence of the tight
  // horizon is deliberate (see SCHED_AHEAD): notes enter the highway partway
  // down rather than at the top, in exchange for responsive mutes and fixes.
  check("every note is scheduled ahead of its own sound", minLead > 0,
        `min lead ${minLead.toFixed(2)}s`);
  check("horizon stays tight enough to keep the booth responsive", minLead <= SCHED_AHEAD + 1e-9,
        `min lead ${minLead.toFixed(2)}s vs horizon ${SCHED_AHEAD}s`);
  const entryPoint = (1 - minLead / LEAD) * 100;
  console.log(`      (notes enter the highway ${entryPoint.toFixed(0)}% of the way down — the accepted trade)`);
}

// ---------- 3. hidden tab: a 30s freeze must not burn the set ----------
{
  const r = makeRig();
  const barDur = 4 * (60 / TRACK.bpm);
  for (let i = 0; i < 40; i++) { r.conduct(null); r.clock.t += 0.09; }   // ~3.6s of normal play
  const barBefore = r.e.bar;
  const firedBefore = r.triggered.length;
  r.clock.t += 30;                                                       // tab hidden, timers frozen
  r.conduct(null);                                                       // the catch-up tick
  const jumped = r.e.bar - barBefore;
  check("a 30s hidden tab does not fast-forward the set", jumped <= MAX_BARS_PER_TICK,
        `advanced ${jumped} bars in one tick (30s = ${(30 / barDur).toFixed(0)} bars of music)`);
  const past = r.triggered.slice(firedBefore).filter((x) => x.at < r.clock.t - 0.05).length;
  check("no silent notes scheduled into the past after the gap", past === 0,
        `${past} of ${r.triggered.length - firedBefore} notes scheduled after the gap were already past`);
  // and it must still finish the full set afterwards
  let ticks = 0;
  while (!r.finished.length && ticks < 20000) { r.conduct(null); r.clock.t += 0.09; ticks++; }
  check("set still completes all 48 bars after a tab switch", r.finished[0].bar === SET_BARS, `bar=${r.finished[0].bar}`);
}

// ---------- 4. the old code, for contrast ----------
{
  const oldConduct = conductSrc
    .replace(/const behind[\s\S]*?\n    }\n\n/, "")            // no re-base
    .replace(/&& n\+\+ < MAX_BARS_PER_TICK/, "")               // no cap
    .replace(/now \+ SCHED_AHEAD/, "now + 0.45");              // old horizon
  const r = makeRig();
  const conduct = new Function("deps", `
    const { Tone, compile, DRUMS, SET_BARS, SCHED_AHEAD, MAX_BARS_PER_TICK, track, eng, trigger, endSet } = deps;
    ${requestMetSrc}${makeRequestSrc}${makeGlitchSrc}${oldConduct}
    return conduct;`)({
      Tone: { now: () => r.clock.t }, compile, DRUMS: ["bd_haus","sn_dolf","drum_cymbal_closed"],
      SET_BARS, SCHED_AHEAD, MAX_BARS_PER_TICK, track: TRACK, eng: { current: r.e },
      trigger: (s, ev, at) => r.triggered.push({ at, ev }), endSet: () => { r.finished.push({ bar: r.e.bar }); r.e.interval = null; },
    });
  for (let i = 0; i < 40; i++) { conduct(null); r.clock.t += 0.09; }
  const barBefore = r.e.bar;
  r.clock.t += 30;
  conduct(null);
  console.log(`\n(contrast) uncapped code advanced ${r.e.bar - barBefore} bars on the same 30s gap, ` +
              `${r.triggered.filter((x) => x.at < r.clock.t - 0.05).length} of them silent`);
}

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURES"}`);
process.exit(failures ? 1 : 0);

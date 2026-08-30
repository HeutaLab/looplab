import { D, P, S, SY } from "../engine/interpreter.js";
import { DRUMS } from "../theme.js";

export const CHIP_GROUPS = {
  drums: { label: "Drums", items: DRUMS.map((d) => ({ label: ":" + d, make: () => D(d) })) },
  notes: {
    label: "Notes",
    items: [33, 38, 40, 48, 55, 60, 64, 67, 72].map((n) => ({ label: "play " + n, make: () => P(n) })),
  },
  sleeps: {
    label: "Sleeps",
    items: [0.25, 0.5, 1].map((t) => ({ label: "sleep " + t, make: () => S(t) })),
  },
  synth: {
    label: "Sounds",
    items: ["tb303", "saw", "prophet", "pretty_bell"].map((s) => ({ label: "use_synth :" + s, make: () => SY(s) })),
  },
  bpm: { label: "Tempo", items: [126, 130, 134].map((b) => ({ label: "use_bpm " + b, make: () => ({ t: "bpm", v: b }) })) },
  chooseNote: {
    label: "Random notes",
    items: [
      { label: "choose([60,64,67,72])", make: () => ({ t: "playChoose", v: [60, 64, 67, 72] }) },
      { label: "choose([33,38,40])", make: () => ({ t: "playChoose", v: [33, 38, 40] }) },
    ],
  },
  chooseDrum: {
    label: "Random drums",
    items: [
      { label: "choose([:sn_dolf,:hat])", make: () => ({ t: "sampleChoose", v: ["sn_dolf", "drum_cymbal_closed"] }) },
      { label: "choose([:bd_haus,:hat])", make: () => ({ t: "sampleChoose", v: ["bd_haus", "drum_cymbal_closed"] }) },
    ],
  },
  rand: { label: "Random timing", items: [{ label: "sleep rrand(0.25,0.5)", make: () => ({ t: "sleepRand", v: [0.25, 0.5] }) }] },
};

export const LEAD = 1.6;

export const C = {
  bg: "#110F26",
  panel: "#1D1A3E",
  panel2: "#26225A",
  line: "#332E66",
  ink: "#F4F2FF",
  dim: "#A29CCB",
  pink: "#FF5CA8",
  yellow: "#FFD34D",
  aqua: "#45E0BE",
  violet: "#9C8BFF",
  orange: "#FF9A57",
  green: "#5CE07E",
  red: "#FF6B6B",
};

export const LANES = [C.pink, C.orange, C.yellow, C.aqua, C.violet];

export const DRUMS = ["bd_haus", "sn_dolf", "drum_cymbal_closed"];

export const DRUM_EMOJI = { bd_haus: "🦶", sn_dolf: "🥁", drum_cymbal_closed: "✨" };

/* ---------- tiny Sonic Pi interpreter ---------- */

export const tokColor = { kw: "#B7A9FF", num: C.yellow, sym: C.aqua };

/* Phase screens split in two on a large screen. A phone keeps the single
   stacked column it always had; from lg up, the parts a player watches — the
   mentor, the note highway, the goals — sit beside the parts they edit, so
   nobody has to scroll between hearing a change and making one. The watch
   column sticks, because the highway is what you look at while typing. */
export const PHASE = {
  "gap-3": {
    grid: "flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5",
    watch: "flex flex-col gap-3 lg:sticky lg:top-4",
    edit: "flex flex-col gap-3 lg:min-w-0",
  },
  "gap-2": {
    grid: "flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5",
    watch: "flex flex-col gap-2 lg:sticky lg:top-4",
    edit: "flex flex-col gap-2 lg:min-w-0",
  },
};

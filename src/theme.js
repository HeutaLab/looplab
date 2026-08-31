export const LEAD = 1.6;

/* One voice for the whole product, on every device it runs on. The faces are
   bundled with the app (see src/index.css) rather than borrowed from the
   operating system, so an iPad, a Chromebook and a Windows laptop show the
   same screen. The stacks below are only what renders in the moment before
   the file loads, or if it fails to. */
export const TYPE = {
  ui: '"Atkinson Hyperlegible Next", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  code: '"Atkinson Hyperlegible Mono", ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace',
};

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

/* The Club floor.

   The lanes took the saturated four — red, yellow, cyan, violet — so the two
   colours that carry meaning had to move out of their way. The fault can no
   longer be red, because red is the drums lane. The thing you write can no
   longer be amber, because amber sat on top of the claps. Write is white,
   which nothing else on this floor is; the fault is magenta, which nothing
   else comes near. */
export const CLUB = {
  void: "#07060c",
  ink: "#f3eee4",
  dim: "#c9c3d4",
  write: "#ffffff", /* the hole, the chips, the playhead bar */
  sour: "#ff2d9e",  /* the fault */
  ok: "#7dffb3",
};


/* One colour per lane, in track order, at full strength. Nothing here is
   tinted or softened: the floor is black and the tokens carry all of it. */
export const CHANNEL = ["#ff3b30", "#ffd426", "#00d6ff", "#b14bff", "#3ddc84"];

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

import * as Tone from "tone";

/* Tone 15 deprecates the `Tone.Transport` singleton in favour of
   getTransport(); Tone 14 has no getTransport at all. Nothing here pins a
   version, so resolve it once and let both work. */
export const transport = () => (typeof Tone.getTransport === "function" ? Tone.getTransport() : Tone.Transport);

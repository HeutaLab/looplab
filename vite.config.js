import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// looplab.jsx stays at the project root: it is the deliverable, the file
// that gets pasted into a Claude artifact. Everything in src/ is local dev
// scaffolding around it and is not part of what ships.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5178 },
});

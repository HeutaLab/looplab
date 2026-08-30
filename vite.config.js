import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The game lives in src/ as modules. It used to be one file at the root,
// because the deliverable was something pasted into a Claude artifact; that is
// no longer how it ships, so the file was split along the lines the build
// brief asked for.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5178 },
});

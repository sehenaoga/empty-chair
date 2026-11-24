import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// "base" is the subpath on GitHub Pages: https://<user>.github.io/empty-chair/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/empty-chair/" : "/",
  plugins: [react()],
}));

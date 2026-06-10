import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      "@archwyvern/carapace": fileURLToPath(new URL("../src/index.ts", import.meta.url)),
    },
  },
});

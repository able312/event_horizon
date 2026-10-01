import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";
import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";

const { version: appVersion } = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
) as { version: string };

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  base: "./",
  build: {
    outDir: "dist-react",
    rollupOptions: {
      output: {
        manualChunks(moduleId) {
          const id = moduleId.replace(/\\/g, "/");

          if (!id.includes("/node_modules/")) {
            return undefined;
          }

          if (id.includes("/react/") || id.includes("/react-dom/")) {
            return "react-core";
          }

          if (id.includes("/react-router/") || id.includes("/react-router/")) {
            return "router";
          }

          if (id.includes("/@tanstack/")) {
            return "query";
          }

          if (
            id.includes("/@radix-ui/") ||
            id.includes("/react-day-picker/") ||
            id.includes("/date-fns/") ||
            id.includes("/lucide-react/") ||
            id.includes("/sonner/")
          ) {
            return "ui-kit";
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port: 42069,
    strictPort: true
  }
})

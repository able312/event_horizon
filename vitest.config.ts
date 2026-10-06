import path from "node:path"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
    include: /\.(?:[cm]?ts|[jt]sx)$/,
  },
  define: {
    __APP_VERSION__: JSON.stringify("0.0.0-test"),
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      "dist/**",
      "dist-electron/**",
      "dist-react/**",
    ],
  },
})

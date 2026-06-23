import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

// Dedicated Vitest config. We intentionally do NOT reuse vite.config.ts because
// the PWA plugin and prod-base logic there are irrelevant (and add overhead) for
// unit tests. We keep only what the source needs to import cleanly:
//   - the Vue SFC plugin (component classes import `.vue` editors)
//   - the `@/` -> `src/` path alias
//   - the SCSS `additionalData` preamble used by the `.vue` editors
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData:
          '@use "sass:color";\n@use "@/scss/_variables.scss" as *;\n',
      },
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Each test file resets the shared component registry (see tests/helpers).
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["src/utils/**/*.ts"],
      exclude: ["src/utils/i18n.ts"],
    },
  },
});

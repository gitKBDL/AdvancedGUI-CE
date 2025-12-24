import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawBase = env.VITE_BASE?.trim();
  const base =
    rawBase && rawBase !== "/"
      ? rawBase.endsWith("/") ? rawBase : `${rawBase}/`
      : "/";

  return {
    base,
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
  };
});

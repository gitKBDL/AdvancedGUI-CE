import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  
  const rawBase = process.env.VITE_BASE || env.VITE_BASE || (mode === 'production' ? '/AdvancedGUI-CE/' : '/');
  
  const base = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
  const finalBase = base.endsWith('/') ? base : `${base}/`;

  return {
    base: finalBase,
    plugins: [
      vue(),
      VitePWA({
        registerType: "autoUpdate",
        manifest: {
          name: "AdvancedGUI Community Editor",
          short_name: "AGUI Editor",
          description: "Visual Web Editor for AdvancedGUI (Minecraft)",
          theme_color: "#2c3e50",
          background_color: "#2c3e50",
          display: "standalone",
          icons: [
            {
              src: "favicon.ico",
              sizes: "64x64 32x32 24x24 16x16",
              type: "image/x-icon",
            },
          ],
        },
      }),
    ],
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

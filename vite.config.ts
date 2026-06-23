import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const rawBase = process.env.VITE_BASE || env.VITE_BASE || (mode === 'production' ? '/AdvancedGUI-CE/' : '/');
  
  const base = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
  const finalBase = base.endsWith('/') ? base : `${base}/`;
  // Tie the service-worker build mode to Vite's own mode, not CI. Previously a
  // local `npm run deploy` (CI unset) shipped a verbose development SW to prod.
  const workboxMode = mode === "production" ? "production" : "development";

  return {
    base: finalBase,
    plugins: [
      vue(),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          mode: workboxMode,
          // The built-in fonts (/fonts/*.ttf) and images (/images/*) are fetched
          // at runtime, and the UI font/icons come from the Google Fonts CDN.
          // Cache them so the installed PWA actually works offline (after first
          // load) — the precache alone only covers the app shell.
          runtimeCaching: [
            {
              urlPattern: /\/(fonts|images)\//,
              handler: "CacheFirst",
              options: {
                cacheName: "agui-builtin-assets",
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
              handler: "StaleWhileRevalidate",
              options: { cacheName: "google-fonts-stylesheets" },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          name: "AdvancedGUI Community Editor",
          short_name: "AGUI Editor",
          description: "Visual Web Editor for AdvancedGUI (Minecraft)",
          theme_color: "#2c3e50",
          background_color: "#2c3e50",
          display: "standalone",
          icons: [
            {
              src: "favicon.svg",
              sizes: "64x64 32x32 24x24 16x16",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
            {
              src: "img/icons/android-chrome-192x192.svg",
              sizes: "192x192",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
            {
              src: "img/icons/android-chrome-512x512.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any maskable",
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

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  
  // Если собираем для продакшена и не задали базу вручную, 
  // используем имя репозитория для GitHub Pages
  const rawBase = process.env.VITE_BASE || env.VITE_BASE || (mode === 'production' ? '/AdvancedGUI-CE/' : '/');
  
  const base = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
  const finalBase = base.endsWith('/') ? base : `${base}/`;

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

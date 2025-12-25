/* eslint-disable @typescript-eslint/no-explicit-any */
import { createApp } from "vue";
import App from "./App.vue";
import { registerDefaultFonts } from "./utils/manager/FontManager";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

registerDefaultFonts();

createApp(App).mount("#app");

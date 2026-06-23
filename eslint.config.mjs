import pluginVue from "eslint-plugin-vue";
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";

export default defineConfigWithVueTs(
  {
    name: "app/files",
    files: ["**/*.{ts,mts,tsx,vue}"],
  },
  {
    name: "app/ignores",
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },

  // Vue 3 "recommended" tier (stricter than the old vue3-essential) + the
  // type-aware-free TypeScript recommended rules; prettier formatting is left to
  // prettier (skip-formatting disables conflicting stylistic rules).
  pluginVue.configs["flat/recommended"],
  vueTsConfigs.recommended,
  skipFormatting,

  {
    name: "app/rules",
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/no-mutating-props": "off",
      "vue/require-default-prop": "off",
      // The serialization layer intentionally uses `any` (JsonObject).
      "@typescript-eslint/no-explicit-any": "off",
      // Surface the dangerous `!` assertions without failing the build (warn).
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },

  {
    // Non-null assertions are idiomatic and safe in test fixtures.
    name: "app/tests",
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);

<template>
  <div class="settings-row">
    <span class="label">{{ label || t("color.default", "Color") }}</span>
    <input v-model="colorHex" type="color" @input="updateColor" />
    <input
      v-model="colorHex"
      type="text"
      style="max-width: 60px"
      @input="updateColor"
    />
    <input
      type="number"
      style="max-width: 40px; text-align: right"
      :value="alpha * 100"
      @input="
        alpha = Math.max(
          Math.min(
            Math.round(Number(($event.target as HTMLInputElement).value)) / 100,
            1,
          ),
          0,
        );
        ($event.target as HTMLInputElement).value = String(alpha * 100);
        updateColor();
      "
    />
    <i style="opacity: 0.5">%</i>
  </div>
  <div v-if="devMode" class="settings-row">
    <span class="label">{{ t("color.dev", "Dev Color") }}</span>
    <input
      type="text"
      style="max-width: 157px"
      :value="color"
      @input="$emit('update:color', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { hexToRgba, rgbaToHex } from "../utils/ColorUtils";
import { devMode } from "../utils/manager/WorkspaceManager";
import { vueRef } from "../utils/VueRef";
import { t } from "@/utils/i18n";

export default defineComponent({

  props: {
    color: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      default: "",
    },
  },

  emits: ["update:color"],
  data() {
    return {
      devMode: vueRef(devMode),
      colorHex: "#FFFFFF",
      alpha: 1.0,
      t,
    };
  },

  watch: {
    color: {
      immediate: true,
      handler(val: string) {
        const conv = rgbaToHex(val);

        this.colorHex = conv.hex;
        this.alpha = conv.alpha;
      },
    },
  },

  methods: {
    updateColor() {
      this.$emit("update:color", hexToRgba(this.colorHex, this.alpha));
    },
  },
});
</script>

<style lang="scss" scoped></style>

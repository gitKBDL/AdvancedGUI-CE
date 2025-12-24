<template>
  <div class="settings-row">
    <div class="input-box">
      <input
        type="number"
        :value="size"
        @input="$emit('update:size', Number($event.target.value))"
      />
      <span>{{ t("font.size", "Size") }}</span>
    </div>
  </div>
  <div class="settings-row">
    <div class="input-box">
      <select :value="font" @input="$emit('update:font', $event.target.value)">
        <option
          v-for="font in regFonts"
          :style="{ fontFamily: font }"
          :key="font"
          :value="font"
        >
          {{ font }}
        </option>
      </select>
      <span>{{ t("font.font", "Font") }}</span>
    </div>
  </div>
  <div class="settings-row">
    <a @click="triggerFileSelector()">
      {{ t("font.upload", "Upload custom font") }}
    </a>
    <input
      type="file"
      ref="fileDownload"
      accept=".ttf"
      style="display: none"
      @change="checkForUpload()"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { regFonts, registerFont } from "../utils/manager/FontManager";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return { regFonts, t };
  },

  props: {
    font: String,
    size: Number,
  },

  methods: {
    triggerFileSelector() {
      (this.$refs.fileDownload as HTMLElement).click();
    },

    checkForUpload() {
      const selector = this.$refs.fileDownload as HTMLInputElement;

      if (selector.files?.length) {
        const file = selector.files[0];
        registerFont(file, file.name.substr(0, file.name.length - 4));
      }
    },
  },
});
</script>

<style lang="scss" scoped>
select {
  width: 150px !important;
}
</style>

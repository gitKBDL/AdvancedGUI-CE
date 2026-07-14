<template>
  <div>
    <span class="label">{{ t("image.dimensions", "Dimensions") }}</span>
    <bounding-box-inputs :component="component" />
    <div class="settings-row">
      <div class="btn fillCanvas" @click="fillCanvas">
        <span class="material-icons">wallpaper</span>
        {{ t("image.fillCanvas", "Fill canvas") }}
      </div>
    </div>
    <div class="settings-row">
      <span class="label">{{ t("image.keepRatio", "Keep ratio") }}</span>
      <input v-model="component.keepImageRatio" type="checkbox" />
    </div>
    <div class="settings-row">
      <span class="label">{{ t("image.dithering", "Dithering") }}</span>
      <input v-model="component.dithering" type="checkbox" />
    </div>
    <div v-if="component.dithering" class="settings-row">
      <span class="label">
        {{ t("image.ditheringIntensity", "Dithering intensity") }}
      </span>
      <input
        v-model.number="component.ditheringIntensity"
        type="range"
        min="0"
        max="100"
        step="1"
      />
      <span class="intensityValue">{{ component.ditheringIntensity }}%</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { t } from "@/utils/i18n";
import BoundingBoxInputs from "./BoundingBoxInputs.vue";

type ImageDimensionsComponent = {
  x: number;
  y: number;
  width: number;
  height: number;
  keepImageRatio: boolean;
  dithering: boolean;
  ditheringIntensity: number;
};

export default defineComponent({
  components: {
    BoundingBoxInputs,
  },

  props: {
    component: {
      type: Object as PropType<ImageDimensionsComponent>,
      required: true,
    },
    maxHeight: {
      type: Number,
      required: true,
    },
    maxWidth: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      t,
    };
  },

  methods: {
    fillCanvas() {
      this.component.keepImageRatio = false;
      this.component.x = 0;
      this.component.y = 0;
      this.component.width = this.maxWidth;
      this.component.height = this.maxHeight;
    },
  },
});
</script>

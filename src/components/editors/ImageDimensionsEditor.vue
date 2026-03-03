<template>
  <div>
    <span class="label">{{ t("image.dimensions", "Dimensions") }}</span>
    <div class="settings-row">
      <div class="input-box">
        <input
          type="number"
          @keypress="inputTransformer($event, component.x)"
          v-model.number="component.x"
        />
        <span>X</span>
      </div>
      <div class="input-box">
        <input
          type="number"
          @keypress="inputTransformer($event, component.width)"
          v-model.number="component.width"
        />
        <span>W</span>
      </div>
    </div>
    <div class="settings-row">
      <div class="input-box">
        <input
          type="number"
          @keypress="inputTransformer($event, component.y)"
          v-model.number="component.y"
        />
        <span>Y</span>
      </div>
      <div class="input-box">
        <input
          type="number"
          @keypress="inputTransformer($event, component.height)"
          v-model.number="component.height"
        />
        <span>H</span>
      </div>
    </div>
    <div class="settings-row">
      <div class="btn fillCanvas" @click="fillCanvas">
        <span class="material-icons">wallpaper</span>
        {{ t("image.fillCanvas", "Fill canvas") }}
      </div>
    </div>
    <div class="settings-row">
      <span class="label">{{ t("image.keepRatio", "Keep ratio") }}</span>
      <input type="checkbox" v-model="component.keepImageRatio" />
    </div>
    <div class="settings-row">
      <span class="label">{{ t("image.dithering", "Dithering") }}</span>
      <input type="checkbox" v-model="component.dithering" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { Template } from "@/utils/components/Template";
import { t } from "@/utils/i18n";

type ImageDimensionsComponent = {
  x: number;
  y: number;
  width: number;
  height: number;
  keepImageRatio: boolean;
  dithering: boolean;
};

export default defineComponent({
  data() {
    return {
      inputTransformer: Template.inputTransformer,
      t,
    };
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

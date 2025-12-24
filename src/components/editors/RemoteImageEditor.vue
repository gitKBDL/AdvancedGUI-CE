<template>
  <div id="imageEditor">
    <div class="label heading">
      {{ gifMode ? t("image.gif", "GIF") : t("image.image", "Image") }}
      <input
        type="text"
        class="imageNameInput"
        @input="(val) => component.setImageUrl(val.target.value)"
        :value="component.imageUrl"
      />
    </div>
    <br />
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
    <div class="settings-row">
      <span class="label">
        {{ t("image.previewLoading", "Preview loading component") }}
      </span>
      <input type="checkbox" v-model="component.drawLoading" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { images, unregisterImage } from "@/utils/manager/ImageManager";
import { Template } from "@/utils/components/Template";
import { RemoteImage } from "@/utils/components/RemoteImage";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return {
      images,
      unregisterImage,
      inputTransformer: Template.inputTransformer,
      t,
    };
  },

  props: {
    component: {
      type: Object as () => RemoteImage,
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

  watch: {
    component: {
      deep: true,
      handler() {
        this.ensureBounds();
      },
    },
  },

  computed: {
    gifMode(): boolean {
      return this.component.displayName == "GIF";
    },
  },

  methods: {
    ensureBounds() {
      const bounds = this.component.getBoundingBox();
      bounds.ensureBounds(this.maxWidth, this.maxHeight);
      this.component.modify(bounds);
    },

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

<style lang="scss" scoped>
#imageEditor {
}
</style>

<template>
  <div id="imageEditor">
    <div class="label heading">
      {{ t("image.image", "Image") }}
      <input
        type="text"
        class="imageNameInput"
        :value="component.imageUrl"
        @input="
          (val) => component.setImageUrl((val.target as HTMLInputElement).value)
        "
      />
    </div>
    <br />
    <image-dimensions-editor
      :component="component"
      :max-height="maxHeight"
      :max-width="maxWidth"
    />
    <div class="settings-row">
      <span class="label">
        {{ t("image.previewLoading", "Preview loading component") }}
      </span>
      <input v-model="component.drawLoading" type="checkbox" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { RemoteImage } from "@/utils/components/RemoteImage";
import { t } from "@/utils/i18n";
import ImageDimensionsEditor from "./ImageDimensionsEditor.vue";
import {
  ensureBoundsWatch,
  ensureComponentBounds,
  maxBoundsProps,
} from "./editorBounds";

export default defineComponent({
  components: {
    ImageDimensionsEditor,
  },

  props: {
    component: {
      type: Object as () => RemoteImage,
      required: true,
    },
    ...maxBoundsProps,
  },
  data() {
    return {
      t,
    };
  },

  watch: ensureBoundsWatch,

  methods: {
    ensureBounds() {
      ensureComponentBounds(this.component, this.maxWidth, this.maxHeight);
    },
  },
});
</script>

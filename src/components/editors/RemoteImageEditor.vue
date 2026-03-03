<template>
  <div id="imageEditor">
    <div class="label heading">
      {{ t("image.image", "Image") }}
      <input
        type="text"
        class="imageNameInput"
        @input="(val) => component.setImageUrl(val.target.value)"
        :value="component.imageUrl"
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
      <input type="checkbox" v-model="component.drawLoading" />
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
  data() {
    return {
      t,
    };
  },

  props: {
    component: {
      type: Object as () => RemoteImage,
      required: true,
    },
    ...maxBoundsProps,
  },

  watch: ensureBoundsWatch,

  methods: {
    ensureBounds() {
      ensureComponentBounds(this.component, this.maxWidth, this.maxHeight);
    },
  },
});
</script>

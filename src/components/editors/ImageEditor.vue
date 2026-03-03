<template>
  <div id="imageEditor">
    <div class="label heading">
      {{ gifMode ? t("image.gif", "GIF") : t("image.image", "Image") }}
      <input
        type="text"
        class="imageNameInput"
        @input="(val) => component.setImage(val.target.value)"
        :value="component.image"
      />
    </div>
    <div class="settings-row imageList">
      <div
        class="imageBox"
        v-for="img in regImages
          .map((key) => images[key])
          .filter((image) => image.isGif == gifMode)"
        :key="img.name"
        :style="{ backgroundImage: `url(${img.data.src})` }"
        @click="component.setImage(img.name)"
        :class="component.image == img.name ? 'active' : ''"
      >
        <div class="delImage" @click.stop="unregisterImage(img.name)">
          <span class="material-icons">close</span>
        </div>
        <div class="imageName">{{ img.name }}</div>
      </div>
    </div>
    <div class="btn" @click="triggerFileSelector()">
      <span class="material-icons">add</span>
      {{ t("image.upload", "Upload") }}
      {{ gifMode ? t("image.gif", "GIF") : t("image.image", "image") }}
      <input
        type="file"
        ref="fileDownload"
        :accept="gifMode ? '.gif' : '.png,.jpg'"
        style="display: none"
        multiple
        @change="checkForUpload()"
      />
    </div>
    <br />
    <image-dimensions-editor
      :component="component"
      :max-height="maxHeight"
      :max-width="maxWidth"
    />
    <div class="settings-row" v-if="gifMode">
      <span class="label">{{ t("image.pause", "Pause by default") }}</span>
      <input type="checkbox" v-model="component.pausedByDefault" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Image } from "@/utils/components/Image";
import {
  images,
  regImages,
  registerImage,
  unregisterImage,
} from "@/utils/manager/ImageManager";
import { GIF } from "@/utils/components/GIF";
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
      images,
      regImages,
      unregisterImage,
      t,
    };
  },

  props: {
    component: {
      type: Object as () => Image | GIF,
      required: true,
    },
    ...maxBoundsProps,
  },

  watch: ensureBoundsWatch,

  computed: {
    gifMode(): boolean {
      return this.component.displayName == "GIF";
    },
  },

  methods: {
    ensureBounds() {
      ensureComponentBounds(this.component, this.maxWidth, this.maxHeight);
    },

    triggerFileSelector() {
      (this.$refs.fileDownload as HTMLElement).click();
    },

    checkForUpload() {
      const selector = this.$refs.fileDownload as HTMLInputElement;

      if (selector.files?.length) {
        for (const file of selector.files) {
          registerImage(
            file,
            file.name.substr(0, file.name.length - 4),
            this.gifMode,
          );
        }
      }
    },
  },
});
</script>

<style lang="scss" scoped>
#imageEditor {
  .imageList {
    flex-wrap: wrap;
    justify-content: space-between;
    max-height: 150px;
    overflow-y: auto;
    margin-bottom: 10px !important;

    .imageBox {
      width: 80px;
      height: 80px;
      overflow: hidden;
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
      image-rendering: pixelated;
      margin: 10px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      flex-direction: column;

      &.active {
        border: 2px solid $blue;
        box-sizing: border-box;
        background-color: $dark2;
      }

      &:hover {
        transform: scale(1.1);

        .imageName {
          white-space: normal;
        }
      }

      .imageName {
        background-color: rgba(0, 0, 0, 0.6);
        width: fit-content;
        white-space: nowrap;
        font-size: 12px;
        padding: 2px 10px;
      }

      .delImage {
        align-self: flex-end;
        padding-top: 3px;
        height: 17px;
        background-color: rgba(0, 0, 0, 0.6);

        .material-icons {
          color: $red;
          font-size: 20px !important;
          line-height: 0.4;
        }
      }
    }
  }
}
</style>

<template>
  <div id="textEditor">
    <color-input
      v-model:color="component.color"
      :label="t('text.color', 'Color')"
    ></color-input>
    <div class="settings-row">
      <span class="label">{{ t("text.text", "Text") }}</span>
      <textarea v-model="component.text" :rows="5" />
    </div>
    <p style="font-size: 10pt">
      {{
        t(
          "text.colors",
          "You can change the color of words by using minecraft color codes (e.g. §aTest for green).",
        )
      }}
    </p>
    <div class="settings-row">
      <span class="label">
        {{ t("text.containsPlaceholder", "Contains placeholders") }}
      </span>
      <input v-model="component.placeholder" type="checkbox" />
    </div>
    <div v-if="component.placeholder" class="settings-row">
      <span class="label">{{ t("text.preview", "Preview Text") }}</span>
      <textarea v-model="component.previewText" />
    </div>
    <br />
    <span class="label">{{ t("text.style", "Style") }}</span>
    <div class="settings-row">
      <div class="alignOptions">
        <i
          class="material-icons"
          :class="component.alignment == 0 ? 'active' : ''"
          @click="component.alignment = 0"
        >
          format_align_left
        </i>
        <i
          class="material-icons"
          :class="component.alignment == 1 ? 'active' : ''"
          @click="component.alignment = 1"
        >
          format_align_center
        </i>
        <i
          class="material-icons"
          :class="component.alignment == 2 ? 'active' : ''"
          @click="component.alignment = 2"
        >
          format_align_right
        </i>
      </div>
    </div>
    <font-editor
      v-model:font="component.font"
      v-model:size="component.size"
    ></font-editor>
    <div class="label heading">{{ t("text.pixelBounds", "Pixel bounds") }}</div>
    <div class="settings-row">
      <span class="label">{{ t("text.verticalCrop", "Vertical crop") }}</span>
      <input v-model="settings.textVerticalPixelCrop" type="checkbox" />
    </div>
    <div class="settings-row">
      <span class="label">{{
        t("text.horizontalAlignCrop", "Horizontal align by pixels")
      }}</span>
      <input v-model="settings.textHorizontalPixelAlign" type="checkbox" />
    </div>
    <div class="label heading">{{ t("text.position", "Position") }}</div>
    <div class="settings-row">
      <div class="input-box">
        <input v-model.number="component.x" type="number" /> <span>X</span>
      </div>
      <div class="input-box">
        <input v-model.number="component.y" type="number" /> <span>Y</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Text } from "@/utils/components/Text";
import FontEditor from "@/components/FontEditor.vue";
import ColorInput from "../ColorInput.vue";
import { t } from "@/utils/i18n";
import { settings } from "@/utils/manager/SettingsManager";

export default defineComponent({

  components: { FontEditor, ColorInput },

  props: {
    component: {
      type: Object as () => Text,
      required: true,
    },
  },
  data() {
    return { t, settings };
  },

  watch: {
    component: {
      deep: true,
      handler() {
        this.ensureValues();
      },
    },
  },

  methods: {
    ensureValues() {
      if (this.component.x == undefined) this.component.x = 0;
      if (this.component.y == undefined) this.component.y = 0;
      if (this.component.size == undefined) this.component.size = 0;
    },
  },
});
</script>

<style lang="scss" scoped>
#textEditor {
  .colorInput {
    width: 80px;
  }

  a {
    font-size: 14px;
  }

  .alignOptions {
    display: flex;
    align-items: center;

    color: $light4;
    border: $inputBorder;
    padding: 5px 10px;
    border-radius: 5px;

    i {
      cursor: pointer;
      font-size: 20px;

      &:hover {
        color: $light2;
      }

      &.active {
        color: $light;
      }

      &:nth-child(2) {
        margin: 0px 10px;
      }
    }
  }
}
</style>

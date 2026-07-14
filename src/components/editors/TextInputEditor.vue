<template>
  <div id="textInputEditor">
    <color-input
      v-model:color="component.backgroundColor"
      :label="t('textInput.bg', 'Background color')"
    ></color-input>
    <color-input
      v-model:color="component.backgroundColorActive"
      :label="t('textInput.bgActive', 'Active background color')"
    ></color-input>
    <div class="settings-row">
      <span class="label">{{ t("textInput.placeholder", "Placeholder") }}</span>
      <input v-model="component.placeHolder" type="text" />
    </div>
    <div class="settings-row">
      <span class="label">{{ t("textInput.default", "Default input") }}</span>
      <input v-model="component.defaultInput" type="text" />
    </div>
    <div class="settings-row">
      <span class="label">{{
        t("textInput.registerPlaceholder", "Register PAPI placeholder")
      }}</span>
      <input v-model="component.registerPlaceholder" type="checkbox" />
    </div>
    <div class="settings-row">
      <span class="label">{{
        t("textInput.maxLength", "Max input length")
      }}</span>
      <input
        v-model.number="component.maxLength"
        type="number"
        style="max-width: 40px"
      />
    </div>
    <br />
    <span class="label heading">{{
      t("textInput.textStyle", "Text-Style")
    }}</span>
    <color-input v-model:color="component.fontColor"></color-input>
    <color-input
      v-model:color="component.fontColorPlaceholder"
      :label="t('textInput.placeholderColor', 'Placeholder Color')"
    ></color-input>
    <font-editor
      v-model:font="component.font"
      v-model:size="component.size"
    ></font-editor>
    <div class="label heading">{{ t("textInput.position", "Position") }}</div>
    <div class="settings-row">
      <div class="input-box">
        <input v-model.number="component.x" type="number" /> <span>X</span>
      </div>
      <div class="input-box">
        <input v-model.number="component.width" type="number" /> <span>W</span>
      </div>
    </div>
    <div class="settings-row">
      <div class="input-box">
        <input v-model.number="component.y" type="number" /> <span>Y</span>
      </div>
      <div class="input-box">
        <input v-model.number="component.height" type="number" /> <span>H</span>
      </div>
    </div>
    <div class="settings-row">
      <div class="input-box">
        <input v-model.number="component.padding" type="number" />
        <span>{{ t("textInput.padding", "Padding") }}</span>
      </div>
    </div>
    <p style="margin-top: 15px">
      {{
        t(
          "textInput.info",
          "The user's input of this component is available through the placeholder %advancedgui_textinput_{id}%. PlaceholderAPI is required.",
        ).replace("{id}", component.id)
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { TextInput } from "@/utils/components/TextInput";
import FontEditor from "@/components/FontEditor.vue";
import ColorInput from "../ColorInput.vue";
import { t } from "@/utils/i18n";

export default defineComponent({

  components: { FontEditor, ColorInput },

  props: {
    component: {
      type: Object as () => TextInput,
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
    return { t };
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

      const bounds = this.component.getBoundingBox();
      bounds.ensureBounds(this.maxWidth, this.maxHeight);
      this.component.modify(bounds);
    },
  },
});
</script>

<style lang="scss" scoped>
#textInputEditor {
  .heading {
    font-weight: bold;
  }

  .colorInput {
    width: 80px;
  }

  p i {
    color: $light3;
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

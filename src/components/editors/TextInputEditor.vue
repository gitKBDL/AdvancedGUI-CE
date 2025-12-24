<template>
  <div id="textInputEditor">
    <color-input
      :label="t('textInput.bg', 'Background color')"
      v-model:color="component.backgroundColor"
    ></color-input>
    <color-input
      :label="t('textInput.bgActive', 'Active background color')"
      v-model:color="component.backgroundColorActive"
    ></color-input>
    <div class="settings-row">
      <span class="label">{{ t("textInput.placeholder", "Placeholder") }}</span>
      <input type="text" v-model="component.placeHolder" />
    </div>
    <div class="settings-row">
      <span class="label">{{ t("textInput.default", "Default input") }}</span>
      <input type="text" v-model="component.defaultInput" />
    </div>
    <div class="settings-row">
      <span class="label">{{
        t("textInput.maxLength", "Max input length")
      }}</span>
      <input
        type="number"
        style="max-width: 40px"
        v-model.number="component.maxLength"
      />
    </div>
    <br />
    <span class="label heading">{{
      t("textInput.textStyle", "Text-Style")
    }}</span>
    <color-input v-model:color="component.fontColor"></color-input>
    <color-input
      :label="t('textInput.placeholderColor', 'Placeholder Color')"
      v-model:color="component.fontColorPlaceholder"
    ></color-input>
    <font-editor
      v-model:font="component.font"
      v-model:size="component.size"
    ></font-editor>
    <div class="label heading">{{ t("textInput.position", "Position") }}</div>
    <div class="settings-row">
      <div class="input-box">
        <input type="number" v-model.number="component.x" /> <span>X</span>
      </div>
      <div class="input-box">
        <input type="number" v-model.number="component.width" /> <span>W</span>
      </div>
    </div>
    <div class="settings-row">
      <div class="input-box">
        <input type="number" v-model.number="component.y" /> <span>Y</span>
      </div>
      <div class="input-box">
        <input type="number" v-model.number="component.height" /> <span>H</span>
      </div>
    </div>
    <div class="settings-row">
      <div class="input-box">
        <input type="number" v-model.number="component.padding" />
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
  data() {
    return { t };
  },

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

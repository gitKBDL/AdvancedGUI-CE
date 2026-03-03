<template>
  <div id="rectEditor">
    <color-input v-model:color="component.color"></color-input>
    <div class="settings-row">
      <span class="label">{{ t("rect.radius", "Border-radius") }}</span>
      <input
        type="number"
        onkeypress="return event.charCode >= 48 && event.charCode <= 57;"
        style="width: 48px"
        v-model.number="component.radius"
      />
    </div>
    <br />
    <span class="label">{{ t("rect.dimensions", "Dimensions") }}</span>
    <bounding-box-inputs :component="component" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Rect } from "@/utils/components/Rect";
import ColorInput from "../ColorInput.vue";
import { t } from "@/utils/i18n";
import BoundingBoxInputs from "./BoundingBoxInputs.vue";

export default defineComponent({
  components: { ColorInput, BoundingBoxInputs },
  data() {
    return {
      t,
    };
  },

  props: {
    component: {
      type: Object as () => Rect,
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

  methods: {
    ensureBounds() {
      const bounds = this.component.getBoundingBox();
      bounds.ensureBounds(this.maxWidth, this.maxHeight);
      this.component.modify(bounds);

      const minDim = Math.min(this.component.height, this.component.width);
      if (this.component.radius > minDim / 2) {
        this.component.radius = Math.floor(minDim / 2);
      }
    },
  },
});
</script>

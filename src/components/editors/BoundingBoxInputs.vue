<template>
  <div>
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
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { Template } from "@/utils/components/Template";

type BoundingBoxComponent = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default defineComponent({
  data() {
    return {
      inputTransformer: Template.inputTransformer,
    };
  },

  props: {
    component: {
      type: Object as PropType<BoundingBoxComponent>,
      required: true,
    },
  },
});
</script>

<template>
  <div>
    <div class="settings-row">
      <div class="input-box">
        <input
          v-model.number="component.x"
          type="number"
          @keypress="inputTransformer($event, component.x)"
        />
        <span>X</span>
      </div>
      <div class="input-box">
        <input
          v-model.number="component.width"
          type="number"
          @keypress="inputTransformer($event, component.width)"
        />
        <span>W</span>
      </div>
    </div>
    <div class="settings-row">
      <div class="input-box">
        <input
          v-model.number="component.y"
          type="number"
          @keypress="inputTransformer($event, component.y)"
        />
        <span>Y</span>
      </div>
      <div class="input-box">
        <input
          v-model.number="component.height"
          type="number"
          @keypress="inputTransformer($event, component.height)"
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

  props: {
    component: {
      type: Object as PropType<BoundingBoxComponent>,
      required: true,
    },
  },
  data() {
    return {
      inputTransformer: Template.inputTransformer,
    };
  },
});
</script>

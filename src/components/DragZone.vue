<template>
  <div
    :class="!dragIndication ? 'invisible' : ''"
    class="dropzone"
    @dragover.prevent.self="
      (ev) => (ev.target as HTMLElement).classList.add('targeted')
    "
    @dragleave.self="
      (ev) => (ev.target as HTMLElement).classList.remove('targeted')
    "
    @drop.prevent.self="$emit('droped')"
  ></div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({

  props: {
    dragIndication: { type: Boolean },
  },
  emits: ["droped"],
  data() {
    return {};
  },
});
</script>

<style lang="scss" scoped></style>

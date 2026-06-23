import { ref } from "vue";

// Decouples non-view modules (e.g. ImageManager) from the Canvas component.
// Instead of the data layer importing a function out of Canvas.vue (an inverted
// dependency), it bumps this signal; Canvas.vue watches it and redraws.
export const redrawSignal = ref(0);

export function requestRedraw() {
  redrawSignal.value++;
}

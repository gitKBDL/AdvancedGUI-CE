import { ref } from "vue";

// Neutral leaf module holding cross-cutting editor session flags. Living here
// (instead of in HistoryManager) breaks the HistoryManager <-> serialization
// handler import cycle: the handler reads `unsavedChange` without importing the
// history layer.
export const unsavedChange = ref(false);

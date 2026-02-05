import { reactive, ref } from "vue";
import {
  loadProjectFromJson,
  bundleCurrentProjectData,
} from "../handler/ProjectSerializationHandler";
import { Project } from "../Project";
import { loading } from "./WorkspaceManager";

export const history = reactive({
  stack: [] as Project[],
  snapshots: [] as string[],
  historyIndex: 0,
  pauseHistoryTracking: false,
});

export const unsavedChange = ref(false);
const MAX_HISTORY = 50;
const HISTORY_UPDATE_DEBOUNCE = 150;
let updateTimer: number | null = null;

export function scheduleHistoryUpdate(delay = HISTORY_UPDATE_DEBOUNCE) {
  if (history.pauseHistoryTracking) return;

  if (updateTimer !== null) {
    window.clearTimeout(updateTimer);
  }

  updateTimer = window.setTimeout(() => {
    updateTimer = null;
    updateHistory();
  }, delay);
}

export async function redo() {
  if (history.historyIndex == 0) return;

  history.historyIndex--;
  const exportData = history.stack[history.historyIndex];
  loading(true);
  history.pauseHistoryTracking = true;
  try {
    await loadProjectFromJson(exportData, true);
  } finally {
    history.pauseHistoryTracking = false;
    loading(false);
  }
}

export async function undo() {
  if (history.stack.length <= history.historyIndex + 1) return;

  history.historyIndex++;
  const exportData = history.stack[history.historyIndex];
  loading(true);
  history.pauseHistoryTracking = true;
  try {
    await loadProjectFromJson(exportData, true);
  } finally {
    history.pauseHistoryTracking = false;
    loading(false);
  }
}

export function updateHistory() {
  if (history.pauseHistoryTracking) return;
  const stateObj = bundleCurrentProjectData({
    includeResources: false,
    includeExportedTree: false,
  });
  const snapshot = JSON.stringify(stateObj);

  if (
    history.stack.length &&
    history.snapshots[history.historyIndex] === snapshot
  )
    return;

  if (history.stack.length) unsavedChange.value = true;

  history.stack.splice(0, 0, stateObj);
  history.snapshots.splice(0, 0, snapshot);
  history.historyIndex = 0;
  if (history.stack.length >= MAX_HISTORY) {
    history.stack.pop();
    history.snapshots.pop();
  }
}

export function clearHistory() {
  history.historyIndex = 0;
  history.stack = [];
  history.snapshots = [];
}

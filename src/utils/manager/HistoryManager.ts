import { reactive, ref, watch, type WatchStopHandle } from "vue";
import {
  loadProjectFromJson,
  bundleCurrentProjectData,
} from "../handler/ProjectSerializationHandler";
import { Project } from "../Project";
import { loading } from "./WorkspaceManager";
import { componentTree } from "./WorkspaceManager";
import { settings } from "./SettingsManager";
import { invisibleIDs } from "./ComponentManager";

export const history = reactive({
  stack: [] as Project[],
  snapshots: [] as string[],
  historyIndex: 0,
  pauseHistoryTracking: false,
});

export const unsavedChange = ref(false);
const MAX_HISTORY = 50;
const HISTORY_UPDATE_DEBOUNCE = 250;
let updateTimer: number | null = null;
let pauseDepth = 0;
let autoTrackingStops: WatchStopHandle[] = [];

function isHistoryTrackingPaused() {
  return history.pauseHistoryTracking || pauseDepth > 0;
}

function clearScheduledHistoryUpdate() {
  if (updateTimer !== null) {
    window.clearTimeout(updateTimer);
    updateTimer = null;
  }
}

function createSnapshot(): [Project, string] {
  const stateObj = bundleCurrentProjectData({
    includeResources: false,
    includeExportedTree: false,
  });
  return [stateObj, JSON.stringify(stateObj)];
}

function pushSnapshot(stateObj: Project, snapshot: string) {
  history.stack.splice(0, 0, stateObj);
  history.snapshots.splice(0, 0, snapshot);
  history.historyIndex = 0;
  if (history.stack.length >= MAX_HISTORY) {
    history.stack.pop();
    history.snapshots.pop();
  }
}

export function scheduleHistoryUpdate(delay = HISTORY_UPDATE_DEBOUNCE) {
  if (isHistoryTrackingPaused()) return;

  clearScheduledHistoryUpdate();

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
  pauseHistoryTracking();
  try {
    await loadProjectFromJson(exportData, true);
  } finally {
    resumeHistoryTracking();
    loading(false);
  }
}

export async function undo() {
  if (history.stack.length <= history.historyIndex + 1) return;

  history.historyIndex++;
  const exportData = history.stack[history.historyIndex];
  loading(true);
  pauseHistoryTracking();
  try {
    await loadProjectFromJson(exportData, true);
  } finally {
    resumeHistoryTracking();
    loading(false);
  }
}

export function updateHistory() {
  if (isHistoryTrackingPaused()) return;
  const [stateObj, snapshot] = createSnapshot();

  if (
    history.stack.length &&
    history.snapshots[history.historyIndex] === snapshot
  )
    return;

  if (history.stack.length) unsavedChange.value = true;

  pushSnapshot(stateObj, snapshot);
}

export function pauseHistoryTracking() {
  pauseDepth += 1;
  history.pauseHistoryTracking = true;
  clearScheduledHistoryUpdate();
}

export function resumeHistoryTracking() {
  if (pauseDepth > 0) pauseDepth -= 1;
  history.pauseHistoryTracking = pauseDepth > 0;
}

export function initializeHistoryAutoTracking() {
  if (autoTrackingStops.length) return;

  autoTrackingStops = [
    watch(
      componentTree,
      () => {
        scheduleHistoryUpdate();
      },
      { deep: true },
    ),
    watch(
      invisibleIDs,
      () => {
        scheduleHistoryUpdate();
      },
      { deep: true },
    ),
    watch(
      () => settings.width,
      () => {
        scheduleHistoryUpdate();
      },
    ),
    watch(
      () => settings.height,
      () => {
        scheduleHistoryUpdate();
      },
    ),
    watch(
      () => settings.projectName,
      () => {
        scheduleHistoryUpdate();
      },
    ),
  ];
}

export function shutdownHistoryAutoTracking() {
  autoTrackingStops.forEach((stop) => stop());
  autoTrackingStops = [];
  clearScheduledHistoryUpdate();
}

export function resetHistoryWithCurrentState() {
  const [stateObj, snapshot] = createSnapshot();
  history.historyIndex = 0;
  history.stack = [];
  history.snapshots = [];
  pushSnapshot(stateObj, snapshot);
  unsavedChange.value = false;
}

export function clearHistory() {
  clearScheduledHistoryUpdate();
  history.historyIndex = 0;
  history.stack = [];
  history.snapshots = [];
}

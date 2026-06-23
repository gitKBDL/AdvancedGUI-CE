/**
 * Live-Sync client.
 *
 * Re-implements the editor side of AdvancedGUI's live-sync without any
 * dependency on the advancedgui.app cloud. The plugin runs a plain WebSocket
 * server on its configured `SyncSocketPort` (default 27757) and, for every text
 * message it receives, parses it with `LayoutManager.syncFromJson(json)` and
 * echoes the session key back as an ack.
 *
 * The wire payload the plugin expects is:
 *   { "name": <layout name loaded on the server>,
 *     "componentTree": <STRINGIFIED JSON of the finalized GroupComponent>,   // double-encoded
 *     "invisible": [<componentId>, ...] }
 *
 * The finalized component tree is exactly what {@link convertToFinalized}
 * already produces (the same format the downloadable layout file carries under
 * `exportedTree.finalized`), so this client reuses the verified serialization
 * pipeline and adds only transport + a debounced change signal.
 *
 * This client is push-only: it never applies inbound layouts, so there is no
 * echo loop to guard against. Resources (images/gifs/fonts) cannot travel over
 * live-sync — see {@link syncUsesUnsyncableResources}.
 */
import { ref, watch, type WatchStopHandle } from "vue";
import { convertToFinalized } from "../LocalConverter";
import {
  BK,
  getCurrentTransferData,
} from "../handler/ProjectSerializationHandler";
import { settings } from "./SettingsManager";
import { normalizeProjectName } from "../ProjectName";
import { history, initializeHistoryAutoTracking } from "./HistoryManager";
import { JsonObject } from "./ComponentManager";
import { DEFAULT_FONTS, regFonts } from "./FontManager";
import { DEFAULT_IMAGES, images } from "./ImageManager";

export interface SyncPayload {
  name: string;
  /** Stringified finalized GroupComponent — the plugin re-parses this string. */
  componentTree: string;
  invisible: string[];
}

export type SyncStatus = "off" | "connecting" | "live" | "error";

export const DEFAULT_SYNC_URL = "ws://localhost:27757";
const PUSH_DEBOUNCE = 300;

// ---- public reactive state -------------------------------------------------

export const syncStatus = ref<SyncStatus>("off");
export const syncError = ref<string | null>(null);
export const syncUrl = ref<string>(DEFAULT_SYNC_URL);
/** Timestamp (ms) of the last ack echoed back by the plugin. */
export const lastAckAt = ref<number | null>(null);
/** Number of payloads sent in the current session. */
export const pushCount = ref<number>(0);

// ---- payload building ------------------------------------------------------

/** The layout name used both in the payload and the `/ag sync` command. */
export function syncLayoutName(): string {
  return normalizeProjectName(settings.projectName, "Unnamed");
}

/**
 * Build the exact wire payload `LayoutManager.syncFromJson` expects. The
 * `componentTree` is finalized and then stringified; the plugin reads it via
 * `.asText()` and re-parses it (double-encoding).
 */
export function buildSyncPayload(): SyncPayload {
  const transfer = getCurrentTransferData();
  const finalizedTree = convertToFinalized(
    transfer.componentTree as unknown as JsonObject,
  );
  return {
    name: syncLayoutName(),
    componentTree: JSON.stringify(finalizedTree),
    invisible: [...transfer.invisible],
  };
}

/** The in-game command the admin must run, with the editor's persistent key. */
export function buildSyncCommand(): string {
  return `/ag sync ${BK} ${syncLayoutName()}`;
}

/**
 * True when the project references images/gifs/fonts that are not built-in.
 * Live-sync cannot transmit resources, so the UI should warn that a full layout
 * file re-upload is required after changing them.
 */
export function syncUsesUnsyncableResources(): boolean {
  const usesCustomImage = Object.values(images).some(
    (img) => !DEFAULT_IMAGES.includes(img.name),
  );
  const usesCustomFont = regFonts.some((font) => !DEFAULT_FONTS.includes(font));
  return usesCustomImage || usesCustomFont;
}

// ---- transport -------------------------------------------------------------

let ws: WebSocket | null = null;
let stopWatch: WatchStopHandle | null = null;
let pushTimer: number | null = null;

function clearPushTimer(): void {
  if (pushTimer !== null) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

function schedulePush(): void {
  clearPushTimer();
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    pushSyncNow();
  }, PUSH_DEBOUNCE);
}

/** Send the current layout immediately (no debounce). */
export function pushSyncNow(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(buildSyncPayload()));
    pushCount.value += 1;
  } catch (exc) {
    syncError.value = String((exc as Error)?.message ?? exc);
  }
}

/**
 * Mixed-content guard: a page served over https can only open a `wss://`
 * connection, or a `ws://` connection to a loopback host (treated as
 * potentially-trustworthy by browsers). Returns an error string when the target
 * would be blocked, else null.
 */
export function syncUrlBlockReason(url: string): string | null {
  if (typeof location === "undefined" || location.protocol !== "https:") {
    return null;
  }
  if (url.startsWith("wss://")) return null;
  const isLoopback = /^ws:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);
  if (isLoopback) return null;
  return (
    "Страница загружена по https — браузер заблокирует ws:// к не-loopback " +
    "адресу. Используй ws://localhost (плагин на этом же ПК или SSH-туннель) " +
    "либо wss:// через свой reverse-proxy."
  );
}

function teardownWatch(): void {
  if (stopWatch) {
    stopWatch();
    stopWatch = null;
  }
  clearPushTimer();
}

/** Open the live-sync connection and start pushing on every change. */
export function connectSync(url: string = syncUrl.value): void {
  disconnectSync();
  syncUrl.value = url;
  syncError.value = null;

  const blocked = syncUrlBlockReason(url);
  if (blocked) {
    syncStatus.value = "error";
    syncError.value = blocked;
    return;
  }

  syncStatus.value = "connecting";
  try {
    ws = new WebSocket(url);
  } catch (exc) {
    syncStatus.value = "error";
    syncError.value = String((exc as Error)?.message ?? exc);
    ws = null;
    return;
  }

  ws.onopen = () => {
    syncStatus.value = "live";
    pushCount.value = 0;
    // Make sure the change signal we subscribe to is actually being produced.
    initializeHistoryAutoTracking();
    // Initial full sync, then push on every committed (debounced, pause-aware)
    // history entry — captures edits, undo and redo of the live state.
    pushSyncNow();
    stopWatch = watch(
      () => history.snapshots[history.historyIndex],
      () => schedulePush(),
    );
  };
  // The plugin echoes the session key back on every applied message — treat it
  // purely as an ack heartbeat.
  ws.onmessage = () => {
    lastAckAt.value = Date.now();
  };
  ws.onerror = () => {
    syncStatus.value = "error";
    syncError.value = "Ошибка WebSocket-соединения";
  };
  ws.onclose = () => {
    teardownWatch();
    if (syncStatus.value !== "error") syncStatus.value = "off";
    ws = null;
  };
}

/** Close the live-sync connection and stop pushing. */
export function disconnectSync(): void {
  teardownWatch();
  if (ws) {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    ws = null;
  }
  if (syncStatus.value !== "error") syncStatus.value = "off";
}

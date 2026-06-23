<template>
  <div class="liveSync">
    <button
      type="button"
      class="btn syncToggle"
      :class="status"
      :title="statusTitle"
      @click="toggle"
    >
      <span class="material-icons">{{ statusIcon }}</span>
      <span class="text">{{ statusLabel }}</span>
      <span v-if="status === 'live'" class="dot" />
    </button>

    <div v-if="open" class="syncPanel">
      <label class="field">
        <span class="label">Server</span>
        <input
          v-model="url"
          type="text"
          class="urlInput"
          :disabled="status === 'live' || status === 'connecting'"
          placeholder="ws://localhost:27757"
        />
      </label>

      <p v-if="blockReason" class="warn">{{ blockReason }}</p>
      <p v-else-if="error" class="warn">{{ error }}</p>
      <p v-if="resourceWarning" class="warn subtle">
        Live-sync не передаёт картинки/гифки/шрифты — после их изменения
        перезалей полный layout-файл на сервер.
      </p>

      <div class="cmdRow">
        <code class="cmd">{{ command }}</code>
        <button type="button" class="copy" title="Скопировать" @click="copyCmd">
          <span class="material-icons">{{ copied ? "check" : "content_copy" }}</span>
        </button>
      </div>
      <p class="hint">
        1. Запусти эту команду на сервере (layout должен быть уже загружен).<br />
        2. Нажми Connect — правки полетят в плагин вживую.
      </p>

      <div class="actions">
        <button
          v-if="status !== 'live' && status !== 'connecting'"
          type="button"
          class="btn primary"
          @click="connect"
        >
          <span class="material-icons">sync</span> Connect
        </button>
        <button v-else type="button" class="btn" @click="disconnect">
          <span class="material-icons">sync_disabled</span> Disconnect
        </button>
        <span v-if="status === 'live'" class="stat">
          отправлено: {{ pushes }}{{ lastAck ? " · ack ✓" : "" }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  syncStatus,
  syncError,
  syncUrl,
  pushCount,
  lastAckAt,
  connectSync,
  disconnectSync,
  buildSyncCommand,
  syncUrlBlockReason,
  syncUsesUnsyncableResources,
  DEFAULT_SYNC_URL,
} from "../utils/manager/SyncManager";
import { vueRef } from "../utils/VueRef";

export default defineComponent({
  data() {
    return {
      open: false,
      copied: false,
      url: DEFAULT_SYNC_URL,
      status: vueRef(syncStatus),
      error: vueRef(syncError),
      syncUrl: vueRef(syncUrl),
      pushes: vueRef(pushCount),
      lastAck: vueRef(lastAckAt),
    };
  },
  computed: {
    command(): string {
      return buildSyncCommand();
    },
    blockReason(): string | null {
      return syncUrlBlockReason(this.url);
    },
    resourceWarning(): boolean {
      return syncUsesUnsyncableResources();
    },
    statusLabel(): string {
      return {
        off: "Live Sync",
        connecting: "Connecting…",
        live: "Live",
        error: "Sync error",
      }[this.status as string] as string;
    },
    statusIcon(): string {
      return {
        off: "sync",
        connecting: "sync",
        live: "sync",
        error: "sync_problem",
      }[this.status as string] as string;
    },
    statusTitle(): string {
      return this.status === "live"
        ? `Подключено к ${this.syncUrl}`
        : "Live-sync с плагином";
    },
  },
  methods: {
    toggle() {
      this.open = !this.open;
    },
    connect() {
      connectSync(this.url);
    },
    disconnect() {
      disconnectSync();
    },
    async copyCmd() {
      try {
        await navigator.clipboard.writeText(this.command);
        this.copied = true;
        window.setTimeout(() => (this.copied = false), 1200);
      } catch {
        /* clipboard may be unavailable */
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.liveSync {
  position: relative;
}

.syncToggle {
  display: flex;
  align-items: center;
  gap: 6px;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #57d977;
    box-shadow: 0 0 6px #57d977;
  }

  &.live {
    color: #57d977;
  }
  &.error {
    color: #ff6b6b;
  }
}

.syncPanel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 50;
  width: 320px;
  padding: 12px;
  border-radius: 12px;
  background: $dark2;
  border: 1px solid rgba(138, 148, 163, 0.25);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 8px;

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: 12px;
    color: $light3;
  }

  .urlInput {
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid rgba(138, 148, 163, 0.3);
    background: rgba(255, 255, 255, 0.04);
    color: $light;
  }

  .warn {
    margin: 0;
    font-size: 12px;
    color: #ffb454;
    line-height: 1.4;

    &.subtle {
      color: $light3;
    }
  }

  .cmdRow {
    display: flex;
    align-items: center;
    gap: 6px;

    .cmd {
      flex: 1;
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.3);
      color: $light2;
      font-size: 12px;
      overflow-x: auto;
      white-space: nowrap;
    }

    .copy {
      background: transparent;
      border: none;
      color: $light3;
      cursor: pointer;

      .material-icons {
        font-size: 18px;
      }
    }
  }

  .hint {
    margin: 0;
    font-size: 11px;
    color: $light3;
    line-height: 1.5;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;

    .btn.primary {
      background: $blue;
      color: #fff;
    }

    .stat {
      font-size: 11px;
      color: $light3;
    }
  }
}
</style>

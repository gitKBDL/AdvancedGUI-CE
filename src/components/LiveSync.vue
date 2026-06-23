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
      <div class="panelHead">
        <span class="title">Live Sync</span>
        <span class="origin" :class="envOk ? 'ok' : 'bad'">{{ originLabel }}</span>
      </div>
      <p class="lead">
        Шлёт текущий лейаут в запущенный плагин по WebSocket в реальном времени —
        без облака advancedgui.app.
      </p>

      <!-- Context-aware diagnosis: the #1 reason it won't connect -->
      <div class="envBanner" :class="envOk ? 'ok' : 'bad'">
        <span class="material-icons">{{ envOk ? "check_circle" : "report" }}</span>
        <span>{{ envMessage }}</span>
      </div>

      <div class="cmdBlock">
        <span class="label">Команда для сервера (включает sync на :27757)</span>
        <div class="cmdRow">
          <code class="cmd">{{ command }}</code>
          <button type="button" class="copy" title="Скопировать" @click="copyCmd">
            <span class="material-icons">{{ copied ? "check" : "content_copy" }}</span>
          </button>
        </div>
      </div>

      <label class="field">
        <span class="label">Адрес сервера</span>
        <input
          v-model="url"
          type="text"
          class="urlInput"
          :disabled="status === 'live' || status === 'connecting'"
          placeholder="ws://localhost:27757"
        />
      </label>

      <p v-if="blockReason" class="warn">{{ blockReason }}</p>
      <p v-else-if="error" class="warn">⚠ {{ error }}</p>
      <p v-if="resourceWarning" class="warn subtle">
        Ресурсы (картинки/гифки/шрифты) через live-sync не передаются — после их
        изменения перезалей полный layout-файл на сервер.
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
        <span v-if="status === 'live'" class="stat live">● отправлено: {{ pushes }}{{ lastAck ? " · ack ✓" : "" }}</span>
        <span v-else-if="status === 'connecting'" class="stat">подключение…</span>
      </div>

      <details class="help">
        <summary>Как это завести (3 шага) и почему может не подключаться</summary>

        <ol class="steps">
          <li>
            <b>На сервере:</b> лейаут должен быть загружен (<code>/ag layouts</code>),
            затем выполни <b>команду выше</b> — она включает sync на порту 27757.
          </li>
          <li>
            <b>Открой редактор по <code>http://localhost</code></b> (а не gh-pages по
            https). С https браузер режет <code>ws://</code> как mixed-content —
            даже к localhost. Для публичного hosted-доступа нужен
            <code>wss://</code> через свой reverse-proxy.
          </li>
          <li>
            Впиши адрес (<code>ws://localhost:27757</code>) и нажми
            <b>Connect</b> → статус станет <b>Live</b>, правки полетят в плагин.
          </li>
        </ol>

        <p class="why">
          <b>Не коннектится — частые причины:</b><br />
          • редактор открыт по <b>https</b> → браузер блокирует <code>ws://</code>
          (нужен http://localhost или wss://);<br />
          • на сервере <b>не включён</b> <code>/ag sync</code> (порт 27757 не слушает);<br />
          • неверный адрес/порт или фаервол закрыл 27757;<br />
          • лейаут с этим именем не загружен на сервере.
        </p>
        <p class="why subtle">
          Порт 27757 принимает запись лейаута <b>без аутентификации</b> — держи его
          на loopback и не пробрасывай в интернет голым.
        </p>
      </details>
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
    isHttps(): boolean {
      return typeof location !== "undefined" && location.protocol === "https:";
    },
    originLabel(): string {
      if (typeof location === "undefined") return "";
      return this.isHttps ? "страница: https ⚠" : "страница: http ✓";
    },
    // The environment is OK for plain ws:// only when the editor itself is NOT
    // served over https (otherwise the browser blocks ws:// as mixed content).
    // A wss:// target is always fine.
    envOk(): boolean {
      return !this.isHttps || this.url.startsWith("wss://");
    },
    envMessage(): string {
      if (!this.isHttps) {
        return "Редактор открыт по http — ws:// разрешён. Включи /ag sync на сервере и жми Connect.";
      }
      if (this.url.startsWith("wss://")) {
        return "Страница по https — ок для wss://. Прокси должен вести на ws://127.0.0.1:27757.";
      }
      return "Редактор открыт по https — браузер заблокирует ws:// (даже к localhost). Открой редактор по http://localhost или подключайся по wss://.";
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
  width: 360px;
  padding: 14px;
  border-radius: 12px;
  background: $dark2;
  border: 1px solid rgba(138, 148, 163, 0.25);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 8px;

  .panelHead {
    display: flex;
    align-items: baseline;
    justify-content: space-between;

    .title {
      font-weight: 600;
      color: $light;
    }
    .origin {
      font-size: 11px;
      &.ok {
        color: #57d977;
      }
      &.bad {
        color: #ffb454;
      }
    }
  }

  .lead {
    margin: 0;
    font-size: 12px;
    color: $light3;
    line-height: 1.45;
  }

  .envBanner {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.4;

    .material-icons {
      font-size: 18px;
      flex-shrink: 0;
    }
    &.ok {
      background: rgba(87, 217, 119, 0.12);
      color: #9ff0b3;
    }
    &.bad {
      background: rgba(255, 107, 107, 0.12);
      color: #ffb0a8;
    }
  }

  .help {
    margin-top: 2px;
    font-size: 12px;
    color: $light2;

    summary {
      cursor: pointer;
      color: $light3;
      font-size: 12px;
      user-select: none;
    }

    .steps {
      margin: 8px 0;
      padding-left: 18px;
      line-height: 1.5;

      li {
        margin-bottom: 8px;
      }
    }

    .why {
      margin: 6px 0 0;
      line-height: 1.5;

      &.subtle {
        color: $light3;
        margin-top: 6px;
      }
    }

    code {
      background: rgba(0, 0, 0, 0.3);
      padding: 1px 4px;
      border-radius: 4px;
      font-size: 11px;
    }
  }

  .cmdBlock,
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

      &.live {
        color: #57d977;
      }
    }
  }
}
</style>

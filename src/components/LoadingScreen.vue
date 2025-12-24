<template>
  <div
    class="loadingPrompt"
    :style="{
      display:
        loading.loading || loading.error || loading.info ? 'flex' : 'none',
    }"
  >
    <span v-if="loading.loading" class="material-icons spin"> autorenew </span>
    <div v-else-if="loading.error" class="errorScreen">
      <h1>
        <span class="material-icons">warning</span>
        {{ t("loading.errorTitle", "Something went wrong") }}
      </h1>
      <p>
        {{ loading.error }}
      </p>
      <div class="action-row">
        <div
          v-if="loading.action"
          class="btn action"
          @click="
            loading.error = null;
            loading.action.callback();
          "
        >
          <span class="text">{{ loading.action.label }}</span>
        </div>
        <div class="btn close" @click="loading.error = null">
          <span class="text">{{ t("loading.close", "Close") }}</span>
        </div>
      </div>
    </div>
    <div v-else class="infoScreen">
      <p>
        <span class="material-icons">info</span>
        <span v-html="loading.info"> </span>
      </p>
      <div class="action-row">
        <div class="btn close" @click="loading.info = null">
          <span class="text">{{ t("modal.ok", "Okay") }}</span>
        </div>
        <div
          v-if="loading.action"
          class="btn action"
          @click="
            loading.info = null;
            loading.action.callback();
          "
        >
          <span class="text">{{ loading.action.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { loadingState } from "../utils/manager/WorkspaceManager";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return {
      loading: loadingState,
      t,
    };
  },
});
</script>

<style lang="scss" scoped>
.loadingPrompt {
  z-index: 11;
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(5px);
  justify-content: center;
  align-items: center;
  padding: 24px;
  box-sizing: border-box;
  overflow: auto;

  .errorScreen,
  .infoScreen {
    width: min(720px, 100%);
    max-height: min(80vh, calc(100vh - 48px));
    min-height: 0;
    overflow-y: auto;
    padding: 24px;
    box-shadow: $shadow;
    background: linear-gradient(
      180deg,
      rgba(20, 26, 35, 0.98),
      rgba(15, 20, 28, 0.98)
    );
    border-radius: var(--panel-radius);
    border: var(--panel-border);
    box-sizing: border-box;
    color: $light2;
    overflow-wrap: anywhere;
    word-break: break-word;

    h1 {
      margin: 0;
      font-size: 22px;
      display: flex;
      align-items: center;

      .material-icons {
        font-size: 24px;
        color: $red;
        margin-right: 10px;
      }
    }

    i {
      color: $light3;
    }

    .action-row {
      padding-top: 5px;
      display: flex;
      justify-content: center;

      .close,
      .action {
        background-color: transparent;
        border: 1px solid color.adjust($light2, $alpha: -0.2);
        color: color.adjust($light2, $alpha: -0.2);

        &:hover {
          border: 1px solid $light2;
          color: $light2;
        }
      }

      .action {
        margin-right: auto;
        border: 1px solid $blue;
        color: $blue;

        &:hover {
          border: 1px solid color.adjust($blue, $alpha: -0.2);
          color: color.adjust($blue, $alpha: -0.2);
        }
      }
    }
  }

  .infoScreen {
    min-width: 20vw;

    p {
      display: flex;
      align-items: center;
      margin: 0 0 20px;
    }

    .material-icons {
      color: $blue;
      margin-right: 10px;
    }

    .action-row {
      .action {
        margin-right: 0;
        margin-left: auto;
      }
    }
  }

  .spin {
    font-size: 40px;
  }
}
</style>

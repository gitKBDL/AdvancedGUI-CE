<template>
  <div class="modal" :style="{ display: modelValue ? 'flex' : 'none' }">
    <div class="modalContainer">
      <h1 v-if="title">
        <span class="material-icons" v-if="icon">{{ icon }}</span> {{ title }}
      </h1>
      <slot></slot>
      <div class="action-row" v-if="closeBtn">
        <div class="btn close" @click="$emit('update:modelValue', false)">
          <span class="text">{{ t("modal.ok", "Okay") }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { t } from "@/utils/i18n";
export default defineComponent({
  data() {
    return { t };
  },

  props: {
    modelValue: {
      type: Boolean,
    },
    closeBtn: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: String,
    },
    title: {
      type: String,
    },
  },
});
</script>

<style lang="scss" scoped>
.modal {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(5px);
  justify-content: center;
  align-items: center;
  z-index: 20;
  padding: 24px;
  box-sizing: border-box;
  overflow: auto;

  .modalContainer {
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

      .material-icons {
        // color: $green;
      }
    }

    i {
      color: $light3;
    }

    .action-row {
      display: flex;
      padding-top: 10px;
      justify-content: space-between;

      .close {
        background-color: transparent;
        border: 1px solid color.adjust($blue, $alpha: -0.2);
        color: color.adjust($blue, $alpha: -0.2);

        &:hover {
          border: 1px solid $blue;
          color: $blue;
        }
      }
    }
  }
}
</style>

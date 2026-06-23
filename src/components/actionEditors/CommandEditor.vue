<template>
  <div>
    <div class="settings-row">
      <span class="label">{{ t("command.command", "Command") }}</span>
      <input v-model="action.command" type="text" />
    </div>
    <div class="settings-row">
      <span class="label">{{ t("command.console", "Run as console") }}</span>
      <input v-model="action.asConsole" type="checkbox" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { CommandAction } from "@/utils/actions/CommandAction";
import { t } from "@/utils/i18n";

export default defineComponent({

  props: {
    action: {
      type: Object as () => CommandAction,
      required: true,
    },
  },
  data() {
    return { t };
  },
});
</script>

<style lang="scss" scoped></style>

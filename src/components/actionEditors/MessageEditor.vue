<template>
  <div>
    <div class="settings-row">
      <span class="label">{{ t("message.message", "Message") }}</span>
      <textarea v-model="action.message" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { MessageAction } from "@/utils/actions/MessageAction";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return { t };
  },

  props: {
    action: {
      type: Object as () => MessageAction,
      required: true,
    },
  },
});
</script>

<style lang="scss" scoped></style>

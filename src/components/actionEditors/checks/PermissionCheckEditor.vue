<template>
  <div>
    <div class="settings-row">
      <span class="label">{{ t("permission.permission", "Permission") }}</span>
      <input v-model="action.permission" type="text" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { PermissionCheck } from "@/utils/checks/PermissionCheck";
import { t } from "@/utils/i18n";

export default defineComponent({

  props: {
    action: {
      type: Object as () => PermissionCheck,
      required: true,
    },
  },
  data() {
    return { t };
  },
});
</script>

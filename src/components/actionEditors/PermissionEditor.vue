<template>
  <div>
    <div class="settings-row">
      <span class="label">{{ t("permission.permission", "Permission") }}</span>
      <input type="text" v-model="action.permission" />
    </div>
    <div class="settings-row switch-row">
      <span
        class="label"
        :class="action.add ? 'active' : ''"
        @click="action.add = true"
        >{{ t("permission.add", "ADD") }}</span
      >&nbsp;{{ t("permission.or", "or") }}&nbsp;
      <span
        class="label"
        :class="!action.add ? 'active' : ''"
        @click="action.add = false"
        >{{ t("permission.remove", "REMOVE") }}</span
      >&nbsp;{{ t("permission.permissionLower", "permission") }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { PermissionAction } from "@/utils/actions/PermissionAction";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return { t };
  },

  props: {
    action: {
      type: Object as () => PermissionAction,
      required: true,
    },
  },
});
</script>

<style lang="scss" scoped>
.switch-row {
  color: $light2;

  .label {
    cursor: pointer;
  }

  .label.active {
    font-weight: bold;
    text-decoration: underline;
  }
}
</style>

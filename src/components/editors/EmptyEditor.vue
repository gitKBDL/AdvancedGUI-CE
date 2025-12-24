<template>
  <div class="settings-row">
    <span class="label">{{
      t("empty.none", "This component has no specific settings")
    }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { t } from "@/utils/i18n";
export default defineComponent({
  data() {
    return { t };
  },
});
</script>

<style lang="scss" scoped></style>

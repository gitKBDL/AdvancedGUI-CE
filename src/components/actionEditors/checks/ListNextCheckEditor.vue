<template>
  <list-next-target-section :action="action">
    <div class="settings-row">
      <span class="label"
        >{{ t("listNext.checkIf", "Check if there is a") }}
      </span>
      <select v-model="action.forward" style="margin-right: 8px">
        <option :value="true">{{ t("listNext.next", "next") }}</option>
        <option :value="false">{{ t("listNext.previous", "previous") }}</option>
      </select>
      <span class="label">{{ t("listNext.page", "page") }}</span>
    </div>
  </list-next-target-section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { ListNextCheck } from "@/utils/checks/ListNextCheck";
import { t } from "@/utils/i18n";
import ListNextTargetSection from "../ListNextTargetSection.vue";

export default defineComponent({
  components: {
    ListNextTargetSection,
  },
  data() {
    return {
      t,
    };
  },

  props: {
    action: {
      type: Object as () => ListNextCheck,
      required: true,
    },
  },
});
</script>

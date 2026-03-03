<template>
  <list-next-target-section :action="action">
    <div class="settings-row">
      <span class="label">{{ t("listNext.goTo", "Go to") }} </span>
      <select v-model="action.forward" style="margin-right: 8px">
        <option :value="true">{{ t("listNext.next", "next") }}</option>
        <option :value="false">{{ t("listNext.previous", "previous") }}</option>
      </select>
      <span class="label">
        {{ t("listNext.pageIfPossible", "page, if possible") }}
      </span>
    </div>
  </list-next-target-section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { ListNextAction } from "../../utils/actions/ListNextAction";
import { t } from "@/utils/i18n";
import ListNextTargetSection from "./ListNextTargetSection.vue";

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
      type: Object as () => ListNextAction,
      required: true,
    },
  },
});
</script>

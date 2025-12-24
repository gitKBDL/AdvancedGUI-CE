<template>
  <div id="visCheckSettings">
    <div class="settings-row">
      <span class="label">{{ t("listNext.viewId", "View ID") }}</span>
      <input
        type="text"
        ref="test"
        class="componentIdInput"
        @focus="idWatcher = (val) => (action.targetId = val)"
        v-model="action.targetId"
      />
    </div>
    <p
      class="label"
      :class="
        components[action.targetId] &&
        components[action.targetId].displayName == 'View'
          ? ''
          : 'red-text'
      "
    >
      {{ t("listNext.target", "TARGET")
      }}{{
        !components[action.targetId]
          ? t("listNext.notFound", " NOT FOUND!")
          : components[action.targetId].displayName != "View"
            ? t("listNext.notView", " is not a view")
            : ": " + components[action.targetId].name
      }}
    </p>
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
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { components } from "@/utils/manager/ComponentManager";
import { ListNextCheck } from "@/utils/checks/ListNextCheck";
import { idWatcher } from "@/utils/manager/WorkspaceManager";
import { vueRef } from "../../../utils/VueRef";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return {
      components,
      idWatcher: vueRef(idWatcher),
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

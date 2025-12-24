<template>
  <div id="visCheckSettings">
    <div class="settings-row">
      <span class="label">{{
        t("visibility.componentId", "Component ID")
      }}</span>
      <input
        type="text"
        ref="test"
        class="componentIdInput"
        @focus="idWatcher = (val) => (action.targetId = val)"
        v-model="action.targetId"
      />
    </div>
    <p class="label" :class="components[action.targetId] ? '' : 'red-text'">
      {{ t("view.target", "TARGET")
      }}{{
        !components[action.targetId]
          ? t("view.notFound", " NOT FOUND!")
          : ": " + components[action.targetId].name
      }}
    </p>
    <p>
      {{
        t(
          "visibility.checkDesc",
          "Used to check whether the component is currently visible for the player",
        )
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { components } from "@/utils/manager/ComponentManager";
import { VisibilityCheck } from "@/utils/checks/VisibilityCheck";
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
      type: Object as () => VisibilityCheck,
      required: true,
    },
  },
});
</script>

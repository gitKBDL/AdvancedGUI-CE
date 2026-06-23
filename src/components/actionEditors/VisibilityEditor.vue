<template>
  <div id="visSettings">
    <div class="settings-row">
      <span class="label">{{
        t("visibility.componentId", "Component ID")
      }}</span>
      <input
        v-model="action.targetId"
        type="text"
        class="componentIdInput"
        @focus="idWatcher = (val) => (action.targetId = val)"
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
    <div class="settings-row">
      <span class="label">{{ t("visibility.visible", "Visible") }}</span>
      <input v-model="action.visibility" type="checkbox" />
    </div>
    <p class="label">
      {{
        t(
          action.visibility
            ? "visibility.makeVisible"
            : "visibility.makeInvisible",
          action.visibility
            ? "Action will make component visible"
            : "Action will make component invisible",
        )
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { VisibilityAction } from "@/utils/actions/VisibilityAction";
import { components } from "@/utils/manager/ComponentManager";
import { idWatcher } from "@/utils/manager/WorkspaceManager";
import { vueRef } from "../../utils/VueRef";
import { t } from "@/utils/i18n";

export default defineComponent({

  props: {
    action: {
      type: Object as () => VisibilityAction,
      required: true,
    },
  },
  data() {
    return {
      components,
      idWatcher: vueRef(idWatcher),
      t,
    };
  },
});
</script>

<style lang="scss" scoped>
#visSettings {
  p {
    margin-top: 0px;
  }
}
</style>

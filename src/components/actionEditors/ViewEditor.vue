<template>
  <div id="viewSettings">
    <div class="settings-row">
      <span class="label">{{ t("view.viewId", "View ID") }}</span>
      <input
        type="text"
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
      {{ t("view.target", "TARGET")
      }}{{
        !components[action.targetId]
          ? t("view.notFound", " NOT FOUND!")
          : components[action.targetId].displayName != "View"
            ? t("view.notView", " is not a View")
            : ": " + components[action.targetId].name
      }}
    </p>
    <div class="settings-row">
      <span class="label">{{ t("view.targetId", "Target ID") }}</span>
      <input
        type="text"
        class="componentIdInput"
        @focus="idWatcher = (val) => (action.activate = val)"
        v-model="action.activate"
      />
    </div>
    <p
      class="label"
      :class="components[action.activate] && isChild() ? '' : 'red-text'"
    >
      {{ t("view.target", "TARGET")
      }}{{
        !components[action.activate]
          ? t("view.notFound", " NOT FOUND!")
          : !isChild()
            ? t("view.notChild", "is not a direct child of view")
            : ": " + components[action.activate].name
      }}
    </p>
    <p>
      {{
        t(
          "view.desc",
          "This action will make the specified view display the specified target for this player.",
        )
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { components } from "@/utils/manager/ComponentManager";
import { ViewAction } from "@/utils/actions/ViewAction";
import { View } from "@/utils/components/View";
import { idWatcher } from "@/utils/manager/WorkspaceManager";
import { vueRef } from "../../utils/VueRef";
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
      type: Object as () => ViewAction,
      required: true,
    },
  },

  methods: {
    isChild() {
      const targetComp = this.components[this.action.targetId] as View;

      return (
        targetComp &&
        targetComp.components &&
        targetComp.components.find((comp) => comp.id == this.action.activate)
      );
    },
  },
});
</script>

<style lang="scss" scoped>
#viewSettings {
  p {
    color: $light2;
    margin-top: 0px;
  }
}
</style>

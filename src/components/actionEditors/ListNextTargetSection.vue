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
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { components } from "@/utils/manager/ComponentManager";
import { idWatcher } from "@/utils/manager/WorkspaceManager";
import { vueRef } from "@/utils/VueRef";
import { t } from "@/utils/i18n";

type ListNextTargetAction = {
  targetId: string;
};

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
      type: Object as PropType<ListNextTargetAction>,
      required: true,
    },
  },
});
</script>

<style lang="scss" scoped>
#visCheckSettings {
  p {
    color: $light2;
    margin-top: 0;
  }
}
</style>

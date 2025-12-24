<template>
  <div id="viewSettings">
    <div class="settings-row">
      <div class="input-box">
        <select v-model="component.drawIndex">
          <option
            v-for="(comp, index) in component.components"
            :key="index"
            :value="index"
          >
            {{
              index == 0
                ? `${t("view.default", "Default")} (${comp.name})`
                : comp.name
            }}
          </option>
        </select>
        <span>{{ t("view.showComponent", "Show component") }}</span>
      </div>
    </div>
    <div class="settings-row">
      <p>
        {{
          t(
            "view.componentDesc",
            "The View component is a group that can contain multiple components. The first is shown by default; with the view-change action you can show the others.",
          )
        }}
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { View } from "@/utils/components/View";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return { t };
  },

  props: {
    component: {
      type: Object as () => View,
      required: true,
    },
  },
});
</script>

<style lang="scss" scoped>
#viewSettings {
  select {
    width: 140px !important;
  }

  p {
    color: $light3 !important;
  }
}
</style>

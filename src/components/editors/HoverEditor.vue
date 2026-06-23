<template>
  <div id="hoverSettings">
    <div class="settings-row">
      <input v-model="component.drawHovered" type="checkbox" />
      <span class="label">{{ t("hover.show", "Show hovered component") }}</span>
    </div>
    <div class="settings-row">
      <p>
        {{
          t(
            "hover.desc",
            "The Hover component is a group with two components. The first is normal; the second shows when hovered.",
          )
        }}
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Hover } from "@/utils/components/Hover";
import { t } from "@/utils/i18n";

export default defineComponent({

  props: {
    component: {
      type: Object as () => Hover,
      required: true,
    },
  },
  data() {
    return { t };
  },
});
</script>

<style lang="scss" scoped>
#hoverSettings {
  input {
    margin: 0 10px 0 0 !important;
  }

  p {
    color: $light3 !important;
  }
}
</style>

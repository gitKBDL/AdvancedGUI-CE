<template>
  <div id="hoverSettings">
    <div class="settings-row">
      <input type="checkbox" v-model="component.drawClicked" />
      <span class="label">{{ t("click.show", "Show clicked component") }}</span>
    </div>
    <div class="settings-row">
      <p>
        {{
          t(
            "click.desc",
            "The Click Animation component is a group that holds two components. The first is shown normally; the second flashes briefly when the default component is clicked.",
          )
        }}
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { ClickAnimation } from "@/utils/components/ClickAnimation";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return { t };
  },

  props: {
    component: {
      type: Object as () => ClickAnimation,
      required: true,
    },
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

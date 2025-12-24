<template>
  <div>
    <div class="settings-row">
      <div class="input-box">
        <input
          type="number"
          @keypress="inputTransformer($event, action.ticks)"
          v-model.number="action.ticks"
        />
        <span>{{ t("delay.ticks", "ticks") }}</span>
      </div>
    </div>

    <p>
      {{
        t(
          "delay.desc",
          "This action will delay its child actions by the given amount of ticks (1 tick = 50ms)",
        )
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { DelayAction } from "@/utils/actions/DelayAction";
import { Template } from "@/utils/components/Template";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return {
      inputTransformer: Template.inputTransformer,
      t,
    };
  },

  props: {
    action: {
      type: Object as () => DelayAction,
      required: true,
    },
  },
});
</script>

<style lang="scss" scoped></style>

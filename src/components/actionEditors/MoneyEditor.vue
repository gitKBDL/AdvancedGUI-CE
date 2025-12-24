<template>
  <div>
    <div class="settings-row">
      <span class="label">{{ t("money.amount", "Amount") }}</span>
      <input
        type="number"
        @keypress="inputTransformer($event, action.amount)"
        v-model.number="action.amount"
      />
    </div>
    <p>
      <br />
      {{
        t(
          "money.negativeHint",
          "Use negative amounts to remove money from a player.",
        )
      }}
      <br /><br />
      {{
        t(
          "money.actionResult",
          "This action will {mode} {amount} money for the player.",
        )
          .replace(
            "{mode}",
            action.amount >= 0
              ? t("money.add", "add")
              : t("money.remove", "remove"),
          )
          .replace("{amount}", Math.abs(action.amount).toString())
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { MoneyAction } from "../../utils/actions/MoneyAction";
import { Template } from "../../utils/components/Template";
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
      type: Object as () => MoneyAction,
      required: true,
    },
  },
});
</script>

<style lang="scss" scoped></style>

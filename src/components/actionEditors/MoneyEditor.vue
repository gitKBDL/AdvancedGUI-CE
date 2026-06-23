<template>
  <div>
    <div class="settings-row">
      <span class="label">{{ t("money.amount", "Amount") }}</span>
      <input
        v-model.number="action.amount"
        type="number"
        @keypress="inputTransformer($event, action.amount)"
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

  props: {
    action: {
      type: Object as () => MoneyAction,
      required: true,
    },
  },
  data() {
    return {
      inputTransformer: Template.inputTransformer,
      t,
    };
  },
});
</script>

<style lang="scss" scoped></style>

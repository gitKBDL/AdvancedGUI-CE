<template>
  <div>
    <div class="settings-row">
      <div class="input-box">
        <input
          type="number"
          @keypress="inputTransformer($event, action.amount)"
          v-model.number="action.amount"
        />
        <span class="label">{{ t("money.amount", "Amount") }}</span>
      </div>
    </div>
    <p>
      {{
        t(
          "money.desc",
          "Used to check whether the player has at least the specified amount of money (through Vault)",
        )
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { MoneyCheck } from "@/utils/checks/MoneyCheck";
import { Template } from "@/utils/components/Template";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return {
      inputTransformer: Template.inputTransformer,
      t,
    };
  },

  watch: {
    "action.amount": {
      handler(val) {
        if (val === "") this.action.amount = 0;
      },
    },
  },

  props: {
    action: {
      type: Object as () => MoneyCheck,
      required: true,
    },
  },
});
</script>

<template>
  <div>
    <div class="settings-row">
      <div class="input-box">
        <input
          v-model.number="action.amount"
          type="number"
          @keypress="inputTransformer($event, action.amount)"
        />
        <span class="label">{{ t("item.amount", "Amount") }}</span>
      </div>
    </div>
    <div class="settings-row">
      <span class="label">{{ t("item.name", "Item name") }}</span>
      <input v-model="action.itemName" type="text" />
    </div>
    <p>
      {{
        t(
          "item.desc",
          "Checks whether the player has at least the specified amount of the given item. Press F3+H in-game and hover an item to see its name.",
        )
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { ItemCheck } from "@/utils/checks/ItemCheck";
import { Template } from "@/utils/components/Template";
import { t } from "@/utils/i18n";

export default defineComponent({

  props: {
    action: {
      type: Object as () => ItemCheck,
      required: true,
    },
  },
  data() {
    return {
      inputTransformer: Template.inputTransformer,
      t,
    };
  },

  watch: {
    action: {
      deep: true,
      handler(action) {
        if (action.amount === "") this.action.amount = 0;
      },
    },
  },
});
</script>

<template>
  <div>
    <div class="settings-row">
      <span class="label">{{
        t("placeholder.placeholder", "Placeholder")
      }}</span>
      <input v-model="action.placeholder" type="text" />
    </div>
    <div class="settings-row">
      <span class="label">
        {{ t("placeholder.compType", "Comparison Type") }}
      </span>
      <select v-model.number="action.compType">
        <option :value="-1">
          {{ t("placeholder.textEq", "Text equals") }}
        </option>
        <option :value="0">&lt;</option>
        <option :value="1">&lt;=</option>
        <option :value="2">=</option>
        <option :value="3">&gt;=</option>
        <option :value="4">&gt;</option>
      </select>
    </div>
    <div class="settings-row">
      <span class="label">{{ t("placeholder.value", "Value") }}</span>
      <input
        v-model="action.value"
        :type="action.compType == -1 ? 'text' : 'number'"
      />
    </div>
    <p v-if="action.compType == -1">
      {{
        t(
          "placeholder.descText",
          'Checks whether the placeholder {ph} has the value "{val}"',
        )
          .replace("{ph}", action.placeholder)
          .replace("{val}", String(action.value))
      }}
    </p>
    <p v-else>
      {{
        t("placeholder.descNumber", "Checks whether: {ph} {cmp} {val}")
          .replace("{ph}", action.placeholder)
          .replace("{cmp}", compText)
          .replace("{val}", String(action.value))
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { PlaceholderCheck } from "@/utils/checks/PlaceholderCheck";
import { t } from "@/utils/i18n";

export default defineComponent({

  props: {
    action: {
      type: Object as () => PlaceholderCheck,
      required: true,
    },
  },
  data() {
    return { t };
  },

  computed: {
    compText(): string {
      switch (this.action.compType) {
        case -1:
          return t("placeholder.textEqShort", "text eq");
        case 0:
          return "<";
        case 1:
          return "<=";
        case 2:
          return "=";
        case 3:
          return ">=";
        case 4:
          return ">";
        default:
          return String(this.action.compType);
      }
    },
  },
});
</script>

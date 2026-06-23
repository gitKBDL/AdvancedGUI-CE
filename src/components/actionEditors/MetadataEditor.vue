<template>
  <div>
    <div class="settings-row">
      <span class="label">{{ t("metadata.key", "Metadata key") }}</span>
      <input v-model="action.key" type="text" />
    </div>
    <div v-if="action.value !== undefined" class="settings-row">
      <span class="label">{{ t("metadata.newValue", "New value") }}</span>
      <input v-model="action.value" type="text" />
    </div>
    <div class="settings-row">
      <span class="label">{{ t("metadata.deleteValue", "Delete value") }}</span>
      <input
        type="checkbox"
        :checked="action.value === undefined"
        @change="action.value = action.value === undefined ? '' : undefined"
      />
    </div>
    <br />
    <p>
      {{
        t(
          "metadata.desc",
          "This action changes the value of %meta.{key}%. You can use metadata anywhere in the GUI, e.g. in placeholder checks.",
        ).replace("{key}", action.key)
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { MetadataAction } from "@/utils/actions/MetadataAction";
import { t } from "@/utils/i18n";

export default defineComponent({

  props: {
    action: {
      type: Object as () => MetadataAction,
      required: true,
    },
  },
  data() {
    return { t };
  },
});
</script>

<style lang="scss" scoped></style>

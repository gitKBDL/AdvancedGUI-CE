<template>
  <div>
    <p>
      {{
        t(
          "standby.desc",
          "This check has no options. It checks whether the player is outside of the GUI interaction radius.",
        )
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { StandbyCheck } from "@/utils/checks/StandbyCheck";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return { t };
  },
  props: {
    action: {
      type: Object as () => StandbyCheck,
      required: true,
    },
  },
});
</script>

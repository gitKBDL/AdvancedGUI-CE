<template>
  <div id="gifContrSettings">
    <div class="settings-row">
      <span class="label">{{ t("gif.targetId", "GIF Component ID") }}</span>
      <input
        type="text"
        class="componentIdInput"
        @focus="idWatcher = (val) => (action.targetId = val)"
        v-model="action.targetId"
      />
    </div>
    <p
      class="label"
      :class="
        components[action.targetId] &&
        components[action.targetId].displayName == 'GIF'
          ? ''
          : 'red-text'
      "
    >
      {{ t("gif.target", "TARGET")
      }}{{
        !components[action.targetId]
          ? t("gif.notFound", " NOT FOUND!")
          : components[action.targetId].displayName != "GIF"
            ? t("gif.notGif", " is not a GIF")
            : ": " + components[action.targetId].name
      }}
    </p>
    <div class="settings-row">
      <span class="label">{{ t("gif.pause", "Pause GIF") }}</span>
      <input type="checkbox" v-model="action.pause" />
    </div>
    <div class="settings-row">
      <span class="label">{{ t("gif.reset", "Reset GIF") }}</span>
      <input type="checkbox" v-model="action.reset" />
    </div>
    <p class="label">
      {{
        t(
          action.pause ? "gif.pauseDesc" : "gif.unpauseDesc",
          action.pause
            ? "Action will pause the GIF"
            : "Action will unpause the GIF",
        )
      }}
      <span v-if="action.reset">
        {{ t("gif.resetDesc", "and reset it to its first frame") }}
      </span>
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { components } from "@/utils/manager/ComponentManager";
import { GifControlAction } from "@/utils/actions/GifControlAction";
import { idWatcher } from "@/utils/manager/WorkspaceManager";
import { vueRef } from "../../utils/VueRef";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return {
      components,
      idWatcher: vueRef(idWatcher),
      t,
    };
  },

  props: {
    action: {
      type: Object as () => GifControlAction,
      required: true,
    },
  },
});
</script>

<style lang="scss" scoped>
#gifContrSettings {
  p {
    margin-top: 0px;
  }
}
</style>

<template>
  <div id="replicaSettings">
    <div class="settings-row">
      <span class="label">{{ t("replica.templateId", "Template ID") }}</span>
      <input
        v-model="component.targetId"
        type="text"
        class="componentIdInput"
        @focus="idWatcher = (val) => (component.targetId = val)"
      />
    </div>
    <p
      class="label"
      :class="
        components[component.targetId] &&
        components[component.targetId].displayName == 'Template'
          ? ''
          : 'red-text'
      "
    >
      {{ t("replica.target", "TARGET")
      }}{{
        !components[component.targetId]
          ? t("replica.notFound", " NOT FOUND!")
          : components[component.targetId].displayName != "Template"
            ? t("replica.notTemplate", " is not a Template")
            : ": " + components[component.targetId].name
      }}
    </p>
    <div class="label heading">{{ t("replica.position", "Position") }}</div>
    <div class="settings-row">
      <div class="input-box">
        <input v-model.number="component.position.x" type="number" />
        <span>X</span>
      </div>
      <div class="input-box">
        <input v-model.number="component.position.y" type="number" />
        <span>Y</span>
      </div>
    </div>
    <br />
    <div
      v-for="(data, i) in component.templateData"
      :key="i"
      class="settings-row"
    >
      <span class="label normalCase">#{{ data.name }} = </span>
      <input
        v-if="typeof data.value == 'number'"
        v-model.number="data.value"
        type="number"
      />
      <input v-else v-model="data.value" type="text" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Replica } from "@/utils/components/Replica";
import { components, TemplateData } from "@/utils/manager/ComponentManager";
import { idWatcher } from "@/utils/manager/WorkspaceManager";
import { vueRef } from "../../utils/VueRef";
import { t } from "@/utils/i18n";

export default defineComponent({

  props: {
    component: {
      type: Object as () => Replica,
      required: true,
    },
  },
  data() {
    return {
      components,
      defaultData: undefined as undefined | TemplateData,
      idWatcher: vueRef(idWatcher),
      t,
    };
  },

  watch: {
    defaultData: {
      deep: true,
      handler() {
        this.updateTemplateData();
      },
    },
    "component.targetId": {
      handler() {
        this.defaultData = this.component.getTemplateDefaultData();
      },
    },
    "component.id": {
      handler() {
        this.defaultData = this.component.getTemplateDefaultData();
        this.updateTemplateData();
      },
    },
  },

  mounted() {
    this.defaultData = this.component.getTemplateDefaultData();
  },

  methods: {
    updateTemplateData() {
      if (!this.defaultData) return;

      for (const entry of this.defaultData) {
        if (
          !this.component.templateData.some(
            (entr) =>
              entr.name == entry.name &&
              typeof entr.value == typeof entry.value,
          )
        ) {
          this.component.templateData.push(JSON.parse(JSON.stringify(entry)));
        }
      }

      this.component.templateData = this.component.templateData.filter(
        (entry) =>
          this.defaultData!.some(
            (entr) =>
              entr.name == entry.name &&
              typeof entr.value == typeof entry.value,
          ),
      );
    },
  },
});
</script>

<style lang="scss" scoped>
#replicaSettings {
  p {
    color: $light3 !important;
  }

  .normalCase {
    text-transform: none !important;
  }
}
</style>

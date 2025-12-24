<template>
  <div id="listSettings">
    <div class="varBox">
      <div class="label heading">
        {{ t("list.entryVars", "Entry variables") }}
      </div>
      <div
        v-for="(data, i) in component.entryType"
        :key="i"
        class="settings-row"
      >
        <select v-model="data.type">
          <option value="number">{{ t("common.number", "Number") }}</option>
          <option value="string">{{ t("common.text", "Text") }}</option>
        </select>
        <span class="label hashtag">#</span>
        <input class="varName" type="text" v-model="data.name" />
        <span
          class="material-icons closeIcon"
          @click="component.entryType.splice(i, 1)"
          >close</span
        >
      </div>
      <div
        class="btn"
        @click="component.entryType.push({ name: 'varName', type: 'string' })"
      >
        <span class="material-icons">add</span>
        <span class="text">{{ t("list.addVariable", "Add variable") }}</span>
      </div>
    </div>
    <br />
    <div class="varBox entries">
      <div class="label heading">
        {{ t("list.entries", "Entries") }}
      </div>
      <div
        v-for="(entry, i) in component.entries"
        :key="i"
        class="settings-row entry"
      >
        <div>
          <div
            v-for="(variable, j) in component.entryType"
            :key="j"
            class="entry-row"
          >
            <span class="varName">#{{ variable.name }} =</span>
            <input
              v-if="variable.type == 'number'"
              type="number"
              v-model.number="entry[variable.name]"
            />
            <input v-else type="text" v-model="entry[variable.name]" />
          </div>
        </div>
        <span
          class="material-icons closeIcon"
          @click="component.entries.splice(i, 1)"
          >close</span
        >
      </div>
      <div class="btn" @click="component.entries.push({})">
        <span class="material-icons">add</span>
        <span class="text">{{ t("list.addEntry", "Add entry") }}</span>
      </div>
    </div>
    <br />
    <div class="label heading">
      {{ t("list.offset", "Entry offset") }}
    </div>
    <div class="settings-row">
      <div class="input-box">
        <input type="number" v-model.number="component.xOffset" />
        <span>X</span>
      </div>
      <div class="input-box">
        <input type="number" v-model.number="component.yOffset" />
        <span>Y</span>
      </div>
    </div>
    <br />
    <div class="settings-row">
      <div class="input-box">
        <input type="number" v-model.number="component.itemsAtOnce" />
        <span>{{ t("list.entriesPerPage", "Entries per page") }}</span>
      </div>
    </div>
    <br />
    <div class="label heading">
      {{
        t("list.showPage", "Show page ({current}/{total})")
          .replace("{current}", (component.drawOffset + 1).toString())
          .replace("{total}", component.pageCount.toString())
      }}
    </div>
    <input
      type="range"
      v-model.number="component.drawOffset"
      :max="component.pageCount - 1"
    />
    <br />
    <p>
      {{
        t(
          "list.help",
          "Use #variableName in any text-input within this template to use the corresponding variable. You can also use them in actions. Make sure each variable has a value. In number inputs you can press '#' to activate text input.",
        )
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { List } from "@/utils/components/List";
import { t } from "@/utils/i18n";

export default defineComponent({
  data() {
    return { t };
  },

  props: {
    component: {
      type: Object as () => List,
      required: true,
    },
  },
});
</script>

<style lang="scss">
.varBox {
  input,
  select {
    border: none !important;
    border-bottom: 1px $light4 solid !important;
    border-radius: 0 !important;
    width: 90px !important;
    margin: 0 5px !important;
  }

  input {
    width: 70px !important;
  }

  .hashtag {
    margin-left: 10px;
  }

  .varName {
    margin-left: -10px !important;
    padding-left: 14px !important;
  }

  .btn {
    margin-top: 15px;
  }

  .closeIcon {
    color: $red;
    font-size: 18px;
    cursor: pointer;
  }

  p {
    color: $light3 !important;
    margin-top: 15px !important;
  }
}

.entries {
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  .entry {
    padding: 6px 8px;
    width: auto !important;
    background-color: $dark2;

    .entry-row {
      display: flex;
      margin: 4px 0;

      .varName {
        color: $light2;
        min-width: 80px;
        display: block;
      }
    }

    .closeIcon {
      margin-left: 10px;
    }
  }
}
</style>

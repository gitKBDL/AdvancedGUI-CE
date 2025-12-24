<template>
  <div class="head">
    <div class="headLeft">
      <div class="btn exitBtn" @click="exitToExplorer()">
        <span class="material-icons">arrow_back</span>
        <span class="text">{{
          t("header.backToProjects", "Back to projects")
        }}</span>
      </div>
      <div class="btn shortcutsBtn" @click="openShortcuts">
        <span class="material-icons">keyboard</span>
        <span class="text">{{ t("header.shortcuts", "Shortcuts") }}</span>
      </div>
    </div>
    <div class="center">
      <input class="inputProjectName" type="text" v-model="projectNameModel" />
      <div class="size">
        <input type="number" v-model="settings.width" />
        <span class="label">x</span>
        <input type="number" v-model="settings.height" />
        <span class="label">{{ t("header.sizeFrames", "frames") }}</span>
        <span class="sizeResolution"
          >({{ pixelWidth }}:{{ pixelHeight }} px)</span
        >
      </div>
    </div>

    <div class="headRight">
      <div
        class="btn save"
        :class="!unsavedChange ? 'inactive' : ''"
        @click="saveCurrentProject"
      >
        <span class="material-icons">save</span>
        <span class="text">{{ t("header.save", "Save") }}</span>
      </div>
      <div class="btn export" @click="exportCurrentProject()">
        <span class="material-icons">get_app</span>
        <span class="text">{{ t("header.download", "Download") }}</span>
      </div>
      <div class="lang-switch">
        <span class="label">{{ t("header.lang", "Language") }}</span>
        <span class="material-icons">translate</span>
        <div class="langSelect">
          <select :value="language" @change="onLanguageChange">
            <option
              v-for="opt in languages"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <span class="material-icons caret">expand_more</span>
        </div>
      </div>
    </div>
    <teleport to="body">
      <modal
        :title="t('header.shortcuts.title', 'Shortcuts')"
        icon="keyboard"
        v-model="showShortcuts"
        closeBtn
      >
        <p class="shortcuts">
          <span>{{ modKeyLabel }}</span> <span>C</span> &ensp;
          {{ t("shortcuts.copy", "Copy component") }} <br />
          <span>{{ modKeyLabel }}</span> <span>V</span> &ensp;
          {{ t("shortcuts.paste", "Paste component") }} <br />
          <span>{{ modKeyLabel }}</span> <span>X</span> &ensp;
          {{ t("shortcuts.cut", "Copy & delete component") }} <br />
          <span>{{ deleteKeyLabel }}</span> &ensp;
          {{ t("shortcuts.delete", "Delete component") }}
          <br />
          <span>{{ modKeyLabel }}</span> <span>Z</span> &ensp;
          {{ t("shortcuts.undo", "Undo") }}
          <br />
          <span>{{ modKeyLabel }}</span>
          <template v-if="isMac"> <span>SHIFT</span> <span>Z</span> </template>
          <template v-else>
            <span>Y</span>
          </template>
          &ensp;
          {{ t("shortcuts.redo", "Redo") }}
          <br />
          <span>{{ modKeyLabel }}</span> <span>SCROLL</span> &ensp;
          {{ t("shortcuts.zoom", "Zoom in/out") }} <br />
          <span>{{ modKeyLabel }}</span> <span>SHIFT</span>
          <span>S</span> &ensp;
          {{ t("shortcuts.snapToggle", "Toggle snapping") }} <br />
          <span>ARROW KEY</span> &ensp;
          {{ t("shortcuts.move1", "Move component by 1 pixel") }} <br />
          <span>SHIFT</span> <span>ARROW KEY</span> &ensp;
          {{ t("shortcuts.move10", "Move component by 10 pixel") }} <br />
          <span>{{ altKeyLabel }}</span> <span>DRAG</span> &ensp;
          {{ t("shortcuts.duplicateDrag", "Duplicate while dragging") }} <br />
          <span>{{ modKeyLabel }}</span> <span>S</span> &ensp;
          {{ t("shortcuts.download", "Download savepoint") }} <br />
          {{
            t(
              "shortcuts.snap",
              "Press SHIFT while moving an element to snap to x- or y-axis",
            )
          }}
        </p>
      </modal>
    </teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import Modal from "@/components/Modal.vue";
import { settings } from "../utils/manager/SettingsManager";
import {
  availableLanguages,
  language,
  setLanguage,
  t,
  type Language,
} from "../utils/i18n";
import {
  undo,
  redo,
  history,
  unsavedChange,
} from "../utils/manager/HistoryManager";
import {
  exportCurrentProject,
  projectExplorerOpen,
  saveCurrentProject,
} from "../utils/manager/ProjectManager";
import { vueRef } from "../utils/VueRef";
import { info } from "../utils/manager/WorkspaceManager";
import { normalizeProjectName } from "@/utils/ProjectName";

export default defineComponent({
  components: { Modal },

  data() {
    return {
      settings,
      undo,
      redo,
      history,
      importComponent: false,
      showShortcuts: false,
      projectExplorerOpen: vueRef(projectExplorerOpen),
      unsavedChange: vueRef(unsavedChange),
      language: vueRef(language),
      languages: availableLanguages.value,
      t,

      saveCurrentProject,
      exportCurrentProject,
    };
  },

  computed: {
    projectNameModel: {
      get(): string {
        return this.settings.projectName;
      },
      set(val: string) {
        this.settings.projectName = normalizeProjectName(
          val,
          t("project.unnamed", "Unnamed"),
        );
      },
    },

    pixelWidth(): number {
      const width = Number(this.settings.width) || 0;
      return Math.round(width * 128);
    },

    pixelHeight(): number {
      const height = Number(this.settings.height) || 0;
      return Math.round(height * 128);
    },

    isMac(): boolean {
      if (typeof navigator === "undefined") return false;
      return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    },

    modKeyLabel(): string {
      return this.isMac ? "CMD" : "CTRL";
    },

    altKeyLabel(): string {
      return this.isMac ? "OPT" : "ALT";
    },

    deleteKeyLabel(): string {
      return this.isMac ? "BACKSPACE" : "DELETE";
    },
  },

  methods: {
    openShortcuts() {
      this.showShortcuts = true;
    },

    exitToExplorer() {
      if (this.unsavedChange) {
        info(
          t(
            "header.unsaved",
            "Unsaved changes! Save all your changes before you exit.",
          ),
          false,
          {
            label: t("header.discard", "Discard changes and exit"),
            callback: () => {
              this.projectExplorerOpen = true;
            },
          },
        );
      } else {
        this.projectExplorerOpen = true;
      }
    },

    onLanguageChange(event: Event) {
      const target = event.target as HTMLSelectElement;
      setLanguage(target.value as Language);
    },
  },
});
</script>

<style lang="scss" scoped>
.shortcuts {
  line-height: 2;

  span {
    font-size: 14px;
    background-color: $light4;
    padding: 2px 4px 0px;
    border-bottom: $light3 3px solid;
  }
}

.lang-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 10px;
  border: 1px solid rgba(138, 148, 163, 0.2);
  background-color: rgba(255, 255, 255, 0.04);

  .label {
    text-transform: none;
    font-size: 12px;
    color: $light3;
  }

  .material-icons {
    font-size: 18px;
    color: $light3;
  }

  .langSelect {
    position: relative;
    display: flex;
    align-items: center;

    select {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background: transparent;
      color: $light;
      border: none;
      padding: 4px 20px 4px 6px;
      font-size: 14px;

      &:focus {
        outline: none;
      }
    }

    .caret {
      position: absolute;
      right: 4px;
      font-size: 18px;
      color: $light4;
      pointer-events: none;
    }
  }
}

.sizeResolution {
  color: $light2;
  opacity: 0.85;
  margin-left: 6px;
  font-size: 0.8em;
  text-transform: none;
  padding: 2px 6px;
  border-radius: 8px;
  border: 1px solid rgba(138, 148, 163, 0.25);
  background-color: rgba(255, 255, 255, 0.04);
}
</style>

<template>
  <div id="app">
    <template v-if="!projectExplorerOpen">
      <app-header />
      <div
        class="row mainSpace"
        @click.capture="updateHistory"
        @mousedown.capture="blurActiveElement"
      >
        <component-tree />
        <div class="canvasContainer" @click.self="selection = null">
          <my-canvas></my-canvas>
          <toolbar />
        </div>
        <side-bar />
      </div>
    </template>

    <project-explorer v-else></project-explorer>

    <loading-screen></loading-screen>

    <a id="downloadAnchor" style="display: none"></a>
    <div ref="imageContainer" style="display: none">
      <img
        :src="baseUrl + 'images/error.svg'"
        crossorigin="anonymous"
        id="broken_TAKEN_ID"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import LoadingScreen from "./components/LoadingScreen.vue";
import SideBar from "./components/SideBar.vue";
import ComponentTree from "./components/ComponentTree.vue";
import Header from "./components/Header.vue";
import MyCanvas from "./components/Canvas.vue";
import { setupImageManager } from "./utils/manager/ImageManager";
import {
  initializeShortcutHandler,
  shutdownShortcutHandler,
} from "./utils/handler/ShortcutHandler";
import {
  loadProjects,
  projectExplorerOpen,
} from "./utils/manager/ProjectManager";
import Toolbar from "./components/Toolbar.vue";
import { loading, selection } from "./utils/manager/WorkspaceManager";
import { vueRef } from "./utils/VueRef";
import ProjectExplorer from "./components/ProjectExplorer.vue";
import { unsavedChange, updateHistory } from "./utils/manager/HistoryManager";
import { t } from "./utils/i18n";

const baseUrl = import.meta.env.BASE_URL;

export default defineComponent({
  name: "App",
  components: {
    MyCanvas,
    ComponentTree,
    SideBar,
    LoadingScreen,
    Toolbar,
    ProjectExplorer,
    AppHeader: Header,
  },

  data() {
    return {
      baseUrl,
      projectExplorerOpen: vueRef(projectExplorerOpen),
      updateHistory,
      selection: vueRef(selection),
      beforeUnloadHandler: null as
        | ((e: BeforeUnloadEvent) => string | undefined)
        | null,
    };
  },

  async mounted() {
    setupImageManager(this.$refs.imageContainer as HTMLElement);
    initializeShortcutHandler();
    loading(true);
    await loadProjects();
    loading(false);

    this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (!unsavedChange.value || projectExplorerOpen.value) {
        return undefined;
      }

      const confirmationMessage = t(
        "app.unsavedLeave",
        "It looks like you have been editing something. If you leave before saving, your changes will be lost.",
      );

      (e || window.event).returnValue = confirmationMessage; //Gecko + IE
      return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
    };

    window.addEventListener("beforeunload", this.beforeUnloadHandler);
  },

  unmounted() {
    shutdownShortcutHandler();
    if (this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
  },

  methods: {
    blurActiveElement(ev: MouseEvent) {
      const target = ev.target as HTMLElement | null;
      if (
        target &&
        target.closest("input, textarea, select, [contenteditable='true']")
      )
        return;

      const active = document.activeElement as HTMLElement | null;
      if (!active) return;

      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        active.isContentEditable
      ) {
        active.blur();
      }
    },
  },
});
</script>

<style lang="scss">
@use "@/scss/app.scss";
</style>

<template>
  <div id="app">
    <template v-if="!projectExplorerOpen">
      <app-header />
      <div
        class="row mainSpace"
        @click.capture="scheduleHistoryUpdate"
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

    <!-- Mobile Warning Modal -->
    <div v-if="showMobileWarning" class="mobile-warning-overlay">
      <div class="mobile-warning-modal">
        <h3>
          {{ t("app.mobileWarning.title", "Unsupported device") }}
        </h3>
        <p>
          {{ t("app.mobileWarning.bodyLine1", "It looks like you're using a mobile device.") }}
          <br />
          {{ t("app.mobileWarning.bodyLine2", "The editor is not optimized for touch screens and small resolutions.") }}
        </p>
        <p class="warning-text">
          {{ t("app.mobileWarning.note", "You can continue, but we can’t guarantee correct behavior.") }}
        </p>
        <button class="proceed-btn" @click="dismissMobileWarning">
          {{ t("app.mobileWarning.cta", "Continue at your own risk") }}
        </button>
      </div>
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
import {
  unsavedChange,
  scheduleHistoryUpdate,
} from "./utils/manager/HistoryManager";
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
      scheduleHistoryUpdate,
      selection: vueRef(selection),
      beforeUnloadHandler: null as
        | ((e: BeforeUnloadEvent) => string | undefined)
        | null,
      showMobileWarning: false,
      t,
    };
  },

  async mounted() {
    this.checkMobile();
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
    checkMobile() {
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ) || window.innerWidth <= 800;

      const dismissed = sessionStorage.getItem("mobileWarningDismissed");

      if (isMobile && !dismissed) {
        this.showMobileWarning = true;
      }
    },
    dismissMobileWarning() {
      this.showMobileWarning = false;
      sessionStorage.setItem("mobileWarningDismissed", "true");
    },
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

.mobile-warning-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.mobile-warning-modal {
  background: #2c3e50;
  color: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);

  h3 {
    margin-top: 0;
    color: #e74c3c;
    margin-bottom: 1rem;
  }

  p {
    line-height: 1.5;
    margin-bottom: 1rem;
    color: #ecf0f1;
  }

  .warning-text {
    font-weight: bold;
    color: #f39c12;
  }

  .proceed-btn {
    background: #e74c3c;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.2s;
    margin-top: 1rem;

    &:hover {
      background: #c0392b;
    }
  }
}
</style>

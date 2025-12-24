<template>
  <div id="compTree">
    <component-list
      class="actualTree"
      root
      :components="componentTree"
      :modelValue="selectedComponent"
      @update:modelValue="(val) => updateSelection(val)"
      @copy="copiedComponent = $event"
      @deleted="checkDelete"
      @add-child="addChildToTreeElem"
    ></component-list>

    <div
      class="btn addComponentBtn"
      ref="addComponentBtn"
      @click.stop="toggleCompAddMenu"
    >
      <span class="material-icons">add</span>
      <span class="text">{{ t("componentTree.add", "Add component") }}</span>

      <div class="absoluteMenu compAddMenu" ref="compAddMenu" @click.stop>
        <template v-if="copiedComponent">
          <div class="entry" @click.stop="pasteComponentAndClose()">
            <span class="material-icons">content_paste</span>
            {{ t("sidebar.paste", "Paste") }}
          </div>
          <div class="divider"></div>
        </template>
        <div v-for="(key, index) in componentNames" :key="index">
          <div class="divider" v-if="index != 0"></div>
          <div class="entry" @click.stop="addNewComponent(key)">
            <span class="material-icons">{{ componentInfo[key].icon }}</span>
            {{ t(`component.${key}`, key) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Component } from "@/utils/components/Component";
import ComponentList from "@/components/ComponentList.vue";

import { registerComponent } from "@/utils/manager/ComponentManager";
import {
  componentTree,
  copiedComponent,
  pasteComponent,
  selection,
  updateSelection,
} from "../utils/manager/WorkspaceManager";
import { componentInfo, componentNames } from "../utils/ComponentMeta";
import { vueRef } from "../utils/VueRef";
import { t } from "@/utils/i18n";

export default defineComponent({
  components: { ComponentList },

  data() {
    return {
      componentInfo,
      componentNames,
      componentTree: vueRef(componentTree),
      selection: vueRef(selection),
      copiedComponent: vueRef(copiedComponent),
      updateSelection,
      pasteComponent,
      addComponentAnchor: null as null | Component[],
      isCompAddMenuOpen: false,
      t,
    };
  },

  mounted() {
    document.addEventListener("click", this.checkClose, { capture: true });
  },

  unmounted() {
    document.removeEventListener("click", this.checkClose, { capture: true });
  },

  computed: {
    selectedComponent(): Component | null {
      return this.selection?.component || null;
    },
  },

  methods: {
    checkDelete(component: Component) {
      if (this.selection?.component?.id == component.id) {
        this.updateSelection({ value: null });
      }
    },

    checkClose(ev: MouseEvent) {
      const menuComp = this.$refs.compAddMenu as HTMLElement | undefined;
      const trigger = this.$refs.addComponentBtn as HTMLElement | undefined;
      if (!menuComp) return;
      const target = ev.target as Node;

      if (menuComp.contains(target)) return;
      if (trigger?.contains(target)) return;

      this.closeCompAddMenu();
    },

    addChildToTreeElem(data: { event: MouseEvent; anchor: Component[] }) {
      this.openCompAddMenu(data.event, data.anchor);
    },

    addNewComponent(key: string) {
      const nComp = componentInfo[key].generator();
      registerComponent(nComp);

      this.addComponentAnchor!.splice(0, 0, nComp);
      this.updateSelection({ value: nComp });
      this.closeCompAddMenu();
    },

    pasteComponentAndClose() {
      if (this.addComponentAnchor) {
        this.pasteComponent(this.addComponentAnchor);
      } else {
        this.pasteComponent();
      }
      this.closeCompAddMenu();
    },

    toggleCompAddMenu(ev: MouseEvent) {
      if (this.isCompAddMenuOpen) {
        this.closeCompAddMenu();
        return;
      }

      this.openCompAddMenu(ev, undefined, true);
    },

    closeCompAddMenu() {
      const menu = this.$refs.compAddMenu as HTMLElement | undefined;
      if (!menu) return;
      menu.style.display = "none";
      menu.style.opacity = "0";
      menu.style.pointerEvents = "none";
      menu.style.visibility = "hidden";
      this.isCompAddMenuOpen = false;
      this.addComponentAnchor = null;
    },

    openCompAddMenu(
      ev: MouseEvent,
      anchor = undefined as undefined | Component[],
      anchorToButton = false,
    ) {
      const menu = this.$refs.compAddMenu as HTMLElement;
      this.addComponentAnchor = anchor || this.componentTree;

      menu.style.display = "block";
      menu.style.opacity = "0";
      menu.style.visibility = "hidden";
      menu.style.pointerEvents = "none";

      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;
      const edgePadding = 8;

      let x = ev.clientX;
      let y = ev.clientY;

      if (anchorToButton) {
        const trigger = this.$refs.addComponentBtn as HTMLElement | undefined;
        if (trigger) {
          const rect = trigger.getBoundingClientRect();
          x = rect.left;
          y = rect.bottom + edgePadding;

          if (y + menuHeight > window.innerHeight) {
            y = rect.top - menuHeight - edgePadding;
          }
        }
      } else if (y + menuHeight > window.innerHeight) {
        y = ev.clientY - menuHeight - edgePadding;
      }

      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - edgePadding;
      }

      if (x < edgePadding) x = edgePadding;

      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - edgePadding;
      }

      if (y < edgePadding) y = edgePadding;

      menu.style.top = `${y}px`;
      menu.style.left = `${x}px`;
      menu.style.visibility = "visible";

      requestAnimationFrame(() => {
        menu.style.opacity = "1";
        menu.style.pointerEvents = "auto";
      });

      this.isCompAddMenuOpen = true;
    },
  },
});
</script>

<style lang="scss" scoped></style>

<template>
  <div id="settings">
    <div id="generalSettings" v-if="selection">
      <div class="settings-box gen-box">
        <h1>
          <span
            class="material-icons"
            style="cursor: pointer; user-select: none"
            @click.prevent="devMode = !devMode"
            >{{ devMode ? "code" : "tune" }}</span
          >
          {{ t("sidebar.general", "General settings") }}
        </h1>
        <div class="settings-row">
          <span class="label">{{ t("sidebar.name", "Name") }}</span>
          <input type="text" v-model="selection.component.name" />
        </div>
        <div class="settings-row id-box">
          <span class="label">{{ t("sidebar.id", "ID") }}</span>
          <input
            type="text"
            :value="selection.component.id"
            @input="
              !devMode
                ? ($refs.idInput.value = selection.component.id)
                : (selection.component.id = $refs.idInput.value)
            "
            ref="idInput"
          />
          <span class="material-icons" @click="copyID()" ref="copyIcon"
            >content_copy</span
          >
        </div>
        <div class="settings-row" v-if="selection.component.hideable">
          <span class="label">{{ t("sidebar.visibility", "Visibility") }}</span>
          <input
            type="checkbox"
            :checked="invisibleIDs.indexOf(selection.component.id) == -1"
            @change="toggleVis(selection.component.id)"
          />
        </div>
        <div class="settings-row">
          <span class="label">{{ t("sidebar.lock", "Lock") }}</span>
          <input type="checkbox" v-model="selection.component.locked" />
        </div>
        <div class="alignBlock" v-if="canAlign">
          <div class="settings-row alignRow">
            <span class="label">{{
              t("sidebar.align.scope", "Align to")
            }}</span>
            <div class="alignScope">
              <div
                class="alignScopeBtn"
                :class="{ active: alignScope == 'canvas' }"
                @click="setAlignScope('canvas')"
              >
                {{ t("sidebar.align.canvas", "Canvas") }}
              </div>
              <div
                class="alignScopeBtn"
                :class="{
                  active: alignScope == 'parent',
                  disabled: !hasParent,
                }"
                @click="setAlignScope('parent')"
              >
                {{ t("sidebar.align.parent", "Parent") }}
              </div>
            </div>
          </div>
          <div class="settings-row alignRow">
            <span class="label">{{
              t("sidebar.align.horizontal", "Horizontal")
            }}</span>
            <div class="alignButtons">
              <span
                class="material-icons"
                @click="alignSelected('x', 'start')"
                title="Align left"
                >align_horizontal_left</span
              >
              <span
                class="material-icons"
                @click="alignSelected('x', 'center')"
                title="Align center"
                >align_horizontal_center</span
              >
              <span
                class="material-icons"
                @click="alignSelected('x', 'end')"
                title="Align right"
                >align_horizontal_right</span
              >
            </div>
          </div>
          <div class="settings-row alignRow">
            <span class="label">{{
              t("sidebar.align.vertical", "Vertical")
            }}</span>
            <div class="alignButtons">
              <span
                class="material-icons"
                @click="alignSelected('y', 'start')"
                title="Align top"
                >align_vertical_top</span
              >
              <span
                class="material-icons"
                @click="alignSelected('y', 'center')"
                title="Align middle"
                >align_vertical_center</span
              >
              <span
                class="material-icons"
                @click="alignSelected('y', 'end')"
                title="Align bottom"
                >align_vertical_bottom</span
              >
            </div>
          </div>
        </div>
      </div>
      <template v-if="selection.component.actionable">
        <div class="divider"></div>
        <div class="settings-box clickActions">
          <h1>
            <span class="material-icons">touch_app</span>
            {{ t("sidebar.clickAction", "Click Action") }}
          </h1>
          <component-list
            root
            :components="selection.component.clickAction"
            :modelValue="selection.action"
            @update:modelValue="(val) => (selection.action = val.value)"
            @deleted="checkDelete"
            @copy="(val) => (copiedAction = val)"
            @add-child="addActionToTree"
          ></component-list>
          <div class="settings-row">
            <div
              class="btn addAction"
              ref="addActionBtn"
              @click.stop="toggleActionAddMenu"
            >
              <span class="material-icons">add</span>
              <span class="text">{{
                t("sidebar.addAction", "Add action")
              }}</span>

              <div
                class="absoluteMenu actionAddMenu"
                ref="actionAddMenu"
                @mousedown.stop
                @click.stop
              >
                <template v-if="copiedAction">
                  <div class="entry" @click.stop="pasteAction()">
                    <span class="material-icons">content_paste</span>
                    {{ t("sidebar.paste", "Paste") }}
                  </div>
                  <div class="divider"></div>
                </template>
                <div v-for="(key, index) in actionIDs" :key="index">
                  <div class="divider" v-if="index != 0"></div>
                  <div class="entry" @click.stop="addNewAction(key)">
                    <span class="material-icons">{{ actions[key].icon }}</span>
                    {{ t(`action.${key}`, key) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selection && selection.action" id="actionEditor">
            <h2>
              <span class="material-icons">edit</span>
              {{ t("sidebar.edit", "Edit") }}
              {{ t(`action.${selection.action.id}`, selection.action.id) }}
            </h2>
            <component
              v-bind:is="actions[selection.action.id].component"
              :action="
                selection.action.isCheck()
                  ? selection.action.check
                  : selection.action
              "
            ></component>
          </div>
        </div>
      </template>
      <div class="divider"></div>
      <div class="settings-box">
        <h1>
          <span class="material-icons">{{ selection.component.icon }}</span>
          {{
            t(
              `component.${selection.component.displayName}`,
              selection.component.displayName,
            )
          }}
        </h1>
        <div class="settings-row" v-if="fillCanvasTarget">
          <div class="btn fillCanvas" @click="fillCanvas">
            <span class="material-icons">wallpaper</span>
            <span class="text">{{ t("image.fillCanvas", "Fill canvas") }}</span>
          </div>
        </div>
        <component
          v-bind:is="selection.component.vueComponent"
          :component="selection.component"
          :maxWidth="settings.width * 128"
          :maxHeight="settings.height * 128"
        ></component>
      </div>
    </div>
    <div v-else class="settings-box">
      <h1>
        <b class="label">{{
          t("sidebar.noneSelected", "no component selected")
        }}</b>
      </h1>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  actions,
  actionIDs,
  actionFromJson,
} from "@/utils/manager/ActionManager";
import ComponentList from "@/components/ComponentList.vue";

import {
  getParentComponent,
  isComponentLocked,
  toggleVis,
  invisibleIDs,
} from "@/utils/manager/ComponentManager";
import type { Component } from "@/utils/components/Component";
import { Action } from "../utils/actions/Action";
import { settings } from "../utils/manager/SettingsManager";
import { devMode, selection } from "../utils/manager/WorkspaceManager";
import { vueRef } from "../utils/VueRef";
import { t } from "@/utils/i18n";
import { BoundingBox } from "@/utils/BoundingBox";
import { updateHistory } from "@/utils/manager/HistoryManager";

type ImageLikeComponent = Component & { keepImageRatio: boolean };

export default defineComponent({
  components: { ComponentList },

  data() {
    return {
      settings,
      actionTarget: null as null | Action[],
      copiedAction: null as null | string,
      actions,
      actionIDs,
      toggleVis,
      invisibleIDs: vueRef(invisibleIDs),
      selection: vueRef(selection),
      devMode: vueRef(devMode),
      isActionMenuOpen: false,
      alignScope: "canvas" as "canvas" | "parent",
      t,
    };
  },

  computed: {
    fillCanvasTarget(): Component | null {
      if (
        !this.selection?.component ||
        isComponentLocked(this.selection.component)
      )
        return null;
      let current: Component | undefined = this.selection.component;
      while (current) {
        if (["Image", "GIF", "Remote Image"].includes(current.displayName)) {
          return current;
        }
        current = getParentComponent(current);
      }

      return null;
    },

    parentComponent(): Component | null {
      if (!this.selection?.component) return null;
      return getParentComponent(this.selection.component) || null;
    },

    hasParent(): boolean {
      return !!this.parentComponent;
    },

    canAlign(): boolean {
      if (
        !this.selection?.component ||
        isComponentLocked(this.selection.component)
      )
        return false;
      const box = this.selection.component.getBoundingBox();
      return box !== BoundingBox.EMPTY;
    },
  },

  watch: {
    hasParent(next: boolean) {
      if (!next && this.alignScope === "parent") {
        this.alignScope = "canvas";
      }
    },
  },

  mounted() {
    document.addEventListener("click", this.checkClose, { capture: true });
  },

  unmounted() {
    document.removeEventListener("click", this.checkClose, { capture: true });
  },

  methods: {
    fillCanvas() {
      if (
        this.selection?.component &&
        isComponentLocked(this.selection.component)
      )
        return;
      const target = this.fillCanvasTarget as ImageLikeComponent | null;
      if (!target) return;

      const maxWidth = this.settings.width * 128;
      const maxHeight = this.settings.height * 128;

      target.keepImageRatio = false;
      target.modify(new BoundingBox(0, 0, maxWidth, maxHeight));
    },

    setAlignScope(scope: "canvas" | "parent") {
      if (scope === "parent" && !this.hasParent) return;
      this.alignScope = scope;
    },

    getAlignmentBounds(): BoundingBox {
      const canvasBounds = new BoundingBox(
        0,
        0,
        this.settings.width * 128,
        this.settings.height * 128,
      );

      if (this.alignScope === "parent") {
        const parentBox = this.parentComponent?.getBoundingBox();
        if (parentBox && parentBox !== BoundingBox.EMPTY) return parentBox;
      }

      return canvasBounds;
    },

    alignSelected(axis: "x" | "y", mode: "start" | "center" | "end") {
      if (!this.selection?.component) return;
      if (isComponentLocked(this.selection.component)) return;

      const box = this.selection.component.getBoundingBox();
      if (box === BoundingBox.EMPTY) return;

      const bounds = this.getAlignmentBounds();

      let x = box.x;
      let y = box.y;

      if (axis === "x") {
        if (mode === "start") x = bounds.x;
        else if (mode === "center")
          x = bounds.x + (bounds.width - box.width) / 2;
        else x = bounds.x + bounds.width - box.width;
      } else {
        if (mode === "start") y = bounds.y;
        else if (mode === "center")
          y = bounds.y + (bounds.height - box.height) / 2;
        else y = bounds.y + bounds.height - box.height;
      }

      this.selection.component.modify(
        new BoundingBox(x, y, box.width, box.height),
      );
      updateHistory();
    },

    checkDelete(action: Action) {
      if (action == this.selection?.action) {
        this.selection.action = null;
      }
    },

    addActionToTree(data: { event: MouseEvent; anchor: Action[] }) {
      this.showActionAddMenu(data.event, data.anchor);
    },

    addNewAction(key: string) {
      if (this.selection && this.actionTarget) {
        const nAction = actions[key].generator(this.selection.component);
        this.actionTarget.push(nAction);
        this.selection.action = nAction;
      }
      this.closeActionAddMenu();
    },

    pasteAction() {
      if (this.selection && this.copiedAction && this.actionTarget) {
        const nAction = actionFromJson(JSON.parse(this.copiedAction));
        this.actionTarget.push(nAction);
        this.selection.action = nAction;
      }
      this.closeActionAddMenu();
    },

    toggleActionAddMenu(ev: MouseEvent) {
      if (this.isActionMenuOpen) {
        this.closeActionAddMenu();
        return;
      }

      this.showActionAddMenu(ev, undefined, true);
    },

    closeActionAddMenu() {
      const menu = this.$refs.actionAddMenu as HTMLElement | undefined;
      if (!menu) return;
      menu.style.display = "none";
      menu.style.opacity = "0";
      menu.style.pointerEvents = "none";
      menu.style.visibility = "hidden";
      this.isActionMenuOpen = false;
      this.actionTarget = null;
    },

    showActionAddMenu(
      ev: MouseEvent,
      target?: Action[],
      anchorToButton = false,
    ) {
      this.actionTarget =
        target ||
        (this.selection ? this.selection.component.clickAction : null);

      const menu = this.$refs.actionAddMenu as HTMLElement;
      menu.style.display = "block";
      menu.style.opacity = "0";
      menu.style.visibility = "hidden";
      menu.style.pointerEvents = "none";

      const edgePadding = 8;
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;

      let x = ev.clientX;
      let y = ev.clientY + edgePadding;

      if (anchorToButton) {
        const trigger = this.$refs.addActionBtn as HTMLElement | undefined;
        if (trigger) {
          const rect = trigger.getBoundingClientRect();
          x = rect.left;
          y = rect.bottom + edgePadding;

          if (y + menuHeight > window.innerHeight) {
            y = rect.top - menuHeight - edgePadding;
          }
        }
      } else {
        const anchorElem = ev.currentTarget as HTMLElement | null;
        if (anchorElem && anchorElem.getBoundingClientRect) {
          const rect = anchorElem.getBoundingClientRect();
          x = rect.right + edgePadding;
          y = rect.top;

          if (x + menuWidth > window.innerWidth) {
            x = rect.left - menuWidth - edgePadding;
          }
        }
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

      this.isActionMenuOpen = true;
    },

    checkClose(ev: MouseEvent) {
      const menuAction = this.$refs.actionAddMenu as HTMLElement | undefined;
      const trigger = this.$refs.addActionBtn as HTMLElement | undefined;
      if (!menuAction) return;
      const target = ev.target as Node;

      if (menuAction.contains(target)) return;
      if (trigger?.contains(target)) return;

      this.closeActionAddMenu();
    },

    copyID() {
      const input = this.$refs.idInput as HTMLInputElement;
      const icon = this.$refs.copyIcon as HTMLElement;

      input.select();
      input.setSelectionRange(0, 99999);
      document.execCommand("copy");

      icon.innerText = "assignment_turned_in";

      setTimeout(() => (icon.innerText = "content_copy"), 1000);
    },
  },
});
</script>

<style lang="scss" scoped></style>

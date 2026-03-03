import { Component } from "../components/Component";
import {
  getParentComponent,
  isComponentLocked,
} from "../manager/ComponentManager";
import { redo, undo } from "../manager/HistoryManager";
import {
  projectExplorerOpen,
  saveCurrentProject,
} from "../manager/ProjectManager";
import { settings } from "../manager/SettingsManager";
import {
  componentTree,
  copiedComponent,
  pasteComponent,
  selection,
  updateSelection,
} from "../manager/WorkspaceManager";

function getParentList(component: Component) {
  if (componentTree.value.some((c) => c.id == component.id)) {
    return componentTree.value;
  } else {
    return getParentComponent(component)?.getItems();
  }
}

function keyZoom(ev: WheelEvent) {
  if (ev.ctrlKey || ev.metaKey) {
    settings.zoom += -(ev.deltaY * settings.zoom) / 1000;
    settings.zoom = Math.round(settings.zoom * 100) / 100;
    ev.preventDefault();
  }
}

function isEditableTarget(target: HTMLElement | null) {
  return !!(
    target &&
    (target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable)
  );
}

function handleCopyOrCutShortcut(modKey: boolean, key: string) {
  if (!modKey || (key != "c" && key != "x")) return;
  if (selection.value?.component) {
    copiedComponent.value = selection.value.component.toJson();
  }
}

function getPasteTarget(): Component[] {
  const target: Component[] = componentTree.value;
  if (!selection.value?.component) return target;

  if (selection.value.component.isGroup()) {
    return selection.value.component.getItems();
  }

  return getParentComponent(selection.value.component)?.getItems() || target;
}

function handlePasteShortcut(modKey: boolean, key: string) {
  if (modKey && key == "v") {
    pasteComponent(getPasteTarget());
  }
}

function handleSnapToggleShortcut(
  ev: KeyboardEvent,
  modKey: boolean,
  key: string,
) {
  if (modKey && ev.shiftKey && key == "s") {
    settings.snapEnabled = !settings.snapEnabled;
    ev.preventDefault();
    return true;
  }
  return false;
}

function handleSaveShortcut(ev: KeyboardEvent, modKey: boolean, key: string) {
  if (modKey && key == "s") {
    saveCurrentProject();
    ev.preventDefault();
    return true;
  }
  return false;
}

function handleHistoryShortcut(ev: KeyboardEvent, modKey: boolean, key: string) {
  if (modKey && key == "z") {
    if (ev.shiftKey) redo();
    else undo();
    return true;
  }

  if (modKey && key == "y") {
    redo();
    return true;
  }

  return false;
}

function deleteSelectedComponent() {
  if (!selection.value?.component) return;
  const parent = getParentList(selection.value.component);
  if (!parent) return;

  const index = parent.findIndex((c) => c.id == selection.value?.component.id);
  parent.splice(index, 1);
  updateSelection({ value: null });
}

function handleDeleteShortcut(ev: KeyboardEvent, modKey: boolean, key: string) {
  if (ev.code == "Delete" || ev.code == "Backspace" || (modKey && key == "x")) {
    deleteSelectedComponent();
  }
}

function getArrowModifier(code: string, shiftPressed: boolean) {
  const modifier = shiftPressed ? 10 : 1;
  if (code == "ArrowUp") return { x: 0, y: -modifier };
  if (code == "ArrowDown") return { x: 0, y: modifier };
  if (code == "ArrowRight") return { x: modifier, y: 0 };
  if (code == "ArrowLeft") return { x: -modifier, y: 0 };
  return null;
}

function handleArrowKeyShortcut(ev: KeyboardEvent) {
  const selected = selection.value?.component;
  if (!selected) return;
  if (isComponentLocked(selected)) return;

  const movement = getArrowModifier(ev.code, ev.shiftKey);
  if (!movement) return;

  const bBox = selected.getBoundingBox();
  bBox.x += movement.x;
  bBox.y += movement.y;
  selected.modify(bBox);
}

function keyPress(ev: KeyboardEvent) {
  const target = ev.target as HTMLElement | null;
  const modKey = ev.ctrlKey || ev.metaKey;
  const key = ev.key.toLowerCase();
  if (isEditableTarget(target) && !(modKey && key == "s")) return;

  if (projectExplorerOpen.value) return;

  handleCopyOrCutShortcut(modKey, key);
  handlePasteShortcut(modKey, key);

  if (handleSnapToggleShortcut(ev, modKey, key)) return;
  if (handleSaveShortcut(ev, modKey, key)) return;
  if (handleHistoryShortcut(ev, modKey, key)) return;

  handleDeleteShortcut(ev, modKey, key);
  handleArrowKeyShortcut(ev);
}

export function initializeShortcutHandler() {
  document.addEventListener("keydown", keyPress, { capture: true });
  document.addEventListener("wheel", keyZoom, {
    capture: true,
    passive: false,
  });
}

export function shutdownShortcutHandler() {
  document.removeEventListener("keydown", keyPress, { capture: true });
  document.removeEventListener("wheel", keyZoom, {
    capture: true,
  });
}

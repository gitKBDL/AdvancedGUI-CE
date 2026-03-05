import { Action } from "../actions/Action";
import { Component } from "../components/Component";
import {
  components as registeredComponents,
  invisibleIDs,
  setInvisibleIDs,
} from "./ComponentManager";
import { componentTree } from "./WorkspaceManager";

interface UnknownRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function remapLinkedId(value: string, oldId: string, newId: string) {
  if (value === oldId) return newId;
  if (value.startsWith(`${oldId}#`)) {
    return `${newId}${value.slice(oldId.length)}`;
  }
  if (value.endsWith(`#${oldId}`)) {
    return `${value.slice(0, value.length - oldId.length)}${newId}`;
  }
  return value;
}

function ensureUniqueId(baseId: string, component: Component) {
  let candidate = baseId;
  let counter = 2;

  while (
    registeredComponents[candidate] &&
    registeredComponents[candidate] !== component
  ) {
    candidate = `${baseId}_${counter}`;
    counter += 1;
  }

  return candidate;
}

function remapCheckTarget(check: unknown, oldId: string, newId: string) {
  if (!isRecord(check)) return;
  if (typeof check.targetId !== "string") return;
  check.targetId = remapLinkedId(check.targetId, oldId, newId);
}

function remapActionTargets(action: Action, oldId: string, newId: string) {
  const mutableAction = action as unknown as UnknownRecord;

  if (typeof mutableAction.targetId === "string") {
    mutableAction.targetId = remapLinkedId(mutableAction.targetId, oldId, newId);
  }

  if (typeof mutableAction.activate === "string") {
    mutableAction.activate = remapLinkedId(mutableAction.activate, oldId, newId);
  }

  remapCheckTarget(mutableAction.check, oldId, newId);

  const nestedActions = mutableAction.actions;
  if (Array.isArray(nestedActions)) {
    nestedActions.forEach((nested) => {
      if (nested instanceof Action) {
        remapActionTargets(nested, oldId, newId);
      }
    });
  }

  const nestedChildren = mutableAction.children;
  if (Array.isArray(nestedChildren)) {
    nestedChildren.forEach((nested) => {
      if (nested instanceof Action) {
        remapActionTargets(nested, oldId, newId);
      }
    });
  }
}

function remapComponentReferences(component: Component, oldId: string, newId: string) {
  component.clickAction.forEach((action) => remapActionTargets(action, oldId, newId));

  const mutableComponent = component as unknown as UnknownRecord;
  if (typeof mutableComponent.targetId === "string") {
    mutableComponent.targetId = remapLinkedId(
      mutableComponent.targetId,
      oldId,
      newId,
    );
  }

  remapCheckTarget(mutableComponent.check, oldId, newId);

  if (component.isGroup()) {
    component.getItems().forEach((child) =>
      remapComponentReferences(child, oldId, newId),
    );
  }
}

function remapInvisibleReferences(oldId: string, newId: string) {
  const seen = new Set<string>();
  const next = [] as string[];

  invisibleIDs.value.forEach((id) => {
    const mapped = remapLinkedId(id, oldId, newId);
    if (seen.has(mapped)) return;
    seen.add(mapped);
    next.push(mapped);
  });

  setInvisibleIDs(next);
}

function collectTreeComponentRefs() {
  const refs = new Set<Component>();

  const walk = (component: Component) => {
    refs.add(component);
    if (!component.isGroup()) return;
    component.getItems().forEach(walk);
  };

  componentTree.value.forEach(walk);
  return refs;
}

function remapRegisteredComponentIds(
  oldId: string,
  newId: string,
  renamedComponent: Component,
) {
  const treeComponentRefs = collectTreeComponentRefs();
  const remapQueue = Object.entries(registeredComponents)
    .filter(
      ([, candidate]) =>
        candidate !== renamedComponent && !treeComponentRefs.has(candidate),
    )
    .map(([currentId, candidate]) => {
      const mappedId = remapLinkedId(currentId, oldId, newId);
      return { currentId, mappedId, candidate };
    })
    .filter(({ currentId, mappedId }) => currentId !== mappedId);

  remapQueue.forEach(({ currentId, mappedId, candidate }) => {
    if (
      registeredComponents[mappedId] &&
      registeredComponents[mappedId] !== candidate
    ) {
      return;
    }

    delete registeredComponents[currentId];
    candidate.setId(mappedId);
    registeredComponents[mappedId] = candidate;
  });
}

export function renameComponentAndReferences(
  component: Component,
  nextIdRaw: string,
) {
  const oldId = component.id;
  const requested = nextIdRaw.trim();
  if (!requested) return oldId;

  const nextId = ensureUniqueId(requested, component);
  if (nextId === oldId) return oldId;

  delete registeredComponents[oldId];
  component.setId(nextId);
  registeredComponents[nextId] = component;

  remapRegisteredComponentIds(oldId, nextId, component);
  remapInvisibleReferences(oldId, nextId);
  componentTree.value.forEach((root) =>
    remapComponentReferences(root, oldId, nextId),
  );

  return nextId;
}

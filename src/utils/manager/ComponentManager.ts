import { Component } from "../components/Component";
import { actionsFromJson } from "./ActionManager";
import { ref } from "vue";
import { ListItemGroup } from "../ListItem";
import { componentInfo } from "../ComponentMeta";

export type TemplateVariable = string;
export type TemplateData = { name: string; value: string | number }[];

export interface JsonObject {
   
  [key: string]: any;
}

export const invisibleIDs = ref([] as string[]);
export const components: {
  [key: string]: Component;
} = {};
const invisibleIDSet = new Set<string>();

type ParentComponent = ListItemGroup<Component> & Component;
const parentComponentCache = new WeakMap<
  Component,
  {
    parent: ParentComponent | null;
    version: number;
  }
>();
let parentComponentCacheVersion = 0;

function randomString(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Untrusted JSON (imported files, clipboard, migrated savepoints) drives these
// registry lookups. componentInfo is a plain object literal, so an unknown or
// prototype-chain key (e.g. "constructor", "toString") would otherwise resolve
// to an inherited member and crash with "fromJson is not a function". Guard with
// an own-property check so unknown types are dropped cleanly instead.
function hasComponentMeta(type: string): boolean {
  return Object.prototype.hasOwnProperty.call(componentInfo, type);
}

function syncInvisibleSet() {
  invisibleIDSet.clear();
  invisibleIDs.value.forEach((id) => invisibleIDSet.add(id));
}

function setCachedParent(component: Component, parent: ParentComponent | null) {
  parentComponentCache.set(component, {
    parent,
    version: parentComponentCacheVersion,
  });
}

function cacheGroupChildren(group: ParentComponent) {
  group.getItems().forEach((child) => setCachedParent(child, group));
}

function findParentComponent(component: Component): ParentComponent | undefined {
  return Object.values(components).find(
    (comp): comp is ParentComponent =>
      comp.isGroup() && comp.getItems().some((child) => child === component),
  );
}

export function generateUniqueID() {
  let id = randomString(8);
  while (components[id]) id = randomString(8);

  return id;
}

export function isInvisible(id: string) {
  return invisibleIDSet.has(id);
}

export function setInvisibleIDs(ids: string[]) {
  invisibleIDs.value = ids;
  syncInvisibleSet();
}

export function addInvisibleID(id: string) {
  if (invisibleIDSet.has(id)) return;
  invisibleIDSet.add(id);
  invisibleIDs.value.push(id);
}

export function addInvisibleIDs(ids: string[]) {
  ids.forEach((id) => addInvisibleID(id));
}

export function removeInvisibleID(id: string) {
  if (!invisibleIDSet.delete(id)) return;
  const index = invisibleIDs.value.indexOf(id);
  if (index !== -1) invisibleIDs.value.splice(index, 1);
}

export function invalidateParentComponentCache() {
  parentComponentCacheVersion += 1;
}

export function toggleVis(id: string) {
  if (!id.includes("#")) {
    Object.keys(components)
      .filter((comp) => comp.startsWith(`${id}#`))
      .forEach(toggleVis);
  }

  if (isInvisible(id)) removeInvisibleID(id);
  else addInvisibleID(id);
}

function _reassignIDs(
  jsonObj: JsonObject,
  idGernerator = generateUniqueID as (oldId: string) => string,
  idMap: { [key: string]: string },
) {
  if (jsonObj.type && hasComponentMeta(jsonObj.type)) {
    idMap[jsonObj.id] = idGernerator(jsonObj.id);

    const childs = componentInfo[jsonObj.type].childComponentProps;
    if (childs) {
      for (const childPorp of childs) {
        if (jsonObj[childPorp]) {
          if (Array.isArray(jsonObj[childPorp])) {
            for (const childPorpElem of jsonObj[childPorp]) {
              _reassignIDs(childPorpElem, idGernerator, idMap);
            }
          } else {
            _reassignIDs(jsonObj[childPorp], idGernerator, idMap);
          }
        }
      }
    }
  }
}

export function traverseComponent(
  component: Component,
  callback: (component: Component) => void,
) {
  callback(component);

  if (component.isGroup()) {
    component
      .getItems()
      .forEach((comp: Component) => traverseComponent(comp, callback));
  }
}

export function getParentComponent(
  component: Component,
): (ListItemGroup<Component> & Component) | undefined {
  const cached = parentComponentCache.get(component);
  if (cached && cached.version === parentComponentCacheVersion) {
    if (!cached.parent) return undefined;
    if (cached.parent.getItems().some((child) => child === component)) {
      return cached.parent;
    }
  }

  const parent = findParentComponent(component);
  setCachedParent(component, parent || null);
  return parent;
}

export function isComponentLocked(component: Component): boolean {
  if (component.locked) return true;

  let current = getParentComponent(component);
  while (current) {
    if (current.locked) return true;
    current = getParentComponent(current);
  }

  return false;
}

export function registerComponent(component: Component) {
  if (component.id == "-") component.setId(generateUniqueID());
  components[component.id] = component;
  parentComponentCache.delete(component);
  if (component.isGroup()) {
    cacheGroupChildren(component as ParentComponent);
  }

  if (
    component.id.includes("#") &&
    isInvisible(component.id.split("#")[0]) &&
    !isInvisible(component.id)
  ) {
    addInvisibleID(component.id);
  }

  return component;
}

export function unregisterComponent(component: Component) {
  delete components[component.id];
  parentComponentCache.delete(component);
  if (component.isGroup()) {
    component.getItems().forEach((child) => parentComponentCache.delete(child));
  }

  if (!component.id.includes("#")) {
    Object.values(components)
      .filter(
        (comp) =>
          comp.id.startsWith(`${component.id}#`) ||
          comp.id.endsWith(`#${component.id}`),
      )
      .forEach(unregisterComponent);
  }
}

export function reassignIDs(
  jsonObj: JsonObject,
  idGernerator = generateUniqueID as (oldId: string) => string,
): JsonObject {
  const idMap: { [key: string]: string } = {};
  _reassignIDs(jsonObj, idGernerator, idMap);

  const oldIds = Object.keys(idMap);
  if (oldIds.length === 0) return JSON.parse(JSON.stringify(jsonObj));

  // Remap every id occurrence in a SINGLE left-to-right pass. The previous
  // approach ran one global replace per id (longest-first), which could
  // re-enter a freshly written new id when an old id happened to be a
  // substring of it (e.g. old "ab" matching inside the new id "abZZZZ22"),
  // corrupting the result. A single alternation regex consumes each match
  // once and never rescans substituted text. Longest-first ordering makes the
  // engine prefer the longest id at any position, since JS alternation picks
  // the first matching branch rather than the longest.
  const pattern = oldIds
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  const json = JSON.stringify(jsonObj).replace(
    new RegExp(pattern, "g"),
    (match) => idMap[match] ?? match,
  );

  return JSON.parse(json);
}

export function componentFromJson(
  jsonObj: JsonObject,
  reassignIDsFirst = false,
): Component | null {
  if (reassignIDsFirst) jsonObj = reassignIDs(jsonObj);

  if (jsonObj.type && hasComponentMeta(jsonObj.type)) {
    const actions = actionsFromJson(jsonObj.action);
    const component = componentInfo[jsonObj.type].fromJson(jsonObj, actions);
    component.locked = !!jsonObj.locked;
    registerComponent(component);
    return component;
  } else {
    return null;
  }
}

syncInvisibleSet();

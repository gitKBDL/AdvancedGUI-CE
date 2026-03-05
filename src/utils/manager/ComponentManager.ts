import { Component } from "../components/Component";
import { actionsFromJson } from "./ActionManager";
import { ref } from "vue";
import { ListItemGroup } from "../ListItem";
import { componentInfo } from "../ComponentMeta";

export type TemplateVariable = string;
export type TemplateData = { name: string; value: string | number }[];

export interface JsonObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  if (jsonObj.type) {
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

  let json = JSON.stringify(jsonObj);
  Object.keys(idMap)
    .sort((left, right) => right.length - left.length)
    .forEach((orgId) => {
      json = json.replace(new RegExp(escapeRegExp(orgId), "g"), idMap[orgId]);
    });

  return JSON.parse(json);
}

export function componentFromJson(
  jsonObj: JsonObject,
  reassignIDsFirst = false,
): Component | null {
  if (reassignIDsFirst) jsonObj = reassignIDs(jsonObj);

  if (jsonObj.type) {
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

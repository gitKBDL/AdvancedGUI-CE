import { BoundingBox } from "../BoundingBox";
import { Point } from "../Point";

import { Component as VueComponent } from "vue";
import { Action } from "../actions/Action";
import { ListItem, ListItemGroup } from "../ListItem";
import {
  componentFromJson,
  JsonObject,
  unregisterComponent,
} from "../manager/ComponentManager";

export type ComponentType =
  | "Rect"
  | "Group"
  | "Hover"
  | "Text"
  | "Image"
  | "View"
  | "List"
  | "Template"
  | "Remote Image"
  | "Text-Input"
  | "Click Animation"
  | "Dummy"
  | "GIF"
  | "Replica"
  | "Check";

export type JsonConverter = (
  jsonObj: JsonObject,
  clickAction: Action[],
) => Component;

export abstract class Component implements ListItem {
  public hideable = true;
  public resizeable = false;
  public actionable = true;
  public locked = false;

  constructor(
    public id: string,
    public name: string,
    public clickAction: Action[],
  ) {}

  protected resizeStartBounds?: BoundingBox;

  abstract draw(context: CanvasRenderingContext2D): void;
  abstract getBoundingBox(): BoundingBox;
  abstract modify(
    newBoundingBox: BoundingBox,
    singleAxisAction?: boolean,
  ): void;
  abstract get vueComponent(): VueComponent;
  abstract get icon(): string;
  abstract get displayName(): ComponentType;
  abstract toDataObj(forUsage: boolean): JsonObject;

  setId(id: string) {
    this.id = id;
  }

  startResize(bounds: BoundingBox) {
    this.resizeStartBounds = bounds;
  }

  endResize() {
    this.resizeStartBounds = undefined;
  }

  toJson(forUsage?: boolean) {
    const data: JsonObject = {
      id: this.id,
      name: this.name,
      action: this.clickAction.map((action) => action.toJsonObj()),
      ...this.toDataObj(forUsage || false),
    };

    if (!forUsage) data.locked = this.locked;

    return JSON.stringify(data);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  refineSelection(point: Point): Component {
    return this;
  }

  isGroup(): this is ListItemGroup<this> {
    return false;
  }

  contains(componentId: string): boolean {
    if (this.id == componentId) return true;

    if (this.isGroup())
      return this.getItems().some((c) => c.contains(componentId));

    return false;
  }

  duplicate(): ListItem | null {
    const nComp = componentFromJson(JSON.parse(this.toJson()), true);
    if (nComp) {
      return nComp as ListItem;
    }
    return null;
  }

  delete() {
    unregisterComponent(this);
  }
}

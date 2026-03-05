import Editor from "@/components/editors/TemplateEditor.vue";
import { Component, ComponentType } from "./Component";
import { Action } from "../actions/Action";
import {
  JsonObject,
  TemplateData,
  componentFromJson,
  reassignIDs,
} from "../manager/ComponentManager";
import { GroupComponent } from "./GroupComponent";
import { markRaw } from "vue";
import { hexToRgba } from "../ColorUtils";

export function transpileToGroup(
  data: TemplateData,
  position = null as { x: number; y: number } | null,
  id: string,
  components: Component[],
  componentSnapshots = components.map((component) => component.toJson(true)),
): GroupComponent {
  const idGenerator = (compId: string) => `${compId}#${id}`;

  const newComps = componentSnapshots
    .map((sourceJson) => {
      let json = sourceJson;
      for (const entry of data) {
        let value = entry.value;
        if (typeof value == "number") {
          json = json.replaceAll(`"#${entry.name}"`, value.toString());
          json = json.replaceAll(`#${entry.name}`, value.toString());
        } else {
          if (/#[0-9A-F]{6},((1(\.0)?)|0\.[0-9]+|0)/g.test(value.toUpperCase()))
            value = hexToRgba(
              value.split(",")[0],
              Number.parseFloat(value.split(",")[1]),
            );

          if (/#[0-9A-F]{6}/.test(value.toUpperCase()))
            value = hexToRgba(value, 1);

          json = json.replaceAll(`#${entry.name}`, value);
        }
      }
      return json;
    })
    .map(
      (json) => componentFromJson(reassignIDs(JSON.parse(json), idGenerator))!,
    );

  const group = new GroupComponent(id, "-", [], newComps, true);
  if (position) {
    const boundingBox = group.getBoundingBox();

    boundingBox.x = position.x;
    boundingBox.y = position.y;

    group.modify(boundingBox);
  }

  return group;
}

export class Template extends GroupComponent {
  public static inputTransformer = (
    ev: KeyboardEvent,
    val: string | number,
  ) => {
    if (ev.key == "#") {
      const input = ev.target as HTMLInputElement;
      if (input.type != "text") {
        input.type = "text";
        input.value = val.toString();
        ev.preventDefault();
      }
    }
  };

  public static displayName: ComponentType = "Template";
  public static icon = "book";
  public displayName = Template.displayName;
  public icon = Template.icon;
  public vueComponent = markRaw(Editor);
  public actionable = false;
  private transpileCache:
    | {
        key: string;
        group: GroupComponent;
      }
    | null = null;

  constructor(
    public id: string,
    public name: string,
    public clickAction: Action[],
    public components: Component[],
    public expanded: boolean,
    public defaultData: TemplateData,
  ) {
    super(id, name, clickAction, components, expanded);
  }

  transpileToGroup(
    data = this.defaultData,
    position = null as { x: number; y: number } | null,
    id = this.id,
  ): GroupComponent {
    const componentSnapshots = this.components.map((component) =>
      component.toJson(true),
    );
    const cacheKey = JSON.stringify({
      id,
      position,
      data,
      componentSnapshots,
    });

    if (this.transpileCache?.key === cacheKey) {
      return this.transpileCache.group;
    }

    const group = transpileToGroup(
      data,
      position,
      id,
      this.components,
      componentSnapshots,
    );
    this.transpileCache = {
      key: cacheKey,
      group,
    };
    return group;
  }

  draw(context: CanvasRenderingContext2D): void {
    this.transpileToGroup().draw(context);
  }

  toDataObj(forUsage: boolean) {
    if (!forUsage) {
      return {
        defaultData: this.defaultData,
        ...super.toDataObj(),
      };
    } else {
      return this.transpileToGroup().toDataObj(forUsage);
    }
  }

  static fromJson(jsonObj: JsonObject, clickAction: Action[]) {
    const comps: Component[] = GroupComponent.componentsFromJson(
      jsonObj.components,
    );
    return new Template(
      jsonObj.id,
      jsonObj.name,
      clickAction,
      comps,
      jsonObj.expanded,
      jsonObj.defaultData,
    );
  }

  static generator() {
    return new Template("-", Template.displayName, [], [], true, [
      { name: "mainColor", value: "#26e686" },
      { name: "price", value: 12 },
    ]);
  }
}

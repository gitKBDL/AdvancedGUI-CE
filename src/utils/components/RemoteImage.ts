import Editor from "@/components/editors/RemoteImageEditor.vue";
import { Component, ComponentType } from "./Component";
import { Action } from "../actions/Action";
import { JsonObject, isInvisible } from "../manager/ComponentManager";
import { GroupComponent } from "./GroupComponent";
import { BoundingBox } from "../BoundingBox";
import { getRemoteImage, placeRemoteImage } from "../manager/ImageManager";
import { settings } from "../manager/SettingsManager";
import { devMode } from "../manager/WorkspaceManager";
import { markRaw } from "vue";
import { applyAspectRatioResize } from "./aspectRatioResize";

export class RemoteImage extends GroupComponent {
  public static displayName: ComponentType = "Remote Image";
  public static icon = "satellite";
  public displayName = RemoteImage.displayName;
  public icon = RemoteImage.icon;
  public vueComponent = markRaw(Editor);
  public resizeable = true;
  private lastResizeWidth: number;
  private lastResizeHeight: number;

  public itemLimit = 1;
  public itemClasses = ["negAction"];

  constructor(
    public id: string,
    public name: string,
    public clickAction: Action[],
    public components: Component[],
    public expanded: boolean,
    public drawLoading: boolean,
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public imageUrl: string,
    public keepImageRatio: boolean,
    public dithering: boolean,
    public ratio: number,
  ) {
    super(id, name, clickAction, components, expanded);
    this.lastResizeWidth = width;
    this.lastResizeHeight = height;

    if (id != "-") placeRemoteImage(imageUrl, id, this);
  }

  setId(id: string) {
    super.setId(id);
    placeRemoteImage(this.imageUrl, id, this);
  }

  draw(context: CanvasRenderingContext2D): void {
    if (this.drawLoading) {
      if (this.components[0] && !isInvisible(this.components[0].id))
        this.components[0].draw(context);
    } else {
      const img = getRemoteImage(this.id);
      if (img && img.complete) {
        try {
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            context.drawImage(img, this.x, this.y, this.width, this.height);
          } else {
            throw new Error("Remote image failed to load");
          }
        } catch {
          context.drawImage(
            document.getElementById("broken_TAKEN_ID") as HTMLImageElement,
            Math.max(this.x, this.x + (this.width - 20) / 2),
            Math.max(this.y, this.y + (this.height - 20) / 2),
            Math.min(this.width, 20),
            Math.min(this.height, 20),
          );
        }
      }
    }
  }

  getBoundingBox() {
    if (this.drawLoading && this.components[0]) {
      const innerBounds = this.components[0].getBoundingBox();
      const nX = Math.min(this.x, innerBounds.x);
      const nY = Math.min(this.y, innerBounds.y);
      return new BoundingBox(
        nX,
        nY,
        Math.max(this.width + this.x, innerBounds.width + innerBounds.x) - nX,
        Math.max(this.height + this.y, innerBounds.height + innerBounds.y) - nY,
      );
    } else {
      return new BoundingBox(this.x, this.y, this.width, this.height);
    }
  }

  modify(newBoundingBox: BoundingBox): void {
    const resized = applyAspectRatioResize({
      newBoundingBox,
      ratio: this.ratio ?? 0,
      keepRatio: this.keepImageRatio,
      resizeStartBounds: this.resizeStartBounds,
      lastResizeWidth: this.lastResizeWidth,
      lastResizeHeight: this.lastResizeHeight,
      maxWidth: devMode.value ? undefined : settings.width * 128,
      maxHeight: devMode.value ? undefined : settings.height * 128,
    });
    this.x = resized.x;
    this.y = resized.y;
    this.width = resized.width;
    this.height = resized.height;

    this.lastResizeWidth = this.width;
    this.lastResizeHeight = this.height;
  }

  refineSelection(): Component {
    return this.drawLoading && this.components[0] ? this.components[0] : this;
  }

  static fromJson(jsonObj: JsonObject, clickAction: Action[]) {
    const comps: Component[] = GroupComponent.componentsFromJson(
      jsonObj.components,
    );
    return new RemoteImage(
      jsonObj.id,
      jsonObj.name,
      clickAction,
      comps,
      jsonObj.expanded,
      jsonObj.drawLoading,
      jsonObj.x,
      jsonObj.y,
      jsonObj.width,
      jsonObj.height,
      jsonObj.imageUrl,
      jsonObj.keepImageRatio,
      jsonObj.dithering,
      jsonObj.ratio,
    );
  }

  setImageUrl(url: string) {
    this.imageUrl = url;
    placeRemoteImage(url, this.id, this);
  }

  toDataObj(forUsage: boolean) {
    return {
      drawLoading: this.drawLoading,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      imageUrl: this.imageUrl,
      keepImageRatio: this.keepImageRatio,
      dithering: this.dithering,
      ratio: this.ratio,
      ...super.toDataObj(forUsage),
    };
  }

  static generator() {
    return new RemoteImage(
      "-",
      RemoteImage.displayName,
      [],
      [],
      true,
      false,
      20,
      20,
      50,
      50,
      "https://visage.surgeplay.com/head/%UUID_U%",
      true,
      false,
      1,
    );
  }
}

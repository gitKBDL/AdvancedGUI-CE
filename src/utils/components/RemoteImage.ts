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
    this.x = newBoundingBox.x;
    this.y = newBoundingBox.y;

    const ratio = this.ratio ?? 0;
    const canKeepRatio =
      this.keepImageRatio && Number.isFinite(ratio) && ratio > 0;

    if (canKeepRatio) {
      const baseWidth =
        this.resizeStartBounds?.width ?? this.lastResizeWidth ?? this.width;
      const baseHeight =
        this.resizeStartBounds?.height ?? this.lastResizeHeight ?? this.height;
      const widthDelta = Math.abs(newBoundingBox.width - baseWidth);
      const heightDelta = Math.abs(newBoundingBox.height - baseHeight);
      const preferWidth = widthDelta >= heightDelta;

      if (preferWidth) {
        this.width = newBoundingBox.width;
        this.height = this.width / ratio;
      } else {
        this.height = newBoundingBox.height;
        this.width = this.height * ratio;
      }

      if (!devMode.value) {
        const maxWidth = settings.width * 128;
        const maxHeight = settings.height * 128;
        const scale = Math.min(
          1,
          maxWidth / this.width,
          maxHeight / this.height,
        );
        if (scale < 1) {
          this.width *= scale;
          this.height *= scale;
        }

        const bounds = new BoundingBox(this.x, this.y, this.width, this.height);
        bounds.ensureBounds(maxWidth, maxHeight);
        this.x = bounds.x;
        this.y = bounds.y;
        this.width = bounds.width;
        this.height = bounds.height;
      }
    } else {
      this.width = newBoundingBox.width;
      this.height = newBoundingBox.height;
    }

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

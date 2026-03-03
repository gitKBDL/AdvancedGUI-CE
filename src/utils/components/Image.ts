import { BoundingBox } from "../BoundingBox";
import ImageEditor from "@/components/editors/ImageEditor.vue";
import { Rectangular } from "./Rectangular";
import { Action } from "../actions/Action";
import { JsonObject } from "../manager/ComponentManager";
import { images } from "../manager/ImageManager";
import { settings } from "../manager/SettingsManager";
import { devMode } from "../manager/WorkspaceManager";
import { markRaw } from "vue";
import { ComponentType } from "./Component";
import { applyAspectRatioResize } from "./aspectRatioResize";

export class Image extends Rectangular {
  public static displayName: ComponentType = "Image";
  public static icon = "image";
  public displayName = Image.displayName;
  public icon = Image.icon;
  public vueComponent = markRaw(ImageEditor);
  public resizeable = true;
  private lastResizeWidth: number;
  private lastResizeHeight: number;

  constructor(
    public id: string,
    public name: string,
    public clickAction: Action[],
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public image: string,
    public keepImageRatio: boolean,
    public dithering: boolean,
  ) {
    super(id, name, clickAction, x, y, width, height);
    this.lastResizeWidth = width;
    this.lastResizeHeight = height;
  }

  draw(context: CanvasRenderingContext2D): void {
    if (images[this.image])
      context.drawImage(
        images[this.image].data,
        this.x,
        this.y,
        this.width,
        this.height,
      );
    else
      context.drawImage(
        document.getElementById("broken_TAKEN_ID") as HTMLImageElement,
        Math.max(this.x, this.x + (this.width - 20) / 2),
        Math.max(this.y, this.y + (this.height - 20) / 2),
        Math.min(this.width, 20),
        Math.min(this.height, 20),
      );
  }

  modify(newBoundingBox: BoundingBox): void {
    const resized = applyAspectRatioResize({
      newBoundingBox,
      ratio: images[this.image]?.ratio ?? 0,
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

  setImage(nImage: string) {
    if (this.keepImageRatio && images[this.image] && images[nImage]) {
      const oldRatio = images[this.image].ratio;
      const ratio = images[nImage].ratio;

      if (oldRatio > ratio) {
        this.width = this.height * ratio;
      } else {
        this.height = this.width / ratio;
      }
    }
    this.image = nImage;
    this.lastResizeWidth = this.width;
    this.lastResizeHeight = this.height;
  }

  toDataObj() {
    return {
      type: this.displayName,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      image: this.image,
      keepImageRatio: this.keepImageRatio,
      dithering: this.dithering,
    };
  }

  static fromJson(jsonObj: JsonObject, clickAction: Action[]) {
    return new Image(
      jsonObj.id,
      jsonObj.name,
      clickAction,
      jsonObj.x,
      jsonObj.y,
      jsonObj.width,
      jsonObj.height,
      jsonObj.image,
      jsonObj.keepImageRatio,
      jsonObj.dithering,
    );
  }

  static generator() {
    return new Image(
      "-",
      Image.displayName,
      [],
      10,
      10,
      50,
      50,
      "Play",
      true,
      false,
    );
  }
}

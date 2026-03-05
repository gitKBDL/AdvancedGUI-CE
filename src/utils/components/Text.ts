import { BoundingBox } from "../BoundingBox";
import TextEditor from "@/components/editors/TextEditor.vue";
import { Action } from "../actions/Action";
import { JsonObject } from "../manager/ComponentManager";
import { Component, ComponentType } from "./Component";
import { markRaw } from "vue";
import { getRandomColor } from "../ColorUtils";
import { ParsedText } from "../ParsedText";
import { settings } from "../manager/SettingsManager";

export class Text extends Component {
  public static displayName: ComponentType = "Text";
  public static icon = "text_fields";
  public displayName = Text.displayName;
  public icon = Text.icon;
  public vueComponent = markRaw(TextEditor);

  private parsedText: ParsedText | null = null;
  private static measureContext: CanvasRenderingContext2D | null = null;

  constructor(
    public id: string,
    public name: string,
    public clickAction: Action[],
    public x: number,
    public y: number,
    public text: string,
    public font: string,
    public size: number,
    public color: string,
    public alignment: number,
    public placeholder: boolean,
    public previewText: string,
  ) {
    super(id, name, clickAction);
  }

  private static getMeasureContext() {
    if (Text.measureContext) return Text.measureContext;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create 2D context for text measurement");
    }

    Text.measureContext = ctx;
    return ctx;
  }

  private getRenderText() {
    return this.placeholder ? this.previewText : this.text;
  }

  private ensureParsedText(context?: CanvasRenderingContext2D) {
    const targetContext = context || Text.getMeasureContext();
    targetContext.font = `${this.size}px ${this.font}`;

    const renderText = this.getRenderText();
    if (
      this.parsedText?.rawText !== renderText ||
      this.parsedText.defaultColor !== this.color ||
      this.parsedText.state !== targetContext.font
    ) {
      this.parsedText = new ParsedText(
        renderText,
        this.color,
        targetContext.font,
        targetContext,
      );
    }

    return this.parsedText;
  }

  private getLineStartX(parsedText: ParsedText, line: number) {
    if (!settings.textHorizontalPixelAlign) {
      return this.x - (this.alignment / 2) * parsedText.getLineAdvanceWidth(line);
    }

    const lineMetrics = parsedText.getLineMetrics(line);
    if (!lineMetrics.hasPixels) {
      return this.x - (this.alignment / 2) * parsedText.getLineAdvanceWidth(line);
    }

    const pixelWidth = lineMetrics.pixelMaxX - lineMetrics.pixelMinX;
    return this.x - lineMetrics.pixelMinX - (this.alignment / 2) * pixelWidth;
  }

  private getVerticalBounds(parsedText: ParsedText) {
    const lineCount = parsedText.getLineCount();
    if (!settings.textVerticalPixelCrop) {
      return {
        y: this.y - this.size * lineCount,
        height: this.size * lineCount,
      };
    }

    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (let line = 0; line < lineCount; line++) {
      const lineMetrics = parsedText.getLineMetrics(line);
      if (!lineMetrics.hasPixels) continue;

      const baselineY = this.y - (lineCount - 1 - line) * this.size;
      const top = baselineY - lineMetrics.pixelAscent;
      const bottom = baselineY + lineMetrics.pixelDescent;

      if (top < minY) minY = top;
      if (bottom > maxY) maxY = bottom;
    }

    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
      return {
        y: this.y - this.size * lineCount,
        height: this.size * lineCount,
      };
    }

    return {
      y: minY,
      height: maxY - minY,
    };
  }

  private getHorizontalBounds(parsedText: ParsedText) {
    if (!settings.textHorizontalPixelAlign) {
      return {
        x: this.x - (this.alignment / 2) * (parsedText.width || 0),
        width: parsedText.width || 0,
      };
    }

    const lineCount = parsedText.getLineCount();
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;

    for (let line = 0; line < lineCount; line++) {
      const lineMetrics = parsedText.getLineMetrics(line);
      if (!lineMetrics.hasPixels) continue;

      const lineStartX = this.getLineStartX(parsedText, line);
      const left = lineStartX + lineMetrics.pixelMinX;
      const right = lineStartX + lineMetrics.pixelMaxX;
      if (left < minX) minX = left;
      if (right > maxX) maxX = right;
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      return {
        x: this.x - (this.alignment / 2) * (parsedText.width || 0),
        width: parsedText.width || 0,
      };
    }

    return {
      x: minX,
      width: maxX - minX,
    };
  }

  draw(context: CanvasRenderingContext2D): void {
    const parsedText = this.ensureParsedText(context);
    const lineCount = parsedText.getLineCount();
    for (let l = 0; l < lineCount; l++) {
      const line = parsedText.getLine(l);
      const baselineY = this.y - (lineCount - 1 - l) * this.size;
      const lineStartX = this.getLineStartX(parsedText, l);

      let xOffset = 0;
      for (const fragment of line) {
        context.fillStyle = fragment.color;
        context.fillText(
          fragment.text,
          lineStartX + xOffset,
          baselineY,
        );

        xOffset += fragment.width;
      }
    }
  }

  modify(newBoundingBox: BoundingBox): void {
    const currentBoundingBox = this.getBoundingBox();
    this.x += newBoundingBox.x - currentBoundingBox.x;
    this.y += newBoundingBox.y - currentBoundingBox.y;
  }

  getBoundingBox() {
    const parsedText = this.ensureParsedText();
    const horizontalBounds = this.getHorizontalBounds(parsedText);
    const verticalBounds = this.getVerticalBounds(parsedText);

    return new BoundingBox(
      horizontalBounds.x,
      verticalBounds.y,
      horizontalBounds.width,
      verticalBounds.height,
    );
  }

  toDataObj() {
    return {
      type: Text.displayName,
      x: this.x,
      y: this.y,
      text: this.text,
      font: this.font,
      size: this.size,
      color: this.color,
      alignment: this.alignment,
      placeholder: this.placeholder,
      previewText: this.previewText,
    };
  }

  static fromJson(jsonObj: JsonObject, clickAction: Action[]) {
    return new Text(
      jsonObj.id,
      jsonObj.name,
      clickAction,
      jsonObj.x,
      jsonObj.y,
      jsonObj.text,
      jsonObj.font,
      jsonObj.size,
      jsonObj.color,
      jsonObj.alignment,
      jsonObj.placeholder,
      jsonObj.previewText,
    );
  }

  static generator() {
    return new Text(
      "-",
      Text.displayName,
      [],
      10,
      10,
      "Text",
      "VT323",
      20,
      getRandomColor(),
      0,
      false,
      "123",
    );
  }
}

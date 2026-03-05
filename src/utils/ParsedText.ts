interface TextFragment {
  text: string;
  color: string;
  width: number;
}

export interface TextLineMetrics {
  fragments: TextFragment[];
  advanceWidth: number;
  pixelMinX: number;
  pixelMaxX: number;
  pixelAscent: number;
  pixelDescent: number;
  hasPixels: boolean;
}

const COLOR_CHAR = "§";

export class ParsedText {
  private lines: TextLineMetrics[] = [];
  public readonly width: number = 0;

  constructor(
    public readonly rawText: string,
    public readonly defaultColor: string,
    public readonly state: string,
    context: CanvasRenderingContext2D,
  ) {
    const lines = rawText.split("\n");
    const lineMetrics: TextLineMetrics[] = [];

    let lastColor = defaultColor;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      const fragments: TextFragment[] = [];
      let cursorX = 0;
      let pixelMinX = Number.POSITIVE_INFINITY;
      let pixelMaxX = Number.NEGATIVE_INFINITY;
      let pixelAscent = 0;
      let pixelDescent = 0;
      let hasPixels = false;

      const pushFragment = (text: string, color: string) => {
        const metrics = context.measureText(text);
        const fragmentWidth = metrics.width;
        fragments.push({
          text,
          color,
          width: fragmentWidth,
        });

        const fragmentHasPixels =
          metrics.actualBoundingBoxLeft > 0 ||
          metrics.actualBoundingBoxRight > 0 ||
          metrics.actualBoundingBoxAscent > 0 ||
          metrics.actualBoundingBoxDescent > 0;

        if (fragmentHasPixels) {
          hasPixels = true;
          const left = cursorX - metrics.actualBoundingBoxLeft;
          const right = cursorX + metrics.actualBoundingBoxRight;
          if (left < pixelMinX) pixelMinX = left;
          if (right > pixelMaxX) pixelMaxX = right;
          if (metrics.actualBoundingBoxAscent > pixelAscent) {
            pixelAscent = metrics.actualBoundingBoxAscent;
          }
          if (metrics.actualBoundingBoxDescent > pixelDescent) {
            pixelDescent = metrics.actualBoundingBoxDescent;
          }
        }

        cursorX += fragmentWidth;
      };

      let colorIndex = line.indexOf(COLOR_CHAR);
      while (colorIndex !== -1) {
        if (colorIndex === line.length - 1) break;

        const preColor = line.substring(0, colorIndex);
        pushFragment(preColor, lastColor);

        const colorString = line.substring(colorIndex + 1, colorIndex + 2);
        line = line.substring(colorIndex + 2);
        lastColor = this.getColor(colorString) || defaultColor;

        colorIndex = line.indexOf(COLOR_CHAR);
      }

      pushFragment(line, lastColor);

      lineMetrics[i] = {
        fragments,
        advanceWidth: cursorX,
        pixelMinX: hasPixels ? pixelMinX : 0,
        pixelMaxX: hasPixels ? pixelMaxX : 0,
        pixelAscent,
        pixelDescent,
        hasPixels,
      };
    }

    this.lines = lineMetrics;
    this.width = Math.max(
      0,
      ...this.lines.map((line) => line.advanceWidth),
    );
  }

  public getLineCount(): number {
    return this.lines.length;
  }

  public getLine(line: number): TextFragment[] {
    return this.lines[line]?.fragments || [];
  }

  public getLineAdvanceWidth(line: number): number {
    return this.lines[line]?.advanceWidth || 0;
  }

  public getLineMetrics(line: number): TextLineMetrics {
    return (
      this.lines[line] || {
        fragments: [],
        advanceWidth: 0,
        pixelMinX: 0,
        pixelMaxX: 0,
        pixelAscent: 0,
        pixelDescent: 0,
        hasPixels: false,
      }
    );
  }

  private getColor(colorString: string): string | null {
    switch (colorString.toLowerCase()) {
      case "a":
        return "rgb(85, 255, 85)";
      case "b":
        return "rgb(85, 255, 255)";
      case "c":
        return "rgb(255, 85, 85)";
      case "d":
        return "rgb(255, 85, 255)";
      case "e":
        return "rgb(255, 255, 85)";
      case "f":
        return "rgb(255, 255, 255)";
      case "0":
        return "rgb(0, 0, 0)";
      case "1":
        return "rgb(0, 0, 170)";
      case "2":
        return "rgb(0, 170, 0)";
      case "3":
        return "rgb(0, 170, 170)";
      case "4":
        return "rgb(170, 0, 0)";
      case "5":
        return "rgb(170, 0, 170)";
      case "6":
        return "rgb(255, 170, 0)";
      case "7":
        return "rgb(170, 170, 170)";
      case "8":
        return "rgb(85, 85, 85)";
      case "9":
        return "rgb(85, 85, 255)";
      default:
        return null;
    }
  }
}

import { BoundingBox } from "../BoundingBox";

export interface AspectRatioResizeInput {
  newBoundingBox: BoundingBox;
  ratio: number;
  keepRatio: boolean;
  resizeStartBounds?: BoundingBox;
  lastResizeWidth: number;
  lastResizeHeight: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface AspectRatioResizeResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

function hasPositiveLimit(value: number | undefined): value is number {
  return Number.isFinite(value) && value > 0;
}

export function applyAspectRatioResize(
  input: AspectRatioResizeInput,
): AspectRatioResizeResult {
  const { newBoundingBox, ratio, keepRatio } = input;
  const result: AspectRatioResizeResult = {
    x: newBoundingBox.x,
    y: newBoundingBox.y,
    width: newBoundingBox.width,
    height: newBoundingBox.height,
  };

  const canKeepRatio = keepRatio && Number.isFinite(ratio) && ratio > 0;
  if (!canKeepRatio) return result;

  const baseWidth =
    input.resizeStartBounds?.width ?? input.lastResizeWidth ?? result.width;
  const baseHeight =
    input.resizeStartBounds?.height ?? input.lastResizeHeight ?? result.height;
  const widthDelta = Math.abs(newBoundingBox.width - baseWidth);
  const heightDelta = Math.abs(newBoundingBox.height - baseHeight);

  if (widthDelta >= heightDelta) {
    result.width = newBoundingBox.width;
    result.height = result.width / ratio;
  } else {
    result.height = newBoundingBox.height;
    result.width = result.height * ratio;
  }

  if (!hasPositiveLimit(input.maxWidth) || !hasPositiveLimit(input.maxHeight)) {
    return result;
  }

  const scale = Math.min(
    1,
    input.maxWidth / result.width,
    input.maxHeight / result.height,
  );
  if (scale < 1) {
    result.width *= scale;
    result.height *= scale;
  }

  const bounded = new BoundingBox(result.x, result.y, result.width, result.height);
  bounded.ensureBounds(input.maxWidth, input.maxHeight);
  result.x = bounded.x;
  result.y = bounded.y;
  result.width = bounded.width;
  result.height = bounded.height;

  return result;
}

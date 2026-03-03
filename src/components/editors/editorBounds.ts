import { PropType } from "vue";
import { BoundingBox } from "@/utils/BoundingBox";

export type BoundedComponent = {
  getBoundingBox(): BoundingBox;
  modify(bounds: BoundingBox): void;
};

export type BoundsProps = {
  maxHeight: number;
  maxWidth: number;
};

export const maxBoundsProps = {
  maxHeight: {
    type: Number as PropType<number>,
    required: true,
  },
  maxWidth: {
    type: Number as PropType<number>,
    required: true,
  },
};

export const ensureBoundsWatch = {
  component: {
    deep: true,
    handler(this: { ensureBounds: () => void }) {
      this.ensureBounds();
    },
  },
};

export function ensureComponentBounds(
  component: BoundedComponent,
  maxWidth: number,
  maxHeight: number,
) {
  const bounds = component.getBoundingBox();
  bounds.ensureBounds(maxWidth, maxHeight);
  component.modify(bounds);
}

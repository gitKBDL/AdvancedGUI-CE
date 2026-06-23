/**
 * Geometry correctness:
 *  - BoundingBox.EMPTY is a shared reference-identity sentinel; it must be frozen
 *    so it can never be mutated/corrupted in place.
 *  - GroupComponent.getBoundingBox must handle negative coordinates (devMode).
 *    The old -1 sentinel falsely reported a group EMPTY when a child sat exactly
 *    at x/y = -1, and mishandled the union for negative coords.
 */
import { describe, it, expect } from "vitest";
import { BoundingBox } from "@/utils/BoundingBox";
import { Component } from "@/utils/components/Component";
import { GroupComponent } from "@/utils/components/GroupComponent";
import { Rect } from "@/utils/components/Rect";

const rect = (id: string, x: number, y: number, w: number, h: number) =>
  new Rect(id, id, [], x, y, w, h, "rgba(0,0,0,1)", 0);

const group = (children: Component[]) =>
  new GroupComponent("g", "g", [], children, true);

describe("BoundingBox.EMPTY", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(BoundingBox.EMPTY)).toBe(true);
  });
});

describe("GroupComponent.getBoundingBox", () => {
  it("returns the shared EMPTY for a childless group", () => {
    expect(group([]).getBoundingBox()).toBe(BoundingBox.EMPTY);
  });

  it("includes a child positioned exactly at x/y = -1", () => {
    const box = group([rect("a", -1, -1, 4, 4)]).getBoundingBox();
    expect(box).not.toBe(BoundingBox.EMPTY);
    expect([box.x, box.y, box.width, box.height]).toEqual([-1, -1, 4, 4]);
  });

  it("unions children spanning negative and positive coordinates", () => {
    const box = group([
      rect("a", -5, 2, 3, 3),
      rect("b", 10, -4, 2, 2),
    ]).getBoundingBox();
    expect(box.x).toBe(-5);
    expect(box.y).toBe(-4);
    expect(box.x + box.width).toBe(12);
    expect(box.y + box.height).toBe(5);
  });

  it("skips nested empty groups when unioning", () => {
    const box = group([group([]), rect("a", 0, 0, 5, 5)]).getBoundingBox();
    expect([box.x, box.y, box.width, box.height]).toEqual([0, 0, 5, 5]);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { resetRegistry } from "./helpers";
import { Rect } from "@/utils/components/Rect";
import { componentFromJson, components } from "@/utils/manager/ComponentManager";
import { hexToRgba } from "@/utils/ColorUtils";

// Smoke test: proves the whole harness works end-to-end —
//  * a component class imports cleanly (it pulls in `.vue` editors + scss),
//  * the global registry is reachable and resettable,
//  * a JSON serialize -> deserialize round-trip reconstructs an equal component.
describe("harness smoke", () => {
  beforeEach(() => resetRegistry());

  it("imports a component class and pure utils", () => {
    expect(Rect.displayName).toBe("Rect");
    expect(hexToRgba("#FF8800", 1)).toBe("rgba(255,136,0,1)");
  });

  it("round-trips a Rect through JSON via the registry", () => {
    const rect = new Rect("box1", "My Box", [], 10, 20, 80, 40, "#abcdef", 4);
    const json = JSON.parse(rect.toJson());
    expect(json).toMatchObject({
      id: "box1",
      name: "My Box",
      type: "Rect",
      x: 10,
      width: 80,
      radius: 4,
    });

    const restored = componentFromJson(json) as Rect;
    expect(restored).toBeInstanceOf(Rect);
    expect(restored.x).toBe(10);
    expect(restored.color).toBe("#abcdef");
    // componentFromJson registers the rebuilt component in the global registry.
    expect(components["box1"]).toBe(restored);
  });
});

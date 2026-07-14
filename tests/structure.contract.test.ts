/**
 * CONTRACT GUARDED BY THIS FILE
 * =============================
 * The AdvancedGUI editor exports a component as a *draft* JSON
 * (`JSON.parse(component.toJson(true))`) which is then run through
 * `convertToFinalized()` (src/utils/LocalConverter.ts) to produce the
 * structure that the AdvancedGUI **plugin** (3.0.3) actually deserializes.
 *
 * This suite pins down `finalizeByType` for the container / special component
 * types and the dummy-fallback injection + legacy-field stripping that the
 * plugin relies on. For every type we:
 *   1. build the real editor component via its `generator()`,
 *   2. serialize to the draft export form (`toJson(true)`),
 *   3. run `convertToFinalized(draft)`,
 *   4. assert the plugin-facing SHAPE, and where a leaf field feeds a plugin
 *      Jackson deserializer (font / inputHandler / alignment / color) we feed
 *      the real deserializer mirror and assert it does NOT throw.
 *
 * Structural guarantees asserted here (the plugin assumes all of these):
 *   View         -> { views, defaultComponent }      (no components / drawIndex)
 *   Group        -> { components: [] }
 *   Click Anim.  -> { normal, clicked }              (no components / drawClicked)
 *   Hover        -> { normal, hovered }              (no components / drawHovered)
 *   Remote Image -> { imageUrl, loading? }           (no ratio/keepImageRatio/drawLoading)
 *   Check        -> { positive, negative, check }    (no components / drawNegative)
 *   Text-Input   -> { inputHandler:int, defaultInput, font:{name,size} }
 *   Text         -> alignment:int, PlaceholderText handling
 *   Dummy fallback shape: { type:"Dummy", id, clickAction:null, hidden:false }
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetRegistry } from "./helpers";
import { convertToFinalized } from "@/utils/LocalConverter";
import type { JsonObject } from "@/utils/manager/ComponentManager";

import { View } from "@/utils/components/View";
import { Hover } from "@/utils/components/Hover";
import { ClickAnimation } from "@/utils/components/ClickAnimation";
import { RemoteImage } from "@/utils/components/RemoteImage";
import { CheckComponent } from "@/utils/components/CheckComponent";
import { GroupComponent } from "@/utils/components/GroupComponent";
import { TextInput } from "@/utils/components/TextInput";
import { Text } from "@/utils/components/Text";
import { Rect } from "@/utils/components/Rect";
import { Component } from "@/utils/components/Component";

import {
  deserializeFont,
  deserializeInputHandler,
  deserializeTextAlignment,
  deserializeColor,
} from "./contract/pluginDeserializers";

/** Editor export form -> plugin-finalized form, the pipeline under test. */
function finalizeOf(component: Component): JsonObject {
  const draft = JSON.parse(component.toJson(true)) as JsonObject;
  return convertToFinalized(draft);
}

/** Assert an object matches the dummy-fallback contract the plugin expects. */
function expectDummy(obj: unknown, expectedId: string) {
  expect(obj).toMatchObject({
    type: "Dummy",
    id: expectedId,
    clickAction: null,
    hidden: false,
  });
  // Exactly the 4 keys the editor injects — nothing extra leaks in.
  expect(Object.keys(obj as object).sort()).toEqual(
    ["clickAction", "hidden", "id", "type"].sort(),
  );
}

beforeEach(() => resetRegistry());

describe("View -> views + defaultComponent", () => {
  it("empty View: components becomes [], defaultComponent is a dummy, drawIndex dropped", () => {
    const finalized = finalizeOf(View.generator());

    expect(finalized.type).toBe("View");
    expect(finalized.views).toEqual([]);
    expect("components" in finalized).toBe(false);
    expect("drawIndex" in finalized).toBe(false);
    // empty -> dummy default keyed off the component id ("-" for a fresh generator)
    expectDummy(finalized.defaultComponent, "-_dummy_default");
  });

  it("non-empty View: views = finalized children, defaultComponent = deep clone of views[drawIndex]", () => {
    const view = new View("v1", "View", [], [Rect.generator(), Rect.generator()], true, 1);
    const finalized = finalizeOf(view);

    expect(Array.isArray(finalized.views)).toBe(true);
    expect(finalized.views).toHaveLength(2);
    expect(finalized.views[0].type).toBe("Rect");
    // drawIndex was 1 -> defaultComponent clones the second view
    expect(finalized.defaultComponent).toEqual(finalized.views[1]);
    // it is a *clone*, not the same reference (so mutating one cannot affect the other)
    expect(finalized.defaultComponent).not.toBe(finalized.views[1]);
    expect("components" in finalized).toBe(false);
    expect("drawIndex" in finalized).toBe(false);
  });

  it("children are recursively finalized (action -> clickAction, hidden defaulted) before being moved to views", () => {
    const view = new View("v2", "View", [], [Rect.generator()], true, 0);
    const finalized = finalizeOf(view);
    const child = finalized.views[0];
    // recursion converts each child too: clickAction present, no leftover `action`
    expect("action" in child).toBe(false);
    expect(child.clickAction).toBeNull();
    expect(child.hidden).toBe(false);
  });
});

describe("Group -> components defaults to []", () => {
  it("empty Group keeps an empty components array", () => {
    const finalized = finalizeOf(GroupComponent.generator());
    expect(finalized.type).toBe("Group");
    expect(finalized.components).toEqual([]);
  });
});

describe("Click Animation -> normal + clicked", () => {
  it("empty: normal is a dummy, clicked is a clone of normal, components/drawClicked dropped", () => {
    const finalized = finalizeOf(ClickAnimation.generator());

    expect(finalized.type).toBe("Click Animation");
    expectDummy(finalized.normal, "-_dummy_normal");
    // clicked falls back to a *clone* of normal (deep-equal, distinct reference)
    expect(finalized.clicked).toEqual(finalized.normal);
    expect(finalized.clicked).not.toBe(finalized.normal);

    expect("components" in finalized).toBe(false);
    expect("drawClicked" in finalized).toBe(false);
  });

  it("two children: normal = child0, clicked = child1", () => {
    const anim = new ClickAnimation(
      "ca1",
      "Click Animation",
      [],
      [Rect.generator(), Text.generator()],
      true,
      false,
    );
    const finalized = finalizeOf(anim);
    expect(finalized.normal.type).toBe("Rect");
    expect(finalized.clicked.type).toBe("Text");
    expect("components" in finalized).toBe(false);
  });

  it("one child: normal = child0, clicked = clone of that child", () => {
    const anim = new ClickAnimation(
      "ca2",
      "Click Animation",
      [],
      [Rect.generator()],
      true,
      false,
    );
    const finalized = finalizeOf(anim);
    expect(finalized.normal.type).toBe("Rect");
    expect(finalized.clicked).toEqual(finalized.normal);
    expect(finalized.clicked).not.toBe(finalized.normal);
  });
});

describe("Hover -> normal + hovered (finalizeHoverComponent)", () => {
  it("empty: normal and hovered are distinct dummies, components/drawHovered dropped", () => {
    const finalized = finalizeOf(Hover.generator());

    expect(finalized.type).toBe("Hover");
    expectDummy(finalized.normal, "-_dummy_normal");
    expectDummy(finalized.hovered, "-_dummy_hovered");

    expect("components" in finalized).toBe(false);
    expect("drawHovered" in finalized).toBe(false);
  });

  it("two children: normal = child0, hovered = child1 (no clone fallback)", () => {
    const hover = new Hover(
      "h1",
      "Hover",
      [],
      [Rect.generator(), Text.generator()],
      true,
      false,
    );
    const finalized = finalizeOf(hover);
    expect(finalized.normal.type).toBe("Rect");
    expect(finalized.hovered.type).toBe("Text");
  });

  it("one child: normal = child0, hovered = dummy_hovered fallback", () => {
    const hover = new Hover("h2", "Hover", [], [Rect.generator()], true, false);
    const finalized = finalizeOf(hover);
    expect(finalized.normal.type).toBe("Rect");
    expectDummy(finalized.hovered, "h2_dummy_hovered");
  });
});

describe("Remote Image -> imageUrl + optional loading", () => {
  it("generator (no child, has url): imageUrl preserved, no loading, ratio/keepImageRatio/drawLoading dropped", () => {
    const finalized = finalizeOf(RemoteImage.generator());

    expect(finalized.type).toBe("Remote Image");
    expect(finalized.imageUrl).toBe("https://visage.surgeplay.com/head/%UUID_U%");
    // loading is only set when there is a child component
    expect("loading" in finalized).toBe(false);
    expect("components" in finalized).toBe(false);
    expect("ratio" in finalized).toBe(false);
    expect("keepImageRatio" in finalized).toBe(false);
    expect("drawLoading" in finalized).toBe(false);
  });

  // NOTE: the RemoteImage *constructor* calls placeRemoteImage() (a DOM/image
  // side-effect) for any non-"-" id, which is irrelevant to the finalize
  // contract and not wired up in the test harness. For the non-generator cases
  // we therefore exercise finalizeRemoteImageComponent on the draft directly —
  // exactly the object `toJson(true)` would produce — which is the real input
  // `convertToFinalized` receives in production.
  function remoteImageDraft(over: Partial<JsonObject>): JsonObject {
    return {
      id: "ri",
      type: "Remote Image",
      drawLoading: false,
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      imageUrl: "https://example.com/x.png",
      keepImageRatio: true,
      dithering: false,
      ratio: 1,
      components: [],
      expanded: true,
      ...over,
    };
  }

  it("empty imageUrl defaults to \"\"", () => {
    const finalized = convertToFinalized(remoteImageDraft({ imageUrl: "" }));
    expect(finalized.imageUrl).toBe("");
    expect("loading" in finalized).toBe(false);
    expect("ratio" in finalized).toBe(false);
    expect("keepImageRatio" in finalized).toBe(false);
    expect("drawLoading" in finalized).toBe(false);
  });

  it("with a child: loading = finalized child0", () => {
    const childDraft = JSON.parse(Rect.generator().toJson(true)) as JsonObject;
    const finalized = convertToFinalized(
      remoteImageDraft({ drawLoading: true, components: [childDraft] }),
    );
    expect(finalized.loading.type).toBe("Rect");
    // the loading child went through the recursive finalize too
    expect(finalized.loading.clickAction).toBeNull();
    expect(finalized.loading.hidden).toBe(false);
    expect("components" in finalized).toBe(false);
  });
});

describe("Check -> positive + negative + check", () => {
  it("empty: positive/negative are distinct dummies, components/drawNegative dropped, check normalized", () => {
    const finalized = finalizeOf(CheckComponent.generator());

    expect(finalized.type).toBe("Check");
    expectDummy(finalized.positive, "-_dummy_pos");
    expectDummy(finalized.negative, "-_dummy_neg");

    expect("components" in finalized).toBe(false);
    expect("drawNegative" in finalized).toBe(false);

    // processCheck strips the `name` helper field but keeps the real check payload
    expect(finalized.check).toBeTruthy();
    expect(finalized.check.type).toBe("Permission Check");
    expect(finalized.check.permission).toBe("ag.group.premium");
    expect("name" in finalized.check).toBe(false);
  });

  it("two children: positive = child0, negative = child1", () => {
    const check = new CheckComponent(
      "ch1",
      "Check",
      [],
      [Rect.generator(), Text.generator()],
      true,
      false,
      // reuse the generator's check
      (CheckComponent.generator() as CheckComponent).check,
    );
    const finalized = finalizeOf(check);
    expect(finalized.positive.type).toBe("Rect");
    expect(finalized.negative.type).toBe("Text");
  });

  it("one child: positive = child0, negative = dummy_neg fallback", () => {
    const check = new CheckComponent(
      "ch2",
      "Check",
      [],
      [Rect.generator()],
      true,
      false,
      (CheckComponent.generator() as CheckComponent).check,
    );
    const finalized = finalizeOf(check);
    expect(finalized.positive.type).toBe("Rect");
    expectDummy(finalized.negative, "ch2_dummy_neg");
  });
});

describe("Text-Input -> inputHandler + defaultInput + font", () => {
  it("maxLength -> inputHandler (integer, plugin-readable), defaultInput defaults, font {name,size}", () => {
    const finalized = finalizeOf(TextInput.generator());

    expect(finalized.type).toBe("Text-Input");

    // maxLength (7) becomes inputHandler as an INT; raw maxLength is gone
    expect(finalized.inputHandler).toBe(7);
    expect(Number.isInteger(finalized.inputHandler)).toBe(true);
    expect("maxLength" in finalized).toBe(false);
    // plugin InputHandlerDeserializer must accept it without throwing
    expect(() => deserializeInputHandler(finalized.inputHandler)).not.toThrow();
    expect(deserializeInputHandler(finalized.inputHandler)).toBe(7);

    // generator defaultInput is "" already, must remain a string (never null)
    expect(finalized.defaultInput).toBe("");

    // font is folded into {name,size} and is FontDeserializer-readable
    expect(finalized.font).toEqual({ name: "VT323", size: 20 });
    expect("size" in finalized).toBe(false);
    expect(() => deserializeFont(finalized.font)).not.toThrow();
    expect(deserializeFont(finalized.font)).toEqual({ name: "VT323", size: 20 });

    // background colors round-trip to plugin ColorDeserializer
    expect(() => deserializeColor(finalized.backgroundColor)).not.toThrow();
    expect(() => deserializeColor(finalized.backgroundColorActive)).not.toThrow();
  });

  it("null defaultInput is normalized to empty string", () => {
    const input = new TextInput(
      "ti1",
      "Text-Input",
      [],
      0,
      0,
      64,
      20,
      3,
      "rgba(0,0,0,1)",
      "rgba(0,0,0,1)",
      null as unknown as string, // defaultInput null
      "Name...",
      5,
      "rgba(255,255,255,1)",
      "rgba(200,200,200,1)",
      "VT323",
      18,
      false,
    );
    const finalized = finalizeOf(input);
    expect(finalized.defaultInput).toBe("");
    expect(finalized.inputHandler).toBe(5);
  });
});

describe("Text -> alignment int + placeholder handling", () => {
  it("plain Text: stays type 'Text', alignment is a plugin-readable int, placeholder/previewText dropped", () => {
    const finalized = finalizeOf(Text.generator());

    expect(finalized.type).toBe("Text");
    expect(Number.isInteger(finalized.alignment)).toBe(true);
    expect(finalized.alignment).toBe(0);
    expect(deserializeTextAlignment(finalized.alignment)).toBe("LEFT");

    // legacy preview/placeholder helper fields are stripped from the export
    expect("placeholder" in finalized).toBe(false);
    expect("previewText" in finalized).toBe(false);

    // color is plugin ColorDeserializer-readable
    expect(() => deserializeColor(finalized.color)).not.toThrow();
  });

  it("alignment values map through TextAlignmentDeserializer (0->LEFT,1->CENTER,2->RIGHT)", () => {
    const mk = (alignment: number) =>
      new Text("t", "Text", [], 0, 0, "x", "VT323", 20, "rgba(0,0,0,1)", alignment, false, "p");

    expect(deserializeTextAlignment(finalizeOf(mk(0)).alignment)).toBe("LEFT");
    expect(deserializeTextAlignment(finalizeOf(mk(1)).alignment)).toBe("CENTER");
    expect(deserializeTextAlignment(finalizeOf(mk(2)).alignment)).toBe("RIGHT");
  });

  it("placeholder=true Text becomes type 'PlaceholderText'", () => {
    const text = new Text(
      "t2",
      "Text",
      [],
      0,
      0,
      "raw",
      "VT323",
      20,
      "rgba(0,0,0,1)",
      0,
      true, // placeholder
      "preview",
    );
    const finalized = finalizeOf(text);
    expect(finalized.type).toBe("PlaceholderText");
    expect("placeholder" in finalized).toBe(false);
    expect("previewText" in finalized).toBe(false);
  });
});

describe("Dummy fallback shape + legacy-field stripping (removeLegacyFields)", () => {
  it("every injected dummy has exactly {type, id, clickAction:null, hidden:false}", () => {
    // View dummy
    expectDummy(finalizeOf(View.generator()).defaultComponent, "-_dummy_default");
    // Hover dummies
    const hover = finalizeOf(Hover.generator());
    expectDummy(hover.normal, "-_dummy_normal");
    expectDummy(hover.hovered, "-_dummy_hovered");
    // Check dummies
    const check = finalizeOf(CheckComponent.generator());
    expectDummy(check.positive, "-_dummy_pos");
    expectDummy(check.negative, "-_dummy_neg");
  });

  it("removeLegacyFields drops all editor-only fields from the finalized output", () => {
    // Build a draft that explicitly carries every legacy field, then finalize.
    // We bypass a single component type and hand a raw draft to convertToFinalized
    // to prove the blanket stripping in removeLegacyFields.
    const draft: JsonObject = {
      id: "legacy",
      type: "Rect",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      color: "rgba(0,0,0,1)",
      radius: 0,
      drawClicked: true,
      drawHovered: true,
      drawLoading: true,
      drawNegative: true,
      drawIndex: 3,
      ratio: 1,
      keepImageRatio: true,
      maxLength: 9,
      placeholder: true,
      previewText: "x",
    };
    const finalized = convertToFinalized(draft);

    for (const legacy of [
      "drawClicked",
      "drawHovered",
      "drawLoading",
      "drawNegative",
      "drawIndex",
      "ratio",
      "keepImageRatio",
      "maxLength",
      "placeholder",
      "previewText",
    ]) {
      expect(legacy in finalized, `expected "${legacy}" to be stripped`).toBe(false);
    }
  });

  it("convertToFinalized always sets clickAction and hidden on a component with no action", () => {
    const finalized = finalizeOf(Rect.generator());
    expect(finalized.clickAction).toBeNull();
    expect(finalized.hidden).toBe(false);
    expect("action" in finalized).toBe(false);
    expect("name" in finalized).toBe(false);
  });
});

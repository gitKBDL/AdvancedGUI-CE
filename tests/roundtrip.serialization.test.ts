/**
 * Contract: DRAFT SERIALIZATION ROUND-TRIPS FOR ALL COMPONENT TYPES.
 *
 * The editor persists a workspace as the editor-side "draft" JSON
 * (`component.toJson(false)`), and exports a plugin-consumable config built from
 * the "usage" form (`component.toJson(true)`) run through
 * `convertToFinalized()` (src/utils/LocalConverter.ts).
 *
 * This suite guards two layers of that contract for EVERY type registered in
 * `componentInfo` (ComponentMeta):
 *
 *   1. EDITOR ROUND-TRIP — `componentFromJson(JSON.parse(comp.toJson()))`
 *      reconstructs the SAME subclass, the data fields survive a
 *      toJson -> fromJson -> toJson cycle (idempotent / stable), and the
 *      `locked` flag round-trips in the draft (forUsage=false) form. Nested
 *      containers (Group / View / Hover / Click Animation / Check / List /
 *      Template / Replica / Remote Image) preserve their child tree and ids.
 *
 *   2. PLUGIN CONTRACT — the FINALIZED leaf fields the editor exports actually
 *      satisfy the AdvancedGUI 3.0.3 Jackson deserializers (mirrored in
 *      tests/contract/pluginDeserializers.ts): every `rgba(...)` color parses
 *      via ColorDeserializer, Image/GIF `image`/`gifFrames` nodes parse, Text /
 *      Text-Input fonts parse via FontDeserializer, Text-Input `inputHandler`
 *      and Text `alignment` are int tokens, and the Dummy fallbacks injected by
 *      convertToFinalized have the documented `{type:"Dummy", id:"<id>_<suffix>"}`
 *      shape.
 *
 * Notes on the harness:
 *   - `Remote Image`'s constructor calls into ImageManager, which needs an
 *     `imageContainer` element (normally installed by App.vue). We install one
 *     via the public `setupImageManager()` and stub `fetch` so the default-image
 *     preload doesn't leave dangling async tasks. Without this the class is
 *     un-deserializable in the test env (querySelector on undefined).
 */
import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import { resetRegistry } from "./helpers";
import {
  deserializeColor,
  deserializeFont,
  deserializeImage,
  deserializeGif,
  deserializeInputHandler,
  deserializeTextAlignment,
} from "./contract/pluginDeserializers";

import { componentInfo, componentNames } from "@/utils/ComponentMeta";
import {
  componentFromJson,
  components,
  JsonObject,
} from "@/utils/manager/ComponentManager";
import { convertToFinalized } from "@/utils/LocalConverter";
import { setupImageManager } from "@/utils/manager/ImageManager";

import { Component } from "@/utils/components/Component";
import { Rect } from "@/utils/components/Rect";
import { Text } from "@/utils/components/Text";
import { Image } from "@/utils/components/Image";
import { GIF } from "@/utils/components/GIF";
import { RemoteImage } from "@/utils/components/RemoteImage";
import { GroupComponent } from "@/utils/components/GroupComponent";
import { View } from "@/utils/components/View";
import { Hover } from "@/utils/components/Hover";
import { ClickAnimation } from "@/utils/components/ClickAnimation";
import { CheckComponent } from "@/utils/components/CheckComponent";
import { TextInput } from "@/utils/components/TextInput";
import { Template } from "@/utils/components/Template";
import { Replica } from "@/utils/components/Replica";
import { List } from "@/utils/components/List";
import { Dummy } from "@/utils/components/Dummy";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** All registered type display names, paired with their class for instanceof. */
const TYPE_TO_CLASS: Record<string, new (...args: never[]) => Component> = {
  Rect,
  Text,
  Image,
  "Remote Image": RemoteImage,
  GIF,
  Group: GroupComponent,
  Hover,
  "Click Animation": ClickAnimation,
  Check: CheckComponent,
  "Text-Input": TextInput,
  View,
  Template,
  Replica,
  List,
  Dummy,
};

/** Parse the editor-side (draft) JSON of a component. */
function draft(comp: Component): JsonObject {
  return JSON.parse(comp.toJson(false));
}

/** Walk a finalized component tree, invoking `cb(node)` on every component. */
function walkFinalized(node: JsonObject, cb: (n: JsonObject) => void) {
  cb(node);
  for (const key of [
    "components",
    "views",
    "normal",
    "hovered",
    "clicked",
    "positive",
    "negative",
    "loading",
    "defaultComponent",
  ]) {
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => {
        if (c && typeof c === "object") walkFinalized(c as JsonObject, cb);
      });
    } else if (child && typeof child === "object") {
      walkFinalized(child as JsonObject, cb);
    }
  }
}

/** Collect every id present in a draft component subtree (recurses children). */
function collectIds(node: JsonObject, acc: string[] = []): string[] {
  if (typeof node.id === "string") acc.push(node.id);
  if (Array.isArray(node.components)) {
    node.components.forEach((c: JsonObject) => collectIds(c, acc));
  }
  return acc;
}

/**
 * Deep-clone a draft and blank out every `id` field (top-level and nested
 * `components`). Generators emit `id:"-"`, which `registerComponent` rewrites to
 * a fresh random id; we compare the *data* payload, not the volatile ids.
 */
function stripIds(node: JsonObject): JsonObject {
  const clone: JsonObject = JSON.parse(JSON.stringify(node));
  const visit = (n: JsonObject) => {
    if (n && typeof n === "object") {
      if ("id" in n) n.id = "<id>";
      if (Array.isArray(n.components)) {
        n.components.forEach((c: JsonObject) => visit(c));
      }
    }
  };
  visit(clone);
  return clone;
}

// ---------------------------------------------------------------------------
// shared image-manager setup so Remote Image is constructible/deserializable
// ---------------------------------------------------------------------------

beforeAll(() => {
  // The default-image preload issues fetches; stub them so happy-dom doesn't
  // leave async tasks dangling (they'd abort noisily at teardown).
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: false,
        blob: () => Promise.resolve(new Blob()),
      } as unknown as Response),
    ),
  );
  setupImageManager(document.createElement("div"));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// 1. Generic per-type round-trip (covers every registered ComponentMeta)
// ---------------------------------------------------------------------------

describe("editor round-trip: every registered component type", () => {
  beforeEach(() => resetRegistry());

  it("ComponentMeta registers all 15 known types", () => {
    // Guards against the meta table and our class map drifting out of sync.
    expect(Object.keys(componentInfo).sort()).toEqual(
      Object.keys(TYPE_TO_CLASS).sort(),
    );
    expect(componentNames).toHaveLength(Object.keys(componentInfo).length);
  });

  for (const typeName of Object.keys(componentInfo)) {
    describe(`${typeName}`, () => {
      it("reconstructs the same subclass from its draft JSON", () => {
        const original = componentInfo[typeName].generator();
        const json = draft(original);
        // Every generator emits a usable draft with its type tag.
        expect(json.type).toBe(typeName);

        const restored = componentFromJson(json);
        expect(restored).not.toBeNull();
        expect(restored).toBeInstanceOf(TYPE_TO_CLASS[typeName]);
        expect(restored!.displayName).toBe(typeName);
        // componentFromJson registers under the (possibly generated) id.
        expect(components[restored!.id]).toBe(restored);
      });

      it("is idempotent across toJson -> fromJson -> toJson", () => {
        const original = componentInfo[typeName].generator();
        // Register first so the original's "-" placeholder id is replaced with a
        // concrete id; both sides then carry the *same* concrete top-level id.
        const registered = componentFromJson(draft(original))!;
        const firstJson = draft(registered);

        // A second clean round-trip (with fresh ids) must produce the same data.
        const restored = componentFromJson(draft(registered), true)!;
        const secondJson = draft(restored);

        // Compare data payloads with ids blanked (ids are intentionally fresh on
        // the reassigned clone, but everything else must be identical).
        expect(stripIds(secondJson)).toStrictEqual(stripIds(firstJson));
      });

      it("round-trips the locked flag in the draft (forUsage=false)", () => {
        const original = componentInfo[typeName].generator();
        original.locked = true;
        const json = draft(original);
        expect(json.locked).toBe(true);

        const restored = componentFromJson(json)!;
        expect(restored.locked).toBe(true);

        // ...and a non-locked component stays non-locked.
        const original2 = componentInfo[typeName].generator();
        original2.locked = false;
        const restored2 = componentFromJson(draft(original2))!;
        expect(restored2.locked).toBe(false);
      });

      it("omits locked from the usage/export form (forUsage=true)", () => {
        const usage = JSON.parse(
          componentInfo[typeName].generator().toJson(true),
        );
        expect("locked" in usage).toBe(false);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Nested container child-tree + id preservation
// ---------------------------------------------------------------------------

describe("nested containers preserve their child tree and ids", () => {
  beforeEach(() => resetRegistry());

  /** Build two leaf children with explicit, recognisable ids. */
  function makeChildren(): Component[] {
    return [
      new Rect("childA", "A", [], 1, 2, 3, 4, "rgba(1,2,3,1)", 0),
      new Text(
        "childB",
        "B",
        [],
        5,
        6,
        "hi",
        "VT323",
        12,
        "rgba(9,9,9,1)",
        0,
        false,
        "p",
      ),
    ];
  }

  it("GroupComponent keeps both children, their order, ids and subclasses", () => {
    const group = new GroupComponent(
      "grp",
      "Group",
      [],
      makeChildren(),
      true,
    );
    const restored = componentFromJson(draft(group)) as GroupComponent;

    expect(restored).toBeInstanceOf(GroupComponent);
    expect(restored.getItems()).toHaveLength(2);
    expect(restored.getItems().map((c) => c.id)).toEqual([
      "childA",
      "childB",
    ]);
    expect(restored.getItems()[0]).toBeInstanceOf(Rect);
    expect(restored.getItems()[1]).toBeInstanceOf(Text);
    // children are individually registered in the global registry too
    expect(components["childA"]).toBeInstanceOf(Rect);
    expect(components["childB"]).toBeInstanceOf(Text);
  });

  it("View preserves children + drawIndex", () => {
    const view = new View("vw", "View", [], makeChildren(), true, 1);
    const restored = componentFromJson(draft(view)) as View;

    expect(restored).toBeInstanceOf(View);
    expect(restored.drawIndex).toBe(1);
    expect(restored.getItems().map((c) => c.id)).toEqual([
      "childA",
      "childB",
    ]);
    expect(restored.getCurrentComponent()!.id).toBe("childB");
  });

  it("Hover preserves children + drawHovered", () => {
    const hover = new Hover("hv", "Hover", [], makeChildren(), true, true);
    const restored = componentFromJson(draft(hover)) as Hover;

    expect(restored).toBeInstanceOf(Hover);
    expect(restored.drawHovered).toBe(true);
    expect(restored.getItems().map((c) => c.id)).toEqual([
      "childA",
      "childB",
    ]);
  });

  it("ClickAnimation preserves children + drawClicked", () => {
    const ca = new ClickAnimation(
      "ca",
      "Click Animation",
      [],
      makeChildren(),
      true,
      true,
    );
    const restored = componentFromJson(draft(ca)) as ClickAnimation;

    expect(restored).toBeInstanceOf(ClickAnimation);
    expect(restored.drawClicked).toBe(true);
    expect(restored.getItems().map((c) => c.id)).toEqual([
      "childA",
      "childB",
    ]);
  });

  it("CheckComponent preserves children + its check + drawNegative", () => {
    const check = new CheckComponent(
      "ck",
      "Check",
      [],
      makeChildren(),
      true,
      true,
      // reuse the default PermissionCheck generator
      CheckComponent.generator().check,
    );
    const restored = componentFromJson(draft(check)) as CheckComponent;

    expect(restored).toBeInstanceOf(CheckComponent);
    expect(restored.drawNegative).toBe(true);
    expect(restored.check.name).toBe("Permission Check");
    expect(restored.getItems().map((c) => c.id)).toEqual([
      "childA",
      "childB",
    ]);
  });

  it("List preserves its template components, entries and entryType", () => {
    const list = componentInfo["List"].generator() as List;
    const beforeIds = collectIds(draft(list));
    const restored = componentFromJson(draft(list)) as List;

    expect(restored).toBeInstanceOf(List);
    expect(restored.getItems()).toHaveLength(2);
    expect(restored.entryType).toEqual([
      { name: "color", type: "string" },
      { name: "test", type: "string" },
    ]);
    expect(restored.entries).toHaveLength(4);
    expect(restored.itemsAtOnce).toBe(3);
    // The (non-usage) draft preserves the raw template child ids.
    expect(beforeIds.length).toBeGreaterThan(0);
  });

  it("Template preserves its template components and defaultData", () => {
    const tmpl = new Template(
      "tpl",
      "Template",
      [],
      makeChildren(),
      true,
      [
        { name: "mainColor", value: "#26e686" },
        { name: "price", value: 12 },
      ],
    );
    const restored = componentFromJson(draft(tmpl)) as Template;

    expect(restored).toBeInstanceOf(Template);
    expect(restored.getItems().map((c) => c.id)).toEqual([
      "childA",
      "childB",
    ]);
    expect(restored.defaultData).toEqual([
      { name: "mainColor", value: "#26e686" },
      { name: "price", value: 12 },
    ]);
  });

  it("Replica preserves position, targetId and templateData (non-usage draft)", () => {
    const rep = new Replica(
      "rep",
      "Replica",
      [],
      { x: 33, y: 44 },
      "some-template-id",
      [{ name: "mainColor", value: "#abcdef" }],
    );
    const json = draft(rep);
    expect(json.type).toBe("Replica");

    const restored = componentFromJson(json) as Replica;
    expect(restored).toBeInstanceOf(Replica);
    expect(restored.position).toEqual({ x: 33, y: 44 });
    expect(restored.targetId).toBe("some-template-id");
    expect(restored.templateData).toEqual([
      { name: "mainColor", value: "#abcdef" },
    ]);
  });

  it("RemoteImage preserves its loading child + image fields", () => {
    const ri = new RemoteImage(
      "ri",
      "Remote Image",
      [],
      [new Rect("loadingChild", "L", [], 0, 0, 10, 10, "rgba(1,1,1,1)", 0)],
      true,
      true,
      20,
      20,
      50,
      50,
      "https://example.test/%NAME%.png",
      true,
      false,
      1,
    );
    const restored = componentFromJson(draft(ri)) as RemoteImage;

    expect(restored).toBeInstanceOf(RemoteImage);
    expect(restored.imageUrl).toBe("https://example.test/%NAME%.png");
    expect(restored.drawLoading).toBe(true);
    expect(restored.getItems().map((c) => c.id)).toEqual(["loadingChild"]);
    expect(restored.getItems()[0]).toBeInstanceOf(Rect);
  });

  it("deeply nested containers preserve the whole id tree", () => {
    // View > Group > [Rect, Hover > [Text, Rect]]
    const inner = new Hover(
      "inner",
      "Hover",
      [],
      [
        new Text(
          "deepText",
          "T",
          [],
          0,
          0,
          "x",
          "VT323",
          10,
          "rgba(1,2,3,1)",
          0,
          false,
          "p",
        ),
        new Rect("deepRect", "R", [], 0, 0, 5, 5, "rgba(4,5,6,1)", 0),
      ],
      true,
      false,
    );
    const group = new GroupComponent(
      "midGroup",
      "G",
      [],
      [new Rect("topRect", "R", [], 0, 0, 5, 5, "rgba(7,8,9,1)", 0), inner],
      true,
    );
    const view = new View("rootView", "V", [], [group], true, 0);

    const restored = componentFromJson(draft(view)) as View;
    const allIds = collectIds(draft(restored));
    expect(allIds).toEqual(
      expect.arrayContaining([
        "rootView",
        "midGroup",
        "topRect",
        "inner",
        "deepText",
        "deepRect",
      ]),
    );

    // navigate the live object tree to confirm structure (not just flat ids)
    const restoredGroup = restored.getItems()[0] as GroupComponent;
    expect(restoredGroup.id).toBe("midGroup");
    const restoredHover = restoredGroup.getItems()[1] as Hover;
    expect(restoredHover).toBeInstanceOf(Hover);
    expect(restoredHover.getItems().map((c) => c.id)).toEqual([
      "deepText",
      "deepRect",
    ]);
  });

  it("reassignIDsFirst re-ids the whole nested tree consistently (duplicate())", () => {
    const view = new View(
      "dupRoot",
      "V",
      [],
      [
        new GroupComponent(
          "dupGroup",
          "G",
          [],
          [new Rect("dupRect", "R", [], 0, 0, 5, 5, "rgba(1,1,1,1)", 0)],
          true,
        ),
      ],
      true,
      0,
    );
    componentFromJson(draft(view)); // register the original

    const copy = componentFromJson(JSON.parse(view.toJson()), true) as View;
    expect(copy).toBeInstanceOf(View);
    // brand-new ids: none of the originals reused
    const copyIds = collectIds(draft(copy));
    expect(copyIds).not.toContain("dupRoot");
    expect(copyIds).not.toContain("dupGroup");
    expect(copyIds).not.toContain("dupRect");
    // structure preserved: still View > Group > Rect
    const copyGroup = copy.getItems()[0] as GroupComponent;
    expect(copyGroup).toBeInstanceOf(GroupComponent);
    expect(copyGroup.getItems()[0]).toBeInstanceOf(Rect);
  });
});

// ---------------------------------------------------------------------------
// 3. Finalized output is plugin-consumable (the deserializer contract)
// ---------------------------------------------------------------------------

describe("finalized export satisfies the plugin deserializers", () => {
  beforeEach(() => resetRegistry());

  /** finalize the usage form of a freshly generated component */
  function finalizeGenerated(typeName: string): JsonObject {
    const comp = componentInfo[typeName].generator();
    return convertToFinalized(JSON.parse(comp.toJson(true)));
  }

  it("Rect color is a plugin-parseable rgba(...)", () => {
    const fin = finalizeGenerated("Rect");
    expect(() => deserializeColor(fin.color)).not.toThrow();
    const c = deserializeColor(fin.color);
    expect(c.r).toBeGreaterThanOrEqual(0);
    expect(c.r).toBeLessThanOrEqual(255);
    expect(c.a).toBe(255); // alpha 1 -> round(1*255)
  });

  it("Text finalizes to a FontDeserializer-readable font + int alignment + rgba color", () => {
    const fin = finalizeGenerated("Text");
    // convertToFinalized splits font:string + size:number into {name,size}
    expect(() => deserializeFont(fin.font)).not.toThrow();
    expect(deserializeFont(fin.font)).toEqual({ name: "VT323", size: 20 });
    expect(() => deserializeTextAlignment(fin.alignment)).not.toThrow();
    expect(deserializeTextAlignment(fin.alignment)).toBe("LEFT");
    expect(() => deserializeColor(fin.color)).not.toThrow();
    // size has been folded into font; not left as a bare field
    expect("size" in fin).toBe(false);
  });

  it("Image finalizes to an ImageDeserializer-readable image{} node", () => {
    const fin = finalizeGenerated("Image");
    expect(() => deserializeImage(fin.image)).not.toThrow();
    expect(deserializeImage(fin.image)).toEqual({
      name: "Play",
      width: 50,
      height: 50,
      dithering: false,
    });
    // width/height/dithering folded into the nested node
    expect("width" in fin).toBe(false);
    expect("height" in fin).toBe(false);
  });

  it("GIF finalizes to a GifDeserializer-readable gifFrames{} node", () => {
    const fin = finalizeGenerated("GIF");
    expect(() => deserializeGif(fin.gifFrames)).not.toThrow();
    expect(deserializeGif(fin.gifFrames)).toMatchObject({
      width: 50,
      height: 50,
      dithering: false,
    });
    expect(fin.pausedByDefault).toBe(false);
  });

  it("Text-Input finalizes maxLength -> int inputHandler and a readable font", () => {
    const fin = finalizeGenerated("Text-Input");
    expect(() => deserializeInputHandler(fin.inputHandler)).not.toThrow();
    expect(deserializeInputHandler(fin.inputHandler)).toBe(7);
    expect("maxLength" in fin).toBe(false);
    expect(() => deserializeFont(fin.font)).not.toThrow();
    // all four colours must be plugin-parseable
    for (const key of [
      "backgroundColor",
      "backgroundColorActive",
      "fontColor",
      "fontColorPlaceholder",
    ]) {
      expect(() => deserializeColor(fin[key])).not.toThrow();
    }
  });

  it("View finalizes to views[] + a defaultComponent (Dummy fallback when empty)", () => {
    const fin = finalizeGenerated("View");
    expect(Array.isArray(fin.views)).toBe(true);
    expect(fin.defaultComponent).toBeDefined();
    // empty View -> Dummy fallback with documented id shape
    expect(fin.defaultComponent.type).toBe("Dummy");
    expect(fin.defaultComponent.id).toBe(`${fin.id}_dummy_default`);
    expect("drawIndex" in fin).toBe(false);
  });

  it("Hover finalizes to normal/hovered Dummy fallbacks when empty", () => {
    const fin = finalizeGenerated("Hover");
    expect(fin.normal).toMatchObject({
      type: "Dummy",
      id: `${fin.id}_dummy_normal`,
      clickAction: null,
      hidden: false,
    });
    expect(fin.hovered).toMatchObject({
      type: "Dummy",
      id: `${fin.id}_dummy_hovered`,
    });
    expect("components" in fin).toBe(false);
    expect("drawHovered" in fin).toBe(false);
  });

  it("Click Animation finalizes to normal/clicked (clicked clones normal when absent)", () => {
    const fin = finalizeGenerated("Click Animation");
    expect(fin.normal).toMatchObject({
      type: "Dummy",
      id: `${fin.id}_dummy_normal`,
    });
    // clicked is a clone of normal (same id) when no 2nd child exists
    expect(fin.clicked).toMatchObject({
      type: "Dummy",
      id: `${fin.id}_dummy_normal`,
    });
    expect("drawClicked" in fin).toBe(false);
  });

  it("Check finalizes to positive/negative Dummy fallbacks + a check node", () => {
    const fin = finalizeGenerated("Check");
    expect(fin.positive).toMatchObject({
      type: "Dummy",
      id: `${fin.id}_dummy_pos`,
    });
    expect(fin.negative).toMatchObject({
      type: "Dummy",
      id: `${fin.id}_dummy_neg`,
    });
    // the check survives (PermissionCheck), with its editor-only `name` stripped
    expect(fin.check.type).toBe("Permission Check");
    expect(fin.check.permission).toBe("ag.group.premium");
    expect("name" in fin.check).toBe(false);
    expect("drawNegative" in fin).toBe(false);
  });

  it("Group finalizes children recursively into a components[] array", () => {
    const group = new GroupComponent(
      "g",
      "Group",
      [],
      [new Rect("r", "R", [], 0, 0, 5, 5, "rgba(10,20,30,1)", 0)],
      true,
    );
    const fin = convertToFinalized(JSON.parse(group.toJson(true)));
    expect(Array.isArray(fin.components)).toBe(true);
    expect(fin.components).toHaveLength(1);
    expect(fin.components[0].type).toBe("Rect");
    expect(() => deserializeColor(fin.components[0].color)).not.toThrow();
  });

  it("every color/font/image leaf in a finalized List page is plugin-readable", () => {
    // List in usage form transpiles to a View of Groups; placeholders like
    // "#color" get substituted with concrete rgba(...) before export.
    const list = componentInfo["List"].generator() as List;
    const fin = convertToFinalized(JSON.parse(list.toJson(true)));

    let textNodes = 0;
    let rectNodes = 0;
    walkFinalized(fin, (n) => {
      if (n.type === "Text") {
        textNodes++;
        expect(() => deserializeFont(n.font)).not.toThrow();
        expect(() => deserializeColor(n.color)).not.toThrow();
        expect(() => deserializeTextAlignment(n.alignment)).not.toThrow();
      }
      if (n.type === "Rect") {
        rectNodes++;
        // the "#color" placeholder must have been replaced with real rgba(...)
        expect(String(n.color).startsWith("rgba(")).toBe(true);
        expect(() => deserializeColor(n.color)).not.toThrow();
      }
    });
    // sanity: we actually visited the transpiled leaves
    expect(textNodes).toBeGreaterThan(0);
    expect(rectNodes).toBeGreaterThan(0);
  });

  it("convertToFinalized converts action -> clickAction and adds hidden=false", () => {
    // a plain Rect with no action gets clickAction:null + hidden:false
    const fin = finalizeGenerated("Rect");
    expect(fin.clickAction).toBeNull();
    expect(fin.hidden).toBe(false);
    expect("action" in fin).toBe(false);
    expect("name" in fin).toBe(false);
  });
});

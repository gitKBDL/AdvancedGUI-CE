/**
 * Contract tests for the three plugin features added in format 1.0.10:
 *
 *   1. ditheringIntensity (Image / GIF / Remote Image)
 *      Plugin: Image/GifDeserializer read it INSIDE the image/gifFrames node —
 *      `has("ditheringIntensity") ? max(0, min(100, asInt())) : 100`;
 *      RemoteImageComponent takes it as a TOP-LEVEL nullable Integer ctor param
 *      (null -> 100). The editor omits the field at the default (100) so
 *      untouched projects export byte-identically to pre-1.0.10 output.
 *
 *   2. registerPlaceholder (Text-Input)
 *      Plugin: @JsonCreator boolean — absent == false (Jackson primitive
 *      default). Editor emits it only when explicitly true; fromJson treats
 *      missing as false so old drafts don't silently start registering PAPI
 *      placeholders.
 *
 *   3. metadataGroup (layout level)
 *      Plugin: `jsonNode.has("metadataGroup") ? asText() : null`; null falls
 *      back to the layout name (Layout.metadataGroupName). Editor exports the
 *      trimmed value only when non-empty.
 *
 * Plus the export-crash guard: View.drawIndex out of views' range is clamped
 * (stale index after child deletion must not clone undefined and throw).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetRegistry } from "./helpers";
import { convertToFinalized } from "@/utils/LocalConverter";
import type { JsonObject } from "@/utils/manager/ComponentManager";
import { componentFromJson } from "@/utils/manager/ComponentManager";
import { componentTree } from "@/utils/manager/WorkspaceManager";
import { settings } from "@/utils/manager/SettingsManager";
import { bundleCurrentProjectData } from "@/utils/handler/ProjectSerializationHandler";
import { sanitizeImportedProjectData } from "@/utils/ProjectValidation";
import { migrate, VERSION } from "@/utils/manager/UpdateManager";
import { Image, normalizeDitheringIntensity } from "@/utils/components/Image";
import { GIF } from "@/utils/components/GIF";
import { TextInput } from "@/utils/components/TextInput";
import { Rect } from "@/utils/components/Rect";
import {
  deserializeImage,
  deserializeGif,
} from "./contract/pluginDeserializers";

function finalizeOf(compJson: JsonObject): JsonObject {
  return convertToFinalized(compJson);
}

beforeEach(() => resetRegistry());

// ---------------------------------------------------------------------------
// ditheringIntensity
// ---------------------------------------------------------------------------

describe("ditheringIntensity -> nested image/gifFrames node (Image, GIF)", () => {
  it("Image: non-default intensity is nested inside image{} and plugin-readable", () => {
    const img = new Image("i1", "Img", [], 0, 0, 32, 16, "Stop", false, true, 40);
    const finalized = finalizeOf(JSON.parse(img.toJson(true)) as JsonObject);

    expect(finalized.image).toMatchObject({
      name: "Stop",
      dithering: true,
      ditheringIntensity: 40,
    });
    // never left at the top level
    expect("ditheringIntensity" in finalized).toBe(false);

    const parsed = deserializeImage(finalized.image);
    expect(parsed.ditheringIntensity).toBe(40);
  });

  it("Image: default intensity (100) is OMITTED — exports stay byte-identical", () => {
    const img = new Image("i2", "Img", [], 0, 0, 32, 16, "Stop", false, true, 100);
    const finalized = finalizeOf(JSON.parse(img.toJson(true)) as JsonObject);

    expect("ditheringIntensity" in (finalized.image as object)).toBe(false);
    // mirror falls back to the plugin default
    expect(deserializeImage(finalized.image).ditheringIntensity).toBe(100);
  });

  it("GIF: intensity nests inside gifFrames{} and is plugin-readable", () => {
    const gif = new GIF("g1", "Gif", [], 0, 0, 24, 24, "spin", true, true, 5, false);
    const finalized = finalizeOf(JSON.parse(gif.toJson(true)) as JsonObject);

    expect(finalized.gifFrames).toMatchObject({ ditheringIntensity: 5 });
    expect("ditheringIntensity" in finalized).toBe(false);
    expect(deserializeGif(finalized.gifFrames).ditheringIntensity).toBe(5);
  });

  it("out-of-range / junk drafts are clamped into the plugin contract 0..100", () => {
    expect(normalizeDitheringIntensity(150)).toBe(100);
    expect(normalizeDitheringIntensity(-3)).toBe(0);
    expect(normalizeDitheringIntensity(59.7)).toBe(60);
    expect(normalizeDitheringIntensity("77")).toBe(77);
    expect(normalizeDitheringIntensity(undefined)).toBe(100);
    expect(normalizeDitheringIntensity("junk")).toBe(100);
  });

  it("Image.fromJson threads the field (load -> save round-trip keeps it)", () => {
    const source = new Image("i3", "Img", [], 0, 0, 8, 8, "Play", true, true, 25);
    const restored = componentFromJson(
      JSON.parse(source.toJson()) as JsonObject,
    ) as Image;
    expect(restored.ditheringIntensity).toBe(25);
    // pre-1.0.10 draft without the field -> plugin default
    const legacyJson = JSON.parse(source.toJson()) as JsonObject;
    delete legacyJson.ditheringIntensity;
    legacyJson.id = "i4";
    const legacy = componentFromJson(legacyJson) as Image;
    expect(legacy.ditheringIntensity).toBe(100);
  });
});

describe("ditheringIntensity -> top-level field (Remote Image)", () => {
  // The RemoteImage constructor performs DOM side-effects (placeRemoteImage),
  // so exercise the converter on a hand-built draft — the exact toJson(true)
  // shape — like structure.contract.test.ts does.
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
      dithering: true,
      ditheringIntensity: 100,
      ratio: 1,
      components: [],
      expanded: true,
      ...over,
    };
  }

  it("non-default intensity stays TOP-LEVEL (plugin ctor param, not nested)", () => {
    const finalized = convertToFinalized(
      remoteImageDraft({ ditheringIntensity: 33 }),
    );
    expect(finalized.ditheringIntensity).toBe(33);
  });

  it("default intensity (100) is omitted — plugin's nullable Integer -> 100", () => {
    const finalized = convertToFinalized(remoteImageDraft({}));
    expect("ditheringIntensity" in finalized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// registerPlaceholder
// ---------------------------------------------------------------------------

describe("registerPlaceholder (Text-Input)", () => {
  function makeInput(register: boolean): TextInput {
    return new TextInput(
      "ti",
      "Text-Input",
      [],
      0,
      0,
      64,
      20,
      3,
      "rgba(0,0,0,1)",
      "rgba(0,0,0,1)",
      "",
      "Name...",
      7,
      "rgba(255,255,255,1)",
      "rgba(200,200,200,1)",
      "VT323",
      18,
      register,
    );
  }

  it("explicit true survives finalization (plugin enables the PAPI placeholder)", () => {
    const finalized = finalizeOf(
      JSON.parse(makeInput(true).toJson(true)) as JsonObject,
    );
    expect(finalized.registerPlaceholder).toBe(true);
  });

  it("false is OMITTED — matches Jackson's absent-boolean default and keeps old exports byte-identical", () => {
    const finalized = finalizeOf(
      JSON.parse(makeInput(false).toJson(true)) as JsonObject,
    );
    expect("registerPlaceholder" in finalized).toBe(false);
  });

  it("fromJson: missing field (pre-1.0.10 draft) -> false, never a silent enable", () => {
    const legacyJson = JSON.parse(makeInput(true).toJson()) as JsonObject;
    delete legacyJson.registerPlaceholder;
    const restored = componentFromJson(legacyJson) as TextInput;
    expect(restored.registerPlaceholder).toBe(false);
  });

  it("fromJson: explicit true round-trips", () => {
    const restored = componentFromJson(
      JSON.parse(makeInput(true).toJson()) as JsonObject,
    ) as TextInput;
    expect(restored.registerPlaceholder).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// metadataGroup
// ---------------------------------------------------------------------------

describe("metadataGroup (layout level)", () => {
  beforeEach(() => {
    settings.projectName = "My GUI";
    settings.metadataGroup = "";
    componentTree.value = [];
  });

  it("set -> exported trimmed at the top level of the project payload", () => {
    settings.metadataGroup = "  shop-guis  ";
    const bundle = bundleCurrentProjectData();
    expect(bundle.metadataGroup).toBe("shop-guis");
  });

  it("empty -> field entirely absent (plugin falls back to the layout name)", () => {
    settings.metadataGroup = "";
    const bundle = bundleCurrentProjectData();
    expect("metadataGroup" in bundle).toBe(false);
  });

  it("import sanitizer passes a valid metadataGroup through and drops junk", () => {
    const base = {
      name: "P",
      version: VERSION,
      width: 3,
      height: 2,
      invisible: [],
      fonts: [],
      images: [],
      gifs: [],
      componentTree: { type: "Group", components: [] },
      exportedTree: { draft: { type: "Group", components: [] } },
    };

    const good = sanitizeImportedProjectData({ ...base, metadataGroup: " grp " });
    expect(good?.metadataGroup).toBe("grp");

    const junk = sanitizeImportedProjectData({ ...base, metadataGroup: 42 });
    expect(junk).not.toBeNull();
    expect(junk && "metadataGroup" in junk).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// migration 1.0.9 -> 1.0.10
// ---------------------------------------------------------------------------

describe("migrate() 1.0.9 -> 1.0.10 backfill", () => {
  function comp(extra: Record<string, unknown> = {}): Record<string, unknown> {
    return { action: [], ...extra };
  }

  it("backfills ditheringIntensity=100 and registerPlaceholder=false", () => {
    const project = {
      name: "legacy",
      version: "1.0.9",
      invisible: [],
      width: 100,
      height: 100,
      componentTree: comp({
        type: "Group",
        components: [
          comp({ type: "Image", image: "Play" }),
          comp({ type: "GIF", image: "anim" }),
          comp({ type: "Remote Image", imageUrl: "https://x/y.png" }),
          comp({ type: "Text-Input" }),
        ],
      }),
    };
    // migrate() takes the editor Project shape but operates on raw JSON drafts
    const out = migrate(project as unknown as Parameters<typeof migrate>[0]);
    expect(out.version).toBe(VERSION);

    const tree = out.componentTree as unknown as {
      components: Record<string, unknown>[];
    };
    const [img, gif, remote, textInput] = tree.components;
    expect(img.ditheringIntensity).toBe(100);
    expect(gif.ditheringIntensity).toBe(100);
    expect(remote.ditheringIntensity).toBe(100);
    expect(textInput.registerPlaceholder).toBe(false);
  });

  it("does not overwrite explicit values", () => {
    const project = {
      name: "legacy",
      version: "1.0.9",
      invisible: [],
      width: 100,
      height: 100,
      componentTree: comp({
        type: "Group",
        components: [
          comp({ type: "Image", ditheringIntensity: 12 }),
          comp({ type: "Text-Input", registerPlaceholder: true }),
        ],
      }),
    };
    const out = migrate(project as unknown as Parameters<typeof migrate>[0]);
    const tree = out.componentTree as unknown as {
      components: Record<string, unknown>[];
    };
    expect(tree.components[0].ditheringIntensity).toBe(12);
    expect(tree.components[1].registerPlaceholder).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// View drawIndex clamp (export-crash guard)
// ---------------------------------------------------------------------------

describe("View stale drawIndex is clamped instead of crashing the export", () => {
  it("drawIndex beyond views length falls back to a real view", () => {
    const rect = Rect.generator();
    const viewDraft: JsonObject = {
      id: "v1",
      type: "View",
      drawIndex: 5, // stale: only one child left
      components: [JSON.parse(rect.toJson(true))],
      expanded: true,
    };
    const finalized = convertToFinalized(viewDraft);
    expect(finalized.views).toHaveLength(1);
    // clamped to index 0 — a real component, not undefined
    expect(finalized.defaultComponent).toEqual(finalized.views[0]);
  });

  it("negative drawIndex clamps to 0", () => {
    const rect = Rect.generator();
    const viewDraft: JsonObject = {
      id: "v2",
      type: "View",
      drawIndex: -2,
      components: [JSON.parse(rect.toJson(true))],
      expanded: true,
    };
    const finalized = convertToFinalized(viewDraft);
    expect(finalized.defaultComponent).toEqual(finalized.views[0]);
  });
});

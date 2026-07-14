import { describe, it, expect, beforeEach } from "vitest";
import { resetRegistry } from "./helpers";
import { convertToFinalized } from "@/utils/LocalConverter";
import { Image } from "@/utils/components/Image";
import { GIF } from "@/utils/components/GIF";
import { Text } from "@/utils/components/Text";
import { TextInput } from "@/utils/components/TextInput";
import { JsonObject } from "@/utils/manager/ComponentManager";
import {
  deserializeImage,
  deserializeGif,
  deserializeFont,
  deserializeInputHandler,
  PluginParseError,
} from "./contract/pluginDeserializers";

/**
 * CONTRACT GUARDED BY THIS FILE
 * -----------------------------
 * The AdvancedGUI plugin (3.0.3) reads the leaf "shape" objects of Image, GIF and
 * font-bearing (Text / Text-Input) components through dedicated Jackson
 * deserializers:
 *
 *   ImageDeserializer / GifDeserializer  read  { name:text, width:int, height:int, dithering?:bool }
 *                                        nested inside  "image" / "gifFrames".
 *   FontDeserializer                     reads  { name:text, size:double }  nested inside "font".
 *   InputHandlerDeserializer             reads  an int token  ("inputHandler", from editor "maxLength").
 *
 * The editor only ever ships the FINALIZED object — i.e.
 *   convertToFinalized( JSON.parse( component.toJson(true) ) ).
 * These tests prove that finalization restructures the editor's flat draft into
 * exactly the nested leaf shape each plugin deserializer expects, and that every
 * field has the JSON type the plugin will coerce without throwing. We assert the
 * contract end-to-end by feeding the finalized leaves through the deserializer
 * mirrors and requiring NO PluginParseError.
 */

/** draft = the export form the editor serializes; what convertToFinalized() consumes. */
function draftOf(component: { toJson(forUsage?: boolean): string }): JsonObject {
  return JSON.parse(component.toJson(true)) as JsonObject;
}

function finalize(component: {
  toJson(forUsage?: boolean): string;
}): JsonObject {
  return convertToFinalized(draftOf(component));
}

describe("font/image/gif leaf shapes -> plugin deserializers", () => {
  beforeEach(() => resetRegistry());

  // -------------------------------------------------------------------------
  // Image
  // -------------------------------------------------------------------------
  describe("Image.generator() -> convertToFinalized -> ImageDeserializer", () => {
    it("nests the image leaf as { name, width, height, dithering } and removes the flat fields", () => {
      const finalized = finalize(Image.generator());

      // The nested leaf the plugin's ImageDeserializer reads.
      expect(finalized.image).toEqual({
        name: "Play", // Image.generator() default image id
        width: 50,
        height: 50,
        dithering: false,
      });

      // The flat draft fields must NOT survive finalization at the top level,
      // otherwise the plugin's component-level reader sees duplicated geometry.
      expect(finalized).not.toHaveProperty("width");
      expect(finalized).not.toHaveProperty("height");
      expect(finalized).not.toHaveProperty("dithering");
      // keepImageRatio is an editor-only concept; the plugin has no field for it.
      expect(finalized).not.toHaveProperty("keepImageRatio");
    });

    it("is accepted by deserializeImage and yields integer width/height", () => {
      const finalized = finalize(Image.generator());

      let parsed!: ReturnType<typeof deserializeImage>;
      expect(() => {
        parsed = deserializeImage(finalized.image);
      }).not.toThrow();

      expect(parsed.name).toBe("Play");
      expect(Number.isInteger(parsed.width)).toBe(true);
      expect(Number.isInteger(parsed.height)).toBe(true);
      expect(parsed.width).toBe(50);
      expect(parsed.height).toBe(50);
      expect(parsed.dithering).toBe(false);
    });

    it("preserves dithering=true through finalization", () => {
      const img = new Image("img1", "Img", [], 5, 6, 32, 16, "Stop", false, true, 100);
      const finalized = finalize(img);

      expect(finalized.image).toMatchObject({ name: "Stop", dithering: true });
      const parsed = deserializeImage(finalized.image);
      expect(parsed.dithering).toBe(true);
      expect(parsed.width).toBe(32);
      expect(parsed.height).toBe(16);
    });

    it("rejects (via the mirror) a non-integer width — guards the int contract", () => {
      // Sanity check that the mirror really enforces int — proves the passing
      // tests above are not tautological.
      const bad = { name: "X", width: 50.5, height: 16, dithering: false };
      expect(() => deserializeImage(bad)).toThrow(PluginParseError);
    });
  });

  // -------------------------------------------------------------------------
  // GIF
  // -------------------------------------------------------------------------
  describe("GIF.generator() -> convertToFinalized -> GifDeserializer", () => {
    it("nests the leaf under gifFrames as { name, width, height, dithering } and drops the flat fields", () => {
      const finalized = finalize(GIF.generator());

      expect(finalized.gifFrames).toEqual({
        name: "", // GIF.generator() default image id is empty
        width: 50,
        height: 50,
        dithering: false,
      });

      // GIF must produce gifFrames, never an "image" leaf, and no flat geometry.
      expect(finalized).not.toHaveProperty("image");
      expect(finalized).not.toHaveProperty("width");
      expect(finalized).not.toHaveProperty("height");
      expect(finalized).not.toHaveProperty("dithering");
    });

    it("is accepted by deserializeGif with integer width/height", () => {
      const gif = new GIF("g1", "Gif", [], 0, 0, 24, 24, "spin", true, true, 100, false);
      const finalized = finalize(gif);

      let parsed!: ReturnType<typeof deserializeGif>;
      expect(() => {
        parsed = deserializeGif(finalized.gifFrames);
      }).not.toThrow();

      expect(parsed.name).toBe("spin");
      expect(Number.isInteger(parsed.width)).toBe(true);
      expect(Number.isInteger(parsed.height)).toBe(true);
      expect(parsed.width).toBe(24);
      expect(parsed.height).toBe(24);
      expect(parsed.dithering).toBe(true);
    });

    it("preserves pausedByDefault at the top level (plugin reads it outside gifFrames)", () => {
      const pausedGif = new GIF("g2", "Gif2", [], 1, 1, 10, 10, "anim", true, false, 100, true);
      const finalized = finalize(pausedGif);

      expect(finalized.pausedByDefault).toBe(true);
      // it must remain a top-level scalar, not absorbed into gifFrames.
      expect(finalized.gifFrames).not.toHaveProperty("pausedByDefault");

      const notPaused = finalize(GIF.generator());
      expect(notPaused.pausedByDefault).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Text font
  // -------------------------------------------------------------------------
  describe("Text.generator() -> convertToFinalized -> FontDeserializer", () => {
    it("normalizes the flat font string + size into a { name, size } leaf", () => {
      const finalized = finalize(Text.generator());

      expect(finalized.font).toEqual({ name: "VT323", size: 20 });
      // The flat numeric "size" must be folded into font and removed.
      expect(finalized).not.toHaveProperty("size");
      // Editor-only preview fields must not leak into the plugin config.
      expect(finalized).not.toHaveProperty("placeholder");
      expect(finalized).not.toHaveProperty("previewText");
    });

    it("is accepted by deserializeFont and exposes a numeric size", () => {
      const finalized = finalize(Text.generator());

      let parsed!: ReturnType<typeof deserializeFont>;
      expect(() => {
        parsed = deserializeFont(finalized.font);
      }).not.toThrow();

      expect(parsed.name).toBe("VT323");
      expect(typeof parsed.size).toBe("number");
      expect(parsed.size).toBe(20);
    });

    it("EDGE: a float font size stays numeric and FontDeserializer (asDouble) accepts it", () => {
      // size is read via JsonNode.asDouble() in the plugin, so non-integers are
      // valid. Verify finalization keeps the float intact rather than rounding
      // or stringifying it.
      const text = new Text(
        "t1",
        "Floaty",
        [],
        0,
        0,
        "Hi",
        "Minecraftia",
        13.5, // float size
        "rgba(0,0,0,1)",
        0,
        false,
        "",
      );
      const finalized = finalize(text);

      expect(finalized.font).toEqual({ name: "Minecraftia", size: 13.5 });

      const parsed = deserializeFont(finalized.font);
      expect(parsed.size).toBe(13.5);
      expect(Number.isFinite(parsed.size)).toBe(true);
    });

    it("guards the leaf shape: deserializeFont throws when name is missing", () => {
      // Proves the FontDeserializer mirror actually enforces the required name
      // node (Java NPE), so the green tests above are meaningful.
      expect(() => deserializeFont({ size: 20 })).toThrow(PluginParseError);
    });
  });

  // -------------------------------------------------------------------------
  // Text-Input font + inputHandler
  // -------------------------------------------------------------------------
  describe("TextInput.generator() -> convertToFinalized -> FontDeserializer + InputHandlerDeserializer", () => {
    it("normalizes font into { name, size } accepted by deserializeFont", () => {
      const finalized = finalize(TextInput.generator());

      expect(finalized.font).toEqual({ name: "VT323", size: 20 });
      expect(finalized).not.toHaveProperty("size");

      const parsed = deserializeFont(finalized.font);
      expect(parsed.name).toBe("VT323");
      expect(parsed.size).toBe(20);
    });

    it("derives inputHandler from maxLength as an int the plugin accepts", () => {
      const finalized = finalize(TextInput.generator());

      // maxLength (editor) -> inputHandler (plugin); the flat field is removed.
      expect(finalized.inputHandler).toBe(7); // TextInput.generator() default maxLength
      expect(finalized).not.toHaveProperty("maxLength");

      let handler!: number;
      expect(() => {
        handler = deserializeInputHandler(finalized.inputHandler);
      }).not.toThrow();
      expect(handler).toBe(7);
      expect(Number.isInteger(handler)).toBe(true);
    });

    it("defaults defaultInput to an empty string when blank", () => {
      // generator() default defaultInput is "" already; finalization keeps it a
      // string (the plugin expects a text node, never null).
      const finalized = finalize(TextInput.generator());
      expect(finalized.defaultInput).toBe("");
      expect(typeof finalized.defaultInput).toBe("string");
    });
  });
});

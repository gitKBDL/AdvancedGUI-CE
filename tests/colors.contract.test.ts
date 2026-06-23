/**
 * CONTRACT: every color string the editor stores or exports must be readable by
 * the AdvancedGUI plugin's `ColorDeserializer`.
 *
 * The plugin parses a color by stripping spaces, taking `substring(5, len-1)`
 * (i.e. assuming a literal 5-char "rgba(" prefix and a trailing ")"), splitting
 * on "," into >= 4 parts, then `new Color(parseInt r, parseInt g, parseInt b,
 * round(parseDouble(a) * 255))`. Every channel must land in 0..255 or the Java
 * `Color` constructor throws. Hex ("#abc") and "rgb(...)" forms are NOT
 * parseable by this code path.
 *
 * This suite guards:
 *  - ColorUtils.hexToRgba / rgbaToHex round-trips, including the alpha-rounding
 *    edge cases the plugin applies (a=1 -> 255, a=0 -> 0, a=0.5 -> 128).
 *  - getRandomColor() / getRandomColorHex() always produce plugin-readable rgba.
 *  - Every color field emitted by the color-bearing component generators
 *    (Rect.color, Text.color, Text-Input's 4 color fields) survives
 *    JSON.parse(toJson(true)) -> convertToFinalized(...) AND is accepted by the
 *    plugin mirror, yielding channels in 0..255.
 *  - The mirror correctly REJECTS hex and "rgb(" forms, proving the editor must
 *    never store those raw.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetRegistry } from "./helpers";
import {
  hexToRgba,
  rgbaToHex,
  getRandomColor,
  getRandomColorHex,
} from "@/utils/ColorUtils";
import { Rect } from "@/utils/components/Rect";
import { Text } from "@/utils/components/Text";
import { TextInput } from "@/utils/components/TextInput";
import { convertToFinalized } from "@/utils/LocalConverter";
import {
  deserializeColor,
  PluginParseError,
  type AwtColor,
} from "./contract/pluginDeserializers";
import type { JsonObject } from "@/utils/manager/ComponentManager";

/** Build the finalized config the plugin actually parses from a live component. */
function finalize(component: { toJson: (forUsage?: boolean) => string }): JsonObject {
  const draft = JSON.parse(component.toJson(true)) as JsonObject;
  return convertToFinalized(draft);
}

/** Assert a color string is plugin-readable and its channels are well-formed. */
function expectPluginReadable(color: unknown): AwtColor {
  expect(typeof color).toBe("string");
  let parsed: AwtColor;
  expect(() => {
    parsed = deserializeColor(color);
  }).not.toThrow();
  // @ts-expect-error assigned inside the not-toThrow closure
  const c = parsed as AwtColor;
  for (const v of [c.r, c.g, c.b, c.a]) {
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(255);
  }
  return c;
}

beforeEach(() => resetRegistry());

describe("ColorUtils.hexToRgba -> ColorDeserializer", () => {
  it("emits the exact 'rgba(R,G,B,A)' shape the plugin substring(5,..) expects", () => {
    // The plugin literally drops the first 5 chars; any other prefix corrupts R.
    expect(hexToRgba("#FF8800", 1)).toBe("rgba(255,136,0,1)");
    expect(hexToRgba("#FF8800", 1).startsWith("rgba(")).toBe(true);
    expect(hexToRgba("#FF8800", 1).endsWith(")")).toBe(true);
  });

  it("produces channels the plugin parses back to the original RGB", () => {
    const color = hexToRgba("#1A2B3C", 1);
    const awt = expectPluginReadable(color);
    expect(awt.r).toBe(0x1a);
    expect(awt.g).toBe(0x2b);
    expect(awt.b).toBe(0x3c);
    expect(awt.a).toBe(255);
  });

  it("pure black rgba(0,0,0,1) -> a=255 (alpha 1 rounds to 255)", () => {
    const awt = expectPluginReadable(hexToRgba("#000000", 1));
    expect(awt).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  it("pure white rgba(255,255,255,1) -> all 255", () => {
    const awt = expectPluginReadable(hexToRgba("#FFFFFF", 1));
    expect(awt).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  it("alpha 0 -> a=0 (fully transparent stays in range)", () => {
    const color = hexToRgba("#FFFFFF", 0);
    expect(color).toBe("rgba(255,255,255,0)");
    expect(expectPluginReadable(color).a).toBe(0);
  });

  it("alpha 0.5 -> round(0.5*255)=128 (the plugin's alpha rounding)", () => {
    const color = hexToRgba("#FFFFFF", 0.5);
    expect(color).toBe("rgba(255,255,255,0.5)");
    expect(expectPluginReadable(color).a).toBe(128);
  });

  it("lowercase hex is normalized and still parses", () => {
    // hexToRgba uppercases internally; verify a lowercase input round-trips.
    const awt = expectPluginReadable(hexToRgba("#abcdef", 1));
    expect(awt.r).toBe(0xab);
    expect(awt.g).toBe(0xcd);
    expect(awt.b).toBe(0xef);
  });

  it("every fractional alpha in [0,1] yields an in-range plugin alpha", () => {
    for (const a of [0, 0.1, 0.25, 0.33, 0.5, 0.66, 0.75, 0.9, 1]) {
      const awt = expectPluginReadable(hexToRgba("#808080", a));
      expect(awt.a).toBe(Math.round(a * 255));
    }
  });
});

describe("ColorUtils.rgbaToHex round-trip", () => {
  it("inverts hexToRgba for a sweep of colors (hex + alpha preserved)", () => {
    for (const hex of ["#000000", "#FFFFFF", "#FF8800", "#1A2B3C", "#0099CC"]) {
      const rgba = hexToRgba(hex, 1);
      const back = rgbaToHex(rgba);
      expect(back.hex.toUpperCase()).toBe(hex.toUpperCase());
      expect(back.alpha).toBe(1);
    }
  });

  it("preserves a fractional alpha through the round-trip", () => {
    const back = rgbaToHex(hexToRgba("#123456", 0.5));
    expect(back.hex.toUpperCase()).toBe("#123456");
    expect(back.alpha).toBe(0.5);
  });
});

describe("ColorUtils random color generators -> ColorDeserializer", () => {
  it("getRandomColorHex() is a 7-char #RRGGBB hex string", () => {
    for (let i = 0; i < 200; i++) {
      const hex = getRandomColorHex();
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("getRandomColor() always yields a plugin-readable rgba with alpha 1 (a=255)", () => {
    for (let i = 0; i < 200; i++) {
      const color = getRandomColor();
      expect(color).toMatch(/^rgba\(\d{1,3},\d{1,3},\d{1,3},1\)$/);
      const awt = expectPluginReadable(color);
      expect(awt.a).toBe(255);
    }
  });
});

describe("Rect.generator() color is plugin-readable", () => {
  it("Rect.color (random) survives finalize() and parses", () => {
    const rect = Rect.generator();
    expect(rect.color).toMatch(/^rgba\(/);
    expectPluginReadable(rect.color);

    const finalized = finalize(rect);
    expect(finalized.type).toBe("Rect");
    expectPluginReadable(finalized.color);
  });

  it("100 fresh Rect generators all emit parseable colors", () => {
    for (let i = 0; i < 100; i++) {
      const finalized = finalize(Rect.generator());
      expectPluginReadable(finalized.color);
    }
  });
});

describe("Text.generator() color is plugin-readable", () => {
  it("Text.color (random) survives finalize() and parses", () => {
    const text = Text.generator();
    expect(text.color).toMatch(/^rgba\(/);
    expectPluginReadable(text.color);

    const finalized = finalize(text);
    expect(finalized.type).toBe("Text");
    // finalizeTextComponent must not touch the color field.
    expectPluginReadable(finalized.color);
  });

  it("100 fresh Text generators all emit parseable colors", () => {
    for (let i = 0; i < 100; i++) {
      const finalized = finalize(Text.generator());
      expectPluginReadable(finalized.color);
    }
  });
});

describe("TextInput.generator() colors are plugin-readable", () => {
  const COLOR_FIELDS = [
    "backgroundColor",
    "backgroundColorActive",
    "fontColor",
    "fontColorPlaceholder",
  ] as const;

  it("all four color fields parse on the raw generator instance", () => {
    const input = TextInput.generator();
    // These are fixed (non-random) defaults built via hexToRgba.
    expect(input.backgroundColor).toBe("rgba(45,83,128,1)");
    expect(input.backgroundColorActive).toBe("rgba(4,44,93,1)");
    expect(input.fontColor).toBe("rgba(238,238,238,1)");
    expect(input.fontColorPlaceholder).toBe("rgba(196,196,196,1)");
    for (const field of COLOR_FIELDS) {
      expectPluginReadable(input[field]);
    }
  });

  it("all four color fields survive finalize() and parse", () => {
    const finalized = finalize(TextInput.generator());
    expect(finalized.type).toBe("Text-Input");
    for (const field of COLOR_FIELDS) {
      // backgroundColorActive in particular must NOT be stripped by finalization.
      expect(finalized[field]).toBeDefined();
      expectPluginReadable(finalized[field]);
    }
  });
});

describe("ColorDeserializer correctly REJECTS non-rgba forms", () => {
  it("rejects raw hex '#abc' (no rgba prefix => corrupt channels/short)", () => {
    expect(() => deserializeColor("#abcdef")).toThrow(PluginParseError);
    expect(() => deserializeColor("#abc")).toThrow(PluginParseError);
  });

  it("rejects the 'rgb(...)' (no-alpha) form: only 3 channels after substring(5)", () => {
    // "rgb(255,0,0)" -> strip none -> substring(5) drops "rgb(2" leaving
    // "55,0,0", split => 3 parts < 4 channels => ArrayIndexOutOfBounds.
    expect(() => deserializeColor("rgb(255,0,0)")).toThrow(PluginParseError);
  });

  it("rejects out-of-range channels (Color constructor range check)", () => {
    expect(() => deserializeColor("rgba(256,0,0,1)")).toThrow(PluginParseError);
    expect(() => deserializeColor("rgba(-1,0,0,1)")).toThrow(PluginParseError);
    // alpha 2 -> round(2*255)=510 > 255
    expect(() => deserializeColor("rgba(0,0,0,2)")).toThrow(PluginParseError);
  });

  it("tolerates spaces inside a valid rgba (plugin strips them)", () => {
    const awt = deserializeColor("rgba( 12 , 34 , 56 , 1 )");
    expect(awt).toEqual({ r: 12, g: 34, b: 56, a: 255 });
  });
});

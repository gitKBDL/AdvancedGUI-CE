/**
 * Correctness: ParsedText must NOT trim lines. In a pixel-precise GUI tool,
 * leading/trailing spaces a user typed are meaningful; trimming made the
 * rendered/measured text diverge from the stored (and exported) text.
 *
 * The fake 2D context (tests/setup.ts) measures 6px per character, so widths
 * are deterministic.
 */
import { describe, it, expect } from "vitest";
import { makeFakeContext } from "./helpers";
import { ParsedText } from "@/utils/ParsedText";

describe("ParsedText — whitespace preservation", () => {
  it("keeps leading/trailing spaces so render width matches the text", () => {
    const parsed = new ParsedText("  hi  ", "rgb(0,0,0)", "s", makeFakeContext());
    expect(parsed.getLine(0)[0].text).toBe("  hi  ");
    expect(parsed.getLineAdvanceWidth(0)).toBe("  hi  ".length * 6); // 36
    expect(parsed.width).toBe(36);
  });

  it("measures a spaces-only line as non-zero width", () => {
    const parsed = new ParsedText("   ", "rgb(0,0,0)", "s", makeFakeContext());
    expect(parsed.getLineAdvanceWidth(0)).toBe(18); // 3 spaces * 6
  });

  it("preserves spaces in fragments split around color codes", () => {
    // "§a hi " -> color code 'a', then a fragment " hi " WITH its trailing space.
    const parsed = new ParsedText("§a hi ", "rgb(0,0,0)", "s", makeFakeContext());
    const texts = parsed.getLine(0).map((f) => f.text);
    expect(texts).toContain(" hi ");
  });
});

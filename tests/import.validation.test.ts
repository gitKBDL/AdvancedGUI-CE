/**
 * Contract tests for src/utils/ProjectValidation.ts -> sanitizeImportedProjectData.
 *
 * This is the IMPORT attack surface: an untrusted .agui project file (arbitrary
 * JSON) is fed into the editor. sanitizeImportedProjectData is the gate that must
 * either (a) reject the blob (=> null) or (b) return a normalized Project that the
 * rest of the editor — and ultimately the AdvancedGUI *plugin* — can safely consume.
 *
 * What we guard here:
 *  - Required scalar fields (name/version/width/height/componentTree) are present,
 *    typed, and bounded. The bounds (name<=120, version<=40, 1..512 canvas dims)
 *    cap memory/DoS blast radius before any component is ever instantiated.
 *  - Untrusted list fields are scrubbed: invisible IDs de-duped/trimmed/string-only,
 *    and fonts/images/gifs keep only entries with a real name + string data. These
 *    feed FontDeserializer / Image|GifDeserializer in the plugin, which read
 *    `name`/`data`; junk entries must never reach them.
 *  - exportedTree always ends up well-formed ({draft: ...}) even when the import
 *    omits or corrupts it, by falling back to a deep clone of the componentTree.
 *  - The MAX_IMPORT_FILE_BYTES guard constant is the documented 20 MiB.
 *
 * These are pure-module tests: inputs are plain objects (no component classes).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  sanitizeImportedProjectData,
  MAX_IMPORT_FILE_BYTES,
} from "@/utils/ProjectValidation";
import { resetRegistry } from "./helpers";

/** Minimal componentTree the validator accepts: an object with a `components` array. */
function makeTree(extra: Record<string, unknown> = {}) {
  return { id: "root", type: "View", components: [], ...extra };
}

/** A fully valid raw import blob; spread + override per test. */
function makeValidRaw(overrides: Record<string, unknown> = {}) {
  return {
    name: "My Project",
    version: "3.0.3",
    width: 128,
    height: 256,
    invisible: ["a", "b"],
    fonts: [],
    images: [],
    gifs: [],
    componentTree: makeTree(),
    exportedTree: { draft: makeTree() },
    ...overrides,
  };
}

beforeEach(() => {
  resetRegistry();
});

describe("MAX_IMPORT_FILE_BYTES", () => {
  it("is exactly the documented 20 MiB pre-parse guard", () => {
    expect(MAX_IMPORT_FILE_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_IMPORT_FILE_BYTES).toBe(20_971_520);
  });
});

describe("sanitizeImportedProjectData — well-formed input", () => {
  it("accepts a valid blob and returns a normalized Project", () => {
    const result = sanitizeImportedProjectData(makeValidRaw());
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      name: "My Project",
      version: "3.0.3",
      width: 128,
      height: 256,
    });
  });

  it("trims the project name", () => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({ name: "   Spaced Name   " }),
    );
    expect(result?.name).toBe("Spaced Name");
  });

  it("trims the version string", () => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({ version: "  3.0.3  " }),
    );
    expect(result?.version).toBe("3.0.3");
  });

  it("preserves the componentTree shape (with its components array)", () => {
    const tree = makeTree({ components: [{ type: "Dummy", id: "x" }] });
    const result = sanitizeImportedProjectData(
      makeValidRaw({ componentTree: tree }),
    );
    expect(Array.isArray(result?.componentTree.components)).toBe(true);
    expect(result?.componentTree.components).toHaveLength(1);
  });

  it("returns a deep clone of componentTree, not the original reference", () => {
    const tree = makeTree();
    const result = sanitizeImportedProjectData(
      makeValidRaw({ componentTree: tree }),
    );
    expect(result?.componentTree).not.toBe(tree);
  });
});

describe("sanitizeImportedProjectData — non-record / structural rejection", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "not an object"],
    ["a number", 42],
    ["a boolean", true],
  ])("rejects %s at the top level (=> null)", (_label, input) => {
    expect(sanitizeImportedProjectData(input)).toBeNull();
  });

  it("rejects an array (Array is typeof object but not a valid project record for our fields)", () => {
    // isRecord lets arrays through, but none of the required scalar fields exist
    // on a bare array, so the result is still null.
    expect(sanitizeImportedProjectData([])).toBeNull();
  });
});

describe("sanitizeImportedProjectData — name validation", () => {
  it("rejects a missing name", () => {
    const raw = makeValidRaw();
    delete (raw as Record<string, unknown>).name;
    expect(sanitizeImportedProjectData(raw)).toBeNull();
  });

  it("rejects a blank / whitespace-only name", () => {
    expect(sanitizeImportedProjectData(makeValidRaw({ name: "   " }))).toBeNull();
    expect(sanitizeImportedProjectData(makeValidRaw({ name: "" }))).toBeNull();
  });

  it("rejects a non-string name", () => {
    expect(sanitizeImportedProjectData(makeValidRaw({ name: 123 }))).toBeNull();
  });

  it("accepts a name at the 120-char boundary", () => {
    const name = "n".repeat(120);
    expect(sanitizeImportedProjectData(makeValidRaw({ name }))?.name).toBe(name);
  });

  it("rejects a name longer than 120 chars", () => {
    expect(
      sanitizeImportedProjectData(makeValidRaw({ name: "n".repeat(121) })),
    ).toBeNull();
  });

  it("measures name length AFTER trimming (trailing spaces don't count toward the cap)", () => {
    const name = "n".repeat(120) + "    ";
    expect(sanitizeImportedProjectData(makeValidRaw({ name }))?.name).toBe(
      "n".repeat(120),
    );
  });
});

describe("sanitizeImportedProjectData — version validation", () => {
  it("rejects a missing version", () => {
    const raw = makeValidRaw();
    delete (raw as Record<string, unknown>).version;
    expect(sanitizeImportedProjectData(raw)).toBeNull();
  });

  it("rejects a blank version", () => {
    expect(sanitizeImportedProjectData(makeValidRaw({ version: "  " }))).toBeNull();
  });

  it("rejects a non-string version", () => {
    expect(sanitizeImportedProjectData(makeValidRaw({ version: 3 }))).toBeNull();
  });

  it("accepts a version at the 40-char boundary", () => {
    const version = "v".repeat(40);
    expect(
      sanitizeImportedProjectData(makeValidRaw({ version }))?.version,
    ).toBe(version);
  });

  it("rejects a version longer than 40 chars", () => {
    expect(
      sanitizeImportedProjectData(makeValidRaw({ version: "v".repeat(41) })),
    ).toBeNull();
  });
});

describe("sanitizeImportedProjectData — canvas dimensions (DoS bound)", () => {
  it("accepts integer width/height", () => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({ width: 10, height: 20 }),
    );
    expect(result?.width).toBe(10);
    expect(result?.height).toBe(20);
  });

  it("accepts numeric-string width/height and parses them to integers", () => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({ width: "64", height: "128" }),
    );
    expect(result?.width).toBe(64);
    expect(result?.height).toBe(128);
  });

  it("rejects a missing width", () => {
    const raw = makeValidRaw();
    delete (raw as Record<string, unknown>).width;
    expect(sanitizeImportedProjectData(raw)).toBeNull();
  });

  it("rejects a missing height", () => {
    const raw = makeValidRaw();
    delete (raw as Record<string, unknown>).height;
    expect(sanitizeImportedProjectData(raw)).toBeNull();
  });

  it("rejects zero and negative dimensions", () => {
    expect(sanitizeImportedProjectData(makeValidRaw({ width: 0 }))).toBeNull();
    expect(sanitizeImportedProjectData(makeValidRaw({ height: -5 }))).toBeNull();
  });

  it("rejects a non-integer numeric width (e.g. 12.5)", () => {
    expect(sanitizeImportedProjectData(makeValidRaw({ width: 12.5 }))).toBeNull();
  });

  it("accepts dimension at the 512 boundary but rejects 513", () => {
    expect(sanitizeImportedProjectData(makeValidRaw({ width: 512 }))?.width).toBe(
      512,
    );
    expect(sanitizeImportedProjectData(makeValidRaw({ width: 513 }))).toBeNull();
    expect(
      sanitizeImportedProjectData(makeValidRaw({ height: 512 }))?.height,
    ).toBe(512);
    expect(sanitizeImportedProjectData(makeValidRaw({ height: 513 }))).toBeNull();
  });

  it("rejects a width that is not number/string (e.g. boolean, object)", () => {
    expect(sanitizeImportedProjectData(makeValidRaw({ width: true }))).toBeNull();
    expect(sanitizeImportedProjectData(makeValidRaw({ width: {} }))).toBeNull();
  });

  it("rejects a non-numeric string width", () => {
    expect(
      sanitizeImportedProjectData(makeValidRaw({ width: "wide" })),
    ).toBeNull();
  });
});

describe("sanitizeImportedProjectData — componentTree validation", () => {
  it("rejects a missing componentTree", () => {
    const raw = makeValidRaw();
    delete (raw as Record<string, unknown>).componentTree;
    expect(sanitizeImportedProjectData(raw)).toBeNull();
  });

  it("rejects a componentTree that is not a record", () => {
    expect(
      sanitizeImportedProjectData(makeValidRaw({ componentTree: "tree" })),
    ).toBeNull();
    expect(
      sanitizeImportedProjectData(makeValidRaw({ componentTree: 5 })),
    ).toBeNull();
  });

  it("rejects a componentTree whose `components` is not an array", () => {
    expect(
      sanitizeImportedProjectData(
        makeValidRaw({ componentTree: { components: "nope" } }),
      ),
    ).toBeNull();
    expect(
      sanitizeImportedProjectData(
        makeValidRaw({ componentTree: { id: "x" } }),
      ),
    ).toBeNull();
  });

  it("accepts a componentTree with an empty components array", () => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({ componentTree: { components: [] } }),
    );
    expect(result?.componentTree.components).toEqual([]);
  });
});

describe("sanitizeImportedProjectData — invisible list scrubbing", () => {
  it("returns [] when invisible is missing or not an array", () => {
    const raw = makeValidRaw();
    delete (raw as Record<string, unknown>).invisible;
    expect(sanitizeImportedProjectData(raw)?.invisible).toEqual([]);
    expect(
      sanitizeImportedProjectData(makeValidRaw({ invisible: "abc" }))?.invisible,
    ).toEqual([]);
  });

  it("filters out non-string entries", () => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({ invisible: ["keep", 1, null, {}, true, "also"] }),
    );
    expect(result?.invisible).toEqual(["keep", "also"]);
  });

  it("trims entries and drops blanks", () => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({ invisible: ["  padded  ", "   ", ""] }),
    );
    expect(result?.invisible).toEqual(["padded"]);
  });

  it("de-duplicates entries (after trimming)", () => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({ invisible: ["dup", "dup", " dup ", "other"] }),
    );
    expect(result?.invisible).toEqual(["dup", "other"]);
  });
});

describe("sanitizeImportedProjectData — fonts/images/gifs scrubbing (plugin asset lists)", () => {
  const cases = ["fonts", "images", "gifs"] as const;

  it.each(cases)("returns [] for %s when missing or not an array", (key) => {
    const raw = makeValidRaw();
    delete (raw as Record<string, unknown>)[key];
    expect((sanitizeImportedProjectData(raw) as Record<string, unknown>)?.[key]).toEqual([]);
    expect(
      (sanitizeImportedProjectData(makeValidRaw({ [key]: 7 })) as Record<
        string,
        unknown
      >)?.[key],
    ).toEqual([]);
  });

  it.each(cases)("keeps only %s entries with a non-empty name AND string data", (key) => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({
        [key]: [
          { name: "good", data: "base64" }, // keep
          { name: "  ", data: "x" }, // drop: blank name
          { name: "noData" }, // drop: missing data
          { name: "numData", data: 123 }, // drop: data not string
          { data: "orphan" }, // drop: no name
          { name: 5, data: "x" }, // drop: name not string
          "not-a-record", // drop: not an object
          null, // drop
        ],
      }),
    );
    const list = (result as Record<string, unknown>)?.[key] as Array<{
      name: string;
      data: string;
    }>;
    expect(list).toEqual([{ name: "good", data: "base64" }]);
  });

  it.each(cases)("trims the name of surviving %s entries", (key) => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({ [key]: [{ name: "  Arial  ", data: "d" }] }),
    );
    const list = (result as Record<string, unknown>)?.[key] as Array<{
      name: string;
      data: string;
    }>;
    expect(list[0].name).toBe("Arial");
  });

  it.each(cases)("preserves the data string verbatim for %s (no trimming)", (key) => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({ [key]: [{ name: "n", data: "  spaced-data  " }] }),
    );
    const list = (result as Record<string, unknown>)?.[key] as Array<{
      name: string;
      data: string;
    }>;
    expect(list[0].data).toBe("  spaced-data  ");
  });
});

describe("sanitizeImportedProjectData — exportedTree handling", () => {
  it("keeps a valid exportedTree.draft (cloned, not the same reference)", () => {
    const draft = makeTree({ marker: "exported" });
    const raw = makeValidRaw({ exportedTree: { draft } });
    const result = sanitizeImportedProjectData(raw);
    expect((result?.exportedTree.draft as Record<string, unknown>).marker).toBe(
      "exported",
    );
    expect(result?.exportedTree.draft).not.toBe(draft);
  });

  it("falls back to a clone of componentTree when exportedTree is missing", () => {
    const raw = makeValidRaw({ componentTree: makeTree({ marker: "ct" }) });
    delete (raw as Record<string, unknown>).exportedTree;
    const result = sanitizeImportedProjectData(raw);
    expect((result?.exportedTree.draft as Record<string, unknown>).marker).toBe(
      "ct",
    );
    // The fallback is a *clone* of the (already cloned) componentTree, so it is
    // structurally equal but not the same object reference.
    expect(result?.exportedTree.draft).not.toBe(result?.componentTree);
    expect(result?.exportedTree.draft).toEqual(result?.componentTree);
  });

  it("falls back when exportedTree is not a record", () => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({
        exportedTree: "garbage",
        componentTree: makeTree({ marker: "ct2" }),
      }),
    );
    expect((result?.exportedTree.draft as Record<string, unknown>).marker).toBe(
      "ct2",
    );
  });

  it("falls back when exportedTree.draft is missing or not a record", () => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({
        exportedTree: { draft: "nope" },
        componentTree: makeTree({ marker: "ct3" }),
      }),
    );
    expect((result?.exportedTree.draft as Record<string, unknown>).marker).toBe(
      "ct3",
    );

    const result2 = sanitizeImportedProjectData(
      makeValidRaw({
        exportedTree: { somethingElse: true },
        componentTree: makeTree({ marker: "ct4" }),
      }),
    );
    expect((result2?.exportedTree.draft as Record<string, unknown>).marker).toBe(
      "ct4",
    );
  });

  it("does NOT carry over a `finalized` field from the import (only draft is kept)", () => {
    const result = sanitizeImportedProjectData(
      makeValidRaw({
        exportedTree: { draft: makeTree(), finalized: makeTree({ x: 1 }) },
      }),
    );
    expect(result?.exportedTree).toEqual({
      draft: expect.objectContaining({ components: [] }),
    });
    expect(
      (result?.exportedTree as Record<string, unknown>).finalized,
    ).toBeUndefined();
  });
});

describe("sanitizeImportedProjectData — combined rejection (first failure wins)", () => {
  it("rejects when any single required field is invalid even if others are fine", () => {
    expect(
      sanitizeImportedProjectData(makeValidRaw({ width: -1 })),
    ).toBeNull();
    expect(
      sanitizeImportedProjectData(makeValidRaw({ version: "" })),
    ).toBeNull();
    expect(
      sanitizeImportedProjectData(
        makeValidRaw({ componentTree: { components: 1 } }),
      ),
    ).toBeNull();
  });

  it("does not mutate the original raw input object", () => {
    const raw = makeValidRaw({ name: "  trimmed  " });
    const snapshot = JSON.stringify(raw);
    sanitizeImportedProjectData(raw);
    expect(JSON.stringify(raw)).toBe(snapshot);
  });
});

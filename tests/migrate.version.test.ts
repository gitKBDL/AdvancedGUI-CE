/**
 * Contract tests for src/utils/manager/UpdateManager.ts — version migration of
 * legacy savepoints.
 *
 * WHAT THIS GUARDS (plugin contract):
 * The editor loads savepoints authored by *older* editor versions and must
 * upgrade their JSON in-place to the current schema (`VERSION`) before the rest
 * of the editor — and ultimately `convertToFinalized()` — can turn them into a
 * config the AdvancedGUI 3.0.3 plugin can parse. `migrate(project)` is the
 * single chokepoint that walks every component / action / check and applies the
 * per-version transforms. If a transform regresses, an old savepoint silently
 * produces a config the plugin's Jackson deserializers reject (e.g. a leftover
 * `#RRGGBB` color the ColorDeserializer cannot parse, or a `comparisonType`
 * that is no longer an int token for the ComparisonTypeDeserializer).
 *
 * These tests construct minimal legacy `Project`-shaped objects at specific
 * `version` stamps, run `migrate`, and assert:
 *   - version stamping (always becomes VERSION)
 *   - concrete field/type transforms the code performs at each step
 *   - that color-bearing fields end up plugin-readable (cross-checked against
 *     the ColorDeserializer mirror)
 *   - idempotency: migrating an already-current project is a no-op besides the
 *     (re-stamped) version.
 *
 * NOTE on traversal contract: migrate() walks via `traverseComponent`, which
 * unconditionally does `comp.action.forEach(...)` on every visited component for
 * versions <= 1.0.6 and >= 1.0.3. Therefore every component node — including the
 * root `componentTree` — must carry an `action: []` array, exactly as the real
 * editor's serialized form does (Component.toJson emits `action`). Our fixtures
 * mirror that.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetRegistry } from "./helpers";

import { migrate, VERSION } from "@/utils/manager/UpdateManager";
import { ComparisonType, PlaceholderCheck } from "@/utils/checks/PlaceholderCheck";
import { ListNextCheck } from "@/utils/checks/ListNextCheck";
import {
  deserializeColor,
  PluginParseError,
} from "./contract/pluginDeserializers";

 

/** Minimal component node that satisfies traverseComponent's `comp.action.forEach`. */
function comp(extra: Record<string, any> = {}): any {
  return { action: [], ...extra };
}

/** A bare-bones legacy project at a given version with a single-node tree. */
function legacyProject(version: string, root: any = comp()): any {
  return {
    name: "legacy",
    version,
    invisible: [],
    width: 100,
    height: 100,
    componentTree: root,
  };
}

beforeEach(() => {
  resetRegistry();
});

describe("UpdateManager VERSION constant", () => {
  it("exposes the current schema version as a semver-ish string", () => {
    // Pin the value so an intentional bump is a conscious, reviewed change.
    expect(VERSION).toBe("1.0.9");
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("migrate() — version stamping", () => {
  it("stamps an undefined/legacy version up to VERSION", () => {
    const project = legacyProject(undefined as any);
    const out = migrate(project);
    expect(out.version).toBe(VERSION);
  });

  it("re-stamps a project that predates the version field (treated as 1.0.0)", () => {
    // No version => defaults to "1.0.0" and runs through every step.
    const project = legacyProject("");
    const out = migrate(project);
    expect(out.version).toBe(VERSION);
  });

  it("is idempotent for an already-current (VERSION) project: version stays VERSION", () => {
    const project = legacyProject(VERSION);
    const out = migrate(project);
    expect(out.version).toBe(VERSION);
  });
});

describe("migrate() — idempotency for current projects (no-op besides version)", () => {
  it("does not mutate component fields of an already-current project", () => {
    // A current-version Text node already carries all modern fields. None of the
    // per-version `if (oldVersion == ...)` blocks should run.
    const text = comp({
      type: "Text",
      id: "t1",
      previewText: "abc",
      alignment: 2,
      color: "rgba(1,2,3,1)",
    });
    const project = legacyProject(VERSION, text);

    const out = migrate(project);

    // Nothing touched: previewText untouched (not reset to "123"),
    // alignment untouched (not reset to 0), gifs NOT injected.
    expect((out.componentTree as any).previewText).toBe("abc");
    expect((out.componentTree as any).alignment).toBe(2);
    expect("gifs" in out).toBe(false);
  });
});

describe("migrate() — 1.0.1 -> 1.0.2: Text gains previewText", () => {
  it('injects previewText="123" on Text components', () => {
    const text = comp({ type: "Text", id: "t1" });
    const project = legacyProject("1.0.1", text);

    const out = migrate(project);

    expect((out.componentTree as any).previewText).toBe("123");
    expect(out.version).toBe(VERSION);
  });

  it("leaves non-Text components without a previewText", () => {
    const rect = comp({ type: "Rect", id: "r1" });
    const project = legacyProject("1.0.1", rect);

    const out = migrate(project);

    expect("previewText" in (out.componentTree as any)).toBe(false);
  });
});

describe("migrate() — 1.0.2 -> 1.0.3: Hover.drawHovered / View.drawIndex", () => {
  it("sets drawHovered=false on Hover and drawIndex=0 on View", () => {
    const hover = comp({
      type: "Hover",
      id: "h1",
      components: [comp({ type: "View", id: "v1" })],
    });
    const project = legacyProject("1.0.2", hover);

    const out = migrate(project);

    expect((out.componentTree as any).drawHovered).toBe(false);
    expect((out.componentTree as any).components[0].drawIndex).toBe(0);
  });
});

describe("migrate() — 1.0.3 -> 1.0.4: gifs array + CommandAction.asOperator", () => {
  it("initializes project.gifs to an empty array", () => {
    const project = legacyProject("1.0.3");
    delete project.gifs;

    const out = migrate(project);

    expect(Array.isArray(out.gifs)).toBe(true);
    expect(out.gifs).toEqual([]);
  });

  it("adds asOperator=false to legacy Command actions (and nested ones)", () => {
    const root = comp({
      type: "Group",
      id: "g1",
      action: [
        { id: "Command", command: "say hi", asConsole: false },
        {
          id: "SomethingWithChildren",
          actions: [{ id: "Command", command: "say nested", asConsole: true }],
        },
      ],
    });
    const project = legacyProject("1.0.3", root);

    const out = migrate(project);

    const actions = (out.componentTree as any).action;
    expect(actions[0].asOperator).toBe(false);
    // traverseAction recurses into `.actions`.
    expect(actions[1].actions[0].asOperator).toBe(false);
  });
});

describe("migrate() — 1.0.4 -> 1.0.5: Image/GIF.dithering + Check.drawNegative", () => {
  it("sets dithering=false on Image and GIF, drawNegative=false on Check", () => {
    const root = comp({
      type: "Group",
      id: "g1",
      components: [
        comp({ type: "Image", id: "img1" }),
        comp({ type: "GIF", id: "gif1" }),
        comp({ type: "Check", id: "chk1" }),
      ],
    });
    const project = legacyProject("1.0.4", root);

    const out = migrate(project);

    const [img, gif, check] = (out.componentTree as any).components;
    expect(img.dithering).toBe(false);
    expect(gif.dithering).toBe(false);
    expect(check.drawNegative).toBe(false);
  });
});

describe("migrate() — 1.0.5 -> 1.0.6: Text.alignment default", () => {
  it("resets Text alignment to 0 (LEFT) when migrating from 1.0.5", () => {
    const text = comp({ type: "Text", id: "t1" });
    const project = legacyProject("1.0.5", text);

    const out = migrate(project);

    expect((out.componentTree as any).alignment).toBe(0);
  });
});

describe("migrate() — 1.0.6 -> 1.0.7: Rect.radius, color normalization", () => {
  it("sets radius=0 on Rect components", () => {
    const rect = comp({ type: "Rect", id: "r1" });
    const project = legacyProject("1.0.6", rect);

    const out = migrate(project);

    expect((out.componentTree as any).radius).toBe(0);
  });

  it("rewrites legacy #RRGGBB hex colors to plugin-readable rgba(...) strings", () => {
    // Pre-1.0.7 savepoints stored colors as #RRGGBB hex. The ColorDeserializer
    // in the plugin CANNOT parse hex — it does substring(5, len-1).split(",")
    // and expects exactly "rgba(R,G,B,A)". The migration must rewrite them.
    const rect = comp({ type: "Rect", id: "r1", color: "#FF8000" });
    const project = legacyProject("1.0.6", rect);

    const out = migrate(project);

    const color = (out.componentTree as any).color;
    // hexToRgba(#FF8000, 1) => "rgba(255,128,0,1)"
    expect(color).toBe("rgba(255,128,0,1)");

    // Cross-check against the plugin mirror: the migrated color must NOT throw.
    expect(() => deserializeColor(color)).not.toThrow();
    const awt = deserializeColor(color);
    expect(awt).toEqual({ r: 255, g: 128, b: 0, a: 255 });
  });

  it('rewrites the literal "transparent" color to rgba(0,0,0,0)', () => {
    const rect = comp({ type: "Rect", id: "r1", color: "transparent" });
    const project = legacyProject("1.0.6", rect);

    const out = migrate(project);

    const color = (out.componentTree as any).color;
    expect(color).toBe("rgba(0,0,0,0)");
    // Fully transparent black is still a valid rgba for the plugin.
    expect(() => deserializeColor(color)).not.toThrow();
  });

  it("proves the contract value: the pre-migration hex color is NOT plugin-readable", () => {
    // This is the *reason* the migration exists — guard that a raw hex really
    // would be rejected by the plugin, so the rewrite above is load-bearing.
    expect(() => deserializeColor("#FF8000")).toThrow(PluginParseError);
  });

  it("normalizes a Placeholder Check's compType to STRING when migrating from 1.0.6", () => {
    // The 1.0.6 step forces compType = ComparisonType.STRING on plain
    // "Placeholder Check" checks (both on components and inside actions).
    const root = comp({
      type: "Check",
      id: "chk1",
      check: { type: PlaceholderCheck.id, placeholder: "%x%", value: "y" },
      action: [
        {
          id: "anyAction",
          check: { type: PlaceholderCheck.id, placeholder: "%a%", value: "b" },
        },
      ],
    });
    const project = legacyProject("1.0.6", root);

    const out = migrate(project);

    // Component-level check compType set to STRING (-1)...
    expect((out.componentTree as any).check.compType).toBe(ComparisonType.STRING);
    // ...but then 1.0.7->1.0.8 normalizeCheck runs: STRING compType means the
    // check type stays the string id and comparisonType is stripped.
    expect((out.componentTree as any).check.type).toBe(PlaceholderCheck.id);
    expect("comparisonType" in (out.componentTree as any).check).toBe(false);

    const actCheck = (out.componentTree as any).action[0].check;
    expect(actCheck.compType).toBe(ComparisonType.STRING);
    expect(actCheck.type).toBe(PlaceholderCheck.id);
  });
});

describe("migrate() — 1.0.7+ -> 1.0.9: normalizeCheck / normalizeAction", () => {
  it("renames the legacy ListNextCheck id (legacyId -> id)", () => {
    const root = comp({
      type: "Check",
      id: "chk1",
      check: { type: ListNextCheck.legacyId, targetId: "v1", forward: true },
    });
    const project = legacyProject("1.0.7", root);

    const out = migrate(project);

    expect((out.componentTree as any).check.type).toBe(ListNextCheck.id);
    expect(ListNextCheck.legacyId).not.toBe(ListNextCheck.id);
  });

  it('renames the legacy "List next" action id to "View Next"', () => {
    const root = comp({
      type: "Group",
      id: "g1",
      action: [{ id: "List next" }],
    });
    const project = legacyProject("1.0.7", root);

    const out = migrate(project);

    expect((out.componentTree as any).action[0].id).toBe("View Next");
  });

  it("normalizes a numeric Placeholder Check into the Number Placeholder Check id + int comparisonType", () => {
    // A legacy "Placeholder Check" carrying a numeric comparison (GREATER_EQ=3)
    // must become numberId with an integer comparisonType the plugin's
    // ComparisonTypeDeserializer can index ComparisonType.values()[3].
    const root = comp({
      type: "Check",
      id: "chk1",
      check: {
        type: PlaceholderCheck.id,
        placeholder: "%player_health%",
        comparisonType: ComparisonType.GREATER_EQ, // 3
        value: 20,
      },
    });
    const project = legacyProject("1.0.7", root);

    const out = migrate(project);

    const check = (out.componentTree as any).check;
    expect(check.type).toBe(PlaceholderCheck.numberId);
    expect(check.comparisonType).toBe(ComparisonType.GREATER_EQ);
    expect(check.compType).toBe(ComparisonType.GREATER_EQ);
    // comparisonType is an int in [0..4] — directly indexable by the plugin enum.
    expect(Number.isInteger(check.comparisonType)).toBe(true);
    expect(check.comparisonType).toBeGreaterThanOrEqual(0);
    expect(check.comparisonType).toBeLessThanOrEqual(4);
  });

  it("falls back to STRING when a numeric Placeholder Check has a non-parseable comparison", () => {
    // normalizeCheck: Number.parseInt(undefined) => NaN => ComparisonType.STRING,
    // so the check collapses back to the plain string id with no comparisonType.
    const root = comp({
      type: "Check",
      id: "chk1",
      check: {
        type: PlaceholderCheck.numberId,
        placeholder: "%x%",
        value: "y",
        // no comparisonType / compType present
      },
    });
    const project = legacyProject("1.0.7", root);

    const out = migrate(project);

    const check = (out.componentTree as any).check;
    expect(check.compType).toBe(ComparisonType.STRING);
    expect(check.type).toBe(PlaceholderCheck.id);
    expect("comparisonType" in check).toBe(false);
  });
});

describe("migrate() — 1.0.0 -> 1.0.1: check wrapping", () => {
  it("wraps a legacy action that carries a top-level `check` into the modern shape", () => {
    // Pre-1.0.1 actions stored check fields flat on the action; 1.0.0 step moves
    // them under a `check` object whose `type` is the action's id.
    const root = comp({
      type: "Group",
      id: "g1",
      action: [
        {
          id: "View Next Check",
          expanded: false,
          targetId: "v1",
          forward: true,
          check: true, // legacy "this action is a check" marker (truthy)
        },
      ],
    });
    const project = legacyProject("1.0.0", root);

    const out = migrate(project);

    const action = (out.componentTree as any).action[0];
    // reassignObject keeps id/actions/expanded and builds a nested check object.
    expect(action.id).toBe("View Next Check");
    expect(action.expanded).toBe(false);
    expect(action.check).toBeDefined();
    expect(typeof action.check).toBe("object");
    expect(action.check.type).toBe("View Next Check");
  });
});

describe("migrate() — full legacy chain end-to-end", () => {
  it("upgrades a 1.0.0 project through every step to VERSION with all transforms applied", () => {
    const text = comp({ type: "Text", id: "t1", color: "#000000" });
    const root = comp({
      type: "Group",
      id: "g1",
      components: [text],
      action: [{ id: "Command", command: "say hi", asConsole: false }],
    });
    const project = legacyProject("1.0.0", root);
    delete project.gifs;

    const out = migrate(project);

    // Version stamped.
    expect(out.version).toBe(VERSION);
    // 1.0.3->1.0.4: gifs initialized.
    expect(out.gifs).toEqual([]);
    // 1.0.3->1.0.4: command action got asOperator.
    expect((out.componentTree as any).action[0].asOperator).toBe(false);

    const migratedText = (out.componentTree as any).components[0];
    // 1.0.1->1.0.2: previewText injected.
    expect(migratedText.previewText).toBe("123");
    // 1.0.5->1.0.6: alignment reset.
    expect(migratedText.alignment).toBe(0);
    // 1.0.6->1.0.7: hex color rewritten + plugin-readable.
    expect(migratedText.color).toBe("rgba(0,0,0,1)");
    expect(() => deserializeColor(migratedText.color)).not.toThrow();
  });
});

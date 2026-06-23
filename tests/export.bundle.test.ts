/**
 * Contract: the LIVE-STATE EXPORT PATH produces a well-formed project payload.
 *
 * The other suites exercise `convertToFinalized()` directly. This one covers the
 * actual export wiring in `ProjectSerializationHandler.bundleCurrentProjectData`
 * — the code that assembles what the user saves/downloads from the live editor
 * state: the draft tree (`componentTree`), the usage tree (`exportedTree.draft`),
 * and the project metadata. It guards three things that only this wiring decides:
 *
 *   1. metadata is taken from live `settings` + `VERSION`, with the project name
 *      run through `normalizeProjectName`;
 *   2. the draft tree preserves ids/nesting and the editor-only `locked` flag,
 *      while `exportedTree.draft` is the USAGE form that drops `locked`;
 *   3. that usage tree feeds straight into `convertToFinalized` (the plugin form),
 *      and `invisible` / the `includeExportedTree:false` stub behave as declared.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetRegistry } from "./helpers";
import { bundleCurrentProjectData } from "@/utils/handler/ProjectSerializationHandler";
import { componentTree } from "@/utils/manager/WorkspaceManager";
import { addInvisibleIDs } from "@/utils/manager/ComponentManager";
import { settings } from "@/utils/manager/SettingsManager";
import { VERSION } from "@/utils/manager/UpdateManager";
import { convertToFinalized } from "@/utils/LocalConverter";
import { Rect } from "@/utils/components/Rect";
import { GroupComponent } from "@/utils/components/GroupComponent";

type TreeJson = {
  type: string;
  components: Array<Record<string, unknown>>;
};

function asTree(value: unknown): TreeJson {
  return value as unknown as TreeJson;
}

describe("bundleCurrentProjectData — live-state export path", () => {
  beforeEach(() => {
    resetRegistry();
    settings.width = 4;
    settings.height = 3;
    settings.projectName = "My Export";
  });

  function buildTree() {
    const lockedRect = new Rect(
      "rectA",
      "A",
      [],
      1,
      2,
      3,
      4,
      "rgba(1,2,3,1)",
      0,
    );
    lockedRect.locked = true;
    const childRect = new Rect(
      "childRect",
      "C",
      [],
      0,
      0,
      5,
      5,
      "rgba(9,9,9,1)",
      0,
    );
    const group = new GroupComponent("grp", "G", [], [childRect], true);
    componentTree.value = [lockedRect, group];
    return { lockedRect, childRect, group };
  }

  it("derives metadata from live settings + VERSION (name normalized)", () => {
    buildTree();
    const bundle = bundleCurrentProjectData({ includeResources: false });

    expect(bundle.name).toBe("My_Export"); // whitespace -> "_"
    expect(bundle.version).toBe(VERSION);
    expect(bundle.width).toBe(4);
    expect(bundle.height).toBe(3);
  });

  it("draft componentTree preserves ids, nesting and the locked flag", () => {
    buildTree();
    const bundle = bundleCurrentProjectData({ includeResources: false });
    const tree = asTree(bundle.componentTree);

    expect(tree.components.map((c) => c.id)).toEqual(["rectA", "grp"]);
    expect(tree.components[0].type).toBe("Rect");
    expect(tree.components[0].locked).toBe(true);

    const grp = tree.components[1] as {
      components: Array<Record<string, unknown>>;
    };
    expect(grp.components[0].id).toBe("childRect");
  });

  it("exportedTree.draft is the USAGE form (drops the editor-only locked flag)", () => {
    buildTree();
    const bundle = bundleCurrentProjectData({ includeResources: false });
    const draft = asTree(bundle.exportedTree.draft);

    expect(draft.components.map((c) => c.id)).toEqual(["rectA", "grp"]);
    expect("locked" in draft.components[0]).toBe(false);
  });

  it("the exported usage tree feeds convertToFinalized into a plugin config", () => {
    buildTree();
    const bundle = bundleCurrentProjectData({ includeResources: false });
    const finalized = convertToFinalized(
      bundle.exportedTree.draft as unknown as Record<string, unknown>,
    );

    // convertToFinalized always rewrites `action` -> `clickAction`.
    expect("action" in finalized).toBe(false);
    expect("clickAction" in finalized).toBe(true);
  });

  it("reflects invisible ids and the includeExportedTree:false stub", () => {
    buildTree();
    addInvisibleIDs(["childRect"]);
    const bundle = bundleCurrentProjectData({
      includeResources: false,
      includeExportedTree: false,
    });

    expect(bundle.invisible).toContain("childRect");
    expect(asTree(bundle.exportedTree.draft).components).toEqual([]);
  });
});

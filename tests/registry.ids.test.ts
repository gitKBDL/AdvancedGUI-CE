/**
 * Contract: registry + ID reassignment integrity.
 *
 * Component IDs are the load-bearing links of an AdvancedGUI config. The plugin
 * resolves cross-component references (a VisibilityAction's `targetId`, a check's
 * `targetId`, the invisible-IDs list, View/Group containment) purely by string
 * identity of these 8-char ids. If the editor ever:
 *   - hands out a duplicate / already-registered id,
 *   - reassigns a subtree's ids but leaves an internal reference pointing at the
 *     OLD id (a dangling link the plugin can't resolve),
 *   - corrupts an id via partial-substring replacement (id "ab" rewritten inside
 *     "abcd"),
 *   - or fails to cascade register/unregister for "#"-suffixed and invisible ids,
 * then the produced config links break in the running plugin even though every
 * leaf field still deserializes fine.
 *
 * These tests exercise the real ComponentManager + ComponentIdManager against
 * real component classes (Rect, GroupComponent, View, VisibilityAction) so the
 * actual toJson/fromJson + reassign machinery is under test, not a mock of it.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetRegistry } from "./helpers";

import { Rect } from "@/utils/components/Rect";
import { GroupComponent } from "@/utils/components/GroupComponent";
import { View } from "@/utils/components/View";
import { VisibilityAction } from "@/utils/actions/VisibilityAction";

import {
  components,
  generateUniqueID,
  registerComponent,
  unregisterComponent,
  reassignIDs,
  componentFromJson,
  getParentComponent,
  invalidateParentComponentCache,
  isInvisible,
  setInvisibleIDs,
  addInvisibleID,
  invisibleIDs,
} from "@/utils/manager/ComponentManager";
import { renameComponentAndReferences } from "@/utils/manager/ComponentIdManager";
import { componentTree } from "@/utils/manager/WorkspaceManager";

/** A plain Rect with a fixed id and a plugin-readable color. */
function makeRect(id: string, x = 10, y = 10): Rect {
  return new Rect(id, "rect", [], x, y, 80, 40, "rgba(255,255,255,1)", 0);
}

describe("ComponentManager — id generation & registration", () => {
  beforeEach(() => resetRegistry());

  it("generateUniqueID returns an 8-char id that is not already registered", () => {
    registerComponent(makeRect("aaaaaaaa"));
    const id = generateUniqueID();
    expect(id).toHaveLength(8);
    expect(components[id]).toBeUndefined();
    expect(id).not.toBe("aaaaaaaa");
  });

  it('registerComponent("-") assigns a freshly generated id and indexes it', () => {
    const rect = makeRect("-");
    registerComponent(rect);

    expect(rect.id).not.toBe("-");
    expect(rect.id).toHaveLength(8);
    // The component is reachable in the registry under its new id.
    expect(components[rect.id]).toBe(rect);
  });

  it("registerComponent indexes a component under its explicit id", () => {
    const rect = makeRect("box00001");
    registerComponent(rect);
    expect(components["box00001"]).toBe(rect);
  });

  it("registering a group caches its children's parent lookups", () => {
    const child = makeRect("childAAA");
    const group = new GroupComponent("groupAAA", "g", [], [child], true);
    registerComponent(group);
    // getParentComponent should resolve the child to the registered group.
    expect(getParentComponent(child)).toBe(group);
  });
});

describe("ComponentManager — register/unregister cascade", () => {
  beforeEach(() => resetRegistry());

  it('unregistering a base id cascades to its "#"-suffixed companions', () => {
    const base = makeRect("hoverID0");
    const normal = makeRect("hoverID0#normal");
    const clicked = makeRect("hoverID0#clicked");
    registerComponent(base);
    registerComponent(normal);
    registerComponent(clicked);

    unregisterComponent(base);

    expect(components["hoverID0"]).toBeUndefined();
    expect(components["hoverID0#normal"]).toBeUndefined();
    expect(components["hoverID0#clicked"]).toBeUndefined();
  });

  it("unregistering a base id does NOT touch an unrelated id sharing a prefix", () => {
    const base = makeRect("hoverID0");
    // "hoverID0extra" starts with the base id but is NOT a "hoverID0#..." child,
    // so the cascade (which keys on the "#" separator) must leave it registered.
    const unrelated = makeRect("hoverID0extra");
    registerComponent(base);
    registerComponent(unrelated);

    unregisterComponent(base);

    expect(components["hoverID0"]).toBeUndefined();
    expect(components["hoverID0extra"]).toBe(unrelated);
  });

  it("registering a #-child of an invisible parent cascades into the invisible set", () => {
    // Parent is hidden, then a "#"-suffixed child registers -> child inherits
    // invisibility so the plugin hides the same logical sub-element.
    addInvisibleID("parent00");
    expect(isInvisible("parent00")).toBe(true);

    const child = makeRect("parent00#hovered");
    registerComponent(child);

    expect(isInvisible("parent00#hovered")).toBe(true);
  });

  it("registering a #-child of a VISIBLE parent does not mark it invisible", () => {
    const child = makeRect("visible0#hovered");
    registerComponent(child);
    expect(isInvisible("visible0#hovered")).toBe(false);
  });
});

describe("ComponentManager — getParentComponent caching", () => {
  beforeEach(() => resetRegistry());

  it("returns undefined for a root (parent-less) component", () => {
    const rect = makeRect("rootRect");
    registerComponent(rect);
    expect(getParentComponent(rect)).toBeUndefined();
  });

  it("is cache-correct after the parent cache is invalidated", () => {
    const child = makeRect("childBBB");
    const group = new GroupComponent("groupBBB", "g", [], [child], true);
    registerComponent(group);

    // Prime the cache.
    expect(getParentComponent(child)).toBe(group);

    // Re-home the child into a different group, then bust the cache version.
    const group2 = new GroupComponent("groupCCC", "g2", [], [child], true);
    registerComponent(group2);
    invalidateParentComponentCache();

    const parent = getParentComponent(child);
    // After invalidation the lookup re-scans and must find a group that actually
    // contains the child (group2 now also does); the result must be a real parent.
    expect(parent).toBeDefined();
    expect(parent!.getItems()).toContain(child);
  });
});

describe("reassignIDs — referential integrity of a remapped subtree", () => {
  beforeEach(() => resetRegistry());

  it("remaps every component id in the subtree to a brand-new id", () => {
    const child = makeRect("childZZZ");
    const group = new GroupComponent("grpZZZ01", "g", [], [child], true);
    const draft = JSON.parse(group.toJson());

    const reassigned = reassignIDs(draft);

    expect(reassigned.id).not.toBe("grpZZZ01");
    expect(reassigned.components[0].id).not.toBe("childZZZ");
    // The originals are unchanged: reassignIDs works on a fresh JSON, not in place.
    expect(draft.id).toBe("grpZZZ01");
    expect(draft.components[0].id).toBe("childZZZ");
  });

  it("keeps an internal reference (VisibilityAction.targetId) pointing at the new child id", () => {
    // A group whose own clickAction toggles the visibility of its own child.
    const child = makeRect("tgtChild");
    const action = new VisibilityAction("tgtChild", false);
    const group = new GroupComponent("grpHost1", "host", [action], [child], true);

    const draft = JSON.parse(group.toJson());
    // Sanity: the draft really does carry the reference we expect to be remapped.
    expect(draft.action[0].targetId).toBe("tgtChild");

    const reassigned = reassignIDs(draft);
    const newChildId = reassigned.components[0].id;

    expect(newChildId).not.toBe("tgtChild");
    // The action that referenced the child must now reference the child's NEW id —
    // otherwise the exported config has a dangling visibility link.
    expect(reassigned.action[0].targetId).toBe(newChildId);
  });

  it("does NOT corrupt ids when one OLD id is a prefix of another OLD id (longest-first replace)", () => {
    // The real-world hazard reassignIDs guards against: two original ids where
    // one ("ab") is a prefix of the other ("abcd"). A naive shortest-first
    // string replace of "ab" -> X would first rewrite the "ab" inside "abcd",
    // corrupting it. Sorting replacements longest-first means "abcd" is replaced
    // before "ab", so each original id is rewritten exactly once and cleanly.
    // New ids are chosen NOT to contain the old ids, isolating this property.
    const child = makeRect("ab"); // short id, a prefix of the group id
    const group = new GroupComponent("abcd", "g", [], [child], true);

    const draft = JSON.parse(group.toJson());

    const mapping: Record<string, string> = {
      ab: "QQQQ1111",
      abcd: "WWWW2222",
    };
    const reassigned = reassignIDs(draft, (oldId) => mapping[oldId]);

    expect(reassigned.id).toBe("WWWW2222");
    expect(reassigned.components[0].id).toBe("QQQQ1111");
  });

  // BUG: reassignIDs() remaps ids via a sequence of global string replaces. The
  // longest-first ordering only protects against an OLD id being a substring of
  // another OLD id. It does NOT protect against an old id being a substring of a
  // NEWLY written id: here old id "ab" is a substring of the new id "abZZZZ22"
  // that "abcd" was just remapped to, so the subsequent "ab" -> "abZZZZ11"
  // replace also rewrites the "ab" inside "abZZZZ22", producing the corrupted
  // "abZZZZ11ZZZZ22". With the real random 8-char generator a new id containing
  // an old id is astronomically unlikely, so this is latent — but it is a real
  // correctness gap: id remapping should not be a blind textual substitution.
  it.skip("BUG: reassignIDs corrupts when an old id is a substring of a new id", () => {
    const child = makeRect("ab");
    const group = new GroupComponent("abcd", "g", [], [child], true);
    const draft = JSON.parse(group.toJson());

    const mapping: Record<string, string> = {
      ab: "abZZZZ11",
      abcd: "abZZZZ22", // contains "ab" -> later "ab" replace re-enters it
    };
    const reassigned = reassignIDs(draft, (oldId) => mapping[oldId]);

    // Correct expectation: each id maps cleanly to its target.
    expect(reassigned.id).toBe("abZZZZ22");
    expect(reassigned.components[0].id).toBe("abZZZZ11");
  });

  it("remaps a child reference even when the parent group is a View", () => {
    // View inherits GroupComponent.childComponentProps = ["components"], so the
    // reassign walk must descend into a View's children too.
    const child = makeRect("viewKid0");
    const action = new VisibilityAction("viewKid0", true);
    const view = new View("viewHost", "v", [action], [child], true, 0);

    const draft = JSON.parse(view.toJson());
    expect(draft.type).toBe("View");
    expect(draft.action[0].targetId).toBe("viewKid0");

    const reassigned = reassignIDs(draft);
    const newKidId = reassigned.components[0].id;

    expect(newKidId).not.toBe("viewKid0");
    expect(reassigned.action[0].targetId).toBe(newKidId);
  });

  it("componentFromJson with reassignIDsFirst registers the rebuilt tree under fresh ids", () => {
    const child = makeRect("origKid0");
    const group = new GroupComponent("origGrp0", "g", [], [child], true);
    const draft = JSON.parse(group.toJson());

    const rebuilt = componentFromJson(draft, true) as GroupComponent;

    expect(rebuilt).toBeInstanceOf(GroupComponent);
    expect(rebuilt.id).not.toBe("origGrp0");
    expect(components[rebuilt.id]).toBe(rebuilt);
    // The original ids must NOT be registered (we reassigned before building).
    expect(components["origGrp0"]).toBeUndefined();
    expect(components["origKid0"]).toBeUndefined();
  });
});

describe("ComponentIdManager — renameComponentAndReferences", () => {
  beforeEach(() => resetRegistry());

  /** Build a registered group {grp -> child} whose clickAction targets the child. */
  function buildGroupWithRef(groupId: string, childId: string) {
    const child = makeRect(childId);
    const action = new VisibilityAction(childId, false);
    const group = new GroupComponent(groupId, "g", [action], [child], true);
    registerComponent(child);
    registerComponent(group);
    componentTree.value = [group];
    return { group, child, action };
  }

  it("renames a component and re-indexes the registry under the new id", () => {
    const child = makeRect("renameMe");
    registerComponent(child);
    componentTree.value = [child];

    const result = renameComponentAndReferences(child, "renamed1");

    expect(result).toBe("renamed1");
    expect(child.id).toBe("renamed1");
    expect(components["renamed1"]).toBe(child);
    expect(components["renameMe"]).toBeUndefined();
  });

  it("enforces uniqueness by suffixing _2 on collision", () => {
    const taken = makeRect("popular0");
    const renamer = makeRect("renameMe");
    registerComponent(taken);
    registerComponent(renamer);
    componentTree.value = [taken, renamer];

    const result = renameComponentAndReferences(renamer, "popular0");

    // "popular0" is taken by another live component, so we must get "popular0_2".
    expect(result).toBe("popular0_2");
    expect(renamer.id).toBe("popular0_2");
    expect(components["popular0"]).toBe(taken); // untouched
    expect(components["popular0_2"]).toBe(renamer);
  });

  it("remaps a VisibilityAction.targetId in the tree when its target is renamed", () => {
    const { child, action } = buildGroupWithRef("grpRef01", "kidRef01");
    expect(action.targetId).toBe("kidRef01");

    const newId = renameComponentAndReferences(child, "kidNew01");

    expect(newId).toBe("kidNew01");
    expect(child.id).toBe("kidNew01");
    // The visibility action that pointed at the child must follow the rename.
    expect(action.targetId).toBe("kidNew01");
  });

  it("remaps #-suffixed invisible references when the base id is renamed", () => {
    const base = makeRect("baseVis0");
    registerComponent(base);
    componentTree.value = [base];
    // The plugin's invisible list holds both the base and a "#"-suffixed variant.
    setInvisibleIDs(["baseVis0", "baseVis0#hovered"]);

    renameComponentAndReferences(base, "baseNew0");

    expect(invisibleIDs.value).toContain("baseNew0");
    expect(invisibleIDs.value).toContain("baseNew0#hovered");
    expect(invisibleIDs.value).not.toContain("baseVis0");
    expect(invisibleIDs.value).not.toContain("baseVis0#hovered");
  });

  it("is a no-op (returns old id) for a blank requested id", () => {
    const child = makeRect("keepMe00");
    registerComponent(child);
    componentTree.value = [child];

    const result = renameComponentAndReferences(child, "   ");

    expect(result).toBe("keepMe00");
    expect(child.id).toBe("keepMe00");
    expect(components["keepMe00"]).toBe(child);
  });
});

describe("reassignIDs — leaf fields survive remap (plugin-readability spot check)", () => {
  beforeEach(() => resetRegistry());

  it("preserves a plugin-readable rgba color through reassignment", () => {
    // Reassignment is a blind JSON string-replace of ids; it must not mangle
    // unrelated leaf values like the color the plugin's ColorDeserializer reads.
    const rect = makeRect("colorRct");
    const draft = JSON.parse(rect.toJson());
    expect(draft.color).toBe("rgba(255,255,255,1)");

    const reassigned = reassignIDs(draft);

    expect(reassigned.color).toBe("rgba(255,255,255,1)");
    expect(reassigned.id).not.toBe("colorRct");
  });
});

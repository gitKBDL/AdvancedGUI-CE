/**
 * Robustness: untrusted JSON (imported files, clipboard, migrated savepoints)
 * drives the component-type registry lookup. componentInfo is a plain object
 * literal, so an unknown type — or a prototype-chain key like "constructor" —
 * must NOT resolve to an inherited member and crash with
 * "fromJson is not a function". componentFromJson must return null and the
 * root importer must surface a clean error.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetRegistry } from "./helpers";
import { componentFromJson } from "@/utils/manager/ComponentManager";
import { addJsonComponentsToRoot } from "@/utils/manager/WorkspaceManager";

describe("componentFromJson — untrusted component type", () => {
  beforeEach(() => resetRegistry());

  it("returns null for an unknown type instead of throwing", () => {
    expect(componentFromJson({ type: "NotARealType", id: "x" })).toBeNull();
  });

  it("returns null for prototype-chain keys (no Object.prototype crash)", () => {
    for (const key of [
      "constructor",
      "toString",
      "hasOwnProperty",
      "__proto__",
      "valueOf",
    ]) {
      expect(componentFromJson({ type: key, id: "x" })).toBeNull();
    }
  });

  it("returns null when type is missing", () => {
    expect(componentFromJson({ id: "x" })).toBeNull();
  });

  it("addJsonComponentsToRoot throws a clean error for an unknown type", () => {
    expect(() =>
      addJsonComponentsToRoot([{ type: "Bogus", id: "y" }], false),
    ).toThrow(/Unable to import/);
  });
});

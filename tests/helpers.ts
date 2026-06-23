/**
 * Shared test helpers: registry reset + a deterministic fake 2D context.
 *
 * The editor keeps a single global component registry (`components`) plus
 * reactive `invisibleIDs` / `componentTree`. Because every test file shares that
 * module state, each test should start from a clean slate. Call `resetRegistry()`
 * in `beforeEach`.
 */
import { createFakeContext } from "./setup";
import {
  components,
  setInvisibleIDs,
  invalidateParentComponentCache,
} from "@/utils/manager/ComponentManager";
import { componentTree } from "@/utils/manager/WorkspaceManager";

export { createFakeContext as makeFakeContext };

/** Wipe all shared, module-level editor state so tests don't leak into each other. */
export function resetRegistry(): void {
  for (const key of Object.keys(components)) {
    delete components[key];
  }
  setInvisibleIDs([]);
  componentTree.value = [];
  invalidateParentComponentCache();
}

/** Build a fake 2D context (per-test, isolated from the global shared one). */
export function makeContext(): CanvasRenderingContext2D {
  return createFakeContext();
}

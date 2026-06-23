/**
 * Regression: the undo/redo history must retain exactly MAX_HISTORY (50)
 * snapshots. The previous cap check (`length >= MAX_HISTORY` AFTER inserting)
 * popped one entry too early, leaving only 49 usable undo steps.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetRegistry } from "./helpers";
import {
  history,
  updateHistory,
  clearHistory,
} from "@/utils/manager/HistoryManager";
import { componentTree } from "@/utils/manager/WorkspaceManager";
import { settings } from "@/utils/manager/SettingsManager";
import { Rect } from "@/utils/components/Rect";

describe("HistoryManager — snapshot cap", () => {
  beforeEach(() => {
    resetRegistry();
    clearHistory();
    settings.width = 3;
    settings.height = 2;
    settings.projectName = "Cap";
  });

  it("keeps exactly MAX_HISTORY (50) distinct snapshots, not 49", () => {
    for (let i = 0; i < 60; i++) {
      // Each iteration is a genuinely different tree so updateHistory() does not
      // dedupe it against the previous snapshot.
      componentTree.value = [
        new Rect(`r${i}`, `R${i}`, [], i, 0, 1, 1, "rgba(0,0,0,1)", 0),
      ];
      updateHistory();
    }

    expect(history.stack.length).toBe(50);
    expect(history.snapshots.length).toBe(50);
  });
});

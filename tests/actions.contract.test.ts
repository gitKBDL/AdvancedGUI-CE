/**
 * CONTRACT: action tree -> clickAction conversion
 * ------------------------------------------------
 * This suite guards the editor's `LocalConverter.processAction` /
 * `convertToFinalized` action-handling contract — i.e. how a component's
 * authoring-time `action` array (an array of editor Action draft objects) is
 * lowered into the single `clickAction` field that the AdvancedGUI 3.0.3 plugin
 * actually deserializes.
 *
 * The plugin reads exactly ONE clickAction per component. The editor therefore
 * has to collapse the authoring array into one of:
 *   - null                          (no actions)
 *   - the single action object      (exactly one action)
 *   - { id: "List", actions: [...] } (two or more actions)
 * and recursively lower conditional ("Check"), Delay, List and "List next"
 * actions into their plugin-side shapes.
 *
 * For Check actions whose payload is a Number Placeholder Check, the nested
 * `check.comparisonType` must be an integer that the plugin's
 * ComparisonTypeDeserializer (ComparisonType.values()[int], valid 0..4) accepts.
 * We assert that with the faithful deserializer mirror so contract drift between
 * the editor enum and the plugin enum is caught loudly.
 *
 * What we deliberately do NOT re-test here: the per-type component finalizers
 * (View/GIF/Image/Text/...); those belong to other contract files. This file is
 * scoped to the `action -> clickAction` lowering only.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetRegistry } from "./helpers";

// IMPORTANT: import ActionManager *first*. The action classes form a circular
// import cycle (Action <-> ActionManager); importing a concrete action class
// before the manager has been evaluated trips a TDZ ("Class extends value
// undefined"). Pulling in the manager first bootstraps the whole graph.
import { actionFromJson, actionsFromJson } from "@/utils/manager/ActionManager";
import { convertToFinalized } from "@/utils/LocalConverter";
import { JsonObject } from "@/utils/manager/ComponentManager";

import { CommandAction } from "@/utils/actions/CommandAction";
import { MessageAction } from "@/utils/actions/MessageAction";
import { CheckAction } from "@/utils/actions/CheckAction";
import { DelayAction } from "@/utils/actions/DelayAction";
import { ListAction } from "@/utils/actions/ListAction";
import { ListNextAction } from "@/utils/actions/ListNextAction";

import { MoneyCheck } from "@/utils/checks/MoneyCheck";
import { PlaceholderCheck, ComparisonType } from "@/utils/checks/PlaceholderCheck";

import {
  deserializeComparisonType,
  PLUGIN_COMPARISON_TYPES,
  PluginParseError,
} from "./contract/pluginDeserializers";

/**
 * Lower an authoring `action` array (array of action draft json objects) into
 * the finalized `clickAction` exactly the way the editor exports it: wrap it in
 * a minimal host component draft, run convertToFinalized, read clickAction back.
 */
function finalizeClickAction(action: unknown): JsonObject | null {
  const finalized = convertToFinalized({
    id: "host",
    type: "Rect",
    action,
  } as JsonObject);
  return finalized.clickAction as JsonObject | null;
}

/** Convenience: build the draft json the editor stores for an Action subclass. */
function draftOf(action: { toJsonObj(): JsonObject }): JsonObject {
  return action.toJsonObj();
}

describe("action tree -> clickAction conversion", () => {
  beforeEach(() => resetRegistry());

  // ---------------------------------------------------------------------------
  // Array collapse arity: 0 / 1 / N
  // ---------------------------------------------------------------------------
  describe("array arity collapse", () => {
    it("emits clickAction:null when the host has no action field at all", () => {
      const finalized = convertToFinalized({
        id: "host",
        type: "Rect",
      } as JsonObject);
      // convertToFinalized always materializes clickAction; absent action => null.
      expect(finalized).toHaveProperty("clickAction", null);
      // The authoring-only `action` field must never survive into the export.
      expect(finalized).not.toHaveProperty("action");
    });

    it("collapses an empty action array to clickAction:null", () => {
      expect(finalizeClickAction([])).toBeNull();
    });

    it("collapses a single action to the bare action object (no List wrapper)", () => {
      const cmd = new CommandAction("heal %player%", true, false);
      const click = finalizeClickAction([draftOf(cmd)]);

      expect(click).not.toBeNull();
      // A single action is NOT wrapped in a List; it becomes the action itself.
      expect(click!.id).toBe("Command");
      expect(click).toEqual({
        id: "Command",
        command: "heal %player%",
        asConsole: true,
        asOperator: false,
      });
    });

    it("wraps two-or-more actions in {id:'List', actions:[...]} preserving order", () => {
      const cmd = new CommandAction("say hi", false, false);
      const msg = new MessageAction("&aHello");
      const click = finalizeClickAction([draftOf(cmd), draftOf(msg)]);

      expect(click).not.toBeNull();
      expect(click!.id).toBe("List");
      expect(Array.isArray(click!.actions)).toBe(true);
      const actions = click!.actions as JsonObject[];
      expect(actions).toHaveLength(2);
      // Order preserved, each child lowered individually.
      expect(actions[0].id).toBe("Command");
      expect(actions[1].id).toBe("Message");
      expect(actions[1].message).toBe("&aHello");
    });

    it("wraps three actions in a single List (not nested lists)", () => {
      const a = new CommandAction("a", false, false);
      const b = new CommandAction("b", false, false);
      const c = new CommandAction("c", false, false);
      const click = finalizeClickAction([draftOf(a), draftOf(b), draftOf(c)]);

      expect(click!.id).toBe("List");
      const actions = click!.actions as JsonObject[];
      expect(actions).toHaveLength(3);
      expect(actions.map((x) => x.command)).toEqual(["a", "b", "c"]);
      // No double-wrapping: children are plain actions, not further Lists.
      expect(actions.every((x) => x.id === "Command")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Authoring-only fields stripped (expanded / name)
  // ---------------------------------------------------------------------------
  describe("authoring-only field stripping", () => {
    it("strips `expanded` and `name` from a lowered action object", () => {
      // Hand-craft a draft that carries authoring metadata the plugin never reads.
      const draft = {
        id: "Command",
        name: "My pretty name",
        expanded: true,
        command: "kill %player%",
        asConsole: true,
        asOperator: false,
      };
      const click = finalizeClickAction([draft]);

      expect(click).not.toBeNull();
      expect(click).not.toHaveProperty("expanded");
      expect(click).not.toHaveProperty("name");
      // The real payload survives intact.
      expect(click).toMatchObject({
        id: "Command",
        command: "kill %player%",
        asConsole: true,
        asOperator: false,
      });
    });

    it("strips `expanded`/`name` from every child inside a List wrapper", () => {
      const draftA = {
        id: "Message",
        name: "first",
        expanded: false,
        message: "one",
      };
      const draftB = {
        id: "Message",
        name: "second",
        expanded: true,
        message: "two",
      };
      const click = finalizeClickAction([draftA, draftB]);
      const actions = click!.actions as JsonObject[];

      for (const child of actions) {
        expect(child).not.toHaveProperty("expanded");
        expect(child).not.toHaveProperty("name");
      }
      expect(actions.map((x) => x.message)).toEqual(["one", "two"]);
    });
  });

  // ---------------------------------------------------------------------------
  // Conditional (Check) action lowering
  // ---------------------------------------------------------------------------
  describe("conditional (Check) action lowering", () => {
    it("lowers a CheckAction with two branches to {id:'Check', positiveAction, negativeAction}", () => {
      const positive = new CommandAction("give diamond", true, false);
      const negative = new MessageAction("&cToo poor");
      const checkAction = new CheckAction(
        new MoneyCheck(30),
        [positive, negative],
        true,
      );

      const click = finalizeClickAction([draftOf(checkAction)]);

      expect(click).not.toBeNull();
      // id becomes the literal "Check" marker the plugin's Check component reads.
      expect(click!.id).toBe("Check");
      // The authoring `actions` array is replaced by positive/negative branches.
      expect(click).not.toHaveProperty("actions");
      expect(click).not.toHaveProperty("expanded");

      expect(click!.positiveAction).toEqual({
        id: "Command",
        command: "give diamond",
        asConsole: true,
        asOperator: false,
      });
      expect(click!.negativeAction).toEqual({
        id: "Message",
        message: "&cToo poor",
      });

      // The check payload is preserved with its `type` discriminator.
      expect(click!.check).toMatchObject({ type: "Money Check", amount: 30 });
    });

    it("sets negativeAction:null when the conditional only has a positive branch", () => {
      const positive = new CommandAction("fly on", true, true);
      const checkAction = new CheckAction(new MoneyCheck(10), [positive], true);

      const click = finalizeClickAction([draftOf(checkAction)]);

      expect(click!.id).toBe("Check");
      expect(click!.positiveAction).toMatchObject({ id: "Command", command: "fly on" });
      // positiveAction = actions[0], negativeAction = actions[1] ?? null.
      expect(click!.negativeAction).toBeNull();
    });

    it("sets both branches null when the conditional has no actions", () => {
      const checkAction = new CheckAction(new MoneyCheck(5), [], true);
      const click = finalizeClickAction([draftOf(checkAction)]);

      expect(click!.id).toBe("Check");
      expect(click!.positiveAction).toBeNull();
      expect(click!.negativeAction).toBeNull();
    });

    it("recursively lowers a conditional branch that is itself a List (2+ nested actions)", () => {
      // A positive branch containing two actions must itself collapse to a List.
      // We can't express a multi-action branch via a single Action subclass, so
      // we use a ListAction as the positive branch (its export is {id:List,...}).
      const inner = new ListAction(
        [new CommandAction("a", false, false), new MessageAction("b")],
        true,
      );
      const checkAction = new CheckAction(new MoneyCheck(1), [inner], true);

      const click = finalizeClickAction([draftOf(checkAction)]);
      expect(click!.id).toBe("Check");
      const pos = click!.positiveAction as JsonObject;
      // A ListAction branch keeps its List id and lowers each child.
      expect(pos.id).toBe("List");
      const innerActions = pos.actions as JsonObject[];
      expect(innerActions).toHaveLength(2);
      expect(innerActions[0].id).toBe("Command");
      expect(innerActions[1].id).toBe("Message");
      // No authoring metadata leaks into the nested branch.
      expect(pos).not.toHaveProperty("expanded");
    });
  });

  // ---------------------------------------------------------------------------
  // Number Placeholder Check comparisonType — guarded against the PLUGIN enum
  // ---------------------------------------------------------------------------
  describe("Number Placeholder conditional comparisonType is plugin-readable", () => {
    it("emits an integer comparisonType the plugin's ComparisonTypeDeserializer accepts", () => {
      const phCheck = new PlaceholderCheck(
        "%player_health%",
        ComparisonType.EQUAL, // editor ordinal 2
        "20",
      );
      const checkAction = new CheckAction(
        phCheck,
        [new CommandAction("heal %player%", true, false)],
        true,
      );

      const click = finalizeClickAction([draftOf(checkAction)]);
      const check = click!.check as JsonObject;

      expect(check.type).toBe("Number Placeholder Check");
      // comparisonType must be a real integer node (not a string) ...
      expect(typeof check.comparisonType).toBe("number");
      expect(Number.isInteger(check.comparisonType as number)).toBe(true);
      // ... and `value` must be numeric for a numeric comparison.
      expect(typeof check.value).toBe("number");
      expect(check.value).toBe(20);

      // The plugin would do ComparisonType.values()[int]; assert it does not throw
      // and resolves to the editor-intended EQUAL ordinal (2 -> "EQUAL").
      expect(() =>
        deserializeComparisonType(check.comparisonType),
      ).not.toThrow();
      expect(deserializeComparisonType(check.comparisonType)).toBe("EQUAL");
    });

    it("every editor numeric ComparisonType ordinal maps to a valid plugin ordinal", () => {
      const editorOrdinals: ComparisonType[] = [
        ComparisonType.LESS,
        ComparisonType.LESS_EQ,
        ComparisonType.EQUAL,
        ComparisonType.GREATER_EQ,
        ComparisonType.GREATER,
      ];

      for (const ordinal of editorOrdinals) {
        const checkAction = new CheckAction(
          new PlaceholderCheck("%p%", ordinal, "1"),
          [new MessageAction("x")],
          true,
        );
        const click = finalizeClickAction([draftOf(checkAction)]);
        const comparisonType = (click!.check as JsonObject).comparisonType;

        // Editor ordinal must equal the value emitted (1:1, no remap).
        expect(comparisonType).toBe(ordinal);
        // ... and must land inside the plugin's 0..4 enum range.
        expect(() => deserializeComparisonType(comparisonType)).not.toThrow();
        expect(deserializeComparisonType(comparisonType)).toBe(
          PLUGIN_COMPARISON_TYPES[ordinal as number],
        );
      }
    });

    it("a STRING placeholder check drops comparisonType (plugin reads a string check)", () => {
      const phCheck = new PlaceholderCheck(
        "%armor_has_chestplate%",
        ComparisonType.STRING, // -1
        "true",
      );
      const checkAction = new CheckAction(
        phCheck,
        [new CommandAction("noop", false, false)],
        true,
      );

      const click = finalizeClickAction([draftOf(checkAction)]);
      const check = click!.check as JsonObject;

      // STRING comparison => "Placeholder Check" with NO numeric comparisonType.
      expect(check.type).toBe("Placeholder Check");
      expect(check).not.toHaveProperty("comparisonType");
      // The value stays a string for a string comparison.
      expect(check.value).toBe("true");
      // Feeding `undefined` to the plugin comparison deserializer would throw,
      // which is exactly why the editor must omit the field here.
      expect(() => deserializeComparisonType(check.comparisonType)).toThrow(
        PluginParseError,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Delay action -> children processed
  // ---------------------------------------------------------------------------
  describe("Delay action lowering", () => {
    it("keeps ticks/children and lowers each child action", () => {
      const delay = new DelayAction(
        20,
        [new CommandAction("a", false, false), new MessageAction("b")],
        true,
      );
      const click = finalizeClickAction([draftOf(delay)]);

      expect(click!.id).toBe("Delay");
      expect(click!.ticks).toBe(20);
      // Delay carries `children`, not `actions`.
      expect(Array.isArray(click!.children)).toBe(true);
      expect(click).not.toHaveProperty("actions");
      expect(click).not.toHaveProperty("expanded");

      const children = click!.children as JsonObject[];
      expect(children).toHaveLength(2);
      expect(children[0]).toEqual({
        id: "Command",
        command: "a",
        asConsole: false,
        asOperator: false,
      });
      expect(children[1]).toEqual({ id: "Message", message: "b" });
    });

    it("recursively lowers a conditional nested inside a Delay child", () => {
      const nestedCheck = new CheckAction(
        new MoneyCheck(2),
        [new CommandAction("p", false, false), new MessageAction("n")],
        true,
      );
      const delay = new DelayAction(10, [nestedCheck], true);

      const click = finalizeClickAction([draftOf(delay)]);
      const children = click!.children as JsonObject[];
      expect(children).toHaveLength(1);

      // The nested conditional child is lowered to a Check, not left as raw actions.
      const child = children[0];
      expect(child.id).toBe("Check");
      expect(child).not.toHaveProperty("actions");
      expect((child.positiveAction as JsonObject).id).toBe("Command");
      expect((child.negativeAction as JsonObject).id).toBe("Message");
    });
  });

  // ---------------------------------------------------------------------------
  // List action and "List next"/"View Next" id rename
  // ---------------------------------------------------------------------------
  describe("List action and id renames", () => {
    it("preserves an authored ListAction's id and lowers its children", () => {
      const list = new ListAction(
        [new CommandAction("a", false, false), new MessageAction("b")],
        true,
      );
      const click = finalizeClickAction([draftOf(list)]);

      expect(click!.id).toBe("List");
      expect(click).not.toHaveProperty("expanded");
      const actions = click!.actions as JsonObject[];
      expect(actions).toHaveLength(2);
      expect(actions[0].id).toBe("Command");
      expect(actions[1].id).toBe("Message");
    });

    it("renames the legacy 'List next' action id to 'View Next'", () => {
      // Hand-crafted legacy draft (older saves used "List next").
      const legacy = { id: "List next", targetId: "tab-2", forward: true };
      const click = finalizeClickAction([legacy]);

      expect(click!.id).toBe("View Next");
      // Payload preserved.
      expect(click!.targetId).toBe("tab-2");
      expect(click!.forward).toBe(true);
    });

    it("emits 'View Next' for the current ListNextAction class (already migrated id)", () => {
      const ln = new ListNextAction("tab-3", false);
      // The current class already exports id "View Next" (legacyId is "List next").
      expect(ListNextAction.id).toBe("View Next");
      expect(ListNextAction.legacyId).toBe("List next");

      const click = finalizeClickAction([draftOf(ln)]);
      expect(click!.id).toBe("View Next");
      expect(click!.targetId).toBe("tab-3");
      expect(click!.forward).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Round-trip: real Action subclasses survive ActionManager (de)serialization
  // ---------------------------------------------------------------------------
  describe("ActionManager round-trip into the lowering pipeline", () => {
    it("actionFromJson reconstructs an action whose re-export lowers identically", () => {
      const original = new CommandAction("heal %player%", true, false);
      const rebuilt = actionFromJson(draftOf(original));

      expect(rebuilt).toBeInstanceOf(CommandAction);
      // Re-exporting the rebuilt action and lowering it yields the same clickAction.
      const click = finalizeClickAction([draftOf(rebuilt)]);
      expect(click).toEqual({
        id: "Command",
        command: "heal %player%",
        asConsole: true,
        asOperator: false,
      });
    });

    it("actionsFromJson round-trips a heterogeneous list and lowers to a List wrapper", () => {
      const drafts = [
        draftOf(new CommandAction("a", false, false)),
        draftOf(new MessageAction("b")),
        draftOf(new ListNextAction("v", true)),
      ];
      const rebuilt = actionsFromJson(drafts as JsonObject);
      expect(rebuilt).toHaveLength(3);

      const click = finalizeClickAction(rebuilt.map((a) => a.toJsonObj()));
      expect(click!.id).toBe("List");
      const actions = click!.actions as JsonObject[];
      expect(actions.map((x) => x.id)).toEqual(["Command", "Message", "View Next"]);
    });
  });

  // ---------------------------------------------------------------------------
  // Whole-component nesting: clickAction lowering also runs inside .components
  // ---------------------------------------------------------------------------
  describe("nested component clickAction lowering", () => {
    it("lowers child component actions when the host has a components array", () => {
      const childCmd = new CommandAction("child cmd", false, false);
      const finalized = convertToFinalized({
        id: "parent",
        type: "Group",
        components: [
          {
            id: "child",
            type: "Rect",
            action: [draftOf(childCmd)],
          },
        ],
      } as JsonObject);

      const children = finalized.components as JsonObject[];
      expect(children).toHaveLength(1);
      // The child's authoring `action` is gone and replaced by a lowered clickAction.
      expect(children[0]).not.toHaveProperty("action");
      expect(children[0].clickAction).toEqual({
        id: "Command",
        command: "child cmd",
        asConsole: false,
        asOperator: false,
      });
    });
  });
});

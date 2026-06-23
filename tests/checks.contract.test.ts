/**
 * Contract tests for the editor's CHECK handling — the boundary where the
 * Community Editor's check classes (PlaceholderCheck, ListNextCheck) plus
 * LocalConverter.processCheck must produce JSON the AdvancedGUI 3.0.3 plugin can
 * actually deserialize.
 *
 * What this file guards (the "plugin contract"):
 *  - A Placeholder check with STRING comparison finalizes to type
 *    "Placeholder Check" with NO `comparisonType` field. (A string check has no
 *    ComparisonType node for the plugin to read.)
 *  - A NUMBER comparison finalizes to type "Number Placeholder Check" with an
 *    INTEGER `comparisonType` in 0..4 and a finite numeric `value`. The integer
 *    must survive the plugin's ComparisonTypeDeserializer
 *    (= ComparisonType.values()[int]); any index outside 0..4 would be an
 *    ArrayIndexOutOfBoundsException, so the editor must never emit one.
 *  - The legacy check type "List next Check" is renamed to "View Next Check".
 *  - Editor-only bookkeeping fields ("name", legacy "compType") are stripped
 *    from the finalized check.
 *  - PlaceholderCheck.toCheckDataObj: string mode omits comparisonType; number
 *    mode coerces `value` to a finite number.
 *
 * The plugin side is asserted through the faithful deserializer mirrors in
 * tests/contract/pluginDeserializers.ts — a finalized check is "plugin-readable"
 * iff deserializeComparisonType() does not throw PluginParseError.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetRegistry } from "./helpers";

import { convertToFinalized } from "@/utils/LocalConverter";
import {
  PlaceholderCheck,
  ComparisonType,
} from "@/utils/checks/PlaceholderCheck";
import { ListNextCheck } from "@/utils/checks/ListNextCheck";
import { CheckComponent } from "@/utils/components/CheckComponent";
import { CheckAction } from "@/utils/actions/CheckAction";
import { checks, checkFromJson } from "@/utils/manager/CheckManager";
import {
  deserializeComparisonType,
  PLUGIN_COMPARISON_TYPES,
  PluginParseError,
} from "./contract/pluginDeserializers";

/** Build the export/draft JSON the editor would serialize for a component. */
function draft(component: { toJson: (forUsage?: boolean) => string }) {
  return JSON.parse(component.toJson(true));
}

beforeEach(() => resetRegistry());

// ---------------------------------------------------------------------------
// PlaceholderCheck unit contract (the source of the check sub-object)
// ---------------------------------------------------------------------------
describe("PlaceholderCheck.toCheckDataObj", () => {
  it("string mode (compType STRING) omits comparisonType and keeps the raw string value", () => {
    const check = new PlaceholderCheck("%armor_has_chestplate%", ComparisonType.STRING, "true");

    expect(check.name).toBe("Placeholder Check");

    const obj = check.toCheckDataObj();
    expect(obj).toEqual({
      placeholder: "%armor_has_chestplate%",
      value: "true",
    });
    // A string check must NOT carry a comparisonType — the plugin's string
    // PlaceholderCheck has no ComparisonType node.
    expect("comparisonType" in obj).toBe(false);
  });

  it("number mode names the check 'Number Placeholder Check' and emits the comparisonType", () => {
    const check = new PlaceholderCheck("%player_health%", ComparisonType.EQUAL, "20");

    expect(check.name).toBe("Number Placeholder Check");

    const obj = check.toCheckDataObj();
    expect(obj.comparisonType).toBe(ComparisonType.EQUAL); // 2
    expect(obj.placeholder).toBe("%player_health%");
  });

  it("number mode coerces a numeric string value to a finite number", () => {
    const check = new PlaceholderCheck("%player_health%", ComparisonType.GREATER, "20.5");
    const obj = check.toCheckDataObj();
    expect(obj.value).toBe(20.5);
    expect(typeof obj.value).toBe("number");
  });

  it("number mode coerces an un-parseable value to 0 (never NaN)", () => {
    const check = new PlaceholderCheck("%x%", ComparisonType.LESS, "not-a-number");
    const obj = check.toCheckDataObj();
    expect(obj.value).toBe(0);
    expect(Number.isNaN(obj.value)).toBe(false);
  });

  it("the emitted comparisonType is a plugin-readable ComparisonType ordinal for every numeric mode", () => {
    for (const ct of [
      ComparisonType.LESS,
      ComparisonType.LESS_EQ,
      ComparisonType.EQUAL,
      ComparisonType.GREATER_EQ,
      ComparisonType.GREATER,
    ]) {
      const obj = new PlaceholderCheck("%v%", ct, "1").toCheckDataObj();
      // round-trips through the actual plugin deserializer without throwing.
      expect(() => deserializeComparisonType(obj.comparisonType)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// ComparisonType <-> plugin ordinal mapping
// ---------------------------------------------------------------------------
describe("ComparisonType bounds vs ComparisonTypeDeserializer", () => {
  it("editor enum 0..4 maps 1:1 onto the plugin's ComparisonType ordinals", () => {
    expect(ComparisonType.LESS).toBe(0);
    expect(ComparisonType.LESS_EQ).toBe(1);
    expect(ComparisonType.EQUAL).toBe(2);
    expect(ComparisonType.GREATER_EQ).toBe(3);
    expect(ComparisonType.GREATER).toBe(4);

    expect(deserializeComparisonType(0)).toBe("LESS");
    expect(deserializeComparisonType(1)).toBe("LESS_EQ");
    expect(deserializeComparisonType(2)).toBe("EQUAL");
    expect(deserializeComparisonType(3)).toBe("GREATER_EQ");
    expect(deserializeComparisonType(4)).toBe("GREATER");
  });

  it("STRING (-1) is NOT a valid number-comparison ordinal", () => {
    expect(ComparisonType.STRING).toBe(-1);
    // -1 would index out of the values() array in the plugin.
    expect(() => deserializeComparisonType(ComparisonType.STRING)).toThrow(
      PluginParseError,
    );
  });

  it("an out-of-range ordinal (5) is rejected by the plugin mirror", () => {
    expect(PLUGIN_COMPARISON_TYPES.length).toBe(5);
    expect(() => deserializeComparisonType(5)).toThrow(PluginParseError);
  });

  it("a non-integer comparisonType token is rejected by the plugin mirror", () => {
    expect(() => deserializeComparisonType(2.5)).toThrow(PluginParseError);
    expect(() => deserializeComparisonType("2")).toThrow(PluginParseError);
  });
});

// ---------------------------------------------------------------------------
// LocalConverter.processCheck via a Check COMPONENT (component.check path)
// ---------------------------------------------------------------------------
describe("convertToFinalized: Check component with a Placeholder check (STRING mode)", () => {
  function finalizeCheckComponent(check: PlaceholderCheck) {
    const comp = new CheckComponent("chk1", "Check", [], [], true, false, check);
    return convertToFinalized(draft(comp));
  }

  it("finalizes to type 'Placeholder Check' with NO comparisonType field", () => {
    const finalized = finalizeCheckComponent(
      new PlaceholderCheck("%has_perm%", ComparisonType.STRING, "true"),
    );

    expect(finalized.type).toBe("Check");
    expect(finalized.check.type).toBe("Placeholder Check");
    expect("comparisonType" in finalized.check).toBe(false);
    // string value preserved verbatim
    expect(finalized.check.value).toBe("true");
    expect(finalized.check.placeholder).toBe("%has_perm%");
  });

  it("strips editor-only fields ('name', legacy 'compType') from the finalized check", () => {
    const comp = new CheckComponent("chk2", "Check", [], [], true, false,
      new PlaceholderCheck("%x%", ComparisonType.STRING, "v"));
    const d = draft(comp);
    // Simulate a legacy/older draft that still carries name + compType on the check.
    d.check.name = "Placeholder Check";
    d.check.compType = -1;

    const finalized = convertToFinalized(d);
    expect("name" in finalized.check).toBe(false);
    expect("compType" in finalized.check).toBe(false);
  });

  it("injects Dummy positive/negative fallbacks when the Check has no child components", () => {
    const finalized = finalizeCheckComponent(
      new PlaceholderCheck("%x%", ComparisonType.STRING, "v"),
    );
    expect(finalized.positive).toMatchObject({
      type: "Dummy",
      id: "chk1_dummy_pos",
      clickAction: null,
      hidden: false,
    });
    expect(finalized.negative).toMatchObject({
      type: "Dummy",
      id: "chk1_dummy_neg",
    });
    // The editor-side `components` array is consumed into positive/negative.
    expect("components" in finalized).toBe(false);
    expect("drawNegative" in finalized).toBe(false);
  });
});

describe("convertToFinalized: Check component with a Placeholder check (NUMBER mode)", () => {
  function finalizeNumberCheck(ct: ComparisonType, value: string) {
    const comp = new CheckComponent(
      "numchk", "Check", [], [], true, false,
      new PlaceholderCheck("%player_health%", ct, value),
    );
    return convertToFinalized(draft(comp));
  }

  it("finalizes to 'Number Placeholder Check' with an INTEGER comparisonType and numeric value", () => {
    const finalized = finalizeNumberCheck(ComparisonType.GREATER_EQ, "20");

    expect(finalized.check.type).toBe("Number Placeholder Check");
    expect(finalized.check.comparisonType).toBe(3);
    expect(Number.isInteger(finalized.check.comparisonType)).toBe(true);
    expect(finalized.check.value).toBe(20);
    expect(typeof finalized.check.value).toBe("number");
  });

  it("the finalized comparisonType is accepted by the plugin's ComparisonTypeDeserializer for every enum value", () => {
    for (let ct = 0 as ComparisonType; ct <= 4; ct++) {
      const finalized = finalizeNumberCheck(ct, "1");
      expect(finalized.check.type).toBe("Number Placeholder Check");
      expect(() =>
        deserializeComparisonType(finalized.check.comparisonType),
      ).not.toThrow();
      expect(deserializeComparisonType(finalized.check.comparisonType)).toBe(
        PLUGIN_COMPARISON_TYPES[ct as number],
      );
    }
  });

  it("coerces a decimal-string value into a finite number", () => {
    const finalized = finalizeNumberCheck(ComparisonType.LESS, "3.5");
    expect(finalized.check.value).toBe(3.5);
  });
});

// ---------------------------------------------------------------------------
// processCheck driven by the legacy `comparisonType` carried on a draft check.
// Verifies the string<->number split decision directly through convertToFinalized.
// ---------------------------------------------------------------------------
describe("convertToFinalized: Placeholder/Number split decision (processCheck)", () => {
  /** Minimal Check-component draft with a hand-built check sub-object. */
  function checkComponentDraft(check: Record<string, unknown>) {
    return {
      id: "split",
      name: "Check",
      action: [],
      type: "Check",
      components: [],
      expanded: true,
      drawNegative: false,
      check,
    };
  }

  it("comparisonType -1 collapses a Number-typed draft back to a string Placeholder Check", () => {
    const finalized = convertToFinalized(
      checkComponentDraft({
        type: "Number Placeholder Check",
        placeholder: "%x%",
        comparisonType: -1,
        value: "hello",
      }),
    );
    expect(finalized.check.type).toBe("Placeholder Check");
    expect("comparisonType" in finalized.check).toBe(false);
  });

  it("absent comparisonType on a Placeholder Check stays a string check (no comparisonType emitted)", () => {
    const finalized = convertToFinalized(
      checkComponentDraft({
        type: "Placeholder Check",
        placeholder: "%x%",
        value: "world",
      }),
    );
    expect(finalized.check.type).toBe("Placeholder Check");
    expect("comparisonType" in finalized.check).toBe(false);
  });

  it("a 0..4 comparisonType promotes a Placeholder Check to a Number Placeholder Check", () => {
    const finalized = convertToFinalized(
      checkComponentDraft({
        type: "Placeholder Check",
        placeholder: "%player_level%",
        comparisonType: 0,
        value: "5",
      }),
    );
    expect(finalized.check.type).toBe("Number Placeholder Check");
    expect(finalized.check.comparisonType).toBe(0);
    expect(finalized.check.value).toBe(5);
    expect(() =>
      deserializeComparisonType(finalized.check.comparisonType),
    ).not.toThrow();
  });

  it("reads the legacy `compType` field when `comparisonType` is absent", () => {
    const finalized = convertToFinalized(
      checkComponentDraft({
        type: "Placeholder Check",
        placeholder: "%v%",
        compType: 4,
        value: "10",
      }),
    );
    expect(finalized.check.type).toBe("Number Placeholder Check");
    expect(finalized.check.comparisonType).toBe(4);
    // legacy field must not leak into the finalized output
    expect("compType" in finalized.check).toBe(false);
  });

  it("number mode rewrites a non-numeric value to 0", () => {
    const finalized = convertToFinalized(
      checkComponentDraft({
        type: "Number Placeholder Check",
        placeholder: "%v%",
        comparisonType: 2,
        value: "abc",
      }),
    );
    expect(finalized.check.value).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ListNextCheck rename: "List next Check" -> "View Next Check"
// ---------------------------------------------------------------------------
describe("ListNextCheck rename to 'View Next Check'", () => {
  it("the editor class exposes the new id and the legacy id", () => {
    expect(ListNextCheck.id).toBe("View Next Check");
    expect(ListNextCheck.legacyId).toBe("List next Check");
    expect(new ListNextCheck("targetA", true).name).toBe("View Next Check");
  });

  it("CheckManager resolves BOTH the new and legacy type strings to ListNextCheck", () => {
    expect(checks["View Next Check"]).toBe(ListNextCheck);
    expect(checks["List next Check"]).toBe(ListNextCheck);

    const fromNew = checkFromJson(
      { targetId: "t", forward: false },
      "View Next Check",
    );
    const fromLegacy = checkFromJson(
      { targetId: "t", forward: false },
      "List next Check",
    );
    expect(fromNew).toBeInstanceOf(ListNextCheck);
    expect(fromLegacy).toBeInstanceOf(ListNextCheck);
  });

  it("processCheck renames a legacy 'List next Check' draft to 'View Next Check'", () => {
    const finalized = convertToFinalized({
      id: "ln",
      name: "Check",
      action: [],
      type: "Check",
      components: [],
      expanded: true,
      drawNegative: false,
      check: {
        type: "List next Check",
        targetId: "viewX",
        forward: true,
      },
    });
    expect(finalized.check.type).toBe("View Next Check");
    expect(finalized.check.targetId).toBe("viewX");
    expect(finalized.check.forward).toBe(true);
  });

  it("an already-'View Next Check' draft is left unchanged by processCheck", () => {
    const finalized = convertToFinalized({
      id: "ln2",
      name: "Check",
      action: [],
      type: "Check",
      components: [],
      expanded: true,
      drawNegative: false,
      check: { type: "View Next Check", targetId: "v", forward: false },
    });
    expect(finalized.check.type).toBe("View Next Check");
  });
});

// ---------------------------------------------------------------------------
// Check via a CheckACTION on a component: action -> clickAction, processCheck
// applies inside the converted condition action.
// ---------------------------------------------------------------------------
describe("convertToFinalized: CheckAction in a component's clickAction", () => {
  it("converts a number-check action into a Check clickAction with a plugin-readable comparisonType", () => {
    const action = new CheckAction(
      new PlaceholderCheck("%player_health%", ComparisonType.EQUAL, "20"),
      [],
      true,
    );
    // The component draft carries `action: [<checkActionJson>]`.
    const compDraft = {
      id: "host",
      name: "host",
      type: "Rect",
      action: [action.toJsonObj()],
    };

    const finalized = convertToFinalized(compDraft);

    // action -> clickAction
    expect("action" in finalized).toBe(false);
    const clickAction = finalized.clickAction;
    // condition action gets id "Check" + positive/negative split
    expect(clickAction.id).toBe("Check");
    expect(clickAction.check.type).toBe("Number Placeholder Check");
    expect(clickAction.check.comparisonType).toBe(2);
    expect(clickAction.check.value).toBe(20);
    expect(() =>
      deserializeComparisonType(clickAction.check.comparisonType),
    ).not.toThrow();
    // the editor `actions` array is consumed into positive/negative
    expect("actions" in clickAction).toBe(false);
  });

  it("a string-check action emits 'Placeholder Check' with no comparisonType", () => {
    const action = new CheckAction(
      new PlaceholderCheck("%has_perm%", ComparisonType.STRING, "true"),
      [],
      true,
    );
    const finalized = convertToFinalized({
      id: "host2",
      name: "host2",
      type: "Rect",
      action: [action.toJsonObj()],
    });

    const clickAction = finalized.clickAction;
    expect(clickAction.id).toBe("Check");
    expect(clickAction.check.type).toBe("Placeholder Check");
    expect("comparisonType" in clickAction.check).toBe(false);
    expect(clickAction.check.value).toBe("true");
  });

  it("a ListNextCheck action is renamed to 'View Next Check' inside the clickAction", () => {
    const action = new CheckAction(new ListNextCheck("targetView", false), [], true);
    const finalized = convertToFinalized({
      id: "host3",
      name: "host3",
      type: "Rect",
      action: [action.toJsonObj()],
    });
    expect(finalized.clickAction.check.type).toBe("View Next Check");
    expect(finalized.clickAction.check.targetId).toBe("targetView");
  });
});

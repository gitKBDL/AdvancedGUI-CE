import { JsonObject } from "./manager/ComponentManager";

type Draft = JsonObject | null | undefined;

function processCheck(check: Draft): JsonObject | null {
  if (!check) return null;

  const finalCheck: JsonObject = { ...check };

  if (finalCheck.type === "List next Check") {
    finalCheck.type = "View Next Check";
  }

  const rawCompType = finalCheck.comparisonType ?? finalCheck.compType;
  const parsedCompType = Number.parseInt(String(rawCompType), 10);
  const isNumberComparison = Number.isFinite(parsedCompType);
  const isStringComparison = !isNumberComparison || parsedCompType === -1;

  if (
    finalCheck.type === "Placeholder Check" ||
    finalCheck.type === "Number Placeholder Check"
  ) {
    if (isStringComparison) {
      finalCheck.type = "Placeholder Check";
      delete finalCheck.comparisonType;
    } else {
      finalCheck.type = "Number Placeholder Check";
      finalCheck.comparisonType = parsedCompType;

      const parsedValue =
        typeof finalCheck.value === "number"
          ? finalCheck.value
          : Number.parseFloat(String(finalCheck.value));
      finalCheck.value = Number.isFinite(parsedValue) ? parsedValue : 0;
    }
  }

  delete finalCheck.compType;
  delete finalCheck.name;
  return finalCheck;
}

function processAction(action: Draft): JsonObject | null {
  if (!action) return null;

  if (Array.isArray(action)) return processActionArray(action);

  const finalAction: JsonObject = { ...action };
  const originalId = finalAction.id as string | undefined;

  delete finalAction.expanded;
  delete finalAction.name;

  normalizeActionCheck(finalAction, originalId);

  if (finalAction.check && finalAction.actions !== undefined) {
    convertConditionAction(finalAction);
  } else {
    convertNestedActionChildren(finalAction);
  }

  normalizeLooseActions(finalAction);
  return finalAction;
}

function processActionArray(action: Draft[]) {
  if (action.length === 0) return null;
  if (action.length === 1) return processAction(action[0]);
  return {
    id: "List",
    actions: action.map(processAction),
  };
}

function normalizeActionCheck(
  finalAction: JsonObject,
  originalId: string | undefined,
) {
  if (!finalAction.check) return;
  if (!finalAction.check.type && originalId) {
    finalAction.check.type = originalId;
  }
  finalAction.check = processCheck(finalAction.check);
}

function convertConditionAction(finalAction: JsonObject) {
  finalAction.id = "Check";
  const actions = Array.isArray(finalAction.actions)
    ? (finalAction.actions as Draft[])
    : [];
  finalAction.positiveAction =
    actions.length > 0 ? processAction(actions[0]) : null;
  finalAction.negativeAction =
    actions.length > 1 ? processAction(actions[1]) : null;
  delete finalAction.actions;
}

function convertNestedActionChildren(finalAction: JsonObject) {
  if (finalAction.id === "List" && Array.isArray(finalAction.actions)) {
    finalAction.actions = finalAction.actions.map(processAction);
    return;
  }

  if (finalAction.id === "Delay" && Array.isArray(finalAction.children)) {
    finalAction.children = finalAction.children.map(processAction);
    return;
  }

  if (finalAction.id === "List next") {
    finalAction.id = "View Next";
  }
}

function normalizeLooseActions(finalAction: JsonObject) {
  if (
    Array.isArray(finalAction.actions) &&
    finalAction.id !== "Check" &&
    finalAction.id !== "List"
  ) {
    finalAction.actions = finalAction.actions.map(processAction);
  }
}

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createDummyComponent(id: string, suffix: string): JsonObject {
  return {
    type: "Dummy",
    id: `${id}_${suffix}`,
    clickAction: null,
    hidden: false,
  };
}

function normalizeFontDefinition(finalized: JsonObject) {
  if (typeof finalized.font === "string" && typeof finalized.size === "number") {
    finalized.font = {
      name: finalized.font,
      size: finalized.size,
    };
    delete finalized.size;
  }
}

function finalizeViewComponent(finalized: JsonObject) {
  if (finalized.components) {
    finalized.views = finalized.components;
    delete finalized.components;

    const defaultIndex = finalized.drawIndex || 0;
    if (finalized.views.length > 0) {
      finalized.defaultComponent = cloneDeep(finalized.views[defaultIndex]);
    } else {
      finalized.defaultComponent = createDummyComponent(finalized.id, "dummy_default");
    }
  } else {
    finalized.views = [];
    finalized.defaultComponent = createDummyComponent(finalized.id, "dummy_default");
  }

  delete finalized.drawIndex;
}

function finalizeGroupComponent(finalized: JsonObject) {
  if (!finalized.components) finalized.components = [];
}

function finalizeClickAnimationComponent(finalized: JsonObject) {
  if (Array.isArray(finalized.components) && finalized.components.length > 0) {
    finalized.normal = finalized.components[0];
  } else {
    finalized.normal = createDummyComponent(finalized.id, "dummy_normal");
  }

  if (Array.isArray(finalized.components) && finalized.components.length > 1) {
    finalized.clicked = finalized.components[1];
  } else {
    finalized.clicked = cloneDeep(finalized.normal);
  }

  delete finalized.components;
  delete finalized.drawClicked;
}

function finalizeHoverComponent(finalized: JsonObject) {
  if (Array.isArray(finalized.components) && finalized.components.length > 0) {
    finalized.normal = finalized.components[0];
  } else {
    finalized.normal = createDummyComponent(finalized.id, "dummy_normal");
  }

  if (Array.isArray(finalized.components) && finalized.components.length > 1) {
    finalized.hovered = finalized.components[1];
  } else {
    finalized.hovered = createDummyComponent(finalized.id, "dummy_hovered");
  }

  delete finalized.components;
  delete finalized.drawHovered;
}

function finalizeRemoteImageComponent(finalized: JsonObject) {
  if (Array.isArray(finalized.components) && finalized.components.length > 0) {
    finalized.loading = finalized.components[0];
  }
  if (!finalized.imageUrl) finalized.imageUrl = "";
  delete finalized.components;
  delete finalized.drawLoading;
  delete finalized.ratio;
  delete finalized.keepImageRatio;
}

function finalizeGifComponent(finalized: JsonObject) {
  finalized.gifFrames = {
    name: finalized.image,
    width: finalized.width,
    height: finalized.height,
    dithering: finalized.dithering,
  };
  delete finalized.image;
  delete finalized.width;
  delete finalized.height;
  delete finalized.dithering;
}

function finalizeImageComponent(finalized: JsonObject) {
  const imageName = finalized.image;
  finalized.image = {
    name: imageName,
    width: finalized.width,
    height: finalized.height,
    dithering: finalized.dithering,
  };
  delete finalized.width;
  delete finalized.height;
  delete finalized.dithering;
  delete finalized.keepImageRatio;
}

function finalizeTextComponent(finalized: JsonObject) {
  const shouldUsePlaceholder =
    finalized.type === "PlaceholderText" || finalized.placeholder;
  if (shouldUsePlaceholder) {
    finalized.type = "PlaceholderText";
  }
  delete finalized.placeholder;
  delete finalized.previewText;
  normalizeFontDefinition(finalized);
}

function finalizeCheckComponent(finalized: JsonObject) {
  if (Array.isArray(finalized.components)) {
    if (finalized.components.length > 0) {
      finalized.positive = finalized.components[0];
    }
    if (finalized.components.length > 1) {
      finalized.negative = finalized.components[1];
    }
  }

  if (finalized.check) {
    finalized.check = processCheck(finalized.check);
  }

  if (!finalized.positive) {
    finalized.positive = createDummyComponent(finalized.id, "dummy_pos");
  }
  if (!finalized.negative) {
    finalized.negative = createDummyComponent(finalized.id, "dummy_neg");
  }

  delete finalized.components;
  delete finalized.drawNegative;
}

function finalizeTextInputComponent(finalized: JsonObject) {
  if (finalized.maxLength !== undefined) {
    finalized.inputHandler = finalized.maxLength;
  }
  delete finalized.maxLength;

  normalizeFontDefinition(finalized);

  if (finalized.defaultInput === null || finalized.defaultInput === undefined) {
    finalized.defaultInput = "";
  }
}

function finalizeByType(finalized: JsonObject) {
  if (finalized.type === "View") {
    finalizeViewComponent(finalized);
    return;
  }
  if (finalized.type === "Group") {
    finalizeGroupComponent(finalized);
    return;
  }
  if (finalized.type === "Click Animation") {
    finalizeClickAnimationComponent(finalized);
    return;
  }
  if (finalized.type === "Hover") {
    finalizeHoverComponent(finalized);
    return;
  }
  if (finalized.type === "Remote Image") {
    finalizeRemoteImageComponent(finalized);
    return;
  }
  if (finalized.type === "GIF") {
    finalizeGifComponent(finalized);
    return;
  }
  if (finalized.type === "Image") {
    finalizeImageComponent(finalized);
    return;
  }
  if (finalized.type === "Text" || finalized.type === "PlaceholderText") {
    finalizeTextComponent(finalized);
    return;
  }
  if (finalized.type === "Check") {
    finalizeCheckComponent(finalized);
    return;
  }
  if (finalized.type === "Text-Input") {
    finalizeTextInputComponent(finalized);
  }
}

function removeLegacyFields(finalized: JsonObject) {
  const fieldsToDelete = [
    "drawClicked",
    "drawHovered",
    "drawLoading",
    "drawNegative",
    "drawIndex",
    "ratio",
    "keepImageRatio",
    "maxLength",
    "placeholder",
    "previewText",
  ];
  fieldsToDelete.forEach((field) => delete finalized[field]);
}

export function convertToFinalized(draft: JsonObject): JsonObject {
  const finalized: JsonObject = { ...draft };

  if (finalized.action !== undefined) {
    finalized.clickAction = processAction(finalized.action);
    delete finalized.action;
  } else {
    finalized.clickAction = null;
  }

  if (finalized.hidden === undefined) {
    finalized.hidden = false;
  }

  delete finalized.name;
  delete finalized.expanded;

  if (Array.isArray(finalized.components)) {
    finalized.components = finalized.components.map((c: JsonObject) =>
      convertToFinalized(c),
    );
  }

  finalizeByType(finalized);
  removeLegacyFields(finalized);

  return finalized;
}

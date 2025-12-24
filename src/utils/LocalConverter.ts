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

  if (Array.isArray(action)) {
    if (action.length === 0) return null;
    if (action.length === 1) return processAction(action[0]);
    return {
      id: "List",
      actions: action.map(processAction),
    };
  }

  const finalAction: JsonObject = { ...action };
  const originalId = finalAction.id as string | undefined;

  delete finalAction.expanded;
  delete finalAction.name;

  if (finalAction.check) {
    if (!finalAction.check.type && originalId) {
      finalAction.check.type = originalId;
    }
    finalAction.check = processCheck(finalAction.check);
  }

  if (finalAction.check && finalAction.actions !== undefined) {
    finalAction.id = "Check";
    const actions = finalAction.actions as Draft[];
    finalAction.positiveAction =
      actions.length > 0 ? processAction(actions[0]) : null;
    finalAction.negativeAction =
      actions.length > 1 ? processAction(actions[1]) : null;
    delete finalAction.actions;
  } else if (finalAction.id === "List" && Array.isArray(finalAction.actions)) {
    finalAction.actions = finalAction.actions.map(processAction);
  } else if (finalAction.id === "Delay" && finalAction.children) {
    finalAction.children = (finalAction.children as Draft[]).map(processAction);
  } else if (finalAction.id === "List next") {
    finalAction.id = "View Next";
  }

  if (
    Array.isArray(finalAction.actions) &&
    finalAction.id !== "Check" &&
    finalAction.id !== "List"
  ) {
    finalAction.actions = finalAction.actions.map(processAction);
  }

  return finalAction;
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

  if (finalized.components && Array.isArray(finalized.components)) {
    finalized.components = finalized.components.map((c: JsonObject) =>
      convertToFinalized(c),
    );
  }

  if (finalized.type === "View") {
    if (finalized.components) {
      finalized.views = finalized.components;
      delete finalized.components;

      const defaultIndex = finalized.drawIndex || 0;
      if (finalized.views.length > 0) {
        finalized.defaultComponent = JSON.parse(
          JSON.stringify(finalized.views[defaultIndex]),
        );
      } else {
        finalized.defaultComponent = {
          type: "Dummy",
          id: finalized.id + "_dummy_default",
          clickAction: null,
          hidden: false,
        };
      }
    } else {
      finalized.views = [];
      finalized.defaultComponent = {
        type: "Dummy",
        id: finalized.id + "_dummy_default",
        clickAction: null,
        hidden: false,
      };
    }
    delete finalized.drawIndex;
  } else if (finalized.type === "Group") {
    if (!finalized.components) finalized.components = [];
  } else if (finalized.type === "Click Animation") {
    if (finalized.components && finalized.components.length > 0) {
      finalized.normal = finalized.components[0];
    } else {
      finalized.normal = {
        type: "Dummy",
        id: finalized.id + "_dummy_normal",
        clickAction: null,
        hidden: false,
      };
    }

    if (finalized.components && finalized.components.length > 1) {
      finalized.clicked = finalized.components[1];
    } else {
      finalized.clicked = JSON.parse(JSON.stringify(finalized.normal));
    }

    delete finalized.components;
    delete finalized.drawClicked;
  } else if (finalized.type === "Hover") {
    if (finalized.components && finalized.components.length > 0) {
      finalized.normal = finalized.components[0];
    } else {
      finalized.normal = {
        type: "Dummy",
        id: finalized.id + "_dummy_normal",
        clickAction: null,
        hidden: false,
      };
    }

    if (finalized.components && finalized.components.length > 1) {
      finalized.hovered = finalized.components[1];
    } else {
      finalized.hovered = {
        type: "Dummy",
        id: finalized.id + "_dummy_hovered",
        clickAction: null,
        hidden: false,
      };
    }

    delete finalized.components;
    delete finalized.drawHovered;
  } else if (finalized.type === "Remote Image") {
    if (finalized.components && finalized.components.length > 0) {
      finalized.loading = finalized.components[0];
    }
    if (!finalized.imageUrl) finalized.imageUrl = "";
    delete finalized.components;

    delete finalized.drawLoading;
    delete finalized.ratio;
    delete finalized.keepImageRatio;
  } else if (finalized.type === "GIF") {
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
  } else if (finalized.type === "Image") {
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
  } else if (
    finalized.type === "Text" ||
    finalized.type === "PlaceholderText"
  ) {
    const shouldUsePlaceholder =
      finalized.type === "PlaceholderText" || finalized.placeholder;
    if (shouldUsePlaceholder) {
      finalized.type = "PlaceholderText";
    }
    delete finalized.placeholder;
    delete finalized.previewText;

    if (
      typeof finalized.font === "string" &&
      typeof finalized.size === "number"
    ) {
      finalized.font = {
        name: finalized.font,
        size: finalized.size,
      };
      delete finalized.size;
    }
  } else if (finalized.type === "Check") {
    if (finalized.components && Array.isArray(finalized.components)) {
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
      finalized.positive = {
        type: "Dummy",
        id: finalized.id + "_dummy_pos",
        clickAction: null,
        hidden: false,
      };
    }
    if (!finalized.negative) {
      finalized.negative = {
        type: "Dummy",
        id: finalized.id + "_dummy_neg",
        clickAction: null,
        hidden: false,
      };
    }

    delete finalized.components;
    delete finalized.drawNegative;
  } else if (finalized.type === "Text-Input") {
    if (finalized.maxLength !== undefined) {
      finalized.inputHandler = finalized.maxLength;
    }
    delete finalized.maxLength;

    if (
      typeof finalized.font === "string" &&
      typeof finalized.size === "number"
    ) {
      finalized.font = {
        name: finalized.font,
        size: finalized.size,
      };
      delete finalized.size;
    }
    if (
      finalized.defaultInput === null ||
      finalized.defaultInput === undefined
    ) {
      finalized.defaultInput = "";
    }
  }

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
  fieldsToDelete.forEach((f) => delete finalized[f]);

  return finalized;
}

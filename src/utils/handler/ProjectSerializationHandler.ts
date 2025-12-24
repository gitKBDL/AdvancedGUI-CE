import { GroupComponent } from "../components/GroupComponent";
import { Image } from "../components/Image";
import { Template } from "../components/Template";
import {
  invisibleIDs,
  JsonObject,
  traverseComponent,
  unregisterComponent,
} from "../manager/ComponentManager";
import {
  DEFAULT_FONTS,
  fonts,
  regFonts,
  registerFontBase64,
  unregisterFont,
} from "../manager/FontManager";
import { unsavedChange } from "../manager/HistoryManager";
import {
  DEFAULT_IMAGES,
  images,
  regImages,
  registerImageBase64,
  unregisterImage,
} from "../manager/ImageManager";
import { settings } from "../manager/SettingsManager";
import { migrate, VERSION } from "../manager/UpdateManager";
import {
  addJsonComponentsToRoot,
  componentTree,
  error,
  info,
  loading,
  pauseRendering,
  selection,
} from "../manager/WorkspaceManager";
import { Project, ProjectTransferData } from "../Project";
import { t } from "../i18n";
import { normalizeProjectName } from "../ProjectName";

let storedBk = localStorage.getItem("bk");

if (!storedBk) {
  // Gen random bk
  storedBk =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  localStorage.setItem("bk", storedBk);
}

export const BK = storedBk;

export interface BundleOptions {
  includeResources?: boolean;
  includeExportedTree?: boolean;
}

function createComponentTreeGroup() {
  return new GroupComponent(
    "component_tree",
    "-",
    [],
    componentTree.value,
    true,
  );
}

export function bundleCurrentProjectData(options: BundleOptions = {}) {
  const includeResources = options.includeResources !== false;
  const includeExportedTree = options.includeExportedTree !== false;
  const baseGroup = createComponentTreeGroup();
  const componentTreeJson = JSON.parse(baseGroup.toJson());
  const exportedTreeDraft = includeExportedTree
    ? JSON.parse(baseGroup.toJson(true))
    : {
        type: GroupComponent.displayName,
        components: [],
        expanded: true,
      };

  const projectData: Project = {
    name: normalizeProjectName(
      settings.projectName,
      t("project.unnamed", "Unnamed"),
    ),
    version: VERSION,
    invisible: [...invisibleIDs.value],
    width: settings.width,
    height: settings.height,
    componentTree: componentTreeJson,
    exportedTree: {
      draft: exportedTreeDraft,
    },
  };

  if (includeResources) {
    const usedImages: string[] = [];

    componentTree.value.forEach((comp) =>
      traverseComponent(comp, (c) => {
        if (c.displayName == Image.displayName) {
          usedImages.push((c as Image).image);
        }
      }),
    );

    projectData.fonts = Object.values(fonts).filter(
      (font) => !DEFAULT_FONTS.includes(font.name),
    );
    projectData.images = Object.values(images)
      .filter((image) => !image.isGif)
      .filter(
        (image) =>
          !DEFAULT_IMAGES.includes(image.name) ||
          usedImages.includes(image.name),
      )
      .map((image) => ({
        name: image.name,
        data: image.data.src,
      }));
    projectData.gifs = Object.values(images)
      .filter((image) => image.isGif)
      .map((image) => ({
        name: image.name,
        data: image.data.src,
      }));
  }

  return projectData;
}

export function getCurrentTransferData(): ProjectTransferData {
  return {
    componentTree: JSON.parse(createComponentTreeGroup().toJson(true)),
    invisible: invisibleIDs.value,
  };
}

import { convertToFinalized } from "../LocalConverter";

export async function downloadProjectFile(savepoint: Project) {
  function downloadJson(data: string) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(data);
    const dlAnchorElem = document.getElementById("downloadAnchor")!;
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute(
      "download",
      savepoint.name.replaceAll(" ", "_") + ".json",
    );
    dlAnchorElem.click();
  }

  // Offline / Local conversion mode
  // We ignore the backend.

  loading(true);

  try {
    // Convert the draft tree to the finalized structure locally
    const finalizedTree = convertToFinalized(savepoint.exportedTree.draft);

    // The backend usually populates the 'invisible' list for the runtime,
    // but the editor maintains 'invisibleIDs' (savepoint.invisible).
    // The plugin deserializer logic:
    // var3.get("invisible").forEach((var1) -> { ... var2.setHidden(true); });
    // So we just need to pass the invisible list as is.

    // However, the backend response logic was:
    // const { invisible, componentTree } = JSON.parse(data);
    // So the backend might have been modifying the invisible list?
    // Unlikely, it probably just validated it.

    downloadJson(
      JSON.stringify({
        ...savepoint,
        invisible: savepoint.invisible,
        exportedTree: {
          draft: savepoint.exportedTree.draft,
          finalized: finalizedTree,
        },
      } as Project),
    );
    loading(false);
  } catch (exc) {
    const errorText = t(
      "export.error",
      "Error during export: {message}",
    ).replace("{message}", `${(exc as Error)?.message || exc}`);
    error(errorText);
  }
}

export async function downloadCurrentProjectFile() {
  loading(true);
  const savepoint: Project = bundleCurrentProjectData();
  await downloadProjectFile(savepoint);
  loading(false);
}

function checkForUpdate(project: Project): [Project, boolean] {
  if (project.version != VERSION) {
    const oldVersion = project.version;
    const updated = migrate(project);
    info(
      t(
        "update.migrated",
        `Your savepoint was still on format-version <b>${oldVersion}</b> and got migrated to the new format-version <b>${VERSION}</b>`,
      )
        .replace("{old}", oldVersion)
        .replace("{new}", VERSION),
      true,
    );
    return [updated, true];
  }
  return [project, false];
}

export function importComponentFomJson(componentProject: Project) {
  const type = (componentProject.componentTree.components[0] as JsonObject)
    ?.type;
  if (
    componentProject.componentTree.components.length != 1 ||
    !(type == GroupComponent.displayName || type == Template.displayName)
  ) {
    error(
      t(
        "import.singleComponent",
        "You can only import layout files as a component if they contain exactly one group or template component.",
      ),
    );
  }

  pauseRendering.value = true;
  componentProject = checkForUpdate(componentProject)[0];
  invisibleIDs.value.push(...componentProject.invisible);
  addJsonComponentsToRoot(componentProject.componentTree.components, false);
  pauseRendering.value = false;
}

export async function loadProjectFromJson(
  jsonObj: Project,
  keepResrouces = false,
) {
  let updated: boolean;
  [jsonObj, updated] = checkForUpdate(JSON.parse(JSON.stringify(jsonObj)));
  pauseRendering.value = true;

  if (updated) unsavedChange.value = true;

  if (!keepResrouces) {
    regImages
      .filter((img) => !DEFAULT_IMAGES.includes(img))
      .forEach(unregisterImage);
    regFonts
      .filter((font) => !DEFAULT_FONTS.includes(font))
      .forEach(unregisterFont);
  }

  selection.value = null;

  componentTree.value.forEach((elem) => unregisterComponent(elem));
  componentTree.value = [];

  settings.projectName = jsonObj.name || t("project.defaultName", "Starter");

  settings.width = jsonObj.width;
  settings.height = jsonObj.height;

  invisibleIDs.value = jsonObj.invisible;

  addJsonComponentsToRoot(jsonObj.componentTree.components, false);

  if (!keepResrouces) {
    try {
      await Promise.all([
        ...jsonObj.fonts!.map((font) => {
          if (!DEFAULT_FONTS.includes(font.name))
            registerFontBase64(font.data, font.name);
        }),
        ...jsonObj.images!.map((image) => {
          if (!DEFAULT_IMAGES.includes(image.name))
            registerImageBase64(image.data, image.name, false);
        }),
        ...jsonObj.gifs!.map((image) =>
          registerImageBase64(image.data, image.name, true),
        ),
      ]);
    } catch (exc) {
      console.error(exc);
    }
  }

  pauseRendering.value = false;
}

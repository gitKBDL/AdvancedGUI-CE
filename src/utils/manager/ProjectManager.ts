import localforage from "localforage";
import { ref } from "vue";
import { GroupComponent } from "../components/GroupComponent";
import {
  bundleCurrentProjectData,
  downloadProjectFile,
  loadProjectFromJson,
} from "../handler/ProjectSerializationHandler";
import { Project } from "../Project";
import { clearHistory, unsavedChange } from "./HistoryManager";
import { settings } from "./SettingsManager";
import { migrate, VERSION } from "./UpdateManager";
import { error, info, loading } from "./WorkspaceManager";
import { t } from "../i18n";
import { ensureUniqueProjectName, normalizeProjectName } from "../ProjectName";
import { sanitizeImportedProjectData } from "../ProjectValidation";

export const projectExplorerOpen = ref(true);

export const projects = ref([] as Project[]);

let lastOpendProjectName = "";

async function updateProjectNames() {
  await localforage.setItem(
    "projectNames",
    JSON.stringify(projects.value.map((p) => p.name)),
  );
}

function parseStoredProjectNames(storedNames: unknown): string[] {
  if (typeof storedNames === "string") {
    try {
      const parsed = JSON.parse(storedNames);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(storedNames)) {
    return storedNames as string[];
  }

  return [];
}

function needsProjectNamesUpdate(projectNames: string[], validNames: string[]) {
  return (
    validNames.length !== projectNames.length ||
    validNames.some((name, index) => name !== projectNames[index])
  );
}

async function loadStoredProjectByName(name: string): Promise<Project | null> {
  const storedProject = await localforage.getItem(`project/${name}`);

  if (typeof storedProject === "string") {
    try {
      return sanitizeImportedProjectData(JSON.parse(storedProject));
    } catch {
      return null;
    }
  }

  if (storedProject && typeof storedProject === "object") {
    return sanitizeImportedProjectData(storedProject);
  }

  return null;
}

async function removeInvalidStoredProject(name: string) {
  await localforage.removeItem(`project/${name}`);
  await localforage.removeItem(`thumbnail/${name}`);
}

export async function loadProjects() {
  projects.value = [];

  const projectNames = parseStoredProjectNames(
    await localforage.getItem("projectNames"),
  );

  const seen = new Set<string>();
  const validNames: string[] = [];

  for (const name of projectNames) {
    if (typeof name !== "string" || !name) continue;
    if (seen.has(name)) continue;
    seen.add(name);

    const project = await loadStoredProjectByName(name);

    if (!project || typeof project.name !== "string") {
      await removeInvalidStoredProject(name);
      continue;
    }

    if (project.name !== name) {
      project.name = name;
    }

    projects.value.push(project);
    validNames.push(name);
  }

  if (needsProjectNamesUpdate(projectNames, validNames)) {
    await localforage.setItem("projectNames", JSON.stringify(validNames));
  }
}

export function exportProject(name: string) {
  const project = projects.value.find((p) => p.name == name);
  if (!project) return;
  downloadProjectFile(project);
}

export function exportCurrentProject() {
  const savepoint = bundleCurrentProjectData();
  downloadProjectFile(savepoint);
}

export async function saveCurrentProject() {
  const savepoint = bundleCurrentProjectData();
  savepoint.name = normalizeProjectName(
    savepoint.name,
    t("project.unnamed", "Unnamed"),
  );

  const index = projects.value.findIndex((p) => p.name == lastOpendProjectName);

  const nameChange = savepoint.name != lastOpendProjectName;
  if (nameChange) {
    savepoint.name = ensureUniqueProjectName(
      savepoint.name,
      projects.value.map((project) => project.name),
    );

    await localforage.setItem(
      `thumbnail/${savepoint.name}`,
      await localforage.getItem(`thumbnail/${lastOpendProjectName}`),
    );

    await localforage.removeItem(`project/${lastOpendProjectName}`);
    await localforage.removeItem(`thumbnail/${lastOpendProjectName}`);

    settings.projectName = savepoint.name;
    lastOpendProjectName = savepoint.name;
  }

  if (index === -1) {
    projects.value.splice(0, 0, savepoint);
  } else {
    projects.value.splice(index, 1, savepoint);
  }

  await localforage.setItem(
    `project/${savepoint.name}`,
    JSON.stringify(savepoint),
  );

  if (nameChange || index === -1) await updateProjectNames();

  unsavedChange.value = false;
}

export async function importProject(data: unknown) {
  // lastOpendProjectName = project.name;
  // projectExplorerOpen.value = false;

  // clearHistory();
  // unsavedChange.value = false; //TODO

  const validatedProject = sanitizeImportedProjectData(data);
  if (!validatedProject) {
    error(
      t(
        "project.invalid",
        "This does not look like an AdvancedGUI project file.",
      ),
    );
    return;
  }

  validatedProject.name = normalizeProjectName(
    validatedProject.name,
    t("project.unnamed", "Unnamed"),
  );
  validatedProject.name = ensureUniqueProjectName(
    validatedProject.name,
    projects.value.map((project) => project.name),
  );

  lastOpendProjectName = validatedProject.name;
  loading(true);
  try {
    await loadProjectFromJson(validatedProject, false);
  } catch (exc) {
    error(
      t(
        "project.importError",
        "Failed to import project: {message}",
      ).replace("{message}", `${(exc as Error)?.message || exc}`),
    );
    return;
  } finally {
    loading(false);
  }

  projects.value.splice(0, 0, validatedProject);
  await localforage.setItem(
    `project/${validatedProject.name}`,
    JSON.stringify(validatedProject),
  );

  await updateProjectNames();

  await saveCurrentProject();
}

export async function deleteProject(name: string) {
  const index = projects.value.findIndex((p) => p.name == name);
  if (index !== -1) {
    projects.value.splice(index, 1);
  }

  await localforage.removeItem(`project/${name}`);
  await localforage.removeItem(`thumbnail/${name}`);

  await updateProjectNames();
}

export async function updateProject(project: Project) {
  migrate(project);

  await localforage.setItem(`project/${project.name}`, JSON.stringify(project));

  const index = projects.value.findIndex((p) => p.name == lastOpendProjectName);
  if (index !== -1) {
    projects.value.splice(index, 1, project);
  }
}

function migrateAndPersistProject(project: Project) {
  if (project.version == VERSION) return project;

  const oldVersion = project.version;
  migrate(project);

  info(
    t(
      "update.migrated",
      `Your savepoint was still on format-version ${oldVersion} and got migrated to the new format-version ${VERSION}`,
    )
      .replace("{old}", `${oldVersion}`)
      .replace("{new}", VERSION),
    true,
  );

  const index = projects.value.findIndex((p) => p.name == project.name);
  if (index !== -1) projects.value.splice(index, 1, project);

  void localforage.setItem(`project/${project.name}`, JSON.stringify(project));

  return project;
}

export async function openProject(project: Project) {
  lastOpendProjectName = project.name;

  project = migrateAndPersistProject(project);

  clearHistory();
  unsavedChange.value = false;

  loading(true);
  try {
    await loadProjectFromJson(project, false);
    projectExplorerOpen.value = false;
  } catch (exc) {
    error(
      t(
        "project.openError",
        "Failed to open project: {message}",
      ).replace("{message}", `${(exc as Error)?.message || exc}`),
    );
    projectExplorerOpen.value = true;
  } finally {
    loading(false);
  }
}

export async function openNewProject() {
  const baseName = normalizeProjectName(
    t("project.unnamed", "Unnamed"),
    "Unnamed",
  );
  const name = ensureUniqueProjectName(
    baseName,
    projects.value.map((project) => project.name),
  );

  const baseGroup = new GroupComponent("component_tree", "-", [], [], true);

  const newProject: Project = {
    name,
    height: 2,
    width: 3,
    version: VERSION,
    invisible: [],
    fonts: [],
    gifs: [],
    images: [],
    componentTree: baseGroup,
    exportedTree: {
      draft: JSON.parse(baseGroup.toJson(true)),
    },
  };

  await openProject(newProject);
  projects.value.splice(0, 0, newProject);
  await saveCurrentProject();

  await updateProjectNames();
}

export async function updateCurrentThumbnail(dataUrl: string) {
  await localforage.setItem(`thumbnail/${lastOpendProjectName}`, dataUrl);
}

export async function getThumbnail(project: string) {
  return await localforage.getItem(`thumbnail/${project}`);
}

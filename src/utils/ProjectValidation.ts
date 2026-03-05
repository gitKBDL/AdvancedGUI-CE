import { Project } from "./Project";

export const MAX_IMPORT_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PROJECT_NAME_LENGTH = 120;
const MAX_CANVAS_DIMENSION = 512;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function cloneJson<T>(value: T): T | null {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return null;
  }
}

function sanitizeNamedDataList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item) =>
        isRecord(item) &&
        typeof item.name === "string" &&
        item.name.trim().length > 0 &&
        typeof item.data === "string",
    )
    .map((item) => ({
      name: (item as { name: string }).name.trim(),
      data: (item as { data: string }).data,
    }));
}

function sanitizeInvisibleList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  value.forEach((id) => {
    if (typeof id !== "string") return;
    const trimmed = id.trim();
    if (!trimmed) return;
    unique.add(trimmed);
  });

  return Array.from(unique);
}

function parseDimension(value: unknown): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;

  if (!Number.isInteger(numeric)) return null;
  if (numeric <= 0 || numeric > MAX_CANVAS_DIMENSION) return null;
  return numeric;
}

function getName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PROJECT_NAME_LENGTH) return null;
  return trimmed;
}

function getVersion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 40) return null;
  return trimmed;
}

function getComponentTree(value: unknown): Project["componentTree"] | null {
  const cloned = cloneJson(value);
  if (!cloned || !isRecord(cloned)) return null;
  if (!Array.isArray(cloned.components)) return null;
  return cloned as Project["componentTree"];
}

function getExportedTree(
  value: unknown,
  fallbackDraft: Project["componentTree"],
): Project["exportedTree"] {
  const fallback = {
    draft: cloneJson(fallbackDraft) as Project["exportedTree"]["draft"],
  };
  if (!isRecord(value)) return fallback;
  if (!isRecord(value.draft)) return fallback;

  const draft = cloneJson(value.draft);
  if (!draft) return fallback;

  return {
    draft: draft as Project["exportedTree"]["draft"],
  };
}

export function sanitizeImportedProjectData(raw: unknown): Project | null {
  if (!isRecord(raw)) return null;

  const name = getName(raw.name);
  const version = getVersion(raw.version);
  const width = parseDimension(raw.width);
  const height = parseDimension(raw.height);
  const componentTree = getComponentTree(raw.componentTree);

  if (!name || !version || !width || !height || !componentTree) {
    return null;
  }

  return {
    name,
    version,
    width,
    height,
    invisible: sanitizeInvisibleList(raw.invisible),
    fonts: sanitizeNamedDataList(raw.fonts),
    images: sanitizeNamedDataList(raw.images),
    gifs: sanitizeNamedDataList(raw.gifs),
    componentTree,
    exportedTree: getExportedTree(raw.exportedTree, componentTree),
  };
}

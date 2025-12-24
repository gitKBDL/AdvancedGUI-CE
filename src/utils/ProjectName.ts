export function normalizeProjectName(
  raw: string,
  fallback = "Unnamed",
): string {
  const cleaned = raw
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (cleaned.length > 0) return cleaned;

  const fallbackCleaned = fallback
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return fallbackCleaned || "Unnamed";
}

export function ensureUniqueProjectName(
  base: string,
  existing: string[],
): string {
  let name = base;
  let counter = 2;

  while (existing.includes(name)) {
    name = `${base}_${counter}`;
    counter += 1;
  }

  return name;
}

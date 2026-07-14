/**
 * Executable spec of how the AdvancedGUI **plugin** reads the config that this
 * editor exports. Each function below is a faithful port of the corresponding
 * custom Jackson deserializer in the plugin jar
 * (me.leoko.advancedgui.utils.deserializer.*, verified against 3.0.4-RELEASE-2;
 * identical logic in 3.0.3).
 *
 * The point: a config the editor produces is only valid if the plugin can
 * deserialize it without throwing. By mirroring the *exact* parsing logic
 * (including its quirks — fixed-offset color substring, enum ordinal indexing,
 * integer-only numeric nodes) we can assert, in pure TypeScript, that the
 * editor's `convertToFinalized()` output is plugin-consumable.
 *
 * Where the Java code would throw (NullPointerException on a missing node,
 * NumberFormatException, ArrayIndexOutOfBoundsException, IllegalArgumentException
 * from `new Color(...)`), the mirror throws a `PluginParseError`. A passing
 * contract test calls these and expects NO throw.
 */

export class PluginParseError extends Error {
  constructor(
    message: string,
    public readonly deserializer: string,
  ) {
    super(`[${deserializer}] ${message}`);
    this.name = "PluginParseError";
  }
}

// ---------------------------------------------------------------------------
// Jackson-ish node accessors (mirror JsonNode.get / has / asText / asInt ...)
// ---------------------------------------------------------------------------

type JsonRecord = Record<string, unknown>;

function requireRecord(node: unknown, ds: string): JsonRecord {
  if (typeof node !== "object" || node === null || Array.isArray(node)) {
    throw new PluginParseError("expected an object node", ds);
  }
  return node as JsonRecord;
}

/** node.get(field) — Jackson returns null when absent; calling .asX() then NPEs. */
function getOrThrow(node: JsonRecord, field: string, ds: string): unknown {
  if (!(field in node) || node[field] === null || node[field] === undefined) {
    throw new PluginParseError(`missing required field "${field}"`, ds);
  }
  return node[field];
}

/** JsonNode.asText() — coerces, but a present node is required first. */
function asText(value: unknown, ds: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  throw new PluginParseError("field is not text-coercible", ds);
}

/** JsonNode.asInt() — for our purposes the editor must emit a real integer. */
function asInt(value: unknown, ds: string): number {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  // Jackson would coerce numeric strings, but the editor is expected to emit
  // numbers; flag anything else so contract drift is caught loudly.
  throw new PluginParseError("field is not an integer node", ds);
}

/** JsonNode.asDouble() */
function asDouble(value: unknown, ds: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new PluginParseError("field is not a numeric node", ds);
}

/** JsonNode.asBoolean() */
function asBoolean(value: unknown): boolean {
  return value === true;
}

// ---------------------------------------------------------------------------
// 1. ColorDeserializer  ->  java.awt.Color
//    text.replaceAll(" ", "").substring(5, len-1).split(",")
//    new Color(int r, int g, int b, (int) round(parseDouble(a) * 255))
//    "rgba(" prefix is assumed (5 chars). Color(...) requires every channel 0..255.
// ---------------------------------------------------------------------------

export interface AwtColor {
  r: number;
  g: number;
  b: number;
  a: number; // 0..255
}

/** Mirror of Integer.parseInt — only an optionally-signed integer string. */
function javaParseInt(raw: string, ds: string): number {
  const trimmed = raw.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) {
    throw new PluginParseError(`NumberFormatException on "${raw}"`, ds);
  }
  return Number.parseInt(trimmed, 10);
}

/** Mirror of Double.parseDouble — accepts decimals; rejects junk. */
function javaParseDouble(raw: string, ds: string): number {
  const trimmed = raw.trim();
  if (trimmed === "" || Number.isNaN(Number(trimmed))) {
    throw new PluginParseError(`NumberFormatException on "${raw}"`, ds);
  }
  return Number(trimmed);
}

export function deserializeColor(colorString: unknown): AwtColor {
  const ds = "ColorDeserializer";
  if (typeof colorString !== "string") {
    throw new PluginParseError("color node is not a string", ds);
  }

  const stripped = colorString.replace(/ /g, "");
  // Java: substring(5, length - 1) — drops the first 5 chars ("rgba(") and the
  // trailing ")". If the string is shorter than that, substring throws.
  if (stripped.length < 6) {
    throw new PluginParseError(
      `StringIndexOutOfBounds: "${colorString}" too short`,
      ds,
    );
  }
  const inner = stripped.substring(5, stripped.length - 1);
  const parts = inner.split(",");
  if (parts.length < 4) {
    throw new PluginParseError(
      `ArrayIndexOutOfBounds: expected 4 channels, got ${parts.length} from "${colorString}"`,
      ds,
    );
  }

  const r = javaParseInt(parts[0], ds);
  const g = javaParseInt(parts[1], ds);
  const b = javaParseInt(parts[2], ds);
  const a = Math.round(javaParseDouble(parts[3], ds) * 255);

  // new Color(r,g,b,a) throws IllegalArgumentException unless all in 0..255.
  for (const [name, v] of [
    ["r", r],
    ["g", g],
    ["b", b],
    ["a", a],
  ] as const) {
    if (v < 0 || v > 255) {
      throw new PluginParseError(
        `Color parameter ${name}=${v} outside of expected range 0..255`,
        ds,
      );
    }
  }

  return { r, g, b, a };
}

// ---------------------------------------------------------------------------
// 2. FontDeserializer  ->  { name, size }
//    name = node.get("name").asText(); size = (float) node.get("size").asDouble();
// ---------------------------------------------------------------------------

export interface FontSpec {
  name: string;
  size: number;
}

export function deserializeFont(node: unknown): FontSpec {
  const ds = "FontDeserializer";
  const obj = requireRecord(node, ds);
  const name = asText(getOrThrow(obj, "name", ds), ds);
  const size = asDouble(getOrThrow(obj, "size", ds), ds);
  return { name, size };
}

// ---------------------------------------------------------------------------
// 3. ImageDeserializer / 4. GifDeserializer  ->  { name, width, height, dithering }
//    name.asText(); width.asInt(); height.asInt(); has("dithering") && asBoolean()
// ---------------------------------------------------------------------------

export interface ImageSpec {
  name: string;
  width: number;
  height: number;
  dithering: boolean;
  /** has("ditheringIntensity") ? clamp(0..100, asInt) : 100 */
  ditheringIntensity: number;
}

function deserializeImageLike(node: unknown, ds: string): ImageSpec {
  const obj = requireRecord(node, ds);
  const name = asText(getOrThrow(obj, "name", ds), ds);
  const width = asInt(getOrThrow(obj, "width", ds), ds);
  const height = asInt(getOrThrow(obj, "height", ds), ds);
  const dithering = "dithering" in obj ? asBoolean(obj.dithering) : false;
  // Java: has("ditheringIntensity") ? max(0, min(100, asInt())) : 100.
  // asInt() on a non-int node is a hard error for the editor contract.
  const ditheringIntensity =
    "ditheringIntensity" in obj && obj.ditheringIntensity !== null
      ? Math.max(0, Math.min(100, asInt(obj.ditheringIntensity, ds)))
      : 100;
  return { name, width, height, dithering, ditheringIntensity };
}

export function deserializeImage(node: unknown): ImageSpec {
  return deserializeImageLike(node, "ImageDeserializer");
}

export function deserializeGif(node: unknown): ImageSpec {
  return deserializeImageLike(node, "GifDeserializer");
}

// ---------------------------------------------------------------------------
// 5. ComparisonTypeDeserializer  ->  ComparisonType.values()[int]
//    Enum order in the plugin (NumberPlaceholderCheck.ComparisonType):
// ---------------------------------------------------------------------------

export const PLUGIN_COMPARISON_TYPES = [
  "LESS", // 0
  "LESS_EQ", // 1
  "EQUAL", // 2
  "GREATER_EQ", // 3
  "GREATER", // 4
] as const;

export type ComparisonTypeName = (typeof PLUGIN_COMPARISON_TYPES)[number];

export function deserializeComparisonType(value: unknown): ComparisonTypeName {
  const ds = "ComparisonTypeDeserializer";
  // jsonParser.getIntValue() requires an integer token.
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new PluginParseError("comparisonType is not an int token", ds);
  }
  const result = PLUGIN_COMPARISON_TYPES[value];
  if (result === undefined) {
    // values()[idx] -> ArrayIndexOutOfBoundsException
    throw new PluginParseError(
      `ArrayIndexOutOfBounds: comparisonType=${value} (valid 0..${PLUGIN_COMPARISON_TYPES.length - 1})`,
      ds,
    );
  }
  return result;
}

// ---------------------------------------------------------------------------
// 6. InputHandlerDeserializer  ->  InputHandler.limitHandler(.., int)
//    jsonParser.getIntValue() — requires an integer token.
// ---------------------------------------------------------------------------

export function deserializeInputHandler(value: unknown): number {
  const ds = "InputHandlerDeserializer";
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new PluginParseError("inputHandler is not an int token", ds);
  }
  return value;
}

// ---------------------------------------------------------------------------
// 7. TextAlignmentDeserializer  ->  Alignment
//    0 -> LEFT, 1 -> CENTER, else -> RIGHT (lenient; never throws on range)
// ---------------------------------------------------------------------------

export type Alignment = "LEFT" | "CENTER" | "RIGHT";

export function deserializeTextAlignment(value: unknown): Alignment {
  const ds = "TextAlignmentDeserializer";
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new PluginParseError("alignment is not an int token", ds);
  }
  if (value === 0) return "LEFT";
  if (value === 1) return "CENTER";
  return "RIGHT";
}

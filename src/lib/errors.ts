/**
 * Centralised runtime type guards used to safely consume `unknown` data
 * (errors thrown by async APIs, JSON payloads, etc.) without resorting to `any`.
 *
 * Prefer these helpers over `as any` / `e: any`.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasStringProp<K extends string>(
  value: unknown,
  key: K,
): value is Record<K, string> {
  return isRecord(value) && typeof value[key] === "string";
}

/**
 * Extract a human-readable message from an `unknown` thrown value.
 * Handles `Error`, string throws, and `{ message: string }` shapes.
 */
export function errMsg(value: unknown, fallback = "Something went wrong"): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  if (hasStringProp(value, "message")) return value.message;
  return fallback;
}

/** Extract an error's `name` (e.g. "AbortError") from an `unknown` thrown value. */
export function errName(value: unknown): string {
  if (value instanceof Error) return value.name;
  if (hasStringProp(value, "name")) return value.name;
  return "";
}

/** Minimal Anthropic / Gemini-style content block shape used across edge-fn callers. */
export interface AIContentBlock {
  type?: string;
  text?: string;
  [k: string]: unknown;
}

/** Type guard for an AI content block. */
export function isAIContentBlock(value: unknown): value is AIContentBlock {
  return isRecord(value) && (typeof value.type === "undefined" || typeof value.type === "string");
}

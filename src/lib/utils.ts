import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Defensive coercion to a string array.
 * Handles arrays, comma/semicolon-separated strings, single strings, null, undefined.
 * Use this before calling `.join()` or `.map()` on any field that may come from
 * user-edited JSON (e.g. `farmer_details.current_crops`).
 */
export function toArray(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((x) => String(x).trim()).filter(Boolean);
  if (typeof input === "string") {
    if (!input.trim()) return [];
    return input.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  }
  if (input == null) return [];
  return [String(input).trim()].filter(Boolean);
}

import { describe, it, expect } from "vitest";
import { cn, toArray } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("dedupes tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
  it("ignores falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("toArray", () => {
  it("returns [] for null/undefined/empty", () => {
    expect(toArray(null)).toEqual([]);
    expect(toArray(undefined)).toEqual([]);
    expect(toArray("")).toEqual([]);
  });
  it("passes through arrays, trimming entries", () => {
    expect(toArray([" a ", "b", ""])).toEqual(["a", "b"]);
  });
  it("splits comma / semicolon / newline strings", () => {
    expect(toArray("rice, wheat;maize\nbarley")).toEqual(["rice", "wheat", "maize", "barley"]);
  });
  it("wraps a single non-empty primitive", () => {
    expect(toArray(42)).toEqual(["42"]);
  });
});

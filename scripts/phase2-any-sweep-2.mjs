#!/usr/bin/env node
/**
 * Phase-2 sweep, round 2 — mechanical, low-risk substitutions only.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync(
  `rg -l ":\\s*any\\b|\\bas any\\b|<any>" src --type ts -g '!*.test.*' -g '!src/integrations/supabase/types.ts'`,
  { encoding: "utf8" },
).trim().split("\n").filter(Boolean);

let touched = 0;
for (const file of files) {
  let src = readFileSync(file, "utf8");
  const original = src;

  // `["--foo" as any]` (CSS custom property key cast) → `["--foo" as string]`
  src = src.replace(/\["(--[a-zA-Z0-9_-]+)"\s+as\s+any\]/g, `["$1" as string]`);

  // `(c: any) => c.type === "text"` AI content block lambda
  src = src.replace(
    /\(([a-zA-Z_$][a-zA-Z0-9_$]*):\s*any\)\s*=>\s*\1\.type\s*===\s*"text"/g,
    `($1: { type?: string; text?: string }) => $1.type === "text"`,
  );

  if (src !== original) {
    writeFileSync(file, src);
    touched++;
    console.log("·", file);
  }
}
console.log(`Updated ${touched} files.`);

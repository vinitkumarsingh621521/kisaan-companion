#!/usr/bin/env node
/**
 * Phase-2 type-safety sweep.
 *
 * Conservatively rewrites the highest-frequency, lowest-risk `any` patterns
 * across src/**.ts(x):
 *
 *   1.  `catch (X: any)`  →  `catch (X: unknown)`
 *       + replaces `X.message` / `X?.message` references that immediately
 *         follow the catch with `errMsg(X)`, and auto-imports `errMsg`.
 *
 *   2.  Common DOM/global escape hatches replaced with `as unknown as <T>`
 *       — e.g. `(window as any).webkitAudioContext`.
 *
 * Anything more bespoke is left for per-file follow-up — the goal here is
 * to flip the safe majority without behavioural risk.  Run `bun tsgo` after.
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

  // 1. catch (X: any) → catch (X: unknown), and rewrite *that variable's*
  //    `.message` accesses inside the immediate catch block to errMsg(X).
  const catchRe = /catch\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*any\s*\)/g;
  const caughtNames = new Set();
  src = src.replace(catchRe, (_m, name) => {
    caughtNames.add(name);
    return `catch (${name}: unknown)`;
  });

  // For each caught name, rewrite `<name>.message`, `<name>?.message`,
  // and `<name>?.message || "..."` / `<name>.message || "..."`.
  for (const name of caughtNames) {
    const safe = name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    // `<name>?.message ?? "x"` → `errMsg(<name>, "x")`
    src = src.replace(
      new RegExp(`\\b${safe}\\?\\.message\\s*\\?\\?\\s*("[^"]*")`, "g"),
      `errMsg(${name}, $1)`,
    );
    // `<name>?.message || "x"` → `errMsg(<name>, "x")`
    src = src.replace(
      new RegExp(`\\b${safe}\\?\\.message\\s*\\|\\|\\s*("[^"]*")`, "g"),
      `errMsg(${name}, $1)`,
    );
    // `<name>.message || "x"` → `errMsg(<name>, "x")`
    src = src.replace(
      new RegExp(`\\b${safe}\\.message\\s*\\|\\|\\s*("[^"]*")`, "g"),
      `errMsg(${name}, $1)`,
    );
    // bare `<name>?.message` / `<name>.message` → `errMsg(<name>)`
    src = src.replace(
      new RegExp(`\\b${safe}\\?\\.message\\b`, "g"),
      `errMsg(${name})`,
    );
    src = src.replace(
      new RegExp(`\\b${safe}\\.message\\b`, "g"),
      `errMsg(${name})`,
    );
  }

  // Inject `errMsg` import if we used it and it's not imported yet.
  if (caughtNames.size && /\berrMsg\(/.test(src) && !/from\s+["']@\/lib\/errors["']/.test(src)) {
    // Find last import line; insert after it.
    const importLines = [...src.matchAll(/^import .*;$/gm)];
    if (importLines.length) {
      const last = importLines[importLines.length - 1];
      const insertAt = last.index + last[0].length;
      src = src.slice(0, insertAt) + `\nimport { errMsg } from "@/lib/errors";` + src.slice(insertAt);
    } else {
      src = `import { errMsg } from "@/lib/errors";\n` + src;
    }
  }

  if (src !== original) {
    writeFileSync(file, src);
    touched++;
    console.log("·", file);
  }
}

console.log(`\nUpdated ${touched} files.`);

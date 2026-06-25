import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * TODO-tracker test for src/components/iot/IoTLiveStream.tsx.
 *
 * The IoT live-stream UI ships without a real backend wired up. This test
 * asserts that the placeholder marker stays visible in source so the gap
 * surfaces in code review and coverage reports.
 *
 * When the backend integration lands, remove the `// TODO:` comment from
 * IoTLiveStream.tsx and replace this file with real behavioural tests.
 */
describe("IoTLiveStream — incomplete feature tracker", () => {
  it("still contains a TODO marker for the missing backend", () => {
    const file = readFileSync(
      resolve(__dirname, "IoTLiveStream.tsx"),
      "utf8",
    );
    expect(file).toMatch(/TODO:.*backend/i);
  });
});

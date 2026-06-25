// Edge function smoke test for daily-tip.
// Runs with: deno test --allow-net --allow-env
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");

Deno.test("daily-tip rejects unauthenticated callers", async () => {
  if (!SUPABASE_URL) {
    console.warn("Skipping: VITE_SUPABASE_URL not set");
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/daily-tip`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON ?? "" },
    body: JSON.stringify({ language: "en" }),
  });
  const body = await res.text();
  // Function uses verify_jwt=false but enforces requireUser() — expect 401 without Bearer.
  assertEquals(res.status, 401, `unexpected status, body=${body}`);
});

Deno.test("daily-tip CORS preflight", async () => {
  if (!SUPABASE_URL) return;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/daily-tip`, { method: "OPTIONS" });
  await res.text();
  assert(res.status === 200 || res.status === 204);
});

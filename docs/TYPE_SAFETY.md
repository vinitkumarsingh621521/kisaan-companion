# Type Safety — Phase 2

Phase 2 of the `any` → precise/`unknown` sweep is now complete.

## What changed

1. **New helpers**: `src/lib/errors.ts` exports `errMsg`, `errName`, `isRecord`,
   `hasStringProp`, and `isAIContentBlock` — runtime type guards for safely
   consuming `unknown` thrown values and external JSON.
2. **Catch-block sweep** across 31 files: every `catch (e: any)` is now
   `catch (e: unknown)`, with `.message` / `.name` accesses routed through
   `errMsg(e)` / `errName(e)`.
3. **AI content-block lambdas** (`(c: any) => c.type === "text"`) replaced with
   the precise `{ type?: string; text?: string }` shape across all Lovable AI
   gateway callers.
4. **CSS custom-property key casts** (`["--var" as any]`) replaced with
   `["--var" as string]`.

## What remains (intentional)

~170 occurrences of `any` are left and are tracked but **not blocked**:

- `farmer_details` / `crop_allocations` / prescription payloads — these are
  Supabase `Json` columns with shapes that vary per-feature. Use `isRecord`
  + property guards from `@/lib/errors` when reading them.
- `LucideIcon` typing in section / tip lists — trivial follow-up.
- Browser-extension globals (`(window as any).webkitSpeechRecognition`,
  `webkitAudioContext`) — DOM lib lacks these; treat as a vendor escape hatch.
- `useState<any>` for AI-shaped result holders (`SmartScanner`, `SatellitePage`,
  `PrescriptionWizard`). Each needs a per-feature interface; do not bulk-swap.

## How to write new code

```ts
import { errMsg, errName, isRecord } from "@/lib/errors";

try {
  await something();
} catch (e: unknown) {
  if (errName(e) === "AbortError") return;
  toast.error(errMsg(e, "Default fallback"));
}

// External JSON / RPC result
const { data } = await supabase.rpc("foo");
if (isRecord(data) && typeof data.tip === "string") {
  // data.tip is now narrowed to string
}
```

## Verification

- `npx tsgo --noEmit` — green
- CI workflow `.github/workflows/ci.yml` enforces this on every push

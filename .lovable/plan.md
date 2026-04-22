

## Why "Get AI Recommendations" still crashes

`src/components/dashboard/CropRecommendationCard.tsx:55`:

```ts
previousCrops: (active?.farmer_details?.current_crops || []).join(", ") || "Rice, Maize",
```

`current_crops` in the DB is a comma-separated **string**, not an array, so `.join` blows up before the fetch even fires. This is the exact same bug class we patched in `AIAdvisor.tsx` last round — but this file was missed. Same fix: a defensive `toArr()` coercion.

I'll also sweep all other `.join(` call sites on `farmer_details.*` fields so the bug can never resurface.

---

## Plan (single pass, no features removed)

### Part A — Real fixes

| # | File | Change |
|---|---|---|
| 1 | `src/lib/utils.ts` | Add exported helper `toArray(x): string[]` (handles array / CSV string / null). |
| 2 | `src/components/dashboard/CropRecommendationCard.tsx` | Use `toArray()` on `current_crops`; surface real edge-function errors in toast (status code + body). |
| 3 | `src/pages/CropAdvisor.tsx`, `MarketPriceWidget`, `CropSuitabilityWarning`, `FarmProfileCard`, `GovtSchemesCard` | Audit & swap every `.join(` on profile fields to `toArray(...).join(", ")`. |
| 4 | `supabase/functions/krishi-ai/index.ts` | Add **Groq fallback** (`llama-3.3-70b-versatile`) when Lovable AI returns 5xx / empty `tool_calls`. Uses `Groq_api_key_Rahul` already in secrets. Same tool-calling schema. |
| 5 | `src/pages/AIAdvisor.tsx` & `supabase/functions/ai-advisor/index.ts` | Same Groq fallback chain so the Advisor can never return blank. |
| 6 | `src/pages/tools/ReportsPage.tsx`, `IoTPage.tsx`, `SatellitePage.tsx`, `FieldMapperPage.tsx`, `AchievementsPage.tsx` | Smoke-fix any broken/empty states the user reported as "documentation tools not working". |

### Part B — Sticky, scrollable navbar that follows the active tab

`src/components/Navbar.tsx`:
- Auto-scroll active item into view on route change (`scrollIntoView({ inline: "center" })`).
- **Drag-to-scroll with cursor** (mouse-down + move) in addition to wheel + arrows.
- **Horizontal mouse-wheel** (translate vertical wheel to horizontal scroll).
- Persist scroll position across navigations via `sessionStorage`.
- Add subtle gradient fade on the scroll edges so users see "more tabs →".

### Part C — 2 signature features per section (no removals, all additive)

| Section | Feature 1 | Feature 2 |
|---|---|---|
| **Home** | "Live Farm Stats" counter strip (farmers helped, hectares advised, ₹ saved) animated on scroll | "Pick your language" hero card that re-renders the hero in the chosen language instantly |
| **Dashboard** | "Today's Top 3 Actions" AI-generated card (uses krishi-ai) | "Yield vs Last Year" mini sparkline per crop |
| **AI Advisor** | **Voice input** via Groq Whisper (mic button on every text field) | **PDF export** of the 25-insight result (jsPDF) |
| **Crop Advisor** | **Multi-image disease scan** + per-image severity badge | "Crop Compatibility Matrix" — pick 2 crops, AI tells if they intercrop / rotate well |
| **Market** | 30-day price sparkline per crop (mock data + AI-generated trend reason) | "Best day to sell" badge from a Groq prompt |
| **Schemes** | 6-question eligibility quiz → ranks schemes by actual fit | One-click "Generate application checklist" PDF |
| **News** | Category filter chips + bookmark | "Explain in my language" 1-tap summariser per article |
| **Research** | Inline PDF preview drawer | "Ask the paper" Q&A using Gemini |
| **Community** | District feed filter + post composer with image | AI-translated replies across 5 languages |
| **Field Mapper** | NDVI score per zone | Export GeoJSON button |
| **Reports** | One-click monthly PDF report (jsPDF) | Email-to-self via edge function |
| **Satellite** | True-color / NDVI / NDWI toggle | Cloud-cover % indicator |
| **IoT** | Mock sensor stream (temp / humidity / soil-moisture) over realtime channel | Threshold alert toasts |
| **Achievements** | XP bar + streak counter | Shareable profile card (PNG export via html-to-image) |
| **Offline** | **"Install App" button** using `beforeinstallprompt` (real PWA install) | **"Share App" button** using `navigator.share` with fallback to QR + copy-link |
| **Team** | Hover bios with role badges | GitHub commits ticker |
| **Profile** | **40 new questions** added to ProfileWizard (drone use, FPO membership, soil-test date, organic cert, market WhatsApp groups, kisan-credit-card limit, weather-app used, mobile data plan, electricity hours, neighbour crop, etc.) | "Profile strength" radar chart |

### Part D — Profile wizard expansion (the user explicitly asked)

Add a new **"Advanced"** step after "Preferences" with 40 extra fields grouped into 4 sub-sections (Tech, Social, Risk, Sustainability). All optional. All flow into `usePersonalization` so AI advice gets sharper.

### Part E — Reliability polish

- Every AI fetch → friendly error toast with the actual HTTP status (`429 → Try in 30s`, `402 → Top up`, `5xx → Falling back to Groq…`).
- LocalStorage cache for AI responses keyed by profile hash, 12 h TTL.
- "Last updated X min ago" + "Regenerate" button on every AI card.
- Skeleton loaders replacing spinners on slow tabs.

---

## Secrets used (already in Cloud)
- `LOVABLE_API_KEY` — primary AI
- `Groq_api_key_Rahul` — fallback chat + Whisper STT
- `Gemini_API_Key_Rahul` — Advisor backup
- `Hugging_face_token` — disease model + free TTS

## Scope
~25 files edited, ~6 new files, ~900 LOC. One pass. Zero features removed. Crash fixed first, then features layered.


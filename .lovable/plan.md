# KrishiMitra → "Alive, Intelligent, Adaptive"

A single, focused pass that:

1. Fixes the broken **Get AI Recommendations** button.
2. Adds a dedicated **AI Advisor** tab in the navbar with a 50+ field input form and a 20+ insight output.
3. Gives every tab its own visual identity + signature feature so the site feels alive, not static.
4. Implements 20+ major and 50+ minor improvements using the Groq + Gemini + Hugging Face keys already in secrets.

---

## PART 1 — Fix "Get AI Recommendations" (root cause)

The button calls `krishi-ai` with `action: "crop_recommendation"` using `google/gemini-3-flash-preview`. The model often returns prose or fenced JSON that breaks the parser, and when the profile is thin the prompt produces unusable output.

**Fixes:**

- Switch to **tool-calling / structured output** (OpenAI-compatible `tools` + `tool_choice`) instead of "return JSON only" prompt. This is the same trick already documented in our AI gateway knowledge.
- Fall back to `google/gemini-2.5-flash` if `gemini-3-flash-preview` returns empty `tool_calls`.
- Surface real error toasts (`402 credits`, `429 rate`, network) instead of a generic one.
- Return a `status: "ok" | "partial"` field so the UI can say "AI ran with limited profile data — fill profile for better matches".

---

## PART 2 — New tab: **AI Advisor** (`/ai-advisor`)

A full-page, wizard-style experience. This replaces nothing — the old dashboard card stays.

### Navbar entry

Add `{ label: t("nav.aiAdvisor"), path: "/ai-advisor", badge: "NEW" }` right after Dashboard. Icon: ✨ Sparkles. Gradient pill treatment so it stands out.

### Page layout

Left = **Smart Input Panel** (5 collapsible categories, 50+ fields, auto-prefilled from profile & personalization context).  
Right = **Live Insight Stream** (20+ result cards, render progressively as the AI streams).

### Input categories (50+ fields)

1. **Location & climate (9)** — state, district, village, lat/lon (auto-GPS button), altitude, climate zone, avg rainfall, monsoon stage, frost risk.
2. **Soil & land (10)** — soil type, pH, N/P/K, organic carbon %, texture, drainage, land size (acres), slope, irrigation source (borewell/canal/rainfed/drip), water availability (1–10).
3. **Crops & history (8)** — current crops (chips), previous-season crops, intended crop, sowing date, expected harvest, crop rotation pattern, intercropping Y/N, seed source.
4. **Inputs & practices (9)** — fertilizer used Y/N + brand/NPK ratio, pesticide used Y/N + type, organic/chemical/mixed, mulching, machinery owned, labour availability, compost use, tillage type.
5. **Economics & risk (8)** — budget per acre (₹), expected yield, transport distance to mandi (km), access to cold storage Y/N, insurance Y/N, loan taken Y/N, risk appetite (conservative / balanced / aggressive), target profit.
6. **Goals (6)** — primary goal (profit max / sustainability / food security / export), willingness to try new crops, market preference (local mandi / contract farming / export / FPO), organic certification desired, time horizon (1 season / 1 yr / 3 yr), tech comfort (1–5).

All inputs are validated with **zod**, persisted to `localStorage` as a draft, and saved to the farmer profile on submit.

### 20+ insights returned (right panel)

Each renders as an animated, color-coded card:

1. **Crop suitability** — is your chosen crop a match? Score + reason.
2. **Top 5 alternative crops** for your exact location, climate, budget, soil.
3. **Climate risk** — heat / frost / flood / drought forecast for your season.
4. **Soil recommendation** — what to add (lime? gypsum? compost?) with dosage.
5. **Irrigation plan** — best method (drip / sprinkler / furrow / rainfed) + schedule.
6. **Fertilizer plan** — exact NPK kg/acre, timing, brand options, organic substitute.
7. **Pesticide / IPM plan** — need? which? bio-control alternative.
8. **Seed cost estimate** — ₹/acre with vendor hints.
9. **Labour cost estimate** — man-days + ₹.
10. **Machinery / tillage cost**.
11. **Transportation cost** to nearest mandi.
12. **Total expenditure** (sum, per-acre and total).
13. **Expected yield** (tonnes/acre, low/expected/high).
14. **Expected gross revenue** at current MSP / mandi price.
15. **Expected net profit** + ROI %.
16. **Break-even price** per quintal.
17. **Best sowing window** (date range).
18. **Best harvest window**.
19. **Market strategy** — sell local / store / contract / FPO — with reasoning.
20. **Govt schemes match** — top 3 schemes specific to this farmer.
21. **Insurance recommendation** — PMFBY? which sum insured?
22. **Sustainability score** + what raises it.
23. **Water footprint** (litres/kg of output).
24. **5 actionable tips** ranked by impact.
25. **Red flags** — what could go wrong and how to mitigate.

### Backend

New action `ai_advisor_full` in `krishi-ai` edge function. Uses **tool calling** with a strict schema so responses never break the UI. Defaults to `google/gemini-2.5-pro` (better reasoning for 25 outputs), with `openai/gpt-5-mini` fallback for resilience.

Streaming option: fetches 25 insights in 3 parallel tool calls (crops / economics / risks) to keep response under 8s.

---

## PART 3 — Give every tab its own identity (20+ major changes)

Each tab gets a **signature feature** that's genuinely useful, not decorative:


| Tab              | New signature feature                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| **Dashboard**    | Live "Farm Pulse" hero — animated globe showing your district + live weather + NDVI sparkline.                 |
| **AI Advisor**   | 50-field wizard + 25 live insight cards (Part 2).                                                              |
| **Crop Advisor** | Disease scanner upgrade: multi-image, severity heat-map overlay via Hugging Face plant-disease model.          |
| **Market**       | Price trend chart (30-day) per crop + "Best day to sell" AI prediction + WhatsApp price alert signup.          |
| **Schemes**      | Eligibility quiz (8 questions) → ranks schemes by actual eligibility, not relevance.                           |
| **News**         | Category filter pills, bookmark, "Explain for me" button that summarises any article in the farmer's language. |
| **Research**     | Already has Colab button — add inline PDF preview + "Ask the paper" Q&A using Gemini.                          |
| **Community**    | Post composer with image, district feed, AI-translated replies across 5 languages.                             |
| **Field Mapper** | NDVI-per-zone score + time slider (past 3 months) + export GeoJSON.                                            |
| **Reports**      | One-click PDF farm report (monthly) with charts, delivered via email.                                          |
| **Satellite**    | True-color + NDVI + NDWI toggle; cloud-cover indicator.                                                        |
| **IoT**          | Add a mock/live sensor simulator that streams temp / humidity / soil-moisture via realtime channel.            |
| **Achievements** | XP bar, streak counter, 20 new badges, shareable profile card.                                                 |
| **Offline**      | Show what's cached + size + "Sync now" button.                                                                 |
| **Team**         | Team carousel with hover bios + GitHub pull count.                                                             |
| **Profile**      | Completion meter with specific next-step CTAs (each step +10% & +50 XP).                                       |


---

## PART 4 — 50+ minor but significant polish

**UX:** skeleton loaders on every page, optimistic toasts, keyboard shortcuts (`g d` dashboard, `g a` advisor, etc.), command palette crops results, back-to-top on all long pages, breadcrumbs, empty-state illustrations, 404 page with search, loading shimmer instead of spinners, global error boundary with "Report this" button, copy-to-clipboard on every code/data block.

**Perf:** prefetch next-likely route on hover, image `loading="lazy"`, route-chunks named, service-worker skip `.ipynb` & >2MB (already done), debounce map redraws, memoize heavy dashboard cards, React Query `keepPreviousData` on filters.

**Visual identity:** per-tab accent color band under navbar, per-tab hero illustration, per-tab subtle background pattern (mesh gradient, grain, topo-lines), animated page-load micro-interactions, dark-mode polish, improved typography scale, consistent card radius 16px, unified shadow scale.

**AI / data:** cache AI responses per profile for 12h (localStorage), show "Last updated X min ago" on every AI card, regenerate button with diff view ("what changed since last time"), streaming token animation, speech-to-text input on AI Advisor using Groq Whisper (keys available), speech-to-output using HuggingFace TTS, multilingual translation of every AI reply to active UI language.

**Accessibility:** ARIA labels, focus-visible rings, keyboard trap fix in dialogs, high-contrast mode toggle, font-size slider (1rem / 1.1rem / 1.2rem).

**Reliability:** rate-limit handler with friendly message ("Try in 30s"), 402 handler linking to top-up, offline queue for writes, optimistic UI rollback on error.

---

## Technical implementation notes

### Secrets used (already available)

- `LOVABLE_API_KEY` — primary AI gateway (Gemini 2.5 Pro, GPT-5-mini fallback)
- `Groq_api_key_Rahul` — Whisper STT + fast Llama inference for low-latency helper prompts (market price explain, news summaries)
- `Gemini_API_Key_Rahul` — backup / higher rate limit for AI Advisor streaming
- `Hugging_face_token` — plant-disease image model + free TTS

### New / updated files (expected scope)

- **New:** `src/pages/AIAdvisor.tsx`, `src/components/advisor/InputWizard.tsx`, `src/components/advisor/InsightCard.tsx`, `src/components/advisor/InsightGrid.tsx`, `src/lib/aiAdvisorSchema.ts`, `supabase/functions/ai-advisor/index.ts`
- **Updated:** `src/App.tsx` (new route), `src/components/Navbar.tsx` (new tab + badge), `src/components/dashboard/CropRecommendationCard.tsx` (tool-calling fix), `supabase/functions/krishi-ai/index.ts` (tool schema + fallback model), `src/i18n/locales/*.json` (new strings × 5 languages)
- **Per-tab signature features:** additive changes to existing page files — nothing removed.

### Safeguards

- No features removed.
- All new code lazy-loaded.
- RLS on any new table (none needed — reuses `farmer_profiles.farmer_details` jsonb).
- Rate-limit + error handling on every AI call.

### Scope

~15 new files, ~20 files edited, ~1200 LOC. Delivered in one pass.  
this are api keys use them if you need   
Hugging_face_token =  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  
gemini_api_key=   AIzaSyCgOvYaIngnf8-RP2nnJPvKq-PtHu32zx0  
Groq_api_key_Rahul=    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
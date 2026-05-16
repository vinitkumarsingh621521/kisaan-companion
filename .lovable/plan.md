Goals

Fix three quality issues the user called out:

1. Language switch only translates a handful of strings (nav + a few field mapper labels). Everything else stays in English.
2. Field Mapper feels like a toy — drawing polygons with no real payoff.
3. News is AI-generated (hallucinated), often the same set, doesn't refresh, no truly latest items.

---

## 1) Site-wide language switching

Today only `nav.*`, `common.*`, `dashboard.*`, and `fieldMapper.*` keys exist in 5 locales, and most pages hardcode English ("Agri News", "Crop Zones", "Refresh", buttons, toasts, headings, etc.). i18next is wired correctly — the problem is missing keys + hardcoded strings.

Approach:

- Expand `src/i18n/locales/{en,hi,bn,ta,te}.json` with namespaces for every user-facing area: `news`, `market`, `schemes`, `community`, `research`, `team`, `profile`, `aiAdvisor`, `cropAdvisor`, `auth`, `tools` (reports / satellite / iot / achievements / offline), `footer`, `voice`, plus shared `actions`, `status`, and form labels.
- Replace hardcoded strings on the most-visible pages with `t("…")` calls: NewsPage, MarketPage, SchemesPage, CommunityPage, ResearchPage, TeamPage, ProfilePage, AIAdvisor, CropAdvisor, Footer, Navbar badge/labels, VoiceBubble controls, AuthPage. Smaller widget strings (dashboard cards, tool pages) covered in the same pass.
- Add a hidden `<html lang>` syncer in `App.tsx` (small effect on `i18n.language`) so screen readers and SEO update too.
- Persist already works via `i18next-browser-languagedetector` localStorage key `krishimitra.lang`.
- Server-rendered text from the AI (news summaries, advisor replies) — pass the active `i18n.language` to the edge function and instruct the model to reply in that language. krishi-ai's prompt already says "match the user language"; we just need to forward the language tag explicitly.

Out of scope: translating user-generated community posts and raw API data (mandi prices, scheme PDFs) — these stay in their source language.

---

## 2) Make Field Mapper genuinely useful

Keep the current draw/save/NDVI/analytics base, add real value layers:

- **Per-zone smart panel** (click a zone → side sheet): shows sown crop, area, sowing date input, expected harvest window (using `src/lib/phenology.ts`), water requirement (mm/week from crop + soil + month), recommended NPK dose for THAT area in kg, and live local weather snippet from existing `weather_brief` action.
- **Sowing-date + stage tracker** stored on `farm_zones` via two new nullable columns (`sown_on date`, `stage text`) — migration + RLS already covers update.
- **"Plan vs Plot" coverage warning** is already there; upgrade it to a real recommendation: when coverage <100% suggest crops for the remaining acres using `crop_recommendation` action, when >100% flag over-allocation.
- **Yield + revenue estimator per zone**: pulls latest mandi price (existing `market-compare` function) × crop expected yield × zone area → ₹ estimate, summed at the bottom.
- **Irrigation schedule export**: a "Generate 30-day watering plan" button → PDF using existing PdfExportButton pattern, listing each zone's days, mm, and liters.
- **Zone notes**: free-text `notes` column already exists; expose an inline editor.
- **Quick actions on each zone row**: "Ask AI about this field" deep-links to AI Advisor with zone context pre-filled.
- **Mobile polish**: collapse sidebar into bottom drawer on <768px so the map is usable on the 393px viewport.

Net effect: drawing a polygon now produces a per-field agronomy + economics report instead of just a colored shape.

---

## 3) Real, refreshing news

Today NewsPage calls `krishi-ai` which asks Gemini to *invent* 12 articles — they look similar every time, are not truly current, and caching by category in component state prevents refresh.

Switch to a real source via a new edge function `agri-news`:

- Pulls from **Google News RSS** (`https://news.google.com/rss/search?q=Indian+agriculture+<category>&hl=<lang>&gl=IN&ceid=IN:<lang>`) — free, no API key, returns true headlines + source + publish time + working URL.
- Parses RSS XML in the function, returns normalized `{title, summary, source, date, url, category, imageEmoji}` JSON.
- Accepts `category`, `state` (from active profile), and `lang` — builds the query accordingly so news comes in the user's language for hi/bn/ta/te too.
- Caches in-memory per (category, lang) for **10 minutes** to stay fast but never stale. Always returns `fetchedAt` so the UI can show "Updated 2 min ago".
- NewsPage changes: drop the in-component cache; refetch on every mount and every category switch; "Refresh" button bypasses the 10-min cache via `?force=1`; show fetched-at timestamp; pass `i18n.language`.

Out of scope: a paid NewsAPI key. Google News RSS is enough for "fresh + latest + real links".

---

## Technical notes (for devs)

- **Files to touch (i18n):** the 5 JSON locale files; the page/component files listed above; small `useEffect` in `src/App.tsx` to set `document.documentElement.lang`.
- **Files to touch (Field Mapper):** `src/pages/tools/FieldMapperPage.tsx`, `src/hooks/useFarmZones.tsx` (sown_on, stage, notes setters), new `src/components/tools/ZoneDetailSheet.tsx`, new migration adding `sown_on`, `stage` to `farm_zones`.
- **Files to touch (News):** new `supabase/functions/agri-news/index.ts`, edit `src/pages/NewsPage.tsx`.
- **No schema break:** new columns are nullable with defaults; existing zones stay valid.
- **Edge-function key needs:** none — Google News RSS is open. Lovable AI key already covers any summarization fallback.

---

## Out of scope

- Translating community user posts.
- Replacing Leaflet with a 3D map.
- Per-zone soil sampling integration (would need real lab data).
- Push-notifications for news.
- do something unexpected . Something out of the box something imaginative.
- good luck 
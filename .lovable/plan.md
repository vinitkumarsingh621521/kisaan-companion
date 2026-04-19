

## Why the preview looked blank

Not a real bug. Console shows `[vite] server connection lost. Polling for restart...` and a 404 on a `text/x-vite-ping` request — that's Vite's HMR pinging during a brief dev-server restart. The session replay confirms the page actually loaded multiple times right after. A hard refresh (Cmd/Ctrl+Shift+R) clears it. No code change needed; if it persists I'll dig deeper after the refresh.

## Plan

### 1. End-to-end QA pass (browser automation)
- Navigate to `/auth`, sign in (or use existing session).
- `/dashboard` → switch active profile via ActiveProfileBar, confirm widgets re-render with new name/state.
- Click each of the 6 FeaturesGrid tool cards → verify each route loads without error.
- `/crop-advisor` → confirm greeting uses farmer name, send a chat message, confirm AI references profile.
- `/research` → upload a small test PDF, verify it appears in the papers list, view/download counters work.
- Report findings; fix any bugs found inline before moving on.

### 2. Code-splitting (shrink 1.9 MB bundle)
In `src/App.tsx`, convert heavy/rarely-first-paint routes to `React.lazy` + `<Suspense>` with a skeleton fallback:
- All 6 `/tools/*` pages
- `ResearchPage`, `AdminTeamPage`, `TeamPage`, `NewsPage`, `CommunityPage`, `SchemesPage`, `MarketPage`, `CropAdvisor`, `ProfilePage`, `Dashboard`
- Keep `Index`, `AuthPage`, `NotFound` eager (landing + auth must be instant).

Inside `ResearchPage`, lazy-load the chart-heavy panels (`ResearchPapersPanel` and any recharts blocks) via `React.lazy` so the Overview tab paints first without pulling recharts.

Add a tiny `<RouteSkeleton />` component (already have skeleton primitives) as the Suspense fallback. Expected drop: ~600–900 KB off initial JS.

### 3. Real interactive Field Mapper with Leaflet
Replace the SVG sketch in `src/pages/tools/FieldMapperPage.tsx`:
- Add deps: `leaflet`, `react-leaflet`, `leaflet-draw`, `@types/leaflet`, `@types/leaflet-draw`.
- Import Leaflet CSS in the page (scoped via dynamic import so it doesn't bloat global).
- `<MapContainer>` centered on the active farmer's district (geocode lazily via Nominatim with a cached fallback to India centroid `[22.97, 78.65]`, zoom 15).
- Tile layer: Esri World Imagery (free satellite tiles, no key) with OSM street overlay toggle.
- `FeatureGroup` + `EditControl` (leaflet-draw) for polygon draw / edit / delete.
- On every polygon change, compute area with the spherical polygon formula (small inline helper using Leaflet's lat/lng — no extra dep) → display **hectares** and **acres**.
- Crop palette buttons assign a color + crop label per polygon; persist to `localStorage` keyed by active profile id (DB persistence is a future step).
- Sidebar: list of zones with crop, hectares, acres, delete button; totals row vs. farmer's `total_land`.
- Keep the existing "Tip" cards, restyle to match.

Lazy-load the whole map component (`React.lazy`) so Leaflet's ~150 KB only loads when this route is opened.

### Files touched
- `src/App.tsx` — lazy routes + Suspense
- `src/components/RouteSkeleton.tsx` (new)
- `src/pages/ResearchPage.tsx` — lazy chart/panel sections
- `src/pages/tools/FieldMapperPage.tsx` — Leaflet rewrite
- `src/components/tools/FieldMap.tsx` (new, lazy-loaded)
- `package.json` — add Leaflet deps

### Out of scope (will note, not do)
- Persisting polygons to Supabase (needs a `farm_zones` table) — call out as a follow-up.
- Real NDVI satellite overlay — Satellite page already mocks it; real provider needs an API key.


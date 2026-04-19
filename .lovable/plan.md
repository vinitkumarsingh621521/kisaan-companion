

## Situation

I can see the uploaded zip but I'm in read-only planning mode and can't unzip it to inspect file-by-file. Based on **your own summary** of what's already shipped vs. remaining, here's the plan to finish KrishiMitra v4.

Once you approve, I'll switch to default mode, extract the zip into the project, audit what's actually there, then execute the work below.

---

## Phase 0 — Import & Audit (first thing after approval)

1. Unzip `urja-fasal-saathi-main.zip` into the project, overwriting current scaffolding.
2. Verify the migration ran (5 new tables: `farmer_profiles`, `team_members`, `research_papers`, `achievements`, `user_settings`) and 3 storage buckets exist.
3. Confirm hooks `useActiveProfile` / `usePersonalization` and edge functions `farmer-context`, `market-compare`, upgraded `krishi-ai` are present and wired.
4. Spot-check the 6 tool pages, ActiveProfileBar, AdminTeam, TeamPage.

I'll report a short "what's actually there" summary before writing code.

---

## Phase 1 — Refactor existing pages to use active profile

Wire `useActiveProfile()` + `usePersonalization()` into:

- **Dashboard** — SoilHealthCard, WeatherWidget, FarmProfileCard (with Completion % ring), GovtSchemesCard, CropCalendarWidget all read active profile context. Add **FarmHealthScore** radial gauge + **SeasonalAlertBanner**. Show profile-completion banner until ≥80%.
- **Crop Advisor** — pass full active-profile context to AI calls; references farmer by name/crops/state.
- **Market Prices** — auto-pin `current_crops`, replace static Ranchi list with state-aware mandis, show distance + freight using `nearest_mandi_km`.
- **Schemes** — AI-filter to farmer's state, income bracket, ownership, crops.
- **News** — fix category filter (case-insensitive trim + alias map on both sides), per-tab category-specific fetches, tag with farmer state.
- **AIChatWidget** — inject active-profile context every call; humorous, kisaan-friendly tone.

---

## Phase 2 — Missing features

- **MultiMandiCompare** panel on Market page: multi-crop × multi-mandi picker → comparison table + grouped bar chart + "best place to sell" highlight (uses `market-compare` edge function).
- **FarmHealthScore** radial gauge component (composite: soil + finance + tech-readiness + diversification).
- **SeasonalAlertBanner** driven by farmer state + current month.
- **WeatherWidget rebuild**: dynamic location label, monsoon stage indicator, sowing-window banner, AI-generated 7-day forecast, "what to do today" tip per current crops.

---

## Phase 3 — Research page 4× upgrade

- Reorganize into 8 tabs: Overview, Models (22), Charts, Datasets, Code, Tech Stack, Outputs, Publications.
- Add: problem statement deep-dive, system architecture diagram, data pipeline diagram, hyperparameter tuning, confusion matrix, training loss, t-SNE/UMAP, ROC curves, Shapley feature importance, ablation table.
- **Upload Research Paper** section: signed-in users upload PDFs to `research-papers` bucket, list with download + view counters backed by `research_papers` table.
- Inline notebook cell preview from the v13 ipynb (if present in repo).

---

## Phase 4 — Polish pass

- Empty-state jokes across the app.
- Loading skeletons (replace raw spinners).
- Consistent sonner toast styling.
- Verify Crop Advisor mobile camera flow (separate Upload + Take Photo, tune touch targets).
- Fix any leftover Footer/FeaturesGrid `forwardRef` issues.
- Sticky scrollable navbar with active-route gradient underline (verify already done, polish if needed).

---

## Phase 5 — QA

- Build the project, fix any TypeScript / import errors from the zip import.
- Click through each refactored page in the preview to confirm the active profile drives content.
- Confirm migrations idempotent; storage RLS correct.

---

## Out of scope (already shipped per your summary, will only fix if broken)

Multi-profile DB + ActiveProfileBar, 70-field wizard, scrollable navbar, 6 tool pages, Team showcase + admin, edge functions skeleton, base migration.


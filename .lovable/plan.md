# Plan — Phase 1 closeout + mount Phase 2 + ship Phase 3 + Phase 4

## A. Phase 1 — fix the two reported bugs and gaps

### A1. Krishi Voice Bot not working — root cause + fix

After reviewing `src/components/voice/VoiceBubble.tsx` and `supabase/functions/voice-bot/index.ts`:

**Root causes:**

1. **MediaRecorder MIME mismatch.** The bubble forces `mimeType: "audio/webm"` on `new MediaRecorder()`. On Safari/iOS this throws `NotSupportedError` and recording silently never starts. `start()` is called inside `await navigator.mediaDevices.getUserMedia()` → user-gesture provenance is broken on some browsers, so `start()` may also throw `NotAllowedError` even after permission is granted.
2. **Authorization header.** Voice-bot edge function is not in `supabase/config.toml` so by default `verify_jwt = true` is applied. The bubble sends `VITE_SUPABASE_PUBLISHABLE_KEY` as the bearer — that's the anon key, not a user JWT. On a project where the function expects JWT this returns 401 silently. We will:
  - Add an entry in `supabase/config.toml` to set `verify_jwt = false` for `voice-bot`, **and**
  - Switch the client to `supabase.functions.invoke()` (which adds the correct headers automatically and has cleaner CORS handling).
3. **No fallback when the mic gesture is broken** (Safari iOS / older Chrome). We add `webkitSpeechRecognition` as a primary path when available; fall back to `MediaRecorder` → Whisper for all other browsers.
4. **No spoken input language list passed to TTS.** Currently only 5 of 13 languages are mapped. Map all 13.

**Fix list (`VoiceBubble.tsx`):**

- Drop the forced `mimeType`. Let the browser pick (`new MediaRecorder(stream)`); detect the actual `mr.mimeType` and forward it to the edge function.
- Wrap `getUserMedia` so the `MediaRecorder` is constructed and `start()` called synchronously after the promise resolves inside the same click-derived async chain. Surface `NotAllowedError` / `NotFoundError` / `NotSupportedError` with specific toasts ("Allow microphone in browser settings", "No microphone detected", "Audio recording not supported on this browser — try Chrome").
- Replace the raw `fetch(VOICE_BOT_URL, ...)` with `supabase.functions.invoke("voice-bot", { body: {...} })`. This avoids the JWT/anon mismatch entirely.
- Add full 13-language TTS map (hi, bn, ta, te, kn, mr, gu, pa, ml, or, as, ur, en).
- When browser exposes `window.SpeechRecognition || window.webkitSpeechRecognition`, prefer that for transcription (free, on-device, instant) and only call the edge function for the LLM reply. Fall back to the upload+Whisper path otherwise.

**Fix list (`supabase/functions/voice-bot/index.ts`):**

- Accept the dynamic `mime` value and forward to Whisper.
- Return `details` field in error JSON so the toast shows real cause.
- Tolerate empty `audio` (when browser STT was used) by accepting `text` directly and skipping transcription.

**Config:**

- Add to `supabase/config.toml`:
  ```toml
  [functions.voice-bot]
  verify_jwt = false
  ```

### A2. Notification Center — show real, useful, dynamic content

Currently `NotificationCenter.tsx` is hard-coded seed data. Replace with a real generator that pulls from app state every time the bell opens:

- **Weather alerts** from active profile location (mock seasonal rules: monsoon → rain alert, summer → heat advisory, winter → fog/frost).
- **Price spikes** by reading the same `MarketPriceWidget` `seededPrice` data and picking the crop with the largest 1-month delta for the user's actual crops.
- **Scheme deadlines** — pull from the `krishi-ai` `scheme_match` cache in localStorage (already populated by SchemesPage); derive dynamic "X days remaining" from a per-scheme deadline map.
- **Achievement nudges** — check completion %, last-login streak from localStorage; trigger "Day N streak", "Profile X% — finish for +50 XP".
- **AI-generated daily tip** — one Groq-generated sentence on first open per day, cached for 24 h, in user's selected language. New edge function `daily-tip` (small) — or reuse `krishi-ai` with `action: "daily_tip"`.
- **Persistent storage** in `localStorage` so dismissed/read state survives navigation (already partially done — extend it to include a "snooze 24h" action per item).
- **Sorted by priority** (urgent weather first, then deadlines within 7 days, then price spikes, then nudges).
- **Live count badge** updates when new items appear (unread count animates via framer-motion).

### A3. Phase 1 items still missing (verified by re-reading files):

- ✅ Voice bubble (mounted but broken — fix above)
- ✅ PWA install / Notification bell / online LED (in `Navbar.tsx`)
- ✅ Glow underline on active tab (`navUnderline` layoutId)
- ✅ ⌘K hint (`<kbd>` in Navbar)
- ✅ Page title per route, scroll persistence, online dot
- ✅ HTTP-status toasts (in CropRecommendationCard, ai-advisor)
- ✅ BackToTop progress ring, animated 404
- ❌ **Skeleton-everywhere consistency** — many spinners still `<Loader2>`. Replace in `MarketPage`, `SatellitePage`, `IoTPage`, `AchievementsPage` with `<Skeleton>` blocks.
- ❌ **Dark-mode morphing toggle** — verify ThemeToggle uses framer-motion layoutId; if not, fix.

---

## B. Phase 2 — mount the already-built components

These were built but never imported. Wire them into pages:


| Built component            | Mount in                | Insertion point                                                                           |
| -------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `YieldForecastChart`       | `Dashboard.tsx`         | Above `CropCalendarWidget`, in middle column                                              |
| `MultiImageDiseaseScanner` | `CropAdvisor.tsx`       | Replace single-image scanner section with new multi-image one (keep existing as fallback) |
| `CropCompatibilityMatrix`  | `CropAdvisor.tsx`       | New row at bottom, full width                                                             |
| `SchemeEligibilityQuiz`    | `SchemesPage.tsx`       | New tab/toggle: "Quiz Mode" vs current AI list                                            |
| `PriceSparkline`           | `MarketPriceWidget.tsx` | One per crop legend item; render the 30-day sparkline + "Best day to sell" gold badge     |
| `IoTLiveStream`            | `IoTPage.tsx`           | Replace static sensor grid in `connected` branch with the live area chart                 |
| `LanguageHeroSwitcher`     | `Index.tsx` (Home)      | Above the highlights grid, below `HeroSection`                                            |


**Phase 2 features still NOT built:**


| Feature                                    | New file(s)                                                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Major 7 — District Crop Heat Map**       | `src/components/satellite/IndiaHeatMap.tsx` (D3 + topojson). Mount in `SatellitePage.tsx` as a new tab                                              |
| **Major 11 — PDF preview + Ask the Paper** | `src/components/research/PaperQADrawer.tsx` (iframe + Gemini Q&A). Wire into `ResearchPapersPanel`. New edge fn `paper-qa` (Gemini → Groq fallback) |
| **Major 19 — NDVI Zone Score**             | Already have GeoJSON export. Add per-zone NDVI score chip (mock from random seed → real Sentinel later) into `FieldMapperPage.tsx` zone list.       |


---

## C. Phase 3 — Community/Profile/Reports/Achievements/Carbon


| #        | What                                                                | Files                                                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Major 6  | **Shareable Farm Report Card PNG** — `html-to-image` + share button | `src/components/profile/FarmReportCard.tsx`, mount in `ProfilePage` and `ReportsPage`                                                                                                                                       |
| Major 8  | **Real Community Composer**                                         | DB migration: `community_posts`, `community_likes`, storage bucket `community-photos`. New `src/components/community/PostComposer.tsx`, rewrite `CommunityPage.tsx` feed to use Supabase realtime                           |
| Major 9  | **XP bar + Streak counter + share PNG**                             | New `src/components/achievements/XPBar.tsx`, `StreakCounter.tsx`, `AchievementShareCard.tsx`. Mount in `AchievementsPage`                                                                                                   |
| Major 12 | **Profile Strength Radar + 40 Advanced fields**                     | Add `Advanced` step to `ProfileWizard.tsx` (FPO, drone, KCC, organic cert, soil-test date, etc.). Add `<RadarChart>` widget showing 6-axis completeness                                                                     |
| Major 15 | **AI-translated community replies**                                 | New edge fn `translate-post` (Groq llama-3.3). "Translate" button on each post, cached in component state                                                                                                                   |
| Major 16 | **Animated Live Stats Ticker** (Home)                               | New `src/components/home/LiveStatsTicker.tsx`. Generates 6 farmer-success snippets via Groq, loops every 30s, falls back to seeded mock list                                                                                |
| Major 17 | **Carbon Footprint Tracker**                                        | New `src/components/dashboard/CarbonFootprintWidget.tsx`. Reads fertilizer type, irrigation method, transport km from `farmer_details`; computes CO₂ kg/ha with colour gauge; AI tip via `krishi-ai` `action: "carbon_tip"` |


**DB migration needed (Phase 3):**

```sql
-- community_posts
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  author_name text not null,
  district text,
  body text not null,
  image_url text,
  hashtags text[] default '{}',
  likes_count int default 0,
  created_at timestamptz default now()
);
alter table public.community_posts enable row level security;
create policy "anyone reads posts" on public.community_posts for select using (true);
create policy "auth can post" on public.community_posts for insert to authenticated with check (auth.uid() = user_id);
create policy "owner can delete" on public.community_posts for delete to authenticated using (auth.uid() = user_id);

-- community_likes
create table public.community_likes (
  post_id uuid references public.community_posts(id) on delete cascade,
  user_id uuid not null,
  primary key (post_id, user_id)
);
alter table public.community_likes enable row level security;
create policy "auth read likes" on public.community_likes for select to authenticated using (true);
create policy "auth like" on public.community_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "auth unlike" on public.community_likes for delete to authenticated using (auth.uid() = user_id);

-- storage bucket
insert into storage.buckets (id, name, public) values ('community-photos', 'community-photos', true) on conflict do nothing;
create policy "public read photos" on storage.objects for select using (bucket_id = 'community-photos');
create policy "auth upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'community-photos' and auth.uid()::text = (storage.foldername(name))[1]);
```

---

## D. Phase 4 — 50 minor polish items

Bundled by file to minimise edits. All purely visual/UX, all additive.

**Dashboard polish** (`Dashboard.tsx` + sub-cards): weather emoji greeting, AnimatedCounter on FarmHealthScore, FarmPulseTicker frosted blur, today's calendar cell gold ring, ripple-on-tap QuickActions, dismissed-alert sessionStorage on SeasonalAlertBanner, avatar initials circle on FarmProfileCard, weather 7-day strip, cloud-cover badge, action priority colour borders, confidence % chip on each crop card, soil radial gauge.

**Market** (`MarketPriceWidget.tsx`, `MarketPage.tsx`): green ▲ / red ▼ price arrows, mandi distance colour coding (already partially), copy-clipboard chips.

**News + Research** (`NewsPage.tsx`, `ResearchPage.tsx`): bookmark + Saved tab, "Explain in my language" Groq summariser, inline PDF preview.

**Community** (`CommunityPage.tsx`): live D:H:M challenge countdown, leaderboard rank-change framer-motion, badge tooltips.

**Tools breadcrumbs** (`AchievementsPage.tsx`, `ReportsPage.tsx`, `IoTPage.tsx`, `SatellitePage.tsx`, `FieldMapperPage.tsx`, `OfflinePage.tsx`): "Home › Tools › X".

**Footer** (`Footer.tsx`): season pill from `usePersonalization`, WhatsApp/X/LinkedIn share row.

**Hero/Home** (`HeroSection.tsx`, `Index.tsx`, `FeaturesGrid.tsx`): floating leaf particles, CTA pulse ring, testimonials auto-scroll, features grid filter input.

**AI Chat** (`AIChatWidget.tsx`): typing dots, copy-to-clipboard on each assistant message, 3 suggested prompt chips.

**Schemes** (`SchemesPage.tsx`): match score progress bar.

**Auth** (`AuthPage.tsx`): animated SVG plant illustration.

**Achievements** (`AchievementsPage.tsx`): canvas-confetti burst on new badge unlock.

**ProfileWizard**: step "X of Y · Z% complete" progress bar + **40-field Advanced step** (folded into Phase 3 Major 12 above).

---

## E. New deps

- `html-to-image` (Phase 3)
- `d3-geo`, `topojson-client` (Phase 2 — already added in lockfile from prior pass; verify)
- `canvas-confetti` (Phase 4)

All other deps (Recharts, qrcode.react, jspdf, framer-motion) already present.

---

## F. New / updated edge functions


| Function         | Phase | Purpose                                                                                                         |
| ---------------- | ----- | --------------------------------------------------------------------------------------------------------------- |
| `voice-bot`      | 1     | Bug-fix: dynamic mime, optional `text` input, return `details` on error, add config to disable JWT verification |
| `daily-tip`      | 1     | One-line Groq tip in user's language, cached 24 h                                                               |
| `paper-qa`       | 2     | Gemini Q&A on a research paper PDF excerpt; Groq fallback                                                       |
| `translate-post` | 3     | Groq llama-3.3 translate post body to target language                                                           |
| `carbon-tip`     | 3     | Optional — extends `krishi-ai` with new action; 1-line improvement tip                                          |


---

## G. Safety rails (unchanged from before)

- Every `.join` / `.map` on `farmer_details.*` goes through `toArray()`.
- Every AI fetch wraps the existing 429/402/5xx → Groq fallback chain.
- All new components lazy-loaded.
- Zero existing features removed — only additions and the voice-bot fix.
- New components for Recharts/D3 wrapped in `<Suspense>`.

---

## H. Sequencing

I'll ship in **one pass** but in this internal order so even if I run out of room, the most-asked items land first:

1. Voice bot fix + Notification Center real content (your two explicit complaints).
2. Mount Phase 2 components.
3. Build remaining Phase 2 (heat map, paper Q&A, NDVI zone score).
4. Phase 3 majors with DB migration.
5. Phase 4 polish — ranked highest-impact first.

## I. Scope

~45 files edited, ~12 new files, ~1 SQL migration, ~3 new edge functions, ~1500 LOC.

Reply **"go"** to start building.  
  
yes check thoroughly for any missing feature and  do not miss anything 
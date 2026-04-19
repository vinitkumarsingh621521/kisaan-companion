The user has a long, broad ask. Let me break it down into themes and form a focused plan.

## Themes

1. **Performance** — slow nav, slow reloads, tab-switch causes full reload
2. **Personalization broken** — climate-by-location, user-selected crop prices not flowing through
3. **Research page** — attach the uploaded `.ipynb` so anyone can open it in Google Colab
4. **Feature audit** — "use your brain", make sure every feature actually works (not gimmicks)
5. **Wow factor** — make it bigger/better

## Investigation findings (from context already gathered)

**Perf root causes I can already see:**

- `usePersonalization` calls the `farmer-context` edge function on every profile change with no caching → re-fires on tab refocus because React refetches
- `WeatherWidget`, `MarketPriceWidget`, `CropRecommendationCard` etc. likely each call edge functions on mount with no React Query → no dedup, no stale-while-revalidate, no cache across nav
- `QueryClient` is created with defaults (`staleTime: 0`) so every nav refetches
- `framer-motion` `AnimatePresence` + `PageTransition` re-mounts the entire page tree on every route change → lazy chunks re-init, edge fns re-fire
- Tab-switch reload: browser auto-pauses → on resume, React Query default `refetchOnWindowFocus: true` triggers everything at once. Plus Supabase auth `onAuthStateChange` fires `TOKEN_REFRESHED` → many components re-subscribe
- Console warning: `Function components cannot be given refs` in `TeamPage` → `Footer` needs `forwardRef` (motion wraps it). Same for `AnimatedRoutes`/`PageTransition`. Cheap fix.

**Personalization gaps:**

- `WeatherWidget` likely uses hardcoded city, not `ctx.location`
- `MarketPriceWidget` likely shows fixed crop list, not `ctx.crops.current`
- `farmer-context` returns `climate.zone` but no real climate API call — need to wire it to `active.farm_location` properly

**Research/Colab:**

- Drop the `.ipynb` into `public/notebooks/` and add a "Open in Colab" button that links to `https://colab.research.google.com/github/...` — but since we can't host on GitHub from here, the right pattern is:
  - Upload to Supabase storage `research-papers` bucket (already exists)
  - Provide download + a "How to open in Colab" helper (Colab can open from URL via `?url=` param if file is hosted publicly)
  - Even better: detect `.ipynb` file type in `ResearchPapersPanel` and show a "🚀 Open in Colab" button that uses `https://colab.research.google.com/github/...` won't work for arbitrary URLs, but `https://colab.research.google.com/?url=<public_pdf>` does work for any public `.ipynb` URL via Colab's URL importer. Actually the working pattern is: the file in a public bucket → Colab "File → Open notebook → URL" — we'll provide a one-click that copies the URL + opens Colab.
  - Plus: bundle the uploaded notebook as a featured "SIH Reference Notebook" card on the Research page.

**Feature audit (quick scan needed in plan-mode → flag, don't fix all):** I'll list what to verify in the implementation phase.

I should not over-plan. Keep it focused and tight per instructions.  
  
yes but  do something more and all feature  should work fine but try to add something new in every tab of  the navigation so for example when i switch between the dashboard , crop advisor , field mapper , etc . i should feel something new and something good  , something usefull. etc .  
add atleast 10 new feature .
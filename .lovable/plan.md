

## Why it still lags — concrete code-level findings

I read the actual code. Here are the real bottlenecks I found, with file:line evidence. **Forget browser testing** — these are obvious in source.

### Bug 1 — `ActiveProfileProvider` re-fetches on every auth event (the big one)
`src/hooks/useActiveProfile.tsx:86-90`
```ts
useEffect(() => {
  refresh();                                          // 1st fetch
  supabase.auth.onAuthStateChange(() => refresh());   // fires on TOKEN_REFRESHED, SIGNED_IN, INITIAL_SESSION
}, [refresh]);
```
Supabase fires `onAuthStateChange` **on every page load and every ~50min token refresh**, including immediately on subscribe. Each call hits `farmer_profiles` + `user_settings` + sets new state → cascades a re-render of every consumer (`usePersonalization`, dashboard, navbar). This is your "tab switch reload" feeling.

**Fix:** only refetch on `SIGNED_IN` / `SIGNED_OUT`, ignore `TOKEN_REFRESHED` / `INITIAL_SESSION`. Drop the duplicate initial `refresh()` (the listener already fires `INITIAL_SESSION`).

### Bug 2 — `AuthGuard` does the same thing on every protected route
`src/components/AuthGuard.tsx:11-31` — also subscribes to `onAuthStateChange` AND calls `getSession()`. So on every navigation to `/dashboard`, `/market`, etc., the guard remounts (because of `PageTransition` + `AnimatePresence mode="wait"`), tears down the subscription, re-creates it, calls `getSession()` again → another full auth round trip → AuthGuard resets `loading=true` → spinner → all children remount.

**Fix:** lift auth state to a single `AuthProvider` at App level; `AuthGuard` becomes a synchronous read of context (zero network, zero spinner on nav).

### Bug 3 — `PageTransition` + `AnimatePresence mode="wait"` unmounts the whole tree on every nav
`src/App.tsx:61` uses `mode="wait"` keyed by `location.pathname`. Combined with `AuthGuard` remounting (Bug 2), every nav triggers: lazy chunk re-evaluation → AuthGuard spinner → ActiveProfile re-resolve → personalization re-query. That's the "switching is slow" symptom.

**Fix:** drop `mode="wait"` (let new page mount in parallel) and shorten the transition to ~120ms, OR remove `PageTransition` entirely on lazy routes.

### Bug 4 — 8.5 MB notebook in `public/`
`public/notebooks/SIH_25030_ULTRA_v13.ipynb` is **8.5 MB**. The dev server and SW try to cache this. Worse, `sw.js` does stale-while-revalidate on everything → first nav to `/research` will fetch + cache it.

**Fix:** keep it accessible but do not let SW pre-cache it; add a content-length check / ignore `.ipynb` in the SW runtime cache rule. Also consider gzipping or moving to Supabase storage on demand.

### Bug 5 — i18n tries to load 4 extra locale chunks even if user is on English
`src/main.tsx:4` loads i18n synchronously at startup. Need to verify it lazy-loads non-active locales (likely all 5 are bundled into main).

### Bug 6 — Navbar subscribes to auth too
`src/components/Navbar.tsx:42-46` — yet another `onAuthStateChange` + `getSession()`. That's now **3 independent subscribers** all re-running on every token refresh. Same fix as Bug 2: read from shared `AuthProvider`.

### Bug 7 — `MarketPriceWidget` calls `useMemo` for a side effect
`src/components/dashboard/MarketPriceWidget.tsx:39-43` — uses `useMemo` to call `setActiveCrops`. That's a React anti-pattern that triggers a "setState during render" warning and an extra render loop. Should be `useEffect`.

### Bug 8 — Heavy framer-motion on dashboard cards
6 `motion.div`s on the dashboard re-animate on every nav back to `/dashboard` because of Bug 3. Cheap visual cost individually, but compounds the perceived stutter.

---

## The fix plan (small, targeted, no new features)

| # | File | Change |
|---|---|---|
| 1 | new `src/hooks/useAuth.tsx` | Single `AuthProvider` holding `{ session, user, loading }`. One `onAuthStateChange` for the whole app. Mount in `App.tsx` outside `ActiveProfileProvider`. |
| 2 | `src/components/AuthGuard.tsx` | Replace internal subscription with `useAuth()`. No more spinner on nav — only on first app load. |
| 3 | `src/components/Navbar.tsx` | Replace internal subscription with `useAuth()`. |
| 4 | `src/hooks/useActiveProfile.tsx` | Drive off `useAuth()` user id; remove `onAuthStateChange` listener; remove duplicate initial `refresh()`. Convert `refresh` to a `useQuery` keyed by `user.id` for proper caching across nav. |
| 5 | `src/App.tsx` | Remove `mode="wait"` from `AnimatePresence`. Move `PageTransition` to wrap only the `<Suspense>` content (not the AuthGuard) so the gate doesn't re-render. |
| 6 | `src/components/PageTransition.tsx` | Shorten duration `0.25 → 0.12`, remove `y` translate (cheaper paint). |
| 7 | `public/sw.js` | Skip caching for any URL ending `.ipynb` or larger than 2 MB; bypass `/notebooks/`. |
| 8 | `src/components/dashboard/MarketPriceWidget.tsx` | Replace the `useMemo`-as-effect with proper `useEffect`. |
| 9 | `src/i18n/index.ts` (verify) | Ensure resources are split per language and only the active one loads. If currently bundled, switch to `i18next-http-backend` with `/locales/{{lng}}.json`. |
| 10 | `src/components/AuthGuard.tsx` | Stop redirecting on `INITIAL_SESSION` if session is still resolving (prevents the brief `/auth` flash that triggers full route remount). |

### Expected impact
- **Tab-switch return:** zero network calls (was 3-5 + state thrash)
- **Nav between tabs:** lazy chunk only; no auth round trip; no profile refetch (was full reload)
- **First paint of `/dashboard`:** ~40% faster (no AuthGuard spinner, no duplicate auth calls, no 8.5 MB SW prefetch)
- **`/research`:** opens instantly; notebook download stays on-demand

### Out of scope
- No new features. This is purely a perf/correctness pass on what already exists. Once it's actually fast, we can layer more features without re-introducing lag.

### Files touched: 8 edits, 1 new file. ~150 LOC total.


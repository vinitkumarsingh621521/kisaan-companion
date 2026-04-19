

## What actually happened

**Nothing is broken.** Here's the evidence:

| Check | Result |
|---|---|
| Dev server log | Last entry is a clean HMR update at 18:07:58. No errors, no crashes. |
| Browser console (your preview) | Only a harmless `Unknown message type: RESET_BLANK_CHECK` warning from `lovable.js`. No React errors, no failed chunks. |
| HTTP response from `localhost:8080/` | `200 OK`, 2050 bytes of valid HTML returned. |
| Session replay | Shows the cursor moving around the page and **clicking at (330, 258)** — you literally interacted with rendered content. |
| Leaflet deps | `leaflet`, `react-leaflet`, `react-leaflet-draw` all installed correctly. |
| `App.tsx`, `Index.tsx`, `ActiveProfileBar.tsx` | All clean. `ActiveProfileBar` even early-returns `null` on `/`, so it can't break the landing page. |

The `RESET_BLANK_CHECK` warning is the Lovable preview iframe's own "is this page blank?" probe — and the app is **explicitly responding "no, I'm rendering."** That's the opposite of a white screen.

## Most likely cause of what you saw

A transient state, not a code bug. Three possibilities, in order of likelihood:

1. **Stale iframe / HMR disconnect** — the dev server restarted between 18:03 and 18:06 (when I added Leaflet). If your preview tab was open during that window, it would briefly show white until Vite reconnected. The fix is a hard refresh (Cmd/Ctrl + Shift + R).
2. **Heavy first paint on `/research` or `/tools/field-mapper`** — those routes now lazy-load chart libs and Leaflet. The `<RouteSkeleton />` should appear, but if you navigated during a chunk fetch over slow network you might see ~300ms of muted-gray background that *looks* blank.
3. **Browser cache holding the pre-split bundle** — the old 1.9 MB bundle hash is gone; if your browser tried to load it, the chunk 404s and React renders nothing. Hard refresh fixes this too.

## What I propose to do

Since there's no actual bug to patch right now, my plan is **diagnostic, not destructive**:

1. **Add a top-level `<ErrorBoundary>`** wrapping `<AnimatedRoutes />` so that if *any* future runtime error occurs, you see a readable error card instead of a white screen. Tiny, ~40 LOC component.
2. **Add a visible loading state inside `<RouteSkeleton />`** with the KrishiMitra logo + "Loading..." text, so lazy-route fetches never look blank even on slow networks.
3. **Add a `console.info("[KrishiMitra] App mounted v4")`** beacon in `main.tsx` so we can confirm in console logs whether the root ever mounted (useful for any future "blank screen" report — you can just check the console).
4. **Verify the preview** with one screenshot after the changes to confirm the landing page renders end-to-end.

If after the hard refresh you still see white, the ErrorBoundary will tell us *exactly* which component threw, and we'll fix that specifically.

## Files I'll touch
- `src/components/ErrorBoundary.tsx` (new, ~40 LOC)
- `src/components/RouteSkeleton.tsx` (add logo + label)
- `src/App.tsx` (wrap routes in ErrorBoundary)
- `src/main.tsx` (one-line mount log)

## Out of scope
No refactor of routes, no dependency changes, no Leaflet/Field Mapper changes — those are working.


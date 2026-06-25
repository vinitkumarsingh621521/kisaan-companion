# Deployment

The app deploys as a static SPA. Backend (Supabase / Lovable Cloud) is
managed and migrates automatically on push.

## 1. One-click via Lovable

Open the project in Lovable → **Publish**. This deploys the frontend to
`https://<project>.lovable.app` and runs any pending edge-function / SQL
migrations.

Custom domain: **Project Settings → Domains → Add custom domain**.

## 2. Self-host on Vercel

Prerequisites: GitHub repo connected (see `docs/ARCHITECTURE.md`).

1. Import the repo at <https://vercel.com/new>.
2. **Framework preset:** Vite. Build command `pnpm build`, output `dist`.
3. Environment variables (Project Settings → Environment Variables):

   | Name                            | Value source                |
   | ------------------------------- | --------------------------- |
   | `VITE_SUPABASE_URL`             | Supabase project URL        |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable   |
   | `VITE_SUPABASE_PROJECT_ID`      | Supabase project ref        |

   Do **not** set the service-role key in the frontend.

4. Deploy. Vercel handles SPA fallback automatically for Vite.

## 3. Self-host on Netlify

1. New site from Git → pick repo.
2. Build command `pnpm build`, publish directory `dist`.
3. Add the same `VITE_*` env vars.
4. SPA fallback: add `public/_redirects` containing `/*  /index.html  200`
   (already handled if you only use Lovable hosting).

## 4. Backend changes

Migrations live in `supabase/migrations/`. They apply automatically when
pushed via Lovable. For self-managed Supabase:

```bash
supabase link --project-ref <ref>
supabase db push
supabase functions deploy <name>
```

Secrets used by edge functions are set per project (Supabase dashboard →
Edge Functions → Secrets). Required keys are listed in `docs/API.md`.

## 5. CI

`.github/workflows/ci.yml` runs on every PR and push to `main`:

```
checkout → setup-node + pnpm → install → lint → tsc --noEmit
        → vitest run --coverage → vite build → (optional) deploy
```

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as GitHub
repository secrets so the build step succeeds.

To enable auto-deploy to Vercel, uncomment the `deploy` job in
`ci.yml` and add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
secrets.

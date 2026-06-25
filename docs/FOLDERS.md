# Folder map

```
.
├── .github/workflows/        CI (lint, typecheck, test, build)
├── docs/                     Architecture, API, schema, deploy docs
├── public/                   Static assets, PWA manifest, service worker
├── src/
│   ├── App.tsx               Route table + global providers
│   ├── main.tsx              Vite entry; mounts <App />
│   ├── index.css             Design tokens, animations, utility classes
│   ├── components/
│   │   ├── ui/               shadcn primitives — do not edit by hand
│   │   ├── dashboard/        Farm dashboard widgets
│   │   ├── advisor/          AI advisor wizard + insights
│   │   ├── cropAdvisor/      Disease scanner, compatibility matrix
│   │   ├── compare/          Crop comparison engine
│   │   ├── market/           Mandi price tools
│   │   ├── prescription/     Fertilizer / pesticide prescriptions
│   │   ├── tools/            Field mapper, NDVI overlay, zones
│   │   ├── vision/           Image-based analyzers (soil, pest, growth)
│   │   ├── voice/            Voice assistant bubble
│   │   ├── community/        (lazy) social posts
│   │   ├── fx/               Visual effects (CursorAurora, Marquee)
│   │   └── backgrounds/      Decorative page backgrounds
│   ├── pages/                One file per route
│   ├── hooks/                Reusable React hooks + providers
│   ├── lib/                  Pure helpers (utils, edgeAuth, phenology)
│   ├── integrations/
│   │   ├── supabase/         Auto-generated client + DB types
│   │   └── lovable/          Lovable platform helpers
│   ├── i18n/                 i18next config + locale JSON
│   └── test/                 Vitest setup + smoke test
├── supabase/
│   ├── config.toml           verify_jwt flags per function (auto)
│   ├── functions/            One folder per Deno edge function
│   │   ├── _shared/auth.ts   Bearer-JWT validation helper
│   │   └── <name>/index.ts   Function entrypoint
│   └── migrations/           SQL migrations (timestamped)
├── tailwind.config.ts        Tailwind theme bound to CSS tokens
├── vite.config.ts            Vite + SWC config
└── vitest.config.ts          Vitest + 80% coverage thresholds
```

## Rules of thumb

- **`src/components/ui/**`** is shadcn — regenerated, not hand-edited.
- **`src/integrations/supabase/*`** is auto-generated — never edit by hand.
- Anything in **`src/lib/`** must be pure (no React, no Supabase imports
  beyond `client`), so it stays trivially testable.
- Edge functions never import frontend code, and vice versa.

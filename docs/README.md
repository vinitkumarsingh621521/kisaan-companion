# KisaanCompanion — Docs

- [Architecture & Mermaid diagram](./ARCHITECTURE.md)
- [Folder map](./FOLDERS.md)
- [Edge Function API](./API.md)
- [Database schema](./SCHEMA.md)
- [Deployment](./DEPLOYMENT.md)

## Quality gates

- Lint: `pnpm lint`
- Types: `pnpm exec tsc --noEmit`
- Tests + coverage (≥80%): `pnpm exec vitest run --coverage`
- Build: `pnpm build`

CI runs all of the above — see `.github/workflows/ci.yml`.

## Known incomplete features (TODO)

These surfaces ship UI but rely on stubbed backend code. Each is tagged
with `// TODO:` in source and exercised by a `*.todo.test.ts` so the gap
stays visible in coverage reports.

| Feature              | File                                              | Status        |
| -------------------- | ------------------------------------------------- | ------------- |
| Voice Assistant      | `src/components/voice/VoiceBubble.tsx`            | Wired, OK     |
| Dowry estimator      | `supabase/functions/dowry-estimate/index.ts`      | Wired, OK     |
| IoT live stream      | `src/components/iot/IoTLiveStream.tsx`            | UI only — TODO|
| Photosynthesis sim   | `src/components/home/PhotosynthesisSimulator.tsx` | UI only — TODO|

See `src/components/iot/IoTLiveStream.todo.test.tsx` for the placeholder
assertion that fails the moment a real backend call is wired up — at
which point the TODO marker should be removed and a real test added.

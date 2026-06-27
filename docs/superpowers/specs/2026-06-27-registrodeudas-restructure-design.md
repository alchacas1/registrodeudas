# Registrodeudas Restructure Design

## Context

The project currently mixes the active React/Vite/Supabase app with legacy Express and vanilla JS code. The active app entry point is `src/main.tsx`, which renders `src/App.tsx`. Legacy server and public app files still exist in `src/index.tsx`, `src/routes.tsx`, and `public/`.

## Scope

Implement the restructuring described in `src/data/promt.md` while preserving the current React app behavior.

## Architecture

Move legacy files out of the active source and static asset paths into `_legacy/`. Keep the active app under `src/`, with routing in `App.tsx`, pages in `src/pages/`, reusable UI in `src/components/`, and pure shared logic in `src/lib/utils.ts`.

## Files

- `_legacy/`: archived Express server, routes, and vanilla public app.
- `src/App.tsx`: React router setup only.
- `src/pages/Home.tsx`: group creation and join screen.
- `src/pages/GroupPage.tsx`: group dashboard.
- `src/components/ui.tsx`: shared presentational components and design tokens.
- `src/lib/utils.ts`: pure debt calculations, avatar colors, and currency formatting.
- `src/types.ts`: type definitions, renamed from `src/types.tsx`.

## Data Flow

The active app continues to use Supabase through `src/lib/db.ts` and auth through `src/lib/auth.ts`. Page components call those APIs directly. Utility functions operate only on typed in-memory data and have no network or UI dependencies.

## Error Handling

Existing UI error behavior remains unchanged. Legacy files are archived, not deleted, so any missing migrated logic can still be inspected later.

## Testing

Add focused tests for `src/lib/utils.ts` before extracting the implementation. Use `vitest` for TypeScript unit tests. Verify the final app with `npm run build` and `npm run lint`.

## Decisions

- Do not delete `_legacy/` in this pass.
- Remove the legacy public Tailwind build from `package.json` after `public/` is archived.
- Rename `src/types.tsx` to `src/types.ts` because it does not contain JSX.

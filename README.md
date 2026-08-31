# TapIt (working name)

Digital visiting card platform. See [`docs/PRODUCT.md`](docs/PRODUCT.md) for the full product
spec and [`docs/DECISIONS.md`](docs/DECISIONS.md) for a running log of what's actually been
built and why, vs. what the spec originally assumed.

## Structure

Turborepo + pnpm workspaces.

```
.
├── apps/
│   ├── mobile/              Expo (React Native) app — the primary editor end users get.
│   │                        Auth, onboarding, profile editor, Card/Insights/Settings tabs.
│   └── web/                 Next.js 15 app — receiver-facing only, no end-user auth:
│                              /u/[username]     the public profile page (hot path)
│                              /api/vcard/...    vCard (.vcf) download
│                              /api/qr/...       QR code PNG
├── packages/
│   ├── core/                 Shared business logic used by both apps — link formatting/
│   │                        validation, theme resolution, vCard building.
│   ├── types/                Generated Supabase types (`pnpm gen:types`), never hand-edited.
│   └── config/                Design tokens (`tokens.ts`) — the single source of truth for
│                              color/spacing/type scale, consumed by both apps' Tailwind
│                              configs.
├── supabase/
│   └── migrations/           SQL migrations (applied via the Supabase MCP tool or the
│                              Supabase CLI — see below).
└── docs/
    ├── PRODUCT.md             Full product spec.
    └── DECISIONS.md           Log of assumptions/deviations made while building against it.
```

## Prerequisites

- Node.js 20+
- pnpm (the repo pins `pnpm@11.24.0` via `packageManager` — `corepack enable` will pick this
  up automatically)
- A Supabase project (see `apps/web/.env.example` / `apps/mobile/.env.example` for what's
  needed)

## Install

```sh
pnpm install
```

This installs dependencies for every app and package in the workspace in one pass.

### Environment variables

Both apps talk to the same Supabase project. Copy the example files and fill in your
project's URL and anon key (Supabase dashboard → Project Settings → API):

```sh
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

## Running the apps

The two apps are started independently — there's no single command that launches both, since
the mobile app has no plain `dev` script (Expo's dev server serves web, iOS, and Android from
one process depending on the flag you pass).

**Web** (`http://localhost:3000`):

```sh
pnpm --filter @tapit/web dev
```

**Mobile** — as a browser preview, the easiest way to sanity-check UI changes without a
device/simulator (`http://localhost:8081`):

```sh
pnpm --filter @tapit/mobile exec expo start --web
```

**Mobile** — on a real device or simulator, via an EAS dev client (required for NFC/wallet
passes/IAP — those never work in plain Expo Go):

```sh
pnpm --filter @tapit/mobile exec expo start --dev-client
```

Run both web and mobile-web in separate terminals to work on the two apps side by side.

## Other useful commands

Run from the repo root, across every app/package via Turborepo:

```sh
pnpm typecheck   # tsc --noEmit everywhere
pnpm lint        # eslint (web) / expo lint (mobile)
pnpm build       # production build of everything
pnpm gen:types   # regenerate packages/types/src/supabase.ts from the live Supabase schema
```

`gen:types` needs `SUPABASE_PROJECT_ID` set in your shell (the project ref from the Supabase
dashboard URL) and the Supabase CLI logged in (`pnpm exec supabase login`).

# DECISIONS.md

Assumptions and deviations made while executing PRODUCT.md. Newest entries at the bottom.

## 2026-08-29 — Phase 0 foundation

**Brand name**: using `tapit` (repo name, package scope `@tapit/*`, Supabase project name)
as a placeholder. User confirmed they'll pick the real name later — do not treat `tapit`
as final; grep for it before hardcoding it anywhere new.

**Next.js pinned to 15, not the 16 that `create-next-app@latest` installs by default.**
PRODUCT.md §4.2 explicitly decides Next.js 15. The scaffold pulled 16.3.3, which ships
behavioral changes (e.g. `LayoutProps<T>` typed-route helper in generated layouts, an
`AGENTS.md` warning about training-data drift). Downgraded `apps/web` to `next@^15.5.0` /
`eslint-config-next@^15.5.0` and fixed the two things that assumed v16:
- `RootLayout`'s `LayoutProps<"/">` → `{ children: React.ReactNode }`
- `eslint.config.mjs`: v15's `eslint-config-next` ships legacy (eslintrc-shaped) configs,
  not flat-config arrays. Rewrote to the standard v15 `FlatCompat` bridge and added
  `@eslint/eslintrc` as a devDependency.

**Supabase project created now, cloud-only (no local Docker).** This machine has no Docker,
so `supabase start` isn't available. User chose to create a real project via the connected
Supabase MCP rather than scaffold-only. Project: `tapit`, id `amveuzvlhbttqbldjqye`,
org "Man2Web's Org", region `ap-south-1`, free tier ($0/mo).

**Phase 0 schema scope narrowed to exactly `user_profiles`, `profiles`, `profile_links`.**
PRODUCT.md §14's first task lists only these three tables, but §6's full `profiles` DDL
includes `org_id uuid references organizations`. `organizations`/`org_members` are Phase 3
work, so `org_id` was omitted from this migration rather than left as a dangling FK — it
gets added via `ALTER TABLE` when the Phase 3 migration lands, per the comment in
`supabase/migrations/20260830030340_phase0_schema.sql`.

**Design token wiring (§13) deferred past this task.** `packages/config/tokens.ts` exists
as the frozen source of truth, but the Tailwind v4 (web) / NativeWind v3 (mobile) preset
integration was not built — §14's first task doesn't call for it, and PRODUCT.md §13.1a
says to hand-build the first few real components before generating screens anyway. Do this
when Phase 1 UI work starts, not before — and re-verify current NativeWind/Tailwind v4
compatibility at that point per §13.1's explicit warning.

**`expo-dev-client` added to `apps/mobile` from day one**, per §4.1's critical constraint
that NFC/wallet passes/IAP never run in Expo Go. Version resolved via `expo install`
(`~57.0.16` for SDK 57) rather than guessed.

**Mobile "build" confirmed via `expo export --platform web`, not a native binary.** This
machine has no Xcode/Android SDK. Metro-bundling the full JS graph (expo-router,
expo-dev-client, and all deps resolve and bundle cleanly) is the available proxy for "the
app builds" until an EAS Build is run. Revisit when a real device/simulator build is needed.

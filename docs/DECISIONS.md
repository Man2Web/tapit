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

## 2026-08-30 — Google auth (web only, no phone OTP yet)

**User explicitly asked to skip Phone OTP and do Google auth only, for `apps/web` only.**
§7.1's onboarding sequence assumes phone OTP first; that's deferred, not dropped — revisit
when phone OTP is actually built. Mobile Google auth (a different flow — expo-auth-session +
deep linking, not cookies) is not built yet either.

Built: `/login` (Google button via `supabase.auth.signInWithOAuth`), `/auth/callback`
(exchanges the OAuth code for a session), `/dashboard` (minimal authed page proving the
session works, with sign-out), `middleware.ts` (refreshes the session cookie per the
standard `@supabase/ssr` pattern), and a `handle_new_user` trigger on `auth.users` so any
new sign-in — Google now, phone OTP later — gets a `user_profiles` row automatically
(`supabase/migrations/20260830033618_auto_provision_user_profile.sql`).

**`@supabase/ssr` pinned to `^0.12.5`, not the `^0.5.2` first installed.** 0.5.2's type
declarations deep-import from `@supabase/supabase-js/dist/module/lib/types`, a path that
doesn't exist in the `@supabase/supabase-js@2.112.4` that `^2.45.0` resolves to today —
every `.from(...)` call on a client built via `createServerClient` typed as `never`. If a
future `@supabase/supabase-js` bump reintroduces type errors here, suspect the same
version-skew issue first.

**Enabling the Google provider itself (Client ID/Secret in the Supabase dashboard, and the
OAuth consent screen + client in Google Cloud Console) is a manual step the user does** —
no MCP tool exposes Supabase Auth provider config, and creating a Google Cloud OAuth client
needs the user's own Google account.

## 2026-08-30 — Email + password auth (Google put on hold)

User asked to build email + password auth now and hold Google for later. Kept the Google
button on `/login` rather than removing it — it's dormant (does nothing useful) until the
provider is enabled, but there's no reason to delete working code for it.

**"Username and password" turned out to mean email + password**, confirmed with the user.
Supabase Auth's password login has no native username identifier; a true-username flow
would mean fabricating an internal email per user and losing built-in password-reset/email
verification. `profiles.username` (the public card slug, `/u/<username>`) is unrelated to
login and unaffected either way.

Built: `/signup` (email/password/confirm, handles both "confirmation required" and
"confirmation disabled" project settings), `/forgot-password` → email link →
`/auth/callback?next=/auth/reset-password` → `/auth/reset-password` (set new password).
`/login` now has the password form as primary, Google as a secondary option below a divider.

Verified live end-to-end against the real `tapit` Supabase project (sign up → confirm email
server-side → sign in → dashboard renders the account → sign out → redirected to `/login`),
then deleted the test `auth.users` row — `user_profiles` cascade-deleted with it, confirming
the FK is wired correctly.

## 2026-08-30 — Supabase advisor cleanup

User asked "is the supabase setup?" — while checking, the advisor turned up 14 RLS perf
warnings, 2 redundant-policy warnings, and a security warning, all introduced by our own
migrations. Fixed all three in
`supabase/migrations/20260830035632_rls_perf_and_hardening.sql`:
- Every `auth.uid()` in an RLS policy wrapped as `(select auth.uid())` — evaluated once per
  query instead of once per row (`auth_rls_initplan`).
- `profiles` and `profile_links` each had two overlapping SELECT policies (owner + public);
  merged into one per table (`multiple_permissive_policies`).
- `handle_new_user()`'s `EXECUTE` revoked from `public`/`anon`/`authenticated` — it's a
  `SECURITY DEFINER` function meant only for the `auth.users` trigger, not a callable RPC.
  Verified the trigger still fires after the revoke (Postgres doesn't privilege-check trigger
  invocation, only direct calls) by inserting and deleting a throwaway `auth.users` row.

Remaining advisor warning is **leaked-password protection (HaveIBeenPwned check), disabled**
— an Auth dashboard toggle (Authentication → Policies → Password), not a SQL fix. Left for
the user; not blocking.

## 2026-08-30 — Onboarding / profile editor

Built the §7.1 onboarding wizard at `/onboarding` (web only, matching the earlier auth-surface
decision): name/designation/company → photo (skippable) → username with live availability →
starter links (WhatsApp/Call/Email/Instagram/LinkedIn/Website as toggles) → done. Single
client-side wizard component with local step state; nothing is persisted to Supabase until
the final "Done" step, so abandoned attempts don't leave partial profile rows.

Bio was in the `profiles` schema but is **not** part of the onboarding sequence per §7.1's
exact step list — left for a later profile-edit page, not added here.

New Supabase pieces (`supabase/migrations/20260830040524_onboarding_support.sql`):
- `avatars` storage bucket, public read, owner-scoped write via the `avatars/<user_id>/...`
  path convention checked against `(storage.foldername(name))[1]`.
- `is_username_available(text)` RPC, `SECURITY DEFINER`, so the live-check bypasses RLS and
  reports truthfully even against inactive profiles (RLS-scoped reads would otherwise show a
  taken-but-inactive username as available, and the insert would then fail on the unique
  constraint). Its advisor warning about being publicly callable is **expected and accepted**
  — that's the point, it's called from the browser during onboarding, and it only ever
  returns a boolean.

`STARTER_LINKS` and `suggestUsername()` live in `packages/core/src/links.ts` (shared
business logic per the repo rule in §5), not duplicated into the web app, so the mobile app's
onboarding can reuse the same link definitions and value-formatting logic later.

Verified live end-to-end: signed up a fresh account, confirmed it, ran the full wizard
(auto-suggested username off the display name, live-checked it, added WhatsApp + Website),
landed on `/dashboard` showing the new card, confirmed `/u/manikandan-g` rendered it publicly
with correctly formatted link values (`https://wa.me/919876543210`, `https://tapit.in`), and
confirmed `/onboarding` redirects away once a profile exists. Deleted the test account after
— cascade-deleted `profiles` and `profile_links` cleanly.

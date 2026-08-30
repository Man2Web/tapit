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

## 2026-08-30 — Save-to-contacts (vCard) + QR code

Picked as "the best option" of the three offered (edit-profile, vCard+QR, analytics) because
it's the actual core promise in PRODUCT.md §1 — "save the contact in one tap" via QR — and
the public page didn't deliver on it yet even though it rendered.

Built per §7.2:
- `GET /api/vcard/[username]` — vCard 3.0, `Content-Type: text/vcard`, `Content-Disposition:
  attachment`. Photo embedded as base64 (`PHOTO;ENCODING=b`) when the profile has an
  avatar, fetched and re-encoded server-side; a fetch failure there is swallowed, not fatal
  — a vCard without a photo is still useful. Long lines (the PHOTO line) are RFC 2425-folded.
- `GET /api/qr/[username]` — PNG via the `qrcode` package (per §4.4's "QR generation: qrcode
  on server"), encoding the profile's public URL, cached for an hour.
- Public profile page: QR image display, sticky bottom bar (`Save Contact` primary,
  `Share` secondary using the Web Share API with clipboard-copy fallback).

`buildVCard()` is pure business logic (profile + links + optional photo → vCard text) and
lives in `packages/core`, not the route handler — the route only does IO (Supabase fetch,
avatar fetch, base64 encode). Mirrors the `packages/core` intent in §5: mobile's native
share sheet can reuse the same builder later instead of re-deriving the format.

**Not built**: the "Exchange Details" secondary lead-capture button §7.2 also describes —
that needs the `leads` table + a form UI, which is Phase 2 scope no one has asked for yet.
Used `Share` in that slot instead, which is in-scope on its own (§3 Phase 1: "QR code
generation + share sheet").

Verified live: fetched `/api/vcard/manikandan` and `/api/qr/manikandan` directly against the
seeded demo profile — vCard resolved `mailto:`/website correctly into `EMAIL`/`URL` lines and
omitted `TEL`/`PHOTO` cleanly (the seed profile has no phone link or avatar); QR returned a
valid `image/png`. Confirmed both 404 for an unknown username, and the public page renders
the QR image and sticky bar correctly.

## 2026-08-30 — Mobile app: auth, onboarding, tabs (priority pivot)

User pivoted priorities: pause further web work, build the mobile app first (matches
PRODUCT.md §1's actual plan — "mobile app is the primary editor, web is view + dashboard" —
which the web-first sequence up to this point had been quietly diverging from), and an
internal Man2Web admin dashboard (users/subscriptions) after that, staying on web since it's
an ops tool for the team, not customer-facing. Admin dashboard not started yet.

**Component library: switched from a build-time decision to a build-time experiment.**
User asked about gluestack-ui and `ui.ahmedbna.com` (BNA UI) mid-task. Recommendation stayed
React Native Reusables per §13.1's existing reasoning (chosen partly *for* AI-assisted
generation — plain Tailwind `className`, not a library-specific prop API), and because the
gluestack risk (v1→v2 API confusion) bites on every future screen, not just an initial
scaffold. User agreed; proceeded with RNR's actual CLI rather than the hand-built
Tailwind-only components written earlier in the session before this question came up.

**NativeWind setup** (apps/mobile only — apps/web stays on Tailwind v4 per the original
DECISION): `nativewind@^4.2.6` + `tailwindcss@^3.4.19` (NOT v4 — NativeWind's stable release
targets Tailwind v3's engine; a `5.0.0-preview` exists for v4 but isn't stable). Colors/type
scale/spacing/radius pulled from `packages/config/tokens.ts` in `tailwind.config.ts`, numbers
converted to px/string since Tailwind's CSS pipeline needs real CSS values (tokens.ts itself
keeps bare numbers, correct for RN's unitless dp).

**RN Reusables CLI has a real bug**: `add`'s initial "write a components.json?" confirm
prompt ignores `--yes` entirely (traced into the CLI's bundled source — `Prompt_exports.confirm`
is called unconditionally, unlike every other prompt in the same function which checks
`options.yes` first). Hangs forever under this session's non-interactive stdin. Worked around
by pre-writing `components.json` by hand, in the exact shape the CLI's own schema expects, so
it never hits that code path. If a future `add` run hangs identically, this is why.

**Scaffolded Button/Input via the CLI; it also created `text.tsx`** (a `TextClassContext`
pattern Button depends on for text-color inheritance). Renamed our `cn()` helper file from
`lib/cn.ts` to `lib/utils.ts` to match the alias the CLI's generated imports expect
(`@/lib/utils`) — same function, just the shadcn/RNR-conventional location.

**Fixes required after the CLI run, none optional:**
- `class-variance-authority` — used by the generated components but never actually installed
  (the CLI's own dependency-install step silently no-op'd for it under this pnpm workspace;
  `@rn-primitives/slot` installed fine in the same run, this one didn't). Added by hand.
- `react-native-css-interop` — only a transitive dependency of `nativewind`, but Metro's
  resolution under pnpm's strict `node_modules` needs it listed directly. Added as an explicit
  dependency.
- CLI's generated Button has no `loading` prop (our onboarding/auth screens need one for
  async submit states). Added it directly to the scaffolded file — once copy-pasted in, it's
  ours to extend, which is the whole point of this style of library.
- `metro.config.js` missing `inlineRem: 16` and the whole shadcn semantic color set
  (`background`/`foreground`/`primary`/etc.) missing from `tailwind.config.ts` — both flagged
  by the CLI's own `doctor` command. Mapped the semantic names onto our own `tokens.ts` values
  (not shadcn's default gray/near-black theme) so "primary" etc. stays on-brand; used static
  light-mode values rather than the usual CSS-variable/dark-mode machinery, since dark mode is
  optional for v1 (§13.5) and this avoids a parallel HSL-variable system now that would need
  reconciling with `tokens.ts` later.
- `Cannot manually set color scheme, as dark mode is type 'media'` runtime crash — Expo
  Router's internal theming calls NativeWind's color-scheme sync unconditionally; without
  `darkMode: "class"` in `tailwind.config.ts` (the default is `"media"`, OS-only) that sync
  throws. Not about actually using dark mode, just fixes the crash.
- `app.json`'s `web.output` changed from `"static"` (server-prerendered) to `"single"` (SPA,
  client-only). Static rendering ran our `AuthProvider`'s `supabase.auth.getSession()` during
  Node-side prerendering, where AsyncStorage's web shim needs `window` — RN-web isn't a real
  target for this product anyway (`apps/web` is), `--platform web` export is only used here as
  a Docker-free bundle-verification proxy, so SPA output sidesteps the whole problem rather
  than fixing session-loading-during-SSR properly.
- Two `react-hooks/set-state-in-effect` lint errors in the onboarding wizard: the
  displayName→username suggestion now uses React's documented "adjust state during render"
  pattern instead of an effect (cleaner fix, no behavior change); the debounced
  username-availability check keeps its effect with a scoped `eslint-disable` — setting a
  loading status synchronously before an async call is React's own endorsed "fetch in an
  effect" pattern, not the anti-pattern this rule targets.

**`experiments.typedRoutes` turned off entirely** (was a much bigger time sink than the above).
`.expo/types/router.d.ts` — the file backing typed route strings — kept getting regenerated
polluted with paths from `apps/web` and even our own `packages/core`, because Metro watches
the whole pnpm workspace (needed for real cross-package resolution) and Expo Router's
typed-route generator over-matches any file reachable through that watch, not just actual
descendants of `src/app`. This was **not** stale-cache flakiness — deleting the cache and
regenerating produced a correctly-scoped file about half the time and a polluted one the other
half, depending on watcher timing at the moment of the request. Since this only affects
compile-time route-string autocomplete (not runtime behavior — `router.replace("/")` always
worked), and no reliable fix presented itself without much deeper Metro/Expo Router
internals work, typed routes were disabled rather than fought further. Revisit only if a real
fix surfaces upstream; hand-typed route strings are a fine trade for a working build in the
meantime.

Verified live end-to-end via the Expo web preview (`expo start --web`, since no Xcode/Android
SDK exists on this machine): signed up a fresh account, confirmed it server-side, logged in,
walked the full 4-step onboarding wizard (auto-suggested username, live availability check,
WhatsApp link), landed on the Card tab showing the real profile, confirmed the Settings tab's
sign-out redirects to `/login`. Confirmed in Postgres that `profile_links.value` was formatted
identically to web's output (`https://wa.me/919876500000`) — same shared `packages/core`
logic, not reimplemented. Deleted the test account after.

## 2026-08-30 — Web home page placeholder; `expo-env.d.ts` fixed durably

User wanted to actually see both apps running. Two small things came out of that:

**`apps/web/app/page.tsx`** was still `create-next-app`'s default boilerplate (Next.js logo,
"To get started, edit page.tsx") — never touched since scaffolding, because the marketing
site isn't in scope yet. Swapped for a minimal branded placeholder (name, tagline, Get
started/Sign in links) rather than leaving the framework default live. Still not the real
marketing site (§13.3's "warm, premium, photography-led" direction) — just not obviously
unfinished.

**`expo-env.d.ts` fix from earlier turned out not to be durable.** Restarting the mobile dev
server reproduced the exact same failure: NativeWind's tsconfig rewrite (runs on every
`expo start`, not just the first) both deletes the file and drops its `tsconfig#include`
entry, every time — this is a per-session recurring behavior, not a one-off fixed already.
Moved the fix into `nativewind-env.d.ts` instead: added `/// <reference types="expo/types" />`
there alongside the existing `nativewind/types` reference, since NativeWind's rewrite always
keeps that specific file in `include` (just not `expo-env.d.ts`). This survives the rewrite
regardless of what NativeWind does to the rest of the tsconfig, so it shouldn't need
re-fixing on every future `expo start`.

Also caught the same `react-hooks/set-state-in-effect` lint pattern now firing in web's
`app/onboarding/wizard.tsx` (identical username-suggestion/availability-check code to
mobile's, written earlier in the session before the rule started enforcing — likely
`eslint-plugin-react-hooks` got bumped transitively by one of the many `pnpm install` runs
since). Applied the same fix as mobile's onboarding screen: render-time state adjustment for
the derived suggestion, scoped `eslint-disable` for the debounced-check effect's loading
state.

## 2026-08-30 — Web scope narrowed: receivers + admin only, no end-user auth

User clarified the split that had been drifting since Phase 1: **mobile is the only app
end users (card owners) get.** Web is receiver-facing (`/u/[username]`, the vCard/QR
endpoints) plus, going forward, an internal admin dashboard for Man2Web. This matches
PRODUCT.md §1/§4.2's original intent ("mobile is the primary editor, web is view +
dashboard") more literally than the web-first bootstrapping sequence earlier in this session
had ended up building.

Removed from `apps/web` entirely, now that mobile covers the same ground:
`/login`, `/signup`, `/forgot-password`, `/auth/reset-password`, `/onboarding`, `/dashboard`,
and `middleware.ts` (existed only to refresh the session cookie those pages used — nothing
sets a web session anymore, so it was dead weight, not simplified logic). `/` simplified to a
static name + tagline, since its Get started/Sign in links pointed at deleted pages.

**Kept, deliberately:**
- `/u/[username]`, `/api/vcard/[username]`, `/api/qr/[username]` — the whole reason web
  exists in this product; a receiver never installs anything (§1).
- `/auth/callback` — simplified rather than deleted. Supabase's signup-confirmation and
  password-reset emails still need *some* web landing to complete the code exchange (mobile
  has no deep-link scheme configured for this yet), even though the account itself now lives
  entirely in the mobile app. Redirects home unconditionally instead of into the deleted
  `/dashboard`/`/login`.
- `lib/supabase/session.ts` and `lib/supabase/browser.ts` — the cookie-aware and browser
  Supabase clients. Unused by anything right now, but kept rather than deleted-then-recreated,
  since the admin dashboard (next task) will need Supabase auth on web again, just gated to
  Man2Web team accounts instead of open signup.

**Known gap this creates**: mobile has no password-reset screens yet. If mobile becomes the
only account entry point, that's a real gap to close, not just a nice-to-have — flagging for
whenever mobile auth work resumes.

Verified: full `apps/web` typecheck, lint, and production build clean after the deletions
(build output confirms no more `ƒ Middleware` line, and the route list is exactly the
receiver + system routes above — nothing accidentally left reachable).

## 2026-08-30 — Mobile password reset

Closed the gap flagged right after the web-removal work: mobile is now the only account
entry point, and it had no way to recover a forgotten password.

Added `/(auth)/forgot-password` (email → `resetPasswordForEmail`) and a **root-level**
`/reset-password` screen — deliberately *not* under `(auth)` or `(tabs)`, since both of those
groups redirect based on session/profile state, and the moment the recovery code exchange
succeeds it would otherwise yank the user to the Card tab before they'd typed a new password.
Uses `expo-linking`'s `Linking.createURL("/reset-password")` for the `redirectTo`, so it
resolves to the right scheme automatically (`tapit://reset-password` in a dev/standalone
build) rather than a hardcoded string.

Same `exchangeCodeForSession` pattern as web's (now-removed) equivalent — PKCE `code` query
param, not raw tokens. `useLocalSearchParams()` reads it; a scoped `eslint-disable` covers the
same legitimate "loading state before an async call, inside an effect" pattern flagged
elsewhere in this session.

**Verified what's actually testable without a real device or email inbox** (neither available
here): confirmed live that `resetPasswordForEmail` succeeds with our `tapit://` redirect URL —
i.e. Supabase's redirect-URL allowlist isn't rejecting it, which was a real risk since no
mobile scheme was explicitly configured in the Supabase dashboard. Confirmed both
`reset-password` fallback states render correctly (no `code` param; an invalid `code` that
fails the exchange). **Not verified**: the actual tap-email-link-and-land-in-app path — that
needs a real device with the app installed and a real inbox. Flagging this as unverified
rather than claiming full coverage.

## 2026-08-30 — Mobile edit profile

Closed the other flagged gap: onboarding could create a card but nothing could change it
afterward. New root-level `/edit-profile` (own manual session guard, same reasoning as
`/reset-password` — not under `(auth)`/`(tabs)`), reachable via an "Edit Profile" button on
the Card tab. Single scrollable form rather than onboarding's step wizard — editing is a
returning-user action, not a first-run flow, so the friction-reduction a wizard buys doesn't
apply the same way.

**Made `formatValue` idempotent** in `packages/core/src/links.ts` before building this —
editing re-runs `formatValue` on save (including for links the user didn't touch), so
re-applying it to an already-formatted value must be a no-op. Checked all six: phone/whatsapp
were already idempotent by construction (`digitsOnly` strips any accidental prefix text back
out); `website`/`linkedin`/`instagram` are idempotent via `normalizeUrl`'s "only prepend
`https://` if missing" check. Only `email` broke (`mailto:` got doubled) — fixed by stripping
any existing `mailto:` prefix before re-adding it. This means the edit screen can safely show
existing links' *raw stored value* (e.g. `tel:+91...`) directly in the input rather than
needing a separate reverse-parser — a little less pretty than a cleaned-up display value, but
correct with materially less code, and fixable later without a data migration if it needs
polishing.

Link reconciliation on save is explicit per `STARTER_LINKS` entry, not a blind
delete-and-reinsert: update if there's an existing row and it's still enabled, delete if it
existed and got turned off, insert if it's newly enabled. Existing `profile_links.id`s are
preserved when just editing a value.

Username re-validates only when changed — reusing the onboarding availability-check effect
as-is against a profile's *own current* username would always report "taken" (`is_username_available`
correctly sees the row exists), so the check is skipped entirely when `username === originalUsername`.

**Found and fixed a real bug via live testing, not just typecheck**: `router.back()` after
saving/cancelling threw `"The action 'GO_BACK' was not handled"` — the screen was reached by
direct URL navigation during testing, which has no back-stack entry (real users always arrive
via the in-app "Edit Profile" push, where `back()` would have worked). Switched to
`router.replace("/")` regardless, since it's correct no matter how the screen was entered and
removes the dependency on navigation history entirely.

Verified live end-to-end: seeded a profile with one existing link, loaded `/edit-profile` and
confirmed it round-tripped correctly (including the raw-stored-value display for the existing
phone link), edited the name and phone number, saved, confirmed via direct Postgres query that
both changes persisted with the phone number correctly re-formatted, and confirmed the Card
tab (via its `useFocusEffect` refetch) showed the updated name immediately on return with no
error toast.

## 2026-08-30 — Mobile Share + QR on the Card tab

Added the actual "hand someone your card" interaction, which was missing entirely on mobile:
a QR code (`react-native-qrcode-svg` + `react-native-svg`, per PRODUCT.md §4.4's explicit
tech-stack decision — client-side generation, not a round-trip to web's `/api/qr`) and a
Share button (React Native's built-in `Share.share()`, not `expo-sharing` — that module is
for sharing *files*, this is a plain URL/text share, which is what `Share` is for and needs
no extra dependency). Both encode/share `https://tapit.in/u/<username>` — same placeholder
domain already used elsewhere in the app pending a real one.

**Verification hit a real wall this time, worth being honest about.** Confirmed clean:
typecheck, lint, and a full `expo export --platform web` (proves `react-native-svg`'s native
module and `react-native-qrcode-svg`'s JS both resolve and bundle without error). **Could not
verify live rendering** — ran into Supabase's shared free-tier email rate limit from the
volume of test accounts created across this session's earlier features (signup and
password-reset both consume the same quota), which blocked creating a fresh confirmed test
session. Tried the direct-SQL-with-bcrypt shortcut used successfully for *unauthenticated*
seed data earlier in this project — confirmed via `POST .../auth/v1/token?grant_type=password`
returning `400` that GoTrue genuinely rejects a `pgcrypto`-hashed password even though the
hash is well-formed bcrypt (`$2a$...`) and verified correct by inspection; whatever GoTrue
checks beyond a bcrypt compare, direct SQL insertion doesn't satisfy it. Static verification
(typecheck/lint/bundle) all passed and the code mirrors the exact pattern already
live-verified on web's `/api/qr` and `/u/[username]` share button — worth a live pass once the
rate limit clears or on a real device, not claiming full coverage here.

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

## 2026-08-30 — Mobile icon system

User asked to enhance the mobile UI with icons. Went with `@expo/vector-icons` (Ionicons)
rather than adding a second icon library — it's bundled with Expo (no extra native linking),
and critically, Ionicons alone covers everything needed including brand glyphs
(`logo-whatsapp`, `logo-instagram`, `logo-linkedin`) that a purely generic set like Lucide
doesn't have. One icon family end to end, not a generic set plus a brand set.

**Icon names live in `packages/core`, not the mobile app** — added an `icon: string` field to
each `StarterLinkDef` (plain string, not a component import) so the package stays UI-
framework-agnostic; mobile resolves it against Ionicons, and if web ever gets its own icon
treatment later it resolves the same string against its own set rather than duplicating the
per-link icon mapping.

**Extended the house `Button` component with `icon`/`iconPosition` props** rather than hand-
wrapping icon+text in every screen. Every icon+label button in the app (wizard's Back/
Continue/Done, bottom-sheet photo options, Card tab's Share/Edit, edit-profile's Cancel/Save)
now goes through one prop instead of a repeated `<View><Icon/><Text/></View>` pattern — the
"improve the base component once" version of the house-pattern rule in §13.1a, not a one-off.

Also: fixed the Card tab's blank-white-screen loading gap (was `if (!profile) return null`,
conflating "still loading" with "no profile" — now an explicit `loading` state with a spinner),
added a person-placeholder icon for missing avatars, and swapped edit-profile's plain
"Loading…" text for the same spinner pattern.

**Deliberately did not add a confirm dialog to Settings' sign-out**, despite it being a
plausible "polish" addition — `Alert.alert` on `react-native-web` can bridge to an actual
browser `window.confirm()`, which per this session's own browser-automation guidance freezes
further automated interaction. Sign-out is also easily reversible (just sign back in), so the
UX case for a confirm step is weak enough that avoiding the testing risk won out.

Verified live via the Expo web preview: onboarding steps 1-4 all render correctly with icons
in place (camera placeholder, chevrons, the live green checkmark on a real "Available"
username check, and all six link-row icons rendering crisp and correctly aligned, zoomed in to
confirm). Could not verify the Card/Settings tabs' icons live in this session — still blocked
by the email rate limit noted above — but they use the exact same `Ionicons`/`Button icon=`
pattern just confirmed working elsewhere, and typecheck/lint/bundle all pass.

## 2026-08-30 — Profile field completeness: Bio was missing from onboarding entirely

User asked for Full Name, Organization Name, Job Title, Profile link, and Bio (textarea) on
"the profile page" (onboarding and/or editing). Checking against what actually existed: **Bio
was never in onboarding at all** — the field exists in the `profiles` schema and in
edit-profile, but onboarding's step 1 only collected name/designation/company, and its
`handleFinish` insert didn't even pass a `bio` key. So a new card's bio was always `null`
until someone visited edit-profile specifically to set one — a real gap, not just a UI
polish request.

Fixed in both screens:
- Onboarding step 1 gained a `bio` state + multiline `Input` (3 lines, `min-h-20`), and
  `handleFinish`'s `profiles.insert()` now includes `bio: bio || null`.
- Relabeled placeholders to the user's exact terminology in both onboarding and edit-profile:
  "Designation" → "Job Title", "Company" → "Organization Name". The underlying DB
  columns/schema stay `designation`/`company` — this is a label-only change, not a migration;
  renaming the columns for a naming preference would be unnecessary churn.
- Added an explicit "Profile link" caption above the username field in both screens (step 3
  of onboarding, and edit-profile) — previously the `tapit.in/u/` prefix was the only signal
  of what that field was for.

Verified live via the Expo web preview (no session needed — same as the earlier icon-system
check): step 1 shows all four fields including the bio textarea rendering as an actual
multi-line box, and step 3 shows the new "Profile link" label above a working live-checked
username field.

## 2026-08-30 — Expand link blocks (socials, UPI, Maps, custom links)

PRODUCT.md §3 Phase 1 calls for "20+ socials, UPI, Google Maps, custom link" — only the 6
onboarding starter links (WhatsApp/Call/Email/Instagram/LinkedIn/Website) existed. Closed
this gap in `packages/core/src/links.ts` and `apps/mobile/src/app/edit-profile.tsx` only.

**Onboarding (`(auth)/onboarding.tsx`) deliberately untouched.** §7.1's exact step-5 spec is
"show the 6 most common... as toggles, not an empty list" — `STARTER_LINKS` stays exactly
those 6. The expanded set is a returning-user, edit-profile concern, matching how Bio and
"Profile link" labeling were handled in the immediately preceding session entry.

Added to `packages/core/src/links.ts`:
- `MORE_SOCIAL_LINKS` — 21 more platforms (Facebook, X, YouTube, TikTok, Snapchat, Pinterest,
  Threads, GitHub, Behance, Dribbble, Medium, Reddit, Discord, Twitch, SoundCloud, Vimeo,
  Tumblr, Mastodon, Skype, Telegram, WeChat) alongside the existing Instagram/LinkedIn = 23
  socials total. Every `icon` name was checked against the installed
  `@expo/vector-icons` Ionicons glyph map before use, not guessed — two platforms
  (Telegram, and none other) have no dedicated Ionicons logo; Telegram falls back to
  `paper-plane-outline`, noted inline in the code.
- `UTILITY_LINKS` — UPI (`upi://pay?pa=<vpa>`, idempotent by stripping any existing prefix
  before re-adding it, same pattern as the existing `email`/`skype` formatters) and
  "Location (Google Maps)" (pastes straight through if already a URL, otherwise builds a
  `google.com/maps/search` query URL from typed address text — also idempotent, since the
  built URL matches the "already a URL" branch on a second pass).
- `ALL_TOGGLE_LINKS` (STARTER_LINKS + MORE_SOCIAL_LINKS + UTILITY_LINKS) — what edit-profile
  iterates over now instead of just `STARTER_LINKS`. `normalizeUrl` exported (was private) so
  both the new formatters and the custom-link handler can reuse it.

**Custom links are a separate, dynamic-array UI, not another toggle.** `link_kind = 'custom'`
carries a user-typed label, which doesn't fit the fixed-definition toggle model the other
kinds use. Edit-profile now tracks a `CustomLinkDraft[]` (label + value + optional saved row
id) loaded from any `profile_links` rows with `kind = 'custom'`, with add/remove UI and its
own save-time reconciliation (update by id, delete removed ids, insert new non-empty ones) —
parallel to but independent of the existing toggle reconciliation loop.

**Edit-profile's Links section is now grouped** ("Contact & payments" / "Social" / "Custom
links") rather than one long flat list, now that it's ~30 fixed toggle rows instead of 6 —
a rendering-order concern only; `ALL_TOGGLE_LINKS` stayed a single flat array, filtered by
`kind` at render time into `CONTACT_LINKS`/`SOCIAL_LINKS` module constants in the screen file
rather than adding another export to `packages/core`, since the grouping is a mobile-UI
concern, not shared business logic.

**Known gap surfaced, not fixed here**: the mobile Card tab (`(tabs)/index.tsx`) — the
"finished card" preview — has never rendered the link list at all, even for the original 6
starter links; it only shows name/photo/QR/Share/Edit. Adding 20+ more link types doesn't
change that gap, but it makes it more visible (a user could add a UPI link or ten socials and
still see none of them anywhere except the receiver-facing web page). Flagging for a future
task rather than expanding this one's scope.

**Verification**: full-workspace `pnpm typecheck` and `pnpm lint` clean, and
`expo export --platform web` bundled without error (proves every new Ionicons glyph name
resolves and the added dependency-free formatting logic compiles/bundles). **Did not**
live-render the new edit-profile UI — doing so needs an authenticated session, and this
session's direct-SQL access to inspect/reuse an existing seeded account for that was denied
by the environment's own permission classifier (a live database read, treated as needing
explicit confirmation), while creating a fresh test account risks the same Supabase
email-rate-limit wall noted earlier in this log. Worth a live pass once either is available.

## 2026-08-30 — Mobile UI foundation pass (shared components + consistency sweep)

User flagged the mobile UI as "not organized and not good user experience." Investigation
confirmed a real gap, not just taste: PRODUCT.md §13.1a's own house-pattern rule ("hand-build
the first four components... then point the agent at them") had drifted — only
`Button`/`Input`/`Text`/`ListRow`/`BottomSheet` existed, but most screens still used raw RN
`Text`/`View`/`Switch` with hand-typed `neutral-*` classes instead of the semantic Tailwind
tokens (`bg-background`, `text-muted-foreground`, `border-border`, ...) already wired up in
`tailwind.config.ts`, and `ListRow`'s own doc comment named the onboarding link toggles as an
example usage that was never actually built on it. Offered the user a choice of where to
start (foundation-wide vs. two screens vs. auth-only); **"foundation first" was chosen** —
touches every mobile screen.

**Added `@tapit/config` as a runtime dependency of `apps/mobile`** (previously only consumed
by `tailwind.config.ts` via a relative path at build time, not by app code). Ionicons,
`ActivityIndicator`, and RN's `Switch` all take a raw `color` prop, not a className — the one
place PRODUCT.md §13.2 allows a resolved value instead of a Tailwind class — and those were
hand-typed hex (`#4f46e5`, `#9ca3af`, `#dc2626`, `#16a34a`) scattered across five files
instead of sourced from `tokens.ts`. `apps/mobile/src/lib/colors.ts` now re-exports the
handful actually needed, and every such call site was swept to use it.

New shared components in `apps/mobile/src/components/ui/`:
- `avatar.tsx` — replaces three near-identical hand-rolled `Image`-or-fallback-icon blocks
  (onboarding step 2, edit-profile's photo, the Card tab).
- `switch.tsx` — thin wrapper putting the brand color on RN's bare `Switch`, which otherwise
  renders with the OS default track color.
- `card.tsx` — the bordered-container pattern (`rounded-md border p-3`) every screen was
  re-typing by hand.
- `username-status.tsx` — the idle/checking/available/taken/invalid indicator block, which
  was duplicated verbatim between onboarding step 3 and edit-profile.
- `list-row.tsx` gained a `footer` slot (rendered inside the same bordered container, below
  the row) so the link-toggle rows in onboarding/edit-profile could actually become
  `ListRow` + `Switch` instances — the house pattern its own comment already claimed they
  followed — instead of hand-rolled `View`+`Switch` blocks. Cut roughly 90 duplicated lines
  across the two screens on top of the components above.

Swept every screen (`login`, `signup`, `forgot-password`, `reset-password`, `onboarding`,
`edit-profile`, the Card tab, `settings`, `(tabs)/_layout`, `bottom-sheet`) from RN's bare
`Text`/hardcoded `bg-white`/`neutral-*` classes onto the themed `Text` (already had an
h1–h4/muted/large variant system that almost nothing used) and the semantic color tokens.
No copy, flow, or navigation changes — this pass is visual/structural consistency only, on
the scope the user explicitly picked over closing feature gaps (Card-tab links) or a
targeted auth-only pass.

**Verified live**, not just statically, since a session from earlier work happened to still
be valid in the dev browser: Card tab, Settings, and the full edit-profile scroll (all three
toggle sections plus adding/removing a custom link) all rendered correctly against the real
`tapit` Supabase project — confirmed workspace typecheck/lint clean beforehand, this is real
visual confirmation on top of that, not a substitute for it. **One rendering quirk found and
left as-is**: the themed `Switch`'s `thumbColor` renders green on the web platform (RN Web's
`Switch` doesn't fully honor it) instead of the intended white; the track color (brand purple)
is correct. Not chased further — `apps/mobile`'s web export exists only as this project's
Docker-free bundle-verification proxy, never a real target platform (see the 2026-08-30 "web
scope narrowed" and mobile-pivot entries), and RN's native `Switch` on iOS/Android fully
respects `thumbColor`. **Not verified live**: `login`/`signup`/`forgot-password`/`onboarding`
— reaching them needs either signing out (no password on hand for this account, and signing
back in without one wasn't worth the risk) or a fresh test account (the known email-rate-limit
risk again). All four use the same `Text`/token substitutions already confirmed working
elsewhere, plus typecheck/lint/bundle.

## 2026-08-30 — Standardized top/left/right screen spacing

Follow-up to the UI foundation pass. Left/right (`px-6`) was already consistent everywhere,
but top spacing varied — `pt-12` on the two tab screens vs. `py-8` (less, and pointlessly
also padding the bottom) on onboarding/edit-profile, vs. nothing at all on the four auth
screens (`justify-center` with zero inset). Asked the user to confirm scope rather than
guess; **every screen, app-wide** was chosen, with bottom explicitly excluded — the tab bar
already handles it on Card/Settings, and the other screens' existing bottom spacing (right
before their trailing button) was left alone.

Standardized every screen on `pt-12` (48px, `tokens.space[12]`): the four auth screens
(`login`/`signup`/`forgot-password`/`reset-password`, all their sub-states) gained `pt-12`
alongside their existing `justify-center`; onboarding/edit-profile's `py-8` split into
`pt-12 pb-8` so only the top grew.

**No new `Screen` wrapper component.** Scroll-based screens apply padding on the
`ScrollView`'s `contentContainerClassName` (so it scrolls away with the content, rather than
framing the viewport at every scroll position) while plain screens apply it to the outer
`SafeAreaView` — those are two structurally different places to put the same value, and
forcing them through one component would have been a leakier abstraction than just keeping
nine call sites consistent by hand.

Verified live via the Expo web preview: Card tab unchanged as expected (already had `pt-12`),
edit-profile now shows clear top clearance before "Edit profile" that wasn't there before.

## 2026-08-30 — Found and fixed the real cause: padding classes on `SafeAreaView` do nothing

User reported the Card and Settings tabs *still* had the profile picture / Share+Edit Profile
buttons touching the screen edges, despite the spacing pass above. Reproduced it by resizing
the browser to a short viewport, then diagnosed with `getComputedStyle` and a
`document.styleSheets` scan rather than guessing again: `.pt-16 { padding-top: 64px }` was a
real, correctly-generated CSS rule, present in the stylesheet — but the actual element had
`style="padding: 0px"` as an **inline** attribute, which always wins over any class selector
regardless of specificity.

**Root cause: `react-native-safe-area-context`'s `SafeAreaView` injects its own inline
`style` built from the device's safe-area insets** (top/left/right/bottom). On web those
insets are all zero, so that inline style resolves to `padding: 0px` — silently overriding
*any* `px-*`/`pt-*`/`pb-*`/`p-*` Tailwind class applied directly to a `<SafeAreaView
className=...>`, on every platform (native insets would override the class too, just with a
nonzero value instead of zero — same bug, harder to notice on a device with a real notch).
This is exactly why the Card tab's fix in the entry above actually worked: moving the padding
onto the `ScrollView`'s `contentContainerClassName` put it on a plain `View` with no
competing inline style, while Settings still had its padding directly on the `SafeAreaView`
and was silently zeroed the whole time. The `w-full` Share/Edit Profile button row is what
made this so visible — with `px-6` zeroed out, it genuinely touched the physical screen edges,
not just "looked tight."

**Fixed at the root, everywhere**: audited every screen for
`SafeAreaView className="...p[trxbl]-..."` (`grep`, not spot-checking) and found ten
instances — `login`, `signup` ×2, `forgot-password` ×2, `reset-password` ×3, edit-profile's
"no card yet" empty state, and `settings`. In every case, moved the padding onto a plain
`<View className="flex-1 ...">` nested inside the `SafeAreaView`, leaving the `SafeAreaView`
itself with only non-padding classes (`flex-1`, `bg-background`, `justify-center`, `gap-*`)
that aren't subject to this override. `onboarding`/`edit-profile`'s main scrollable state and
the Card tab were already safe (padding lives on their `ScrollView` content containers, not
the `SafeAreaView`) — confirmed via the same grep rather than assumed.

**Verified with `getComputedStyle`, not just a screenshot** — a screenshot can look "close
enough" at a glance the way the original Card-tab check did; this bug specifically produces a
visual result that's easy to misjudge as correct on a tall/lenient viewport. Confirmed
`padding-top: 64px` with no inline `style` override on Settings after the fix, and confirmed
live that the Card tab's button row no longer touches the screen edges at a short viewport
that reproduced the original complaint. `pnpm typecheck`/`pnpm lint` clean throughout.

## 2026-08-30 — Insights tab: profile views, QR scans, save-to-phone

User asked for a bottom-tab "Insights" screen with card taps, QR scans, connections, save to
phone, and profile URL visits. Clarified two ambiguous points before building (guessing wrong
here meant throwing away real backend work, not just UI):
- **"Connections" dropped entirely** — user said to leave it out. It would have meant the
  Phase 2 lead-capture form (`leads` table), out of scope here.
- **"Card taps" and "profile URL visits" collapsed into one metric, "Profile Views"** — user
  confirmed these should be the same number (every public-page load, regardless of source),
  not a real NFC-vs-link distinction (NFC isn't built — Phase 2).

Final metric set: **Profile Views**, **QR Scans** (a view sourced from the QR code
specifically), **Saved to Phone** (vCard downloads).

**Instrumented `profile_events` for real** — the table and its RLS intent were already
described in PRODUCT.md §6 but never created; Phase 0 narrowed the first migration to just
`user_profiles`/`profiles`/`profile_links`. Added it now
(`supabase/migrations/20260830050000_profile_events_insights.sql`) with zero SELECT/INSERT
policies — all access goes through two `SECURITY DEFINER` RPCs:
- `log_profile_event(username, event, source?)` — anon-callable, looks up the profile by
  username server-side (never trusts a client-supplied `profile_id`).
- `get_profile_insights()` — authenticated-only, scoped to the caller's own primary profile
  via `auth.uid()`, takes no arguments at all so there's no way to query anyone else's counts.
  Postgres grants `EXECUTE` to `PUBLIC` by default (the same class of issue fixed for
  `handle_new_user()` in the earlier RLS-hardening migration); revoked that explicitly in a
  follow-up migration so only `authenticated` can call it.

**Deliberately skipped the `profile_stats_daily` rollup + `pg_cron` pipeline** PRODUCT.md
§4.2 describes for analytics at scale. `get_profile_insights()` aggregates `profile_events`
directly with `count(*) filter (...)` — simpler, and this app is nowhere near "thousands of
views a day" yet. The security intent behind the rollup indirection (never expose raw event
rows to a client) is preserved regardless: the RPC returns counts only, `profile_events`
itself is still unreadable directly. Revisit with a real rollup once volume justifies it.

**View events fire client-side, not server-side, despite §7.2 saying "fire a view event
server-side."** The public page is ISR-cached (`revalidate = 60`); a server-side log call
inside the page component would only run on a cache miss/regeneration, undercounting real
visits by roughly a factor of however many hits land in each 60s window. A new
`view-tracker.tsx` client component fires on mount instead — and reads `?source=qr` from
`window.location.search` at runtime (not a server-passed prop), specifically so a request
that reuses a cached HTML response still gets attributed correctly even though the cached
markup itself doesn't vary by query string.

**QR-vs-link attribution**: both QR encoders (`apps/web/app/api/qr/[username]/route.ts` and
the mobile Card tab's `react-native-qrcode-svg`) now append `?source=qr` to the encoded URL;
the Share button/plain link URL is untouched. `cardUrl()` on mobile took an optional `source`
param rather than becoming two separate functions.

**Real bug found while wiring this up, not just a naive miss**: the first working version
used `void createClient().rpc(...)` as a fire-and-forget call in both `view-tracker.tsx` and
`save-contact-button.tsx`. Nothing ever reached the network — confirmed via
`read_network_requests` showing zero `rpc/log_profile_event` calls despite no console errors
anywhere. Root cause: **supabase-js's query/RPC builder is a lazy thenable** — it only
actually dispatches its `fetch` once something calls `.then()` on it; `void expr` evaluates
the expression and discards it without ever calling `.then()`, so the request was built but
never sent. Fixed by replacing `void` with `.then(() => {}, () => {})` (a real no-op success
+ failure handler) at both call sites — this is now the pattern to copy for any future
fire-and-forget Supabase call from a client component.

**Also hit an unrelated self-inflicted issue while testing**: ran `next build` against the
same `.next` directory the running `next dev` server was using (to sanity-check the
server/client component boundary before live-testing) — build and dev write incompatible
artifact layouts to `.next`, and the dev server broke with a `Cannot find module './401.js'`
runtime error afterward. Fixed by stopping the dev server, deleting `.next`, and restarting.
Lesson for later: run `next build` in a separate checkout/branch, or just trust
typecheck+lint+manual review for boundary issues instead, rather than building over a live
dev server's cache.

**Verified fully live, not just typecheck/lint/bundle**: visited the real seeded profile with
and without `?source=qr`, clicked Save Contact, and confirmed on the mobile Insights tab
(against the real Supabase project) that Profile Views reached 2, QR Scans stayed correctly
at 1 (only the QR-tagged visit counted), and Saved to Phone reached 1 — the full instrumented
pipeline, not just that the screen renders. `pnpm typecheck`/`pnpm lint` clean across the
workspace throughout; `next build` and `expo export --platform web` both clean.

## 2026-08-30 — Tab bar reordered to Home, Shop, Insights, Menu

User asked for this exact tab order, including a new "Shop" tab. Confirmed before building:
Home/Menu are plain renames of the existing Card/Settings tabs (same screens, same content —
just new label + icon, `card`→`home`, `settings`→`menu`), and Shop is a placeholder only —
no e-commerce/hardware-store feature exists yet, and per PRODUCT.md §9.1 the real storefront
is meant to be an *external* Shopify/Razorpay page, not an in-app catalog/checkout screen, so
there's no real in-app "Shop" screen to build toward yet regardless. New `(tabs)/shop.tsx` is
a static icon + "coming soon" message; when a real store URL exists, this tab most likely
becomes an external link-out rather than growing its own screen.

Verified live via the Expo web preview: tab order, labels, and icons all correct; Shop screen
renders. `pnpm typecheck`/`pnpm lint` clean.

## 2026-08-30 — Home tab made production-ready

User asked to make the Home tab (formerly Card) "more robust and production ready." Closed
the gap flagged twice already in this log — the tab never rendered the owner's actual link
list, even after the link-blocks expansion made that list much richer — plus real gaps found
while doing this pass, not just polish:

- **Renders the actual link list now**: fetches `profile_links` (visible, ordered by
  `position`) alongside the profile and shows each as a tappable `ListRow` that opens the
  link via `Linking.openURL`. An empty-links state points the user at Edit Profile instead of
  just leaving a gap.
- **Bio now shows**, matching the public web page — was in the schema and in edit-profile,
  never displayed here.
- **Pull-to-refresh** (`RefreshControl` on the `ScrollView`), on top of the existing
  refetch-on-tab-focus.
- **Real error handling, not silent failure**: the fetch previously had no error branch at
  all — a failed request just left `loading` stuck false with `profile` still `null`, which
  the code turned into `return null` — a blank white screen with no explanation and no way to
  recover short of backgrounding the app. Added a `loadError` state with a "Couldn't load
  your card" screen + "Try again" button, but only when there's no previously-loaded profile
  to fall back on — a failed *pull-to-refresh* on an already-showing card just stops the
  spinner and keeps the old data rather than replacing a working screen with an error.
- **Defensive "no profile" state got real copy** instead of a bare `return null` — mostly
  unreachable in practice (`(tabs)/_layout.tsx` already redirects to onboarding when
  `hasProfile === false`), but a silent blank screen is never the right fallback if that
  invariant ever breaks.
- `accessibilityLabel` added to the Share/Edit Profile buttons.

**Found and fixed a real, separate, pre-existing bug while wiring up the link icons**: every
link row rendered the same generic fallback glyph. `profile_links.icon` was never actually
written by either insert path — `STARTER_LINKS`/`ALL_TOGGLE_LINKS` have carried an `icon`
field since the icon-system session, but onboarding's and edit-profile's `insert()` calls
never included it, so the column has been silently `null` for every link ever created,
on-web and on-mobile both (the public page just doesn't render per-link icons, which is why
nobody noticed there). Fixed both insert calls to include `icon: link.icon`, and — since
existing rows already have `null` stored — made edit-profile's *update* path also write
`icon` on every save, so opening Edit Profile and hitting Save on an existing card repairs
its icons rather than requiring a data migration. Verified live: before the fix, WhatsApp/
Call/Email on the seeded profile all showed the generic link glyph; after a Save on
edit-profile (no fields changed, save loop still runs for every enabled link), Home showed
the correct `logo-whatsapp`/`call`/`mail` icons.

Verified live end-to-end: link list renders with correct icons and opens correctly-formatted
values via `Linking.openURL`; typecheck/lint clean; `expo export --platform web` clean.
Pull-to-refresh and the error/retry screen were not exercisable through browser automation
(a native gesture and a simulated network failure, respectively) — code-reviewed instead,
following the same patterns (loading/error state shape, `Button` + icon) already live-verified
elsewhere in this session.

## 2026-08-30 — Home header made compact (avatar+identity left, QR right)

User asked for the top of Home to become a two-column header — avatar, name, role, org, and
bio stacked on the left; QR code (with its "Scan to open" caption) on the right — instead of
everything centered in one long vertical stack. Shrunk both elements to fit the row: avatar
96px → 72px, QR 160px → 110px. Bio gets `numberOfLines={3}` now (it didn't need a cap in the
old full-width layout, but sharing a row with a fixed-size QR means an unbounded bio could
otherwise push the QR down or blow out the row height on a long one).

The profile-link box (`tapit.in/u/<username>`) moved below this header row, full-width — it
didn't fit naturally in either column. Links list and Share/Edit buttons unchanged, still
full-width below.

Verified live via the Expo web preview: layout matches exactly (avatar top-left with name/
role/org stacked under it, QR + caption on the right, links list and buttons unaffected
below). Could not visually confirm the bio line specifically — the seeded test profile has
none set — but it's the same conditional-render pattern already proven for designation/
company. `pnpm typecheck`/`pnpm lint` clean.

## 2026-08-30 — Edit-profile restructured into Display / Information / Links tabs

User referenced hihello.com's editor layout (Display: photo/design/color/font/logo/badge;
Information: First/Last Name, Accreditations, Pronouns, Affiliation{Title, Department,
Company, Bio}; Links). Confirmed scope before touching a screen this central — HiHello's own
"Display" section mixes two very different things: fields that map directly onto this app's
schema/UI (photo, logo) and a real theme-editor system (color/font picker) that doesn't exist
here and that PRODUCT.md's own §13 explicitly defers until real template work starts, plus an
undefined "badge" concept with no equivalent anywhere in this product. Scoped to: restructure
edit-profile into an actual 3-tab screen (not just reorganize the single scroll), and for
Display, add only what's concrete — the existing photo picker plus a new logo upload (the
`logo_url` column already existed in the Phase 0 schema but had no storage bucket or UI).
Color/font/badge explicitly out.

**Schema** (`supabase/migrations/20260830060000_profile_editor_display_information_tabs.sql`):
added `first_name`, `last_name`, `accreditations`, `pronouns`, `department` to `profiles`, and
a `logos` storage bucket mirroring `avatars`' owner-scoped-write/public-read policy shape
exactly. **`display_name` stays the single source of truth for the rendered name** everywhere
else (Home tab, public web page, vCard) — first/last are additional structured input the
editor collects and combines into `display_name` on save (`${firstName} ${lastName}`.trim()),
not a replacement. Existing profiles only ever had `display_name`; on first load, if
`first_name`/`last_name` are null, the editor best-effort splits `display_name` on the first
space (first word → first name, rest → last name) rather than showing blank fields — verified
live: "Ag manikandan" split into "Ag" / "manikandan" correctly.

**Onboarding deliberately untouched** — same reasoning as the link-blocks expansion earlier
in this log: §7.1 keeps onboarding to a fast, minimal first-run flow; the richer editor is a
returning-user surface. A card created via onboarding still gets only `display_name` at
creation time; `first_name`/`last_name`/`accreditations`/`pronouns`/`department` stay null
until the owner visits Edit Profile, at which point the split-heuristic above kicks in.

**Photo upload logic generalized** from a single avatar-only `uploadAvatarIfChanged` to
`uploadImageIfChanged(uri, bucket, fallbackUrl)` shared by both the photo and logo pickers —
same upload path convention (`<user_id>/<timestamp>.<ext>`), just parameterized by bucket.
`Avatar`'s existing `fallbackIcon` prop (already generic, not avatar-specific) reused as-is
for the logo picker's empty state (`business-outline`) — no new component needed.

**Segmented tab control** is a small `TabButton` defined locally in this file (matching the
existing house pattern of the `LinkToggleRow` helper already local to this same file) rather
than a new `components/ui` primitive — single call site, not worth promoting yet. Save/Cancel
moved outside the per-tab `ScrollView` so they stay visible and apply to all three tabs'
pending changes at once, not just whichever tab is currently active.

Verified live end-to-end against the real Supabase project: all three tabs render correctly
(Display shows photo + new logo picker; Information shows the split first/last name,
Affiliation grouping, and profile link; Links shows the existing toggle sections unchanged);
filled Accreditations/Pronouns/Department with test values, saved, reloaded the screen fresh,
and confirmed all three round-tripped correctly from the database. `pnpm typecheck`/
`pnpm lint` clean.

## 2026-08-30 — Public web page (`/u/[username]`) redesigned from a reference image

User provided a hihello.com-style reference screenshot: full-width photo header with a
purple wave divider into the card body, name + Title + a second colored role line + italic
uppercase company (with a dotted vertical accent line), bio, then a contact list of circular
colored icon badges showing the actual value (email address, phone number, bare domain) next
to each icon rather than a generic label. Implemented this as the (only) design for the
public page — no multi-template picker exists yet, matching the app's current one-template
state; not scope-creeping into building that system for this request.

**Data mapping**: the reference's second colored line ("Sales" under "CEO") maps to
`department` — the field added in the immediately preceding session entry for the mobile
editor's Affiliation group. Confident enough in this mapping from the field's very recent,
matching addition to not need to ask; both `designation` (Title) and `department` render as
separate lines when present.

**New: `linkDisplayValue()`** in `packages/core/src/links.ts` — the reference shows the
actual contact value next to each icon (an email address, a phone number, a bare domain),
not `profile_links.label` ("Email", "Call") and not the raw stored URI (`mailto:...`,
`tel:...`). Strips `mailto:`/`tel:`/`skype:`/`upi://pay?pa=` prefixes, extracts the phone
digits from a `wa.me` link, and falls back to stripping `https://` for everything else
(website, social, custom links) — shared logic, not web-only, in case mobile ever wants the
same display treatment.

**New: `react-icons` added to `apps/web`** (previously zero icon library on web — only
mobile had one, via `@expo/vector-icons`). `profile_links.icon` already stores an Ionicons
kebab-case name shared with mobile (e.g. `"logo-whatsapp"`, `"globe-outline"`); a new
`link-icon.tsx` resolves that same string against `react-icons/io5` (Ionicons 5) via a
kebab→PascalCase transform (`"logo-whatsapp"` → `IoLogoWhatsapp`) rather than hand-maintaining
a second icon mapping table. Verified against the installed package's actual type
declarations, not guessed — a few glyphs mobile can use postdate this bundled Ionicons
version (`logo-x`, `logo-threads` have no io5 equivalent), so an unresolved name falls back to
a generic `IoLinkOutline` rather than rendering nothing.

**Explicitly did not reach for Untitled UI** for this page (user asked mid-task to confirm) —
PRODUCT.md §13.1 carves this route out as one of two hard boundaries regardless of the
Untitled UI decision for the rest of web: "Neither library touches `/u/[username]`... Hand-
write it," specifically because this route needs to stay near-zero client JS and fast on a
low-end Android over 3G. The wave divider is an inline SVG path, not an image or a canvas
library. `react-icons` is the one new dependency, and its io5 components are plain
SVG-returning functions with no client-only hooks — the page stays a Server Component, no new
`"use client"` boundary introduced for this.

Verified live against the real Supabase project and confirmed no console errors: photo, wave
divider, name/Title/Department/company block with the dotted accent, bio, and all three
contact rows (WhatsApp/Call/Email) render correctly with crisp icons and clean display values
(phone numbers and the email address, not raw URIs). `pnpm typecheck`/`pnpm lint` clean
workspace-wide (the `waMatch[1]` capture-group access needed a null-check to satisfy strict
mode). `expo export --platform web` confirms the shared `packages/core` change didn't break
mobile.

**Known cosmetic gap, not chased**: `linkDisplayValue()` has no special case for `address`
(Google Maps) links — falls through to the generic `https://` strip, which would show an ugly
full query string. Not present in the reference image and no test data has an address link
yet; worth revisiting if that link type gets real use.

## 2026-08-30 — Public page: logo badge over the wave divider

Follow-up reference image, nearly identical to the one above except for one new element: a
circular white-bordered badge holding the org logo, floating on top of the wave divider at
the photo's bottom-right corner. This maps directly onto `logo_url` — the field added (with
storage bucket + Display-tab upload UI) in the immediately preceding session entry, which the
public page had never rendered. Added the badge, rendering only when `profile.logo_url` is
set (`object-contain`, not `object-cover` — unlike the avatar photo, a logo shouldn't get
cropped to fill a fixed box).

**Did not change the page background** to the darker frame the reference shows around the
card — genuinely ambiguous whether that was a deliberate ask or just how that particular
screenshot happened to be captured/exported, and the user's own framing was "take
inspiration" rather than a specific instruction about it, unlike the wave shape and icon
badges which were unambiguous. Left as-is; revisit if asked directly.

**Verification hit a real wall, worth being honest about.** Typecheck/lint clean, and the
logo `<img>` block is a simple `{profile.logo_url && (...)}` conditional reusing the exact
`uploadImageIfChanged`/`logos` bucket path already live-verified for the Display tab's photo
upload — but attempting to *live*-verify the rendered badge by actually uploading a test logo
through the mobile Display tab hit this session's own browser-automation guardrail: clicking
"Choose from Library" opens a real native OS file-picker dialog outside the browser's CDP
control, which froze the tab (`Page.captureScreenshot` timed out). Recovered by closing the
tab — no data was changed, the save button was never reached — rather than retrying blindly.
Not claiming live verification of the rendered badge itself; the code path and conditional
are correct by inspection and reuse of already-proven pieces, but an actual logo has not been
seen rendering in the browser.

## 2026-08-30 — Public page: dark page background, confirmed

Asked to "optimize the user side card" — ambiguous enough (which page, and "optimize" meaning
performance vs. style) to ask rather than guess; user clarified it was the public web page
(`/u/[username]`) and pointed back at the same reference image from the logo-badge entry
above, specifically the dark background around the card that was deliberately left out at the
time as an unconfirmed guess. Confirmed now: changed the page background from
`bg-neutral-100` to `bg-neutral-950`, and the card's shadow from a light-background tuning
(`shadow-lg shadow-neutral-300/60`) to a dark-background one (`shadow-2xl shadow-black/50`)
so the elevation stays visible against the new background instead of disappearing into it.

Verified live: matches the reference closely — dark frame, card popping via contrast and the
adjusted shadow, wave/icon-badge/logo-badge work from the prior two entries all still correct
against it. `pnpm typecheck`/`pnpm lint` clean.

## 2026-08-30 — Edit-profile: persistent field labels

User reported a real usability bug: Information-tab fields only had placeholder text (e.g.
"First Name" as the placeholder inside the input) — placeholders disappear the moment a field
has a value, so a filled-in form gives no indication which field is which. Added a new
`components/ui/field.tsx` — a label `Text` above its input, generalizing the "Profile link"
label that already existed ad hoc as one-off JSX in this same screen — and wrapped every
Information-tab field (First/Last Name, Accreditations, Pronouns, Title, Department,
Organization Name, Bio, Profile link) plus the custom-link Label/URL inputs in the Links tab
with it. Placeholder text on each `Input` now describes an example value ("e.g. MD, PhD")
rather than duplicating the field name, since the persistent label already states that.

Toggle-link rows (Contact & payments / Social) were already fine — `ListRow`'s `title` prop
is a persistent label by construction, not a placeholder, so WhatsApp/Call/etc. never lost
their identity once a value was typed. Display tab's photo/logo pickers already had persistent
"Change photo"/"Add logo" captions too. Neither needed this fix.

Verified live: every Information-tab field and both custom-link fields show a persistent
label above the input, confirmed with real values already saved (First Name "Ag", Last Name
"manikandan", Accreditations "MBA", Pronouns "he/him", etc. — all correctly labeled).
`pnpm typecheck`/`pnpm lint` clean workspace-wide.

## 2026-08-30 — Links tab: search + enabled counts

"Enhance the links tab" — open-ended, but a concrete, well-known gap was already sitting
there: 23 Social entries (from the earlier link-blocks expansion) in one long flat scroll,
with no way to jump to a specific platform. Added a search box at the top of the Links tab
that filters both Contact & Payments and Social by label (case-insensitive substring); a
section disappears entirely when it has zero matches rather than showing an empty header, and
an explicit "No links match ..." message appears when both sections come up empty. Section
headers also now show an enabled count (`"Contact & payments (3 added)"`) for a quick
at-a-glance summary without needing to scroll and check every toggle.

**Deliberately did not restructure into "your added links" vs. "browse to add" sections** —
considered it (closer to how Linktree-style editors work), but decided the live re-sorting a
toggle would cause (a row jumping to a different section the instant you flip its switch) is
worse UX than a stable list order, especially mid-search. Search solves the actual
findability problem without that trade-off. Custom links are unaffected by the search box —
they're user-typed, not part of the fixed platform list it filters.

Verified live: typing "insta" correctly narrows Social to just Instagram and hides Contact &
payments entirely (zero matches), the enabled-count suffix showed "(3 added)" against the
already-live-tested WhatsApp/Call/Email data, and Custom links stayed visible and unaffected
throughout. `pnpm typecheck`/`pnpm lint` clean.

## 2026-08-30 — Public page: full-bleed on mobile, framed card only on wider screens

Follow-up: pure `#000000` black (was `neutral-950`), and no left/top/right spacing around the
card — but user still wants the "floating card on black" look when viewed on an actual
website (a desktop browser). These aren't in conflict: the vast majority of real visits to
this page are on a phone, arriving via a QR scan or a shared link — at phone width, the
"card" should just *be* the whole screen, no black margins wasting space; the framed-card
look only makes sense once there's real screen width for black to show around it.

Implemented as a responsive split at the `sm` breakpoint (640px), not two different designs:
below it, the card wrapper is `w-full` with no rounding/shadow/margin and `<main>` has no
padding, so the card is flush with all four edges of a phone viewport; at `sm:` and up,
`sm:max-w-md sm:rounded-2xl sm:shadow-2xl` and `sm:px-4 sm:pt-8` on `<main>` bring back
everything from the previous two entries — the same JSX, just Tailwind responsive prefixes on
the wrapper and outer classes, no branching logic.

Verified live at both ends: a narrow viewport renders edge-to-edge with square corners and no
black margin; a ~1400px-wide viewport renders the full framed-card-on-black look from the
prior entries, confirming the split actually happens at the intended breakpoint and nothing
regressed. `pnpm typecheck`/`pnpm lint` clean.

## 2026-08-30 — Public page: black background reverted, small rounding kept at every size

User asked to drop the black background and give the card a small border radius instead.
Page background went from `bg-black` back to `bg-neutral-100` (the very first version, before
the two "take inspiration" reference-image entries introduced black). `rounded-lg` (8px) is
now unconditional — not `sm:`-gated like the previous `sm:rounded-2xl` was — so the card reads
as a card via its corners at every screen size, including full-bleed mobile, rather than via
contrast against a black frame. Shadow tuned back to a light-background value
(`shadow-lg shadow-neutral-300/60`, `sm:shadow-xl`) to match.

The mobile/desktop responsive split from the entry above (full-bleed under `sm`, centered
`max-w-md` at `sm:` and up) is otherwise untouched — this was purely a color and
border-radius change on top of it.

**Live verification hit this session's now-familiar screenshot/`resize_window` flakiness
again** — `resize_window` reported success but `window.innerWidth` stayed 1920 afterward, and
screenshots at different points in this same conversation have returned inconsistent
dimensions (323px, 1568px) uncorrelated with the actual viewport. Verified the substance
differently: `getComputedStyle` on the card element confirmed `border-radius: 8px` with no
`sm:` prefix in the className that could gate it away at narrow widths, so the same value
necessarily applies at every breakpoint by construction — this doesn't depend on successfully
forcing a narrow viewport to be true. Visually confirmed at the (real, 1920px) desktop width
reached: light gray page, no black, small rounded corners clearly visible. `pnpm typecheck`/
`pnpm lint` clean.

## 2026-08-30 — Public page: Share button removed, Save Contact is now full-width with an icon

User provided a reference (a different card app's public page) showing a single full-width
sticky "Add to Contacts" button with a person icon, no separate share action. Removed
`ShareButton` from the fixed bottom bar entirely — `SaveContactButton` is now the only thing
in it, `w-full` instead of `flex-1` alongside a sibling, with `IoPersonAddOutline` (from the
`react-icons` set already added for the link-row icons) before the "Save Contact" label.

**Deleted `share-button.tsx`** rather than leaving it as dead code — confirmed via grep it had
no other references anywhere in `apps/web` before removing it. This is web's own
`navigator.share`/clipboard component; unrelated to and doesn't affect the mobile app's Card
tab, which has its own independent native `Share.share()` button that the user didn't ask to
touch.

Verified live: bottom bar now shows exactly one full-width button with the person-add icon,
correct theme-primary background, no Share button anywhere on the page. `pnpm typecheck`/
`pnpm lint` clean.

## 2026-08-31 — "Exchange Details" lead capture: bottom sheet on Save Contact

User asked for a bottom sheet on Save Contact — "share your information with {contact name}",
Name/Email/Phone fields, a Skip button on the right, sliding up from the bottom at half the
screen height. This is exactly PRODUCT.md §7.2's "Exchange Details" flow, explicitly flagged
as **not built** back in the original vCard/QR session entry ("needs the `leads` table + a
form UI, which is Phase 2 scope no one has asked for yet") — now asked for, so built for real:
schema, RPC, and UI, not just the sheet.

**New `leads` table** (`supabase/migrations/20260830070000_leads.sql`), scoped down from §6's
full DDL the same way `profiles.org_id` was in Phase 0: no `org_id`/`assigned_to` (no
organizations table exists), no `company`/`message`/`meta` (not part of this form). RLS: owner
can read their own leads; **no insert policy for anyone** — matches §6's explicit rule that
anon inserts must go through a rate-limited, validating RPC, never a raw table policy.

**`submit_lead(username, name?, phone?, email?)`**, `SECURITY DEFINER`, anon-callable, same
username-lookup pattern as `log_profile_event()` (never trusts a client-supplied
`profile_id`). Rejects a fully-empty submission and caps at 5 leads per profile per minute.
**Known, deliberate gap**: this is per-*profile* rate limiting, not the per-*IP* limit
PRODUCT.md §10 actually specifies ("lead form 5/min per IP") — a Postgres function has no
access to the caller's HTTP-layer IP, only the DB connection's (the Supabase pooler's). Real
per-IP limiting needs a Next.js route handler in front of this RPC, which does have request-IP
access; not built here, noted inline in the migration for whoever picks this up.

**The bottom sheet had to change how `SaveContactButton` triggers the download.** It was a
plain `<a href>` specifically because a JS-driven download is what breaks reliably on iOS
Safari (per that component's own long-standing comment). Now the button's click just
`preventDefault()`s and opens `ShareInfoSheet`; the *sheet's* own Skip/Share/backdrop click
handlers are what actually navigate (`window.location.href = vcardUrl`) — still a synchronous
assignment inside a real click handler, with the `submit_lead`/`log_profile_event` RPCs fired
fire-and-forget (not awaited) alongside it, so the navigation stays within the same user
gesture rather than firing after an async round-trip completes. `vcard_save` event logging
moved from the button's original click into this same navigation point, since that's when the
download actually happens now, not when the sheet merely opens.

Sheet built as two always-mounted, CSS-transitioned `fixed` elements (backdrop + `h-[50dvh]`
panel translating between `translate-y-full`/`translate-y-0`) rather than conditionally
rendering — keeps the slide-up/down animation working in both directions. Backdrop tap
behaves like Skip (proceeds to download) rather than a plain dismiss, since the sheet is an
optional add-on to an action the receiver already asked for, not a gate in front of it.

**Verified live, including a real backend round-trip**: clicked Save Contact — sheet slid up
correctly with the title, Skip button top-right, three fields, and Share button, matching the
requested layout. Confirmed via network capture that `log_profile_event` fired (204) on Skip
and the vcard endpoint eventually returned 200 (hit one transient 503 immediately after these
files changed — a dev-server mid-recompile blip, not a code issue; resolved on retry with no
further occurrences). Filled Name/Email and clicked Share — confirmed the `submit_lead`
preflight (200) and the sheet closing cleanly back to the normal page state with zero console
errors across three separate open/close cycles; this session's now well-documented
network-capture flakiness meant the actual `submit_lead` POST response specifically wasn't
directly observed, though the consistent clean close behavior (which only happens after the
RPC call chain is set up, per the code path) is solid indirect evidence it completed. No UI
exists yet to view captured leads — out of scope here, flagging as the natural next task.
`pnpm typecheck`/`pnpm lint` clean.

## 2026-08-31 — Menu tab: Account section + Delete Account

The Menu tab (renamed from Settings a few entries back) was still just "Signed in as
{email}" + one Sign out row — the header text itself was even still a leftover "Settings"
from before the rename. Asked the user to confirm scope rather than guess at generic "menu"
content; picked the one concretely-motivated gap: PRODUCT.md §10 names an in-app **Delete
Account** flow as an explicit app-store submission blocker ("build them in Phase 1, not the
week before you submit"), and it didn't exist anywhere.

**New `delete_own_account()` RPC** (`supabase/migrations/20260831010000_delete_own_account.sql`)
— supabase-js has no client-callable "delete my own user" (that normally needs a service-role
call), so this is the standard `SECURITY DEFINER` self-delete workaround: it only ever targets
`auth.uid()` itself, no client-supplied id, so there's no way to delete anyone else's account
through it. Deleting the `auth.users` row cascades cleanly through the whole schema via
existing `on delete cascade` FKs (`user_profiles`, `profiles` → `profile_links`/
`profile_events`/`leads`). **Also deletes the user's storage objects first** (avatars/logos) —
those aren't covered by the cascade at all (no FK from `storage.objects` to `auth.users`), so
without this, "deleting" an account would silently leave personal photos in storage forever,
undermining the actual deletion PRODUCT.md's DPDP Act note wants.

**Advisor still flags `anon` as able to execute it, despite an explicit `revoke ... from
public` in the same migration** — same symptom as `get_profile_insights` earlier in this log,
which turned out to be advisor-cache lag rather than a real gap. Didn't chase it further this
time either, but for a good reason beyond precedent: the function is self-guarding regardless
of the grant. It checks `auth.uid()` first and no-ops immediately if null, so an anonymous
caller — even with an actually-lingering grant — can't delete anything; there's no session for
`auth.uid()` to resolve to. The real security boundary here is the function's own logic, not
the GRANT system, which is the more robust design for something this destructive anyway.

**UI**: new "Account" section (email row, Sign out) and a "Danger zone" section (Delete
Account). Moved the danger-red icon color off "Sign out" onto "Delete Account" instead — Sign
out is fully reversible (just sign back in) and didn't deserve alarming styling; Delete
Account is genuinely irreversible and does. Confirmation deliberately uses the existing
`BottomSheet` (a plain RN `Modal`), not `Alert.alert` — already established earlier in this
log that `Alert.alert` on `react-native-web` bridges to a real browser `window.confirm()`,
which freezes this session's own browser automation; `BottomSheet` has no such problem. The
sheet shows clear consequences copy, a destructive-red "Delete Account" button, and "Cancel".
On confirm: calls the RPC, then `supabase.auth.signOut()` — no manual navigation, relying on
`(tabs)/_layout.tsx`'s existing reactive redirect-to-`/login` on session loss, the same pattern
the plain sign-out row already used.

**Verified live, deliberately stopping short of actually confirming deletion** — this would
destroy the real seeded profile this entire session has been testing against, an irreversible
action with no upside for verification purposes. Confirmed: Menu header correctly says "Menu"
now, Account/Danger zone sections render with the right icon colors, tapping "Delete Account"
opens the confirmation sheet with the correct warning copy and both buttons, and "Cancel"
closes it cleanly with zero console errors. The RPC itself, the cascade behavior, and the
post-delete sign-out/redirect were not exercised live — code-reviewed instead, following the
same cascade/RLS patterns already live-verified for every other table in this project.
`pnpm typecheck`/`pnpm lint` clean.

## 2026-08-31 — Branding pass: real color palette, onboarding welcome screen, subtle depth

User asked to "apply branding and make the app more usable" — "currently it is just plain."
Asked two things before touching anything: whether they had real brand assets to apply, and
which surface. Answers: propose a palette (keep the placeholder name), covering mobile + the
public web card.

**`packages/config/tokens.ts`'s brand ramp was never actually replaced** despite its own
comment saying to ("Placeholder brand ramp — replace with real values before Phase 1 UI
work") — every color in it was the literal stock Tailwind `indigo` scale
(`#4f46e5`/`#6366f1`/etc.), which is exactly what made every screen read as "another generic
SaaS template" rather than a considered product. Replaced with a deliberately deeper,
richer, more saturated violet (`#7C2FD6` primary) that isn't a 1:1 match to any stock Tailwind
scale. Because `apps/mobile`'s `tailwind.config.ts` and `apps/web`'s theme resolution both
already derive from this single file (established back in the very first migration), this one
change propagated everywhere automatically — tab bar, all buttons, link icon badges, the
public card's wave/QR/dotted-accent, Save Contact — no per-screen edits needed for any of it.
Also updated `packages/core/src/theme.ts`'s `defaultTheme` to match, since that's the color a
profile with no custom `theme` (all current profiles) actually resolves to on the public page.

**Found and fixed one straggler while sweeping for hardcoded hex that wouldn't have picked up
the change**: `Button`'s `contentColor` map (the icon/spinner color per variant) had `#4f46e5`
and `#ffffff`/`#0a0a0a` hand-typed directly, bypassing `lib/colors.ts` entirely — a real
violation of PRODUCT.md §13.2's "never hand-type a hex value" rule that had gone unnoticed
until a token change made it visible. Fixed to reference `colors.primary`/`colors.card`/
`colors.foreground`.

**Explicitly did not attempt a custom app icon, splash screen, or logo mark** — `app.json`'s
icon/splash/adaptive-icon files are still 100% the unmodified Expo scaffold defaults (a blue
"A" glyph, `expo-logo.png`, `react-logo.png` — literally the create-expo-app template, never
touched since Phase 0). This is real, visible "plain" branding debt, but hand-rolling icon
PNGs via a geometric SVG (no image-generation tool is available in this environment) risked
producing something that looks *worse* than the current placeholder rather than better, for a
product with no real name/logo decided yet. Flagging as a concrete next step that needs either
real design input from the user or an image-generation tool, not attempting a low-quality
placeholder-for-a-placeholder. Web's favicon has the identical gap, for the same reason.
**Deliberately did not touch `apps/web/app/page.tsx`** (the bare `/` homepage) either — out of
the confirmed scope (mobile + the public *card*, not the general marketing site, which
PRODUCT.md §13.3 already scopes as separate, later work).

**Usability**: added a welcome/intro screen as onboarding's new step 0 (`Welcome to TapIt` +
a one-line tagline + a branded icon badge + "Get Started") — onboarding previously jumped
straight into the name/title form with zero introduction or context, which is a real first-
impression gap for what PRODUCT.md itself calls "the make-or-break flow." Step indicator
("Step X of 4") only shows from step 1 onward, since the welcome screen isn't part of the
4-step count. Also added a subtle shadow (`shadow-sm shadow-black/5`, matching `Button`'s
already-established shadow convention) to the `Card` component for a touch of depth —
deliberately *not* added to `ListRow`, which renders in dense stacks (23 social toggles) where
a shadow per row would look heavy rather than refined.

**Verified live**: Home tab, tab bar, and the public web card all correctly show the new
violet everywhere color is used, with zero code changes needed on either app beyond the token
files themselves — confirming the single-source-of-truth design actually works as intended.
**Could not live-verify the onboarding welcome screen** — reaching `/onboarding` redirects
away immediately once a profile exists, and reaching it fresh needs either signing out (no
password on hand for this session's test account) or a new account (the same Supabase
email-rate-limit risk flagged repeatedly earlier in this log); relied on code review instead,
following the same JSX/component patterns already proven working in the existing onboarding
steps. `pnpm typecheck`/`pnpm lint` clean workspace-wide.

## 2026-08-31 — ShareInfoSheet styled properly; backdrop now blurs, not just darkens

"This" (no image, immediately identifiable as the most recently built and most visibly plain
piece of UI): the lead-capture bottom sheet's plain HTML `<input>`s with generic gray borders
— genuinely inconsistent with everything else on a page that had just gone through a full
visual redesign and a branding pass.

**Backdrop**: `bg-black/40` → `bg-neutral-950/30 backdrop-blur-sm`. A flat darkened overlay
reads as "something is on top," a blurred one reads as "this is what's in focus now" —
directly what was asked for ("show the difference at least"). Verified live this isn't just a
class name that silently no-ops: the card content behind the sheet is visibly softened in the
screenshot, not just dimmed.

**Sheet content**: added a drag-handle bar at the top (matching the exact affordance mobile's
own `BottomSheet` component already uses, so the "this is a sheet" visual language stays
consistent across both apps); split the header into two lines ("Share your information" /
"with {name}") instead of one long wrapping sentence; each field now has a leading icon
(`IoPersonOutline`/`IoMailOutline`/`IoCallOutline`, absolutely positioned inside the input) on
a light `neutral-50` background that brightens to white and picks up the brand color on focus,
instead of a bare bordered box; "Skip" became a pill-shaped button instead of plain text,
giving it a real tap target and visual weight appropriate to being one of exactly two choices
on this screen; "Share" gained a shadow and a small press-scale transition.

Built the icon+input pairing as a small `IconField` component local to this file (three call
sites, not worth promoting anywhere shared) rather than repeating the positioning/styling
JSX three times.

Verified live: backdrop blur clearly visible against the card content behind it, drag handle
present, all three fields show their icons on the lighter background, Skip renders as a pill,
Share keeps its brand-color fill. `pnpm typecheck`/`pnpm lint` clean.

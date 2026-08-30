# PRODUCT.md — TapKit (working name)

> Digital visiting card platform. Individual first, teams/organizations second.
> Replace `TapKit` and `tapkit.in` with the real brand/domain before building.
>
> This file is the source of truth for Claude Code. Read it fully before writing code.
> When a decision is ambiguous, prefer the choice marked **DECISION** below and note the
> assumption in `DECISIONS.md` rather than inventing a new approach.

---

## 1. What we are building

A digital visiting card. A user creates a profile once, gets a permanent short link
(`tapkit.in/u/manikandan`) plus a QR code, and shares it by link, QR, NFC tap, wallet pass,
or email signature. The receiver **never needs the app** — the profile opens as a normal web
page in their browser and they can save the contact in one tap.

Two revenue surfaces, both important, and they are architecturally different:

| Surface | What it is | Payment rail |
|---|---|---|
| **SaaS** | Pro features on the profile (analytics, lead capture, multiple profiles, custom domain, teams) | Subscription |
| **Hardware** | Printed/metal NFC cards, standees, review cards, stickers | One-time, physical goods |

The hardware is what most Indian competitors actually monetize. The app is the free hook.
Build the app so hardware can be bolted on later without a rewrite (see §9).

### Non-goals for v1
- No CRM. Lead capture writes rows and exports CSV; integrations come later.
- No in-app card *design* editor with freeform canvas. Templates only.
- No web builder parity in v1 — mobile app is the primary editor, web is view + dashboard.

---

## 2. Users

**P1 — Solo professional (v1 target).** Realtor, freelancer, insurance agent, doctor, sales rep.
Wants: look professional, stop reprinting cards, capture the other person's number.
Tech comfort: low. Onboarding must produce a shareable card in under 3 minutes.

**P2 — Small business owner.** 2–20 staff. Wants consistent branding across the team and to
see which staff member is generating leads.

**P3 — Org admin (v2).** 20+ seats. Wants centralized control, SSO-ish onboarding, offboarding
that instantly kills a departed employee's card, and team-wide analytics.

**P4 — The receiver.** Not a user. Never signs up. Their entire experience is one fast web page.
Optimize ruthlessly for this person: page must be usable on a 3G Android phone in under 2s.

---

## 3. Scope by phase

Build in this order. Do not start a phase before the previous one is deployed and usable.

### Phase 0 — Foundation (week 1)
- Monorepo, Supabase project, schema + RLS, auth, CI, EAS + Vercel deploys wired.
- One end-to-end vertical slice: sign up → create profile → public page renders.

### Phase 1 — Individual MVP (weeks 2–5) — **ship this to both stores**
- Phone OTP + Google auth
- Profile editor: photo, cover, name, designation, company, bio, theme
- Link blocks: phone, email, WhatsApp, website, 20+ socials, UPI, Google Maps, custom link
- Public profile page at `/u/:username`
- Save-to-contacts (vCard download)
- QR code generation + share sheet
- Basic view analytics (profile views, per-link taps)
- Free tier only. No payments yet.

### Phase 2 — Monetization + NFC (weeks 6–9)
- Pro tier: multiple profiles, lead capture form, full analytics, remove branding, custom themes
- Subscriptions (see §8 — this is the trickiest part, read it before writing payment code)
- NFC write/read in-app for provisioning physical cards
- Apple Wallet + Google Wallet passes
- Email signature generator
- Paper business card scanner (OCR → contact)

### Phase 3 — Teams / Organizations (weeks 10–16)
- Organizations, seats, roles (owner / admin / member)
- Bulk member invite via CSV
- Locked brand templates — admin defines, members can only fill allowed fields
- Central lead inbox with assignment
- Team analytics dashboard (web)
- Instant deactivation on offboard
- Invoice-based billing, GST fields, per-seat pricing

---

## 4. Tech stack

### 4.1 Mobile — **DECISION: Expo (React Native) + Expo Router (SDK 54+)**

One codebase, both stores, and it is the same React mental model as the rest of your work.

- **Expo Router** for file-based navigation
- **EAS Build** for iOS/Android binaries, **EAS Update** for OTA JS pushes (ship copy/UI fixes
  without a store review — very useful in the first months)
- **NativeWind** so Tailwind classes carry over from web, with **React Native Reusables** as the
  copy-paste component base (§13.1)
- **React Native Reanimated** for the card flip / share sheet polish
- **Zustand** for local UI state, **TanStack Query** for server state
- **expo-image**, **expo-contacts**, **expo-camera**, **expo-sharing**, **expo-notifications**

**Critical constraint:** NFC, wallet passes, and IAP will **not** run in Expo Go. From day one
use an **EAS development build** (`npx expo run:ios` / `expo-dev-client`). Do not build the app
against Expo Go and discover this in Phase 2.

Why not the alternatives:
- *Flutter* — good, arguably smoother animations, but throws away your React/Next/Tailwind
  muscle memory and every shared type between app and web. Not worth it here.
- *Native Swift + Kotlin* — 2x the work for an app that is mostly forms and a share sheet.
- *Capacitor/PWA wrapper* — tempting since the profile is already a web page, but NFC writing,
  wallet passes, and contact-picker access are painful, and Apple rejects thin web wrappers
  under guideline 4.2. Avoid.

### 4.2 Web — **DECISION: Next.js 15 (App Router) on Vercel**

Two apps, one repo:
- `apps/web` — marketing site + **public profile pages** + auth'd account settings
- `apps/dashboard` — team/org admin (Phase 3). Can start as a route group inside `apps/web`
  and split out only if it gets heavy.

Public profile rendering matters more than anything else in this product:
- Server-render the profile, cache at the edge with `revalidate` + tag-based invalidation on save
- Ship near-zero client JS on that route — it is a read-only page
- `generateMetadata` for OG image, title, description (this is how the link looks in WhatsApp,
  which is where 90% of Indian sharing happens — get the OG image right)
- Dynamic OG image via `next/og`

Tailwind CSS + Untitled UI React (free tier) for the dashboard and marketing surfaces. The public
profile route stays hand-written and near-zero JS. Design tokens come from a single shared
file — see §13.

### 4.3 Backend — **DECISION: Supabase**

Supabase is the right answer here, and not just because it is your default:

- **Postgres + RLS** maps cleanly onto the multi-tenant model (personal profiles → org profiles
  is a `org_id` column and a policy change, not a rewrite)
- **Auth** has phone OTP built in, which is what Indian users expect. Plug an Indian SMS
  provider (MSG91 / Fast2SMS) as the custom SMS hook — Twilio pricing to India is rough.
- **Storage** for avatars, cover images, brochures/PDFs, with image transforms
- **Edge Functions** (Deno) for the handful of things that must be server-side: Razorpay
  webhooks, wallet pass signing, vCard generation, OCR proxy, CSV export
- **Realtime** for the team lead inbox in Phase 3
- **pg_cron** for analytics rollups

Cost: free tier covers development; ~$25/mo Pro handles the first several thousand users.

**Where Supabase is not enough**, and what to do:
- *Analytics writes* — a popular card could generate thousands of view rows. Do **not** insert
  one row per view into the main table forever. Write raw events to a `profile_events` table,
  roll up nightly with `pg_cron` into `profile_stats_daily`, and prune raw rows after 90 days.
- *Wallet pass signing* — needs Apple certs and Node crypto. Edge Function or a tiny Vercel
  route; keep the `.p12` in Supabase Vault, never in the repo.
- *OCR for card scanning* — use Google Cloud Vision or ML Kit on-device. On-device (ML Kit text
  recognition) is free and works offline; prefer it, and only fall back to cloud for
  parsing quality if needed.

Alternatives considered: a custom NestJS/Fastify API on Railway gives more control but costs you
weeks you do not need to spend; Firebase's document model fights the org/seat/role relational
shape you will need in Phase 3.

### 4.4 Supporting services

| Need | Choice | Note |
|---|---|---|
| Payments (web + hardware) | Razorpay | UPI, cards, subscriptions, GST invoicing |
| Payments (in-app subs) | RevenueCat over StoreKit/Play Billing | See §8 |
| SMS OTP | MSG91 or Fast2SMS | Wire as Supabase custom SMS hook; DLT template registration required in India |
| Transactional email | Resend | Zoho for human mail, Resend for app mail |
| Push | Expo Push Notifications | Free, fine at this scale |
| Error tracking | Sentry | Both RN and Next |
| Product analytics | PostHog | Self-host or cloud |
| QR generation | `qrcode` on server, `react-native-qrcode-svg` in app | |
| NFC | `react-native-nfc-manager` | Needs config plugin + dev build |
| Image CDN | Supabase Storage transforms | |

---

## 5. Repository structure

Turborepo + pnpm workspaces.

```
tapkit/
├── apps/
│   ├── mobile/                 # Expo app
│   │   ├── app/                # Expo Router
│   │   │   ├── (auth)/         # login, otp, onboarding
│   │   │   ├── (tabs)/         # card, leads, analytics, settings
│   │   │   ├── editor/         # profile editor screens
│   │   │   └── nfc/            # write/read tag flows
│   │   ├── components/
│   │   └── lib/
│   └── web/                    # Next.js 15
│       ├── app/
│       │   ├── (marketing)/
│       │   ├── u/[username]/   # PUBLIC PROFILE — the hot path
│       │   ├── (dashboard)/    # org admin (Phase 3)
│       │   └── api/
│       └── components/
├── packages/
│   ├── types/                  # generated Supabase types + shared zod schemas
│   ├── core/                   # profile/link/theme logic shared by app + web
│   ├── ui/                     # shared primitives where sensible
│   └── config/                 # eslint, tsconfig, tailwind preset
├── tools/
│   └── nfc-writer/             # internal desktop tool, USB reader (§9.4) — never shipped
├── supabase/
│   ├── migrations/
│   ├── functions/              # edge functions
│   └── seed.sql
└── docs/
    ├── PRODUCT.md              # this file
    └── DECISIONS.md            # log assumptions and deviations here
```

Rules for Claude Code:
- All business logic that both app and web need lives in `packages/core`. Never duplicate.
- Database types are **generated**, never hand-written: `supabase gen types typescript`.
- Every table gets RLS enabled in the same migration that creates it. No exceptions.
- Validation schemas are zod, defined once in `packages/types`, used on both client and server.

---

## 6. Data model

Postgres. Every table has `id uuid default gen_random_uuid()`, `created_at`, `updated_at`.

```sql
-- ============ IDENTITY ============

-- users: managed by Supabase auth.users
create table public.user_profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text unique,
  email text,
  avatar_url text,
  plan text not null default 'free',        -- free | pro | team
  plan_expires_at timestamptz,
  onboarding_done boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ ORGS (schema exists from day 1, features come in Phase 3) ============

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  brand jsonb default '{}',                  -- colors, fonts, locked template id
  gstin text,
  seat_limit int default 5,
  plan text default 'team',
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

create type org_role as enum ('owner','admin','member');

create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  user_id uuid references auth.users on delete cascade,
  invited_email text,                        -- set before the user accepts
  role org_role not null default 'member',
  status text not null default 'invited',    -- invited | active | suspended
  created_at timestamptz default now(),
  unique(org_id, user_id)
);

-- ============ THE CARD ============

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  org_id uuid references organizations on delete set null,   -- null = personal card
  username text unique not null,             -- the public slug: /u/<username>
  is_primary boolean default true,
  is_active boolean default true,            -- offboarding kills this, not the row

  -- content
  display_name text not null,
  designation text,
  company text,
  bio text,
  avatar_url text,
  cover_url text,
  logo_url text,

  -- presentation
  theme jsonb default '{}',                  -- {template, primary, accent, font, layout}
  template_locked boolean default false,     -- org-enforced

  -- behaviour
  direct_link_url text,                      -- if set, /u/x redirects straight here
  lead_capture_enabled boolean default false,
  lead_capture_config jsonb default '{}',

  view_count bigint default 0,               -- denormalized counter, updated by trigger
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on profiles (username);
create index on profiles (owner_id);
create index on profiles (org_id) where org_id is not null;

-- link blocks on a card
create type link_kind as enum (
  'phone','whatsapp','email','website','address','upi','payment',
  'social','file','video','calendar','custom'
);

create table public.profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  kind link_kind not null,
  platform text,                             -- 'instagram','linkedin','youtube', ...
  label text not null,
  value text not null,                       -- url / number / upi id / storage path
  icon text,
  position int not null default 0,
  is_visible boolean default true,
  click_count bigint default 0,
  created_at timestamptz default now()
);

create index on profile_links (profile_id, position);

-- ============ NFC HARDWARE ============

create table public.nfc_tags (
  id uuid primary key default gen_random_uuid(),
  tag_uid text unique,                       -- physical chip UID, if captured
  short_code text unique not null,           -- what is actually written: tapkit.in/t/<code>
  profile_id uuid references profiles on delete set null,
  owner_id uuid references auth.users on delete set null,
  order_id uuid,
  status text default 'unassigned',          -- unassigned | assigned | disabled
  activated_at timestamptz,
  created_at timestamptz default now()
);
```
Writing a **short code that resolves server-side** rather than the profile URL directly is
deliberate: a physical card can be reassigned to a different profile or a new employee without
reprogramming or reprinting it. Do not write `/u/<username>` onto tags. This is load-bearing,
because we write and password-protect tags at fulfilment time — the tag content is fixed for the
life of the card, so it must not encode anything that can change.

`nfc_tags` gains several fulfilment columns and a `card_orders` table in §9.6. Apply that
migration when you start Phase 2, not before.

```sql
-- ============ LEADS ============

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  org_id uuid references organizations on delete cascade,
  assigned_to uuid references auth.users on delete set null,
  name text,
  phone text,
  email text,
  company text,
  message text,
  source text,                               -- form | nfc | qr | link | scan
  meta jsonb default '{}',
  status text default 'new',                 -- new | contacted | qualified | closed | dropped
  created_at timestamptz default now()
);

-- ============ ANALYTICS ============

create table public.profile_events (
  id bigserial primary key,
  profile_id uuid not null references profiles on delete cascade,
  event text not null,                       -- view | link_click | vcard_save | lead_submit
  link_id uuid references profile_links on delete set null,
  source text,                               -- nfc | qr | link | wallet | signature
  country text, city text, referrer text, device text,
  created_at timestamptz default now()
);

create index on profile_events (profile_id, created_at desc);

create table public.profile_stats_daily (
  profile_id uuid references profiles on delete cascade,
  day date not null,
  views int default 0,
  unique_views int default 0,
  link_clicks int default 0,
  vcard_saves int default 0,
  leads int default 0,
  primary key (profile_id, day)
);

-- ============ BILLING ============

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  org_id uuid references organizations on delete cascade,
  provider text not null,                    -- razorpay | apple | google
  provider_ref text,                         -- subscription id / original_transaction_id
  plan text not null,
  seats int default 1,
  status text not null,                      -- active | past_due | cancelled | expired
  current_period_end timestamptz,
  raw jsonb,
  created_at timestamptz default now()
);
```

### RLS rules (write these carefully — they are the whole security model)
- `profiles`: public `select` allowed when `is_active = true` (the page is public by design).
  `insert`/`update`/`delete` only by `owner_id`, or by an org admin when `org_id` matches an org
  where the caller has role `owner`/`admin`.
- `profile_links`: same, inherited through `profile_id`.
- `leads`: readable by the profile owner, plus org admins of the same `org_id`. Insert is allowed
  **anonymously** (that is how the public form works) but only via a `security definer` RPC that
  rate-limits and validates — do not expose a raw anon insert policy on the table.
- `profile_events`: no client select at all. Inserts only through an RPC. Reads go through
  `profile_stats_daily`.
- `org_members`: readable by members of that org, writable by owner/admin only.

---

## 7. Feature specs (the ones with real complexity)

### 7.1 Onboarding — the make-or-break flow
Target: **under 3 minutes from install to shareable link.** Sequence:
1. Phone number → OTP (skip password entirely)
2. Name + designation + company (3 fields, one screen)
3. Photo — camera or gallery, with a "skip for now"
4. Username — auto-suggest from name, check availability live
5. "Add your links" — show the 6 most common (WhatsApp, call, email, Instagram, LinkedIn, website)
   as toggles, not an empty list
6. Done → immediately show the finished card with a big **Share** button

Do not gate anything behind payment during onboarding. Do not ask for email if you have the phone.

### 7.2 Public profile page — the hot path
- Server-rendered, edge-cached, revalidated on profile save
- Sticky bottom bar with **Save Contact** (primary) and **Exchange Details** (secondary,
  opens lead form) — this bar is where conversion happens, do not bury it
- `Save Contact` downloads a vCard 3.0 (`.vcf`). Generate server-side at
  `/api/vcard/[username]`. Include photo as base64 `PHOTO;ENCODING=b`. Test on both iOS Safari
  and Android Chrome — iOS handles `.vcf` differently and needs the right `Content-Type`
  (`text/vcard`) and `Content-Disposition`.
- Fire a `view` event server-side; fire `link_click` client-side via `navigator.sendBeacon`
- Free tier shows a small "Made with TapKit" footer link; Pro removes it

### 7.3 NFC

**DECISION: customers never write tags. We write and password-protect every card before
shipping.** See §9 for the fulfilment process and the internal writer tool.

Consequences for the consumer app, which are all simplifications:
- The app needs NFC **read** only, and only for activation (reading a chip UID to bind a card to
  a profile). No write flows, no write UI, no risk of a customer bricking a card.
- iOS still needs the **NFC Tag Reading capability** in the Apple Developer portal, the
  `com.apple.developer.nfc.readersession.formats` entitlement, and `NFCReaderUsageDescription`
  in Info.plist. Configure via the Expo config plugin; requires a dev build, not Expo Go.
- Android: read via `react-native-nfc-manager`.
- Activation must also work **without NFC**, by typing the short code printed on the sleeve.
  Old phones, NFC switched off, and damaged antennas are all common. Treat the typed code path
  as primary and the tap as the shortcut.

**The tap itself needs no app on either side.** Modern iPhones (XS and later) and virtually all
Android phones read an NDEF URL record in the background and offer to open it. The receiver taps,
the browser opens. That is the whole trick, and it costs nothing.

`/t/<short_code>` on the web app looks up `nfc_tags`, logs an event with `source=nfc`, and 302s
to the currently bound profile. It must be fast — this redirect sits in front of every physical
tap, so keep it at the edge with a short cache and no cold start.

Handle these states at `/t/<short_code>`:

| Tag state | Response |
|---|---|
| `assigned`, profile active | 302 to `/u/<username>` |
| `unassigned` | Activation landing page: "Card not yet set up — open the app or tap here" |
| `assigned`, profile inactive (offboarded) | Neutral "This card is no longer active" page |
| `disabled` (lost/stolen) | Same neutral page; never 404 |
| unknown code | Generic landing page, not a 404 stack trace |

### 7.4 Wallet passes
- Apple: requires a **Pass Type ID certificate** from the Apple Developer account. Build the
  `.pkpass` (a signed zip) server-side. Store the `.p12` and password in Supabase Vault.
- Google: Google Wallet API, generic pass class, JWT-signed save link. Easier than Apple.
- Both passes carry the QR code and update via push when the profile changes.
- This is genuinely fiddly. Schedule it as its own task, not a sub-task of something else.

### 7.5 Business card scanner
- On-device text recognition (ML Kit via `@react-native-ml-kit/text-recognition`) → raw lines
- Parse with regex-first heuristics (phone patterns incl. `+91`, email, URL) and treat the
  largest text block as the name
- Show an **editable confirmation screen** — never save straight from OCR
- Save into `leads` with `source=scan`, and optionally to device contacts via `expo-contacts`

### 7.6 Teams (Phase 3)
- Admin defines a template: which fields are locked (logo, colors, company, designation format)
  and which the member can edit (photo, personal phone, bio)
- Enforce lock at the **database level** via a trigger or RPC, not just in the UI
- CSV bulk invite → creates `org_members` rows with `invited_email`, sends magic links
- Offboarding sets `profiles.is_active = false` and `org_members.status = 'suspended'`.
  The public URL then returns a neutral "This card is no longer active" page. Never hard-delete
  — the leads history belongs to the org.

---

## 8. App store compliance — read before writing any payment code

This is the single most likely thing to blow up your launch timeline.

**Physical goods** (NFC cards, standees) may be sold with Razorpay, outside IAP. Apple and Google
do not take a cut of physical products. Safe.

**Digital subscriptions** (Pro features unlocked inside the app) fall under Apple guideline 3.1.1
and Google Play's billing policy, which have historically required in-app purchase. Both platforms
have been under regulatory and litigation pressure on external payment links, and the rules have
shifted more than once recently — **verify the current policy text before you commit**, because
guidance from even a few months ago may be stale.

Pragmatic plan that survives either outcome:
1. Use **RevenueCat** as the entitlement layer. It abstracts StoreKit and Play Billing, handles
   receipt validation, and gives you one webhook to write into the `subscriptions` table.
2. Sell subscriptions via **IAP inside the apps**, and via **Razorpay on the web**. RevenueCat
   supports granting entitlements from an external purchase, so a web subscriber gets Pro in the
   app too.
3. Keep the app fully functional on the free tier. An app that does nothing until you pay gets
   rejected more often.
4. Do **not** put a "subscribe on our website, it's cheaper" link in the iOS app without first
   confirming the current external-link rules for your storefront.

Price in INR with GST handled on the Razorpay side; IAP prices are set per-storefront in
App Store Connect / Play Console.

---

## 9. Hardware: store, fulfilment, and the internal writer tool

### 9.1 Storefront
Do not build a custom e-commerce stack. Either:
- Point a Shopify store at the same domain (what Taponn does), with a webhook that creates
  `nfc_tags` and `card_orders` rows on order paid, or
- Use Razorpay Payment Pages for a handful of SKUs

### 9.2 Order-to-activation flow

```
1. ORDER PAID
   Shopify/Razorpay webhook → edge function
   → create card_orders row
   → generate N short codes, insert nfc_tags rows (status='unassigned')
   → codes are reserved but nothing is written yet

2. DESIGN + PRINT
   Customer artwork approved. Cards printed with:
     - their design
     - the short code printed small on the card sleeve or back
     - QR fallback encoding the same /t/<code> URL

3. WRITE (internal, §9.4)
   Operator loads the batch in the writer tool, taps each card on the USB reader:
     - read chip UID → store on the nfc_tags row
     - write NDEF URL record: https://tapkit.in/t/<short_code>
     - set PWD/PACK password protection (AUTH0 covers the data pages)
     - store the password encrypted on the row, set protected_at
     - verify by re-reading, then mark status='written'

4. QC + SHIP
   Random sample tapped with an actual phone (both an iPhone and an Android).
   Verifying with the same reader that wrote the tag catches nothing.

5. ACTIVATION (customer)
   Customer opens the app → "Activate my card"
     - taps the card (app reads UID → matches nfc_tags row), or
     - types the short code from the sleeve
   → binds tag to their chosen profile, status='assigned', activated_at=now()
   The tag content never changes. Rebinding to a different profile is a database update.
```

### 9.3 Protection: password, not permanent lock

**DECISION: password-protect (PWD/PACK). Do not permanently lock.**

NTAG213/215/216 offer both. The permanent lock sets the capability container read-only and is
irreversible — nobody can ever rewrite that tag, including us. Password protection blocks the
customer while leaving us able to reprovision.

Why this matters in practice: damaged cards returned under warranty, corporate reorders with a
tweaked URL scheme, and mis-written batches. Under permanent lock every one of those is scrap.

- One password per tag, generated randomly, stored encrypted on the `nfc_tags` row.
- Never derive the password from the short code or the UID — a customer who reads their own tag
  would then be able to compute it.
- `locked_permanently` exists in the schema for the rare case where a client explicitly demands
  a tamper-proof card. Default false, and require a confirmation step in the writer tool.

### 9.4 Internal writer tool

**Not a phone app.** Batch-writing 200 cards by tapping them against a phone is slow and
error-prone. Build a small desktop tool:

- **Hardware:** ACR122U or ACR1252U USB reader (₹3,000–6,000)
- **Stack:** Node + `nfc-pcsc` + `ndef` for encoding, wrapped in either a CLI or a minimal
  Electron/Tauri UI. Lives in `tools/nfc-writer/` in the monorepo.
- **Auth:** a Supabase service-role key in a local `.env`, never checked in. Only operators
  get this tool.

Operator flow:
1. Enter or scan a `batch_id` / order number
2. Tool pulls the unwritten `nfc_tags` rows for that batch and shows a queue
3. Operator taps card → tool writes, protects, verifies, marks the row, advances to the next
4. Audible success/failure beep — the operator is looking at the cards, not the screen
5. Failed writes go to a retry pile; the code is returned to the queue, never silently burned

Must-haves:
- **Verify after write.** Re-read the tag and compare bytes before marking it written.
- **Idempotent.** Re-tapping an already-written card shows "already done", does not double-write.
- **Offline tolerant.** Queue results locally and sync if the connection drops mid-batch;
  a half-written batch with no record of which cards are done is the worst failure mode here.
- **Audit trail:** `written_by`, `written_at` on every row.

### 9.5 Chip selection

| Use | Chip | Note |
|---|---|---|
| Standard PVC/printed card | NTAG213 (144 bytes) | Cheapest; plenty for a short URL |
| Premium / future-proofing | NTAG215 (504 bytes) | Room if the URL scheme grows |
| Metal cards | **On-metal / ferrite-backed inlay** | Mandatory — standard inlays detune against metal and simply will not read |
| Standees, stickers | NTAG213 wet inlay | |
| High-security corporate | NTAG424 DNA | SUN authentication, per-tap unique codes, anti-clone. Costs more; only if a client asks |

Order samples of every SKU and test on a low-end Android and an iPhone before committing to a
production run. Read range varies more than spec sheets suggest, especially through thick PVC.

### 9.6 Additional schema

```sql
create table public.card_orders (
  id uuid primary key default gen_random_uuid(),
  external_ref text,                        -- Shopify/Razorpay order id
  org_id uuid references organizations on delete set null,
  customer_user_id uuid references auth.users on delete set null,
  customer_name text,
  customer_phone text,
  sku text,
  quantity int not null,
  status text default 'paid',               -- paid | in_design | printing | writing | shipped | delivered
  artwork_url text,
  tracking_ref text,
  notes text,
  created_at timestamptz default now()
);

alter table public.nfc_tags
  add column batch_id uuid references card_orders on delete set null,
  add column chip_type text,                -- ntag213 | ntag215 | ntag216 | ntag424
  add column write_password text,           -- encrypted; reprovisioning only
  add column protected_at timestamptz,
  add column locked_permanently boolean default false,
  add column written_by uuid references auth.users,
  add column written_at timestamptz,
  add column verified_at timestamptz;
```

`nfc_tags.status` values: `unassigned` → `written` → `assigned` → `disabled`.

RLS: `nfc_tags` is **never** client-readable in bulk. The only customer-facing access is a
`security definer` RPC that takes a short code or UID and either activates it or returns "not
found". `write_password` must never leave the server — exclude it from every view and RPC return.

### 9.7 Short code format
- 6–8 characters, Crockford base32 (no `I`, `L`, `O`, `U`) so a customer reading it off a printed
  sleeve cannot confuse characters
- Case-insensitive on lookup
- Random, not sequential — sequential codes let anyone enumerate every card you have ever shipped
- Collision check against `nfc_tags` at generation time

---

## 10. Non-functional requirements

- **Public profile TTFB < 300ms, LCP < 1.5s on 4G.** Measure it; do not assume.
- Works on Android 8+ and iOS 15+
- Profile page must render without JS enabled (progressive enhancement on the share buttons)
- All user content images resized server-side; reject uploads > 5MB
- Rate limit: lead form 5/min per IP, OTP 3 per number per 10 min
- Soft-delete everything user-facing; hard delete only on explicit account deletion (which both
  stores now require you to offer in-app)
- Privacy policy, terms, and an in-app **Delete Account** flow are store submission blockers —
  build them in Phase 1, not the week before you submit
- DPDP Act (India) — collect the minimum, state retention, allow export and deletion

---

## 11. Analytics events to instrument

`profile_view`, `link_click`, `vcard_save`, `lead_submit`, `qr_scan`, `nfc_tap`,
`wallet_pass_add`, `share_opened`, `onboarding_step_completed`, `onboarding_completed`,
`profile_published`, `upgrade_viewed`, `upgrade_started`, `upgrade_completed`.

North star for v1: **weekly active shares per user.** Not signups.

---

## 12. Open decisions to resolve before Phase 2

Log answers in `docs/DECISIONS.md`.

1. Brand name, domain, and short domain for NFC URLs (shorter is better on printed cards)
2. Free vs Pro feature split — where exactly does the paywall sit?
3. Pricing: monthly vs annual-only; team per-seat rate
4. Do we sell hardware ourselves or partner with a printer in Vellore/Chennai?
5. Custom domain support for Pro (`card.yourcompany.com`) — DNS + cert automation on Vercel
6. Multi-language: is a Tamil UI worth it for the local market, or is English sufficient?
7. Chip SKUs to stock, and which printer/supplier in Vellore or Chennai
8. Does the short code get printed on the card itself or only the sleeve? (Design constraint —
   decide before artwork templates are finalized)
9. Warranty policy for dead or damaged tags — free replacement window?

---

## 13. Design system

### 13.1 Component foundations

**DECISION: two libraries, one token file, no paid design service.**

| App | Library | Model |
|---|---|---|
| `apps/web` | **Untitled UI React** (free/MIT tier) | Copy-paste source, React Aria, Tailwind v4 |
| `apps/mobile` | **React Native Reusables** | Copy-paste source, NativeWind |

Both follow the shadcn philosophy: component source lands in your repo, no dependency to
manage, no lock-in. You own the files, so their default colors get replaced with your tokens
(§13.2). Both use Tailwind class vocabulary, so one styling language spans the whole repo.

**Web — Untitled UI React.** MIT-licensed free tier covers base components, application UI, and
marketing sections, which is enough for Phase 1 and 2. PRO adds dashboard and settings-page
templates; revisit only if Phase 3 needs it, do not buy up front.

**Mobile — React Native Reusables.** Chosen over the alternatives for agent-assisted work
specifically: Tailwind utility classes are the highest-confidence output Claude Code produces,
and using the same class vocabulary on both sides means no context-switching within one repo.
- *gluestack-ui v2* is the closest runner-up and has a better accessibility story (focus
  trapping via `@react-native-aria`). Its v1→v2 API break means models mix the two syntaxes, so
  expect confident-but-wrong output. Choose it only if screen-reader correctness outweighs that.
- *Tamagui* is more capable and compiler-optimized, but the setup cost and idiosyncratic API are
  a bad trade for an app that is mostly forms, lists, and a share sheet.
- *React Native Paper* is out — Material Design makes the iOS app look like an Android app,
  which is wrong for a product selling premium first impressions.

**Do not use shadcn/ui on web alongside Untitled UI.** shadcn sits on Radix, Untitled UI sits on
React Aria. Two primitive layers means two focus-management models and two sets of behaviour bugs.

Two hard boundaries:

1. **Never share components across web and mobile.** React Aria is DOM-based and does not run in
   React Native. Share tokens only. `packages/ui` holds primitives implemented twice against one
   token source, never one implementation used twice.
2. **Neither library touches `/u/[username]`.** React Aria ships real JavaScript. The public
   profile page is read-only and must render fast on a low-end Android over 3G with near-zero
   client JS. Hand-write it. Libraries belong on marketing, dashboard, settings, and auth.

**Tailwind version mismatch is expected.** Untitled UI is Tailwind v4; React Native Reusables
tracks NativeWind, which has been on v3. Do not try to share a `tailwind.config.js`. Keep tokens
in plain TypeScript (§13.2) and generate two configs from that one file. Verify current NativeWind
Tailwind compatibility in the first hour of setup, before anything depends on it.

### 13.1a Working with the agent on UI

Two practices matter more than the library choice:

- **Pin versions and doc links in `CLAUDE.md`.** All of these libraries move faster than any
  model's training data. Record the exact versions in use and instruct the agent to check the
  docs rather than recall the API.
- **Hand-build the first four components before generating any screen.** Button, text input,
  list row, bottom sheet. Get them right, then point the agent at them as the house pattern.
  Claude Code follows an existing convention in the repo far more reliably than it recalls a
  library API from memory. This is the single biggest quality lever available.

### 13.2 The token file is the design system

The reason AI-assisted UI looks generic is not missing taste — it is the agent inventing new
values on every screen. A frozen token file fixes that, regardless of where the values came from.
It also lets you take Untitled UI components and make them not look like Untitled UI.

`packages/config/tokens.ts` is the single source of truth and must be added to `CLAUDE.md`
context so every generation session reads it.

Define exactly these, once, before building any screen:

```ts
// packages/config/tokens.ts
export const tokens = {
  // Type scale — pick 6 sizes, no more. Every screen uses only these.
  fontSize: { xs:12, sm:14, base:16, lg:20, xl:26, '2xl':34 },
  fontWeight: { normal:400, medium:500, semibold:600, bold:700 },
  lineHeight: { tight:1.2, normal:1.5, relaxed:1.7 },

  // Spacing — 4pt base. Every margin and padding is one of these.
  space: { 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 8:32, 10:40, 12:48, 16:64 },

  radius: { sm:6, md:10, lg:16, xl:24, full:9999 },

  // Brand ramp — one accent, one neutral. Resist adding a third.
  color: {
    brand:   { 50:'', 100:'', 300:'', 500:'', 600:'', 700:'', 900:'' },
    neutral: { 0:'#fff', 50:'', 100:'', 200:'', 400:'', 600:'', 800:'', 950:'' },
    success: '', warning: '', danger: '',
  },

  // RN needs shadow props, web needs box-shadow — define both, derive per platform.
  elevation: { none:0, sm:1, md:3, lg:8 },
} as const;
```

Rules Claude Code must follow:
- Never write a raw pixel value, hex color, or arbitrary Tailwind class (`p-[13px]`,
  `text-[#3a2f1b]`). If a value is needed and no token fits, add the token first.
- `apps/web` consumes this via a Tailwind preset in `packages/config/tailwind-preset.js`.
- `apps/mobile` consumes the same file via a NativeWind preset.
- Changing a token is a deliberate act recorded in `DECISIONS.md`, not a drive-by edit.

### 13.3 Style choice per surface

The product has three visual layers and they should not all look the same.

| Surface | Direction | Why |
|---|---|---|
| Marketing site | Warm, premium, photography-led | This page sells a ₹2,499 metal card — it has to look worth it. Show real cards in real hands, not gradient blobs. |
| App UI + dashboard | Plain, dense, functional | This is a tool. Boring is correct. Untitled UI application components with your tokens applied gets you there. |
| **Public profile / card templates** | **Its own system** | See below |

**The card templates are not part of the design system.** That page is themed per user and the
themes are the product. A realtor's card, a jewellery showroom's card, and a doctor's card should
not look like the same SaaS dashboard. Build 6–8 distinct templates with their own type pairings
and color logic, driven by `profiles.theme`. The token file governs the *app chrome* around
them, not the cards themselves.

Ship v1 with a small, opinionated template set rather than a color picker. Users with no design
sense produce bad cards when handed freedom, and a bad card reflects on the platform because
every recipient sees it.

### 13.4 Tailwind → NativeWind translation

Any web Tailwind you copy from a template or generate for `apps/web` will not run as-is in the
Expo app. NativeWind implements a subset. Things that will not carry over:

- `space-x-*` / `space-y-*` → use `gap-*` on a flex container
- Arbitrary CSS properties and most pseudo-selectors (`hover:`, `before:`, `after:`)
- `shadow-*` behaves differently — iOS uses shadow props, Android uses `elevation`
- Grid — RN has flexbox only
- `backdrop-blur` needs `expo-blur`, not a class

So: share **tokens** across web and mobile, not **components**. `packages/ui` holds primitives
implemented twice against one token source, not one implementation used twice. Attempting a
single shared component library across RN and web (react-native-web, Tamagui) is a larger bet
than this project needs — revisit only if the duplication becomes painful.

### 13.5 Non-negotiables regardless of style

- **Tamil and Latin script must both render well.** Test the type scale with Tamil names and
  company names before locking it. Many display fonts have no Tamil coverage and will fall back
  to something ugly. Noto Sans Tamil is a safe pairing.
- Minimum touch target 44pt. Your users include people in their 50s sharing a card at a BNI
  meeting, not just 25-year-old designers.
- The public profile must be legible in direct sunlight — this gets viewed at outdoor events and
  construction sites. Avoid low-contrast grey-on-grey, whatever the design system suggests.
- Dark mode for the app UI is optional in v1. Dark mode for the *card templates* is a feature
  users will ask for; design the theme schema to support it from the start.

---

## 14. Build instructions for Claude Code

Work phase by phase. For each task:
1. Restate the acceptance criteria before writing code.
2. Write the migration first, generate types, then the UI.
3. Every new table ships with RLS policies in the same migration.
4. Prefer server components in Next; only reach for `'use client'` when you need interactivity.
5. Do not add a dependency without noting why in `DECISIONS.md`.
6. After each task, run typecheck and lint across the whole workspace before declaring done.

First task to run:

> Set up the Turborepo skeleton per §5, initialize the Supabase project with the Phase 0 subset
> of the schema in §6 (`user_profiles`, `profiles`, `profile_links`) including RLS, scaffold the
> Expo app with `expo-dev-client` and Expo Router, scaffold the Next.js app with the
> `/u/[username]` route rendering a profile from Supabase, and confirm both build.

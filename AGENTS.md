# AGENTS.md — PAX Platform (Praxis Exchange)

**Audience:** AI coding agents and developers continuing work on this codebase.
**Version:** 1.0 · **Date:** 12 August 2026 · **Status:** Pre-launch (not publicly announced)
**Production host:** `thepraxisexchange.abacusai.app`

Read this file **before** writing any code. It encodes the rules, constants and constraints already
implemented in the system. Companion documents: `README.md` (scope, install, deploy) and `DESIGN.md`
(styling and design standards).

---

## 1. What PAX Is

PAX (Praxis Exchange) is a public-health innovation platform connecting practitioners, innovators,
investors, employers and policymakers. It is **evidence-first**: every claim a member makes is backed by a
structured, endorsed record rather than a self-declared CV line.

Eight functional modules are implemented:

| Module | Purpose |
|---|---|
| GPS (Growth & Practice Signature) | Structured, endorsed record of a practitioner's real-world work |
| Innovation Vault | Innovator submissions, IP timestamping, controlled investor access |
| Investment Desk | Investor mandates, deterministic opportunity matching, portfolio & diligence |
| Knowledge & Consensus Briefs | Moderated expert debates distilled into purchasable consensus briefs |
| Practice Hub | Clinic operations: patients, appointments, invoices, insurers, payer tracking |
| Safety & Pharmacovigilance | Adverse drug reports, product feedback, signal detection, surveillance |
| Marketplace | Vendor listings for health products/services — **PAX never transacts** |
| Talent & Employer | Employer roles, verified talent search, credibility-ranked candidates |

---

## 2. Non-Negotiable Rules

These are architectural and legal constraints. **Do not violate them, even for a "quick feature".**

1. **PAX is a passive intermediary in the Marketplace.** PAX does not sell, hold, stock, ship, price, or take
   payment for any listed product. There is **no cart, no checkout, no order status, no fulfilment**. Listings
   link buyers to vendors; the transaction happens off-platform between the two parties.
2. **AI moderation is flag-only and fails open.** Moderation never hides, deletes, blocks or auto-rejects
   content. It raises a flag for a human reviewer. If the model errors, times out, or returns unparseable
   output, the content **passes through** — availability is prioritised over enforcement.
3. **"PAX Certified" is not the same as "Verified Vendor".** A vendor is *Verified* when documents are
   checked. Nothing on PAX is ever labelled "PAX Certified", "PAX Approved" or "PAX Recommended" for a
   product. Never introduce such wording.
4. **Safety data is never public.** Adverse-event and pharmacovigilance signals are visible only to `ADMIN`
   and `POLICYMAKER`. Never surface them on public pages, dashboards or aggregate counters.
5. **The app is locked to light theme.** `forcedTheme="light"` in `app/layout.tsx`. A `.dark` token block
   exists in `globals.css` but is unreachable. Do not add dark-mode toggles or dark-only styling.
6. **Additive changes only.** Do not delete existing models, fields, routes or components to make a new
   feature simpler. Extend. Removal requires explicit human approval.
7. **`yarn` only.** Never `npm`, never `npx`. Install from `nextjs_space/`: `yarn add <pkg>`.
8. **Next.js 14 only.** The deployment pipeline does not support Next 15 or React 19 APIs.
9. **Never hand-set `NEXTAUTH_URL`.** The platform injects it per environment.
10. **Never commit or print secret values.** Refer to environment variables by name only.

---

## 3. Repository Structure

```
pax_platform/
└── nextjs_space/
    ├── app/                    # App Router — 69 pages, 100 API routes
    │   ├── api/                # Route handlers (server only)
    │   ├── globals.css         # Design tokens + base layer + utilities
    │   ├── layout.tsx          # Root layout: fonts, providers, analytics, toaster
    │   ├── page.tsx            # Landing page
    │   ├── robots.ts           # Dynamic robots
    │   └── sitemap.ts          # Dynamic sitemap
    ├── components/             # 149 components
    │   ├── ui/                 # 49 shadcn/ui primitives — extend, do not fork
    │   ├── layouts/            # AppShell, AuthLayout, Container, PageHeader, Section
    │   ├── brand/              # pax-logo.tsx
    │   ├── dashboard/ admin/ investor/ innovator/ employer/ policymaker/
    │   ├── knowledge/ marketplace/ hub/ hub-finance/ safety/ community/
    │   ├── marketing/ landing/ modules/ auth/ verification/ contact/ whatsapp/
    │   └── providers.tsx, theme-provider.tsx, google-analytics.tsx,
    │       chunk-load-error-handler.tsx, regulatory-disclaimer.tsx
    ├── lib/                    # 31 modules — all business logic lives here
    ├── hooks/                  # use-toast.ts
    ├── prisma/schema.prisma    # 43 models, 32 enums, 1,259 lines
    ├── scripts/                # safe-seed.ts, seed.ts
    ├── public/                 # Static assets (see §9)
    ├── types/                  # next-auth.d.ts module augmentation
    ├── middleware.ts           # Route protection
    ├── next.config.js
    ├── tailwind.config.ts
    └── STYLE_GUIDE.md          # Template baseline — DESIGN.md supersedes it on fonts
```

**Do not change this structure.** The build and deployment pipeline depends on `nextjs_space/` being the
app root.

Codebase size: **366 TypeScript files · ~36,758 lines · 69 pages · 100 API routes · 149 components ·
31 lib modules · 43 Prisma models · 32 enums**.

---

## 4. Coding Conventions

### 4.1 General

- TypeScript everywhere. `typescript.ignoreBuildErrors` is **false** — type errors break the build.
  `eslint.ignoreDuringBuilds` is **true** — lint warnings do not.
- Import alias `@/` maps to `nextjs_space/`.
- Files: `kebab-case.tsx`. Components: `PascalCase`. Functions and variables: `camelCase`.
  Constants and enum members: `SCREAMING_SNAKE_CASE`.
- Business logic belongs in `lib/`, never inline in a page or route handler. If a rule is used twice,
  extract it to `lib/`.
- Display strings for enums live in `lib/pax-labels.ts` and `lib/admin-labels.ts`. Never hardcode an enum
  label in a component.
- Never emit `\uXXXX` escapes in user-visible strings — write the UTF-8 character directly.

### 4.2 Pages (App Router)

- Server components by default. Add `'use client'` only when hooks, browser APIs or event handlers are needed.
- **Any file that reads `process.env.NEXTAUTH_URL` must declare `export const dynamic = 'force-dynamic'`**,
  otherwise it captures the stale build-time value.
- Every app page opens with `PageHeader` (`@/components/layouts/page-header`) inside a `Container`.
- Dashboard and admin surfaces use `AppShell`. Auth surfaces use `AuthLayout`.

### 4.3 API routes

Every route handler that touches user data follows this shape:

```ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;          // ALWAYS from the session
  // ...
}
```

Rules:

- **Always pass `authOptions`** to `getServerSession`.
- **Derive `userId` from the session, never from a URL parameter or request body.** Passing a user id in the
  URL is a privilege-escalation bug.
- Role-gated routes call `hasRole(session.user, 'ADMIN')` from `lib/access.ts` before proceeding.
- Return `401` unauthenticated, `403` authenticated-but-not-permitted, `404` not-found-or-not-yours,
  `400` validation failure, `500` unexpected. Error bodies are `{ error: string }`.
- Never expose another member's record by id — scope every query by the session user unless the caller is
  `ADMIN`.

### 4.4 Client-side conventions

- Toasts use **sonner** (`import { toast } from 'sonner'`). The `<Toaster />` is mounted in the root layout.
  Do not add a second toaster or use the legacy `use-toast` for new work.
- Forms use `react-hook-form` with `yup` via `@hookform/resolvers`, rendered through
  `@/components/ui/form`. (`formik` is present for legacy screens — do not use it for new forms.)
- Client data fetching uses `swr` or `@tanstack/react-query`, already configured in
  `components/providers.tsx`.
- Dates are formatted with `date-fns`. Money helpers live in `lib/hub-finance.ts` and `lib/format.ts`.

### 4.5 Hydration safety (SSR output must be deterministic)

- Never let `Math.random()`, `Date.now()` or `new Date()` reach server-rendered markup, including
  `useState` initialisers and default props. Move them into `useEffect`.
- `toLocaleString` / `Intl.*` must always receive an explicit locale, and a `timeZone` for dates.
  Operational timezone is `Africa/Nairobi`; Hub currency locale is `en-KE`.
- Browser APIs (`window`, `document`, `localStorage`) only inside `useEffect` or event handlers.
- Wrap contact values (email, phone) shown as text in their own element with `suppressHydrationWarning`.

### 4.6 Images

- Use `next/image`. `images.unoptimized = true` in `next.config.js` — the optimizer is off, so size images
  correctly at source.
- Fixed aspect-ratio container + `fill` + `relative` on the parent. Always give a meaningful `alt`.
- Never invent image URLs. Assets must exist under `public/`.

---

## 5. Authentication, Roles and Tiers

### 5.1 Auth (`lib/auth.ts`)

- NextAuth 4 with `PrismaAdapter`.
- Providers: **Google** (`allowDangerousEmailAccountLinking: true`) and **Credentials** (`bcryptjs.compare`).
- Session strategy: **JWT**. The `jwt` callback attaches `role`, `id`, `tier`, `additionalRoles`; for Google
  SSO users missing a role it re-fetches from the database. The `session` callback mirrors these onto
  `session.user` (typed in `types/next-auth.d.ts`).
- On sign-in, `verificationLevel` auto-upgrades `NONE → EMAIL_VERIFIED` when `emailVerified` is set. This is
  wrapped in a non-blocking try/catch — it must never block login.
- Custom `state` and `pkceCodeVerifier` cookies: `httpOnly`, `sameSite: 'lax'`, `secure` in production.
- `pages.signIn = '/login'`.

### 5.2 Middleware (`middleware.ts`)

Matcher: `['/dashboard/:path*', '/login', '/register']`.

- Unauthenticated request to `/dashboard/*` → redirect `/login`.
- Authenticated request to `/login` or `/register` → redirect `/dashboard`.

Adding a new protected area means adding it to this matcher **and** guarding its API routes.

### 5.3 Roles (`lib/access.ts`)

`PRACTITIONER · INNOVATOR · INVESTOR · EMPLOYER · POLICYMAKER · PATIENT · ADMIN`

- **Public sign-up exposes only five**: Practitioner, Innovator, Investor, Employer, Policymaker.
  `PATIENT` exists only as a Hub clinic record; `ADMIN` is provisioned internally. Never add either to the
  registration UI.
- Each role has a `UserTypeDef` (`value`, `label`, `shortLabel`, `description`, `icon`, `slug`).
  Registration deep-links as `/register?role=<slug>`.
- Multi-role support: `userRoles(primary, additional)` de-duplicates; `hasRole(user, role)` is the only
  permitted check. **`ADMIN` bypasses every role check** — this is intentional.
- `homePathForRole()`: `INVESTOR → /investor`, `INNOVATOR → /innovator`, `EMPLOYER → /employer`,
  `POLICYMAKER → /policymaker`, everything else → `/dashboard`.

### 5.4 Tiers

| Enum | Rank | Label | Badge (`lib/credibility.ts`) | Colour |
|---|---|---|---|---|
| `TIER1_BASIC` | 1 | Basic | Basic Member | `#2D9B94` |
| `TIER2_PROFESSIONAL` | 2 | Professional | Verified Professional | `#F59E0B` |
| `TIER3_EXPERT` | 3 | Expert | Peer-Vouched Expert | `#8B7FD4` |

Helpers: `hasTier(user, minimum)`, `tierRank(tier)`, `tierLabel(tier)`.
`addressRequiredForTier(tier)` returns **true for Professional and above** — physical address, city, postal
code and country become mandatory fields.

---

## 6. Validation Rules (implemented — keep consistent)

| Area | Rule |
|---|---|
| Profile address | Required when tier ≥ `TIER2_PROFESSIONAL` (`addressRequiredForTier`) |
| GPS entry completeness | 5 content fields + 1 endorsement bonus, scored out of 6 |
| Measurable outcome | An outcome counts as measurable when it contains a digit: `/\d/.test(outcome)` |
| Marketplace licence | 365 days from approval; enforced lazily on read |
| PAX ID | `PAX-<PREFIX>-<6>` from alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0 O 1 I`) |
| Upload filename | Sanitised `[^a-zA-Z0-9._-] → _` before it becomes a storage key |
| Presigned upload | PUT URL expires in 3600 s |
| Signed download | 1 hour, with `ContentDisposition`; inline only for `image/*`, `application/pdf`, `text/*` |
| Moderation | Flag-only; never blocks submission |
| Credentials login | `bcrypt.compare` against the stored hash; email is unique per user |

---

## 7. Business Logic Constants — Source of Truth

These values are **already implemented**. Change them only on explicit instruction, and change them in
`lib/` (one place), never by copying the number into a component.

### 7.1 GPS endorser weights — `lib/gps.ts`

| Endorser type | Weight |
|---|---|
| `SUPERVISOR` | 1.0 |
| `EXPERT` | 1.0 |
| `COMMUNITY_ORG` | 0.85 |
| `BENEFICIARY` | 0.6 |
| `PEER` | 0.6 |
| `ACADEMIC` | 0.6 |

Each endorser type carries a fixed "confirms" statement describing exactly what that endorser attests to.
Entry types: `FORMAL_ROLE`, `COMMUNITY_INITIATIVE`, `RESEARCH_POLICY`, `VOLUNTEER`, `TRADITIONAL_KNOWLEDGE`.

`HEALTH_AREAS` (11): Maternal & Child Health · Infectious Disease · Mental Health · Nutrition · WASH ·
Non-Communicable Disease · Health Systems · Community Health · Sexual & Reproductive Health ·
Health Financing · Other.

### 7.2 Credibility score — `lib/credibility.ts` → `computeCredibilityScore()`

Weighted out of 100:

| Component | Weight | Saturation |
|---|---|---|
| Community endorsements | 25% | ÷ 8 |
| Peer endorsements | 20% | ÷ 6 |
| Measurable outcomes | 20% | — |
| GPS completeness | 15% | — |
| Debate participation | 10% | contributions ÷5 → 4 pts, upvotes ÷10 → 4 pts, expert opinions ÷3 → 2 pts |
| Engagement | 10% | ÷ 6 |

When no `debateStats` are supplied, an expert-endorsement proxy is used for the debate component.

Bands: `≥75` **Highly Credible** `#2ABFB0` · `≥50` **Established** `#FBBF24` · `≥25` **Emerging** `#8B7FD4` ·
below that **New Contributor**.

### 7.3 Feedback weighting — `lib/feedback-weight.ts`

`STAR` 1 · `STAR_COMMENT` 1.5 · `EXPERT_COMMENT` 3 · `EXPERT_EVIDENCE` 5.
Resolved from `{ isExpert, hasComment, hasEvidence }`.

### 7.4 Pharmacovigilance signals — `shared/pax_signal_alerts.py`

Severity points: `MILD` 1 · `MODERATE` 2 · `SEVERE` 4 · `LIFE_THREATENING` 6.
Bands: `≥12` **CRITICAL** · `≥6` **ELEVATED** · `≥3` **WATCH** · else **LOW**.
14-day per-drug cooldown between alerts. Alerts route to `ADMIN` and `POLICYMAKER` only — **never public**.

### 7.5 Investment matching — `lib/match-scoring.ts`

Deterministic, no LLM. Weights: **sector 30 · geography 25 · stage 25 · ticket 20**.
`KSH_PER_USD = 130`. `REGION_KEYWORDS` maps 12 regions to keyword sets.
An empty mandate dimension scores **neutral full marks** rather than zero.

### 7.6 IP timestamping — `lib/ip-timestamp.ts`

SHA-256 over `ownerId|title|problem|solution|evidence|timestamp`.
`certificateRef = 'PAX-IP-' + first 12 hex characters, uppercased`.

### 7.7 PAX identifiers — `lib/pax-id.ts`

Format `PAX-<PREFIX>-<6 chars>`; alphabet excludes visually ambiguous characters.
Prefixes: `PR` practitioner · `PT` patient · `IN` innovator · `IV` investor · `EM` employer ·
`PM` policymaker · `AD` admin · fallback `PX`. Clinic records use `CLN-<6>`.

### 7.8 Marketplace licence — `lib/marketplace-license.ts`

`LICENSE_PERIOD_DAYS = 365`. Enforcement is **lazy** — evaluated on any read path. An expired `APPROVED`
vendor is moved to `FROZEN` and all their listings are unpublished inside a single `prisma.$transaction`.
The whole check **fails open**: any error returns `0` rather than breaking the read.

### 7.9 AI moderation — `lib/debate-moderation.ts`, `lib/marketplace-moderation.ts`

Endpoint `https://apps.abacus.ai/v1/chat/completions` · model `gpt-5.4-mini` · `temperature: 0` ·
`max_tokens: 400` · `response_format: { type: 'json_object' }` · 12-second `AbortController` timeout.

Debate categories: `PATIENT_IDENTIFIERS`, `UNSAFE_ADVICE`, `MISINFORMATION`, `ABUSE`, `SPAM`, `OFF_TOPIC`,
`CONFLICT_OF_INTEREST`.
Marketplace categories: `DIRECT_DRUG_SALES`, `B2C_TEST_KITS`, `UNSUBSTANTIATED_CLAIMS`,
`COUNTERFEIT_OR_UNLICENSED`, `PROHIBITED_GOODS`, `MISLEADING`, `SPAM`.

**Flag only. Fails open on error, timeout or parse failure.**

### 7.10 Consensus brief pricing — `lib/brief-pricing.ts`

`BRIEF_PRICE_CENTS = 99` (USD, displayed `$0.99`).
`isPilotFree()` returns true unless `BRIEF_PILOT_FREE === 'false'`.
`isPaymentConfigured()` requires both `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`.
**Neither key is currently set, so the paywall is dormant and briefs are free.** Do not build checkout UI
that assumes payment is live.

### 7.11 Practice Hub finance — `lib/hub-finance.ts`

`HUB_CURRENCY = 'KSh'`; `formatKsh()` uses the `en-KE` locale.
Payer types: `PATIENT`, `INSURER`, `EMPLOYER`, `SHA_NHIF`, `NGO_DONOR`, `OTHER`.
Payment methods: `CASH`, `MPESA`, `CARD`, `BANK_TRANSFER`, `INSURANCE`, `CHEQUE`, `OTHER`.
Payer status: `PENDING`, `PAID`, `OVERDUE`. Invoice status: `DRAFT`, `UNPAID`, `PARTIAL`, `PAID`.

---

## 8. Data Layer

- Prisma 6.7 against PostgreSQL. A single client instance is exported from `lib/db.ts` — **never instantiate
  a new client anywhere else**.
- The database is **shared between preview and production**. Treat every write as production data.
- **Schema changes must be additive and backwards-compatible.** New columns are nullable or carry defaults.
  Destructive Prisma flags that reset or drop data require explicit human approval before use.
- Connection budget is tight: roughly 25 concurrent connections, 5 s statement timeout, 30 s
  idle-in-transaction timeout, short idle-session timeout. Reuse the shared client, keep transactions short,
  never hold a connection across an await on an external API.
- Seeding: `scripts/safe-seed.ts` (run via `yarn prisma db seed`). It **upserts only** — no deletes. If
  records need adding, edit the existing seed file rather than creating a new one.
- Avoid `mode: 'insensitive'` / `ILIKE` on indexed enum-like columns — it defeats the B-Tree index.

### 8.1 Models (43)

`User` `Account` `Session` `VerificationToken` `PractitionerProfile` `Innovation` `Milestone` `Investment`
`DiligenceItem` `CashFlowEntry` `Endorsement` `GpsEntry` `ChallengeBrief` `ChallengeResponse` `GpsEvidence`
`GpsEndorsement` `Notification` `LedgerEntry` `Appointment` `BillingRecord` `AdverseDrugReport`
`ProductFeedback` `PatientNote` `HubPatient` `Insurer` `Invoice` `InvoicePayer` `PaymentReminder` `Debate`
`BriefPurchase` `InvestorMandate` `DebateContribution` `DebateStance` `ContributionUpvote`
`VaultAccessRequest` `MarketplaceVendor` `VendorDocument` `MarketplaceListing` `MarketplaceTransaction`
`MarketplaceReview` `MarketplaceBuyer` `VerificationRequest` `VerificationDocument`

### 8.2 Enums (32)

`UserRole` `MembershipTier` `VerificationLevel` `VerificationRequestStatus` `InnovationStage`
`InnovationStatus` `MilestoneStatus` `InvestmentStatus` `CashFlowType` `DiligenceStatus` `NotificationType`
`AppointmentType` `AppointmentStatus` `PaymentStatus` `PayerType` `InvoiceStatus` `PaymentMethod`
`InsurerCategory` `ReminderChannel` `GpsEntryType` `GpsEndorserType` `ChallengeStatus` `SideEffectSeverity`
`DebateType` `DebateStatus` `ContributionKind` `StanceType` `ModerationStatus` `MarketplacePillar`
`VendorStatus` `MarketplaceListingType` `BuyerEntityType`

---

## 9. Asset Mapping (`public/`)

| Asset | Used by |
|---|---|
| `favicon.png`, `favicon.svg`, `apple-touch-icon.png`, `icon-512.png` | Root layout `metadata.icons` (cache-busted `?v=2`) |
| `og-image.png` | Open Graph / social preview in root metadata |
| `img/pax-mark-color.png` | Primary colour logo mark — headers, documents |
| `img/pax-mark.png` | Monochrome mark |
| `img/pax-logo-white.png` | Logo for dark/vivid surfaces (CTA band, footer) |
| `logo-mark.png`, `logo.jpg` | Legacy references and generated documents |
| `whatsapp-qr.png` | WhatsApp floating action button / contact page |
| `mod-*.jpg` | Module cards on `/modules/[slug]` and the landing module grid |

Rules:

- Reference assets by path from the `public/` root, e.g. `/img/pax-mark-color.png`.
- **Never overwrite a file in `public/` in place.** Browsers and the CDN cache by URL. Write a new filename
  and update every reference, or bump a `?v=N` query on every reference.
- 19 images are currently shipped. Adding one means adding it to this table.

---

## 10. Components

149 components. **Reuse before you create.**

| Directory | Count | Notes |
|---|---|---|
| `ui/` | 49 | shadcn/ui primitives on Radix. Extend variants; do not fork a primitive |
| `dashboard/` | 17 | Practitioner dashboard widgets |
| `admin/` | 13 | Admin console panels |
| `investor/` | 8 | Mandate, opportunities, portfolio |
| `knowledge/` | 7 | Debates, briefs |
| `marketplace/` | 7 | Listings, vendor, buyer |
| `innovator/` | 6 | Vault, submissions |
| `hub-finance/` | 5 | Invoices, payers, reminders |
| `layouts/` | 5 | `AppShell` `AuthLayout` `Container` `PageHeader` `Section` |
| `safety/` | 4 | Adverse reports, feedback |
| `community/` `hub/` `marketing/` `policymaker/` | 3 each | |
| `auth/` `employer/` | 2 each | |
| `brand/` `contact/` `landing/` `modules/` `verification/` `whatsapp/` | 1 each | |
| root level | 6 | `providers` `theme-provider` `theme-toggle` `google-analytics` `chunk-load-error-handler` `regulatory-disclaimer` |

Rules:

- **`chunk-load-error-handler.tsx` must stay mounted in the root layout** — it works around a known
  ChunkLoadError race condition.
- `regulatory-disclaimer.tsx` must remain on every safety and marketplace surface.
- New feature UI goes into the matching feature directory, never into `ui/`.
- `components/brand/pax-logo.tsx` is the only permitted way to render the logo.
  **Do not modify it — the founder has not yet selected a final lockup.**

---

## 11. Styling

Full detail in `DESIGN.md`. The short version:

- All colours come from CSS variables in `app/globals.css`, consumed through Tailwind
  (`bg-primary`, `text-muted-foreground`, `border-border`). **Never hardcode a hex** except inside
  `components/brand/pax-logo.tsx`, which holds the fixed brand colours.
- Fonts: **Outfit** (`--font-sans` and `--font-display`) and **JetBrains Mono** (`--font-mono`).
  `STYLE_GUIDE.md` still names DM Sans / Plus Jakarta Sans — that is the untouched template baseline and is
  **out of date**; DESIGN.md is authoritative.
- Cards use shadow and generous whitespace, not heavy borders.
- Every interactive element must have a real handler. No dead buttons.
- Contrast is a hard requirement — never light text on a light surface.

---

## 12. Environment Variables (names only)

`DATABASE_URL` · `NEXTAUTH_SECRET` · `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` ·
`NEXT_PUBLIC_GA_MEASUREMENT_ID` · `ABACUSAI_API_KEY` · `WEB_APP_ID` ·
`NOTIF_ID_CONTACT_FORM_SUBMISSION` · `NOTIF_ID_SAFETY_REPORT_ACKNOWLEDGEMENT` ·
`NOTIF_ID_DEVELOPMENT_UPDATE` · `AWS_PROFILE` · `AWS_REGION` · `AWS_BUCKET_NAME` ·
`AWS_FOLDER_PREFIX` · `BRIEF_PILOT_FREE`

Injected by the platform: `NEXTAUTH_URL`.
Not currently set: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`.

---

## 13. File Storage

`lib/s3.ts` is the only storage entry point.

- Uploads go **directly to cloud storage** via a presigned PUT. Never write to the local filesystem, never
  create an `/uploads` folder on disk.
- Key format: `${folderPrefix}uploads/${Date.now()}-${safeName}`.
- Store only the `cloud_storage_path` in the database — never a local path, never a signed URL.
- Downloads are triggered with an `<a>` element click, not `fetch` (avoids CORS and iframe restrictions).
- Signed URLs are generated on demand and never cached or persisted.

---

## 14. Scheduled Tasks

Four background jobs run outside the app, in Python, from `/home/ubuntu/shared/`. They connect with
`psycopg2` using `DATABASE_URL` from `/home/ubuntu/shared/.env`.

| Script | Schedule (UTC) | Purpose |
|---|---|---|
| `pax_signal_alerts.py` | Daily 06:00 | Pharmacovigilance signal scoring and alerting |
| `pax_overdue_reminders.py` | Daily 08:00 | Invoice / payer overdue reminders |
| `pax_quarterly_surveillance.py` | 1 Jan/Apr/Jul/Oct 08:00 | Quarterly surveillance summary |
| `pax_safety_archive.py` | 1 February, annually | Annual safety archive |

If you change a safety, invoice or notification model, **check these scripts** — they query the schema
directly and will break silently on a rename.

---

## 15. Notifications and Email

- Email uses the platform notification API. Each notification type has a registered id exposed as a
  `NOTIF_ID_*` variable. Register a new type before writing code that sends it.
- Do not add SendGrid, Mailgun, Resend or the Gmail API.
- WhatsApp helpers live in `lib/whatsapp.ts`; the floating action button is in `components/whatsapp/`.

---

## 16. Working Practices

1. **Search before you write.** Grep for an existing implementation — the same rule is often already coded.
2. **Smallest possible change.** Do not refactor, restyle or rewrite code the task does not require.
3. **Shared code is dangerous.** Before editing anything in `ui/`, `layouts/`, `lib/` or a shared API route,
   grep every usage and preserve existing behaviour for consumers you were not asked to change.
4. **Run the project test tool, then save a checkpoint.** Both must pass before finishing.
5. **Verify user-reported bugs by reproducing them**, not by reading code.
6. Known false positives from the automated test tool, safe to ignore: duplicate `mod-*.jpg` filenames;
   an "Ageing CSV" warning on `/dashboard/hub`; a seeded LinkedIn URL returning HTTP 999; an intermittent
   "text not visible" report on framer-motion reveals.

---

## 17. Content Constraints

- The founder's personal name must **never** appear in the app UI. Use "Founder, Praxis Exchange".
- Hero phrase is locked: **"Where Public Health Innovation Meets Impact"**.
- Tagline: **"Bridging the Gap from Idea to Impact"**.
- No paid membership pricing on the landing page.
- Copy must not box PAX to Africa; imagery is African-majority, wording is global.
- Navigation bar styling is locked. Module navigation belongs on a second line.
- Currency `KSh`, timezone `Africa/Nairobi` for operational data.

---

*PAX Platform — confidential. © 2026 Praxis Exchange. Version 1.0, 12 August 2026.*

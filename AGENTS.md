# AGENTS.md — PAX Platform (Praxis Exchange)

**Audience:** AI coding agents and developers continuing work on this codebase.
**Version:** 1.1 · **Date:** 20 September 2026 · **Status:** Pre-launch (not publicly announced)
**Deployment targets:** Resolve from current deployment configuration and runbooks; do not assume historical hosts are current.

Read this file **before** writing any code. It encodes the rules, constants and constraints already
implemented in the system. Companion documents: `README.md` (scope, install, deploy) and `DESIGN.md`
(styling and design standards).

---

## 0. Mandatory engineering workflow — every module, every task

You are the senior software engineer and coding agent for PAX. Understand the existing system,
preserve its business rules, make the smallest correct change, and verify the result.

**Inspect first → Plan second → Code third → Test fourth → Review last.**

### 0.1 Establish context before execution

1. Read this file, relevant `README.md` sections, `DESIGN.md`, and instructions applying to the files
   being changed. Review relevant prior PAX decisions and module documentation; state when referenced
   history is unavailable rather than claiming to have read it.
2. Inspect the actual checkout, branch, and working-tree changes. Preserve unrelated work and changes
   from other threads. Follow the user's current branch instruction; recent work uses local `main`,
   but verify before editing or switching branches.
3. Establish the requested outcome, affected modules, users, roles, workspaces, acceptance criteria,
   and exclusions. Distinguish planning, implementation, and deployment. Do not invent business rules.
4. Trace the existing workflow: page → component → API → authorization → business logic → database →
   notifications/workers/integrations. Search existing components, helpers, validation, models,
   permissions, and tests before creating anything.
5. Identify shared consumers and legacy entry points. Protect modules outside the task. Reproduce
   reported bugs where feasible; distinguish confirmed failures from code-review suspicions.
6. Check relevant feature flags, migrations, runtime configuration, and local services without
   revealing secrets. Verify the database target before any write.
7. Before coding, explain current behavior, the proposed change, intended files and responsibilities,
   cross-module/permission/data implications, and verification steps.

**Approval rule:** Explain the plan first, then proceed when the request already authorizes
implementation. Do not ask for the same approval again. Planning-only requests remain planning-only.
Ask focused, preferably clickable questions for unresolved material product decisions, conflicting
requirements, or authorization boundaries. Explain trade-offs before changing the requested direction.

### 0.2 Source of truth and current stack

Current code establishes implemented behavior; accepted user decisions and project rules establish
intended behavior. Earlier proposals, audits, inventories, and passing tests are historical evidence,
not proof of current state. Check later decisions before repeating earlier designs. If documentation
and implementation disagree, identify the discrepancy, preserve explicit business/security constraints,
and clarify conflicts that materially change intended behavior. Do not perpetuate stale counts,
hostnames, credentials, deployment claims, or feature-flag values.

Use repository-pinned versions: Node 22, Yarn 4, Next.js 14 App Router, React 18, TypeScript,
PostgreSQL, Prisma 6, NextAuth 4, Tailwind, shadcn/ui/Radix, React Hook Form/Yup, Sonner, and
SWR/React Query. Verify exact versions in configuration. Do not upgrade the stack or install
convenience dependencies incidentally. Keep types strict; never hide errors with broad `any` types,
ignored checks, weakened configuration, or disabled safeguards.

Read the relevant current module records:

- `docs/SERVICE-ENROLLMENT.md` — Accounts service choices and future billing boundaries.
- `docs/SERVICE-NAVIGATION.md` — launcher, service profiles, and shared navigation.
- `docs/PRACTICE-ROUTING.md` — canonical Practice URLs and legacy compatibility.
- `docs/PRACTITIONER-MVP-IMPLEMENTATION.md` — workspace behavior and release requirements.
- `docs/TALENT-IMPLEMENTATION.md` — Talent, shared identity, privacy, and release requirements.
- `docs/docker/README.md` and `docs/go-live/` — deployment and operational runbooks.

### 0.3 Shared identity, separate services

- PAX spans GPS, Practice, Talent, Marketplace, Community/Knowledge, Innovation Vault, Investment,
  Safety, and shared account/admin infrastructure. Do not treat one module as the entire project.
- Preserve one shared PAX identity with independently authorized services and service-specific profiles.
  Accounts manages shared security and enrollment. Do not copy profile fields between services
  automatically; inspect save paths for unintended cross-service writes.
- Keep enablement, setup completion, permissions, workspace membership, professional verification,
  credibility tiers, and payment entitlements distinct.
- Current enrollment tracks preferences. Enabling does not grant permissions or verification;
  disabling does not revoke otherwise-authorized direct access, delete records, or cancel billing.
  Do not introduce paid enforcement incidentally. Reuse existing billing entities when requested;
  do not add an `isPaid` shortcut or equate payment with professional credibility.
- Practice uses `/practice/*` on the main domain. Preserve legacy redirects, query parameters, public
  booking/invitation flows, and existing API compatibility. Resolve product origins through existing
  helpers rather than hardcoded domains. Preserve flags and release gates.
- Reuse the shared header, launcher, user menu, account layout, and capability-filtered sidebars.
- Practitioners at the same facility do not gain access to each other's patients, calendars, or finances.
  Self-declared Talent career history is not verified GPS evidence.

### 0.4 Security and operational boundaries

- Derive the acting user from the authenticated session. Reuse granular permission, role, ownership,
  and workspace capability helpers; inspect their current signatures and enforcement paths.
- Authorize APIs and business logic as well as UI. Validate resource IDs against authorized ownership
  or membership. A hidden button or successful page load is not authorization proof.
- Preserve account restrictions, session revocation, scoped team roles, established admin rules,
  writable-field allowlists, origin checks, rate limits, and audit behavior.
- Protect clinical data, CVs, applications, hiring notes, finances, and private documents across reads,
  writes, downloads, exports, and workers. Moderation failing open never relaxes authorization.
- Use isolated local databases and synthetic records for tests. Never run destructive tests or broad
  demo seeds against shared/production data. Review additive migrations and backup needs before applying.
- Reuse database-managed notification templates, outbox, provider, retries, and preferences. Reuse
  `lib/s3.ts` and upload ownership, validation, quarantine/scanning, retention, and freshly authorized
  signed downloads. Do not persist signed URLs or add local application uploads.
- Inspect TypeScript workers and Python jobs when changing their models or behavior. Keep transactions
  short and external network calls outside them.
- Preserve the single PAX Docker image reused for web, migrations, and workers; PostgreSQL is separate.
- Do not push, publish images, deploy, change DNS, or modify production data unless authorized by the task.

### 0.5 Verification and completion

- Keep changes focused and additive; removal requires explicit authorization. Reuse current architecture
  and avoid unrelated refactoring. Preserve locked design/copy, accessibility, deterministic rendering,
  and loading, empty, validation, error, and success states. Every interactive control must work.
- Run `yarn test` for implementation checkpoints, plus checks appropriate to the change:
  `yarn typecheck`, `yarn lint`, `yarn build`, and `git diff --check`. Add relevant Prisma, integration,
  worker, or browser checks when the behavior requires them. Documentation-only changes do not require
  an application build or browser journey. Tests should verify behavior, not mirror implementation.
- Verify allowed and denied access, direct API requests, cross-user/workspace/service isolation,
  persistence after reload, existing records, legacy paths, and shared consumers as applicable.
- For UI work, verify desktop/mobile behavior, keyboard access, and browser runtime errors. Check the
  normal local preview the user will open: isolated tests are insufficient if that preview has missing
  migrations, disabled flags, stale builds, or conflicting processes.
- Investigate failures. Separate introduced failures, existing unrelated failures, environment or
  integration blockers, and checks not run. Do not hide errors or fabricate passing results.
- Review the final diff, remove only task-created artifacts, and save a scoped local checkpoint after
  required checks pass. Preserve unrelated work. Do not claim full verification while checks are blocked.
- Finish with what changed and why, verification results, remaining limitations, checkpoint/commit,
  and explicit local/pushed/deployed status. Mocked integrations are not live delivery; a local commit
  or successful build is not deployment.

The goal is the smallest reliable solution that belongs in PAX and preserves the rest of the platform.

---

## 1. What PAX Is

PAX (Praxis Exchange) is a public-health innovation platform connecting practitioners, innovators,
investors, employers and policymakers. It is **evidence-first**: every claim a member makes is backed by a
structured, endorsed record rather than a self-declared CV line.

PAX has seven user-facing services, with existing implementations at different stages of readiness:

| Service | Purpose |
|---|---|
| Knowledge Exchange | Debates, consensus briefs and knowledge products; unpublished papers are coming soon |
| Innovation Hub | Innovation submissions, IP timestamping and controlled investor access |
| Talent Marketplace | Evidence portfolios, jobs, applications and hiring |
| Medical Practitioner | Practice workspaces, patients, appointments, facilities and finance |
| Product Marketplace | Vendor listings for health products/services — **PAX never transacts** |
| Investment Platform | Investor mandates, opportunity matching, portfolio and diligence |
| Pharmacovigilance | Public reporting with reports and signals restricted to authorized administrators and policymakers |

GPS (Growth & Practice Signature) and credibility scoring are shared evidence capabilities, not an eighth service.
Home and Accounts are shared infrastructure. Enrollment is independent of authorization.

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
5. **Light theme by default; Admin Dashboard has an approved dark palette.** See `DESIGN.md` §3:
   admin background `#080F18`, green accent `#00C896`. Keep this exception scoped to admin; do not add
   global dark mode or theme toggles. The existing forced-light runtime needs a separate implementation
   before the admin palette is active.
6. **Additive changes only.** Do not delete existing models, fields, routes or components to make a new
   feature simpler. Extend. Removal requires explicit human approval.
7. **`yarn` only.** Never `npm`, never `npx`. Install from the repository root: `yarn add <pkg>`.
8. **Next.js 14 only.** The deployment pipeline does not support Next 15 or React 19 APIs.
9. **Never hand-set `NEXTAUTH_URL`.** The platform injects it per environment.
10. **Never commit or print secret values.** Refer to environment variables by name only.

---

## 3. Repository Structure

```text
pax/                         # Application and repository root
├── app/                     # App Router pages, layouts, and API routes
├── components/              # Shared primitives, layouts, and feature UI
├── lib/                     # Business logic and integration helpers
├── hooks/
├── prisma/                  # Schema and additive migrations
├── scripts/                 # Seeds, workers, and maintenance commands
├── shared/                  # Python scheduled jobs
├── public/                  # Static assets
├── types/
├── tests/                   # Unit, integration, and runtime checks
├── docs/                    # Module decisions and operational runbooks
├── middleware.ts
├── package.json
├── Dockerfile
└── compose.yaml
```

The current checkout is `/Users/mach/dev/nextjs/pax`; `@/` resolves from this root.
Do not recreate the historical `nextjs_space/` wrapper or move the application to match old documents.
Preserve the existing structure and inspect configuration before running commands.

---

## 4. Coding Conventions

### 4.1 General

- TypeScript everywhere. `typescript.ignoreBuildErrors` is **false** — type errors break the build.
  `eslint.ignoreDuringBuilds` is **true** — lint warnings do not.
- Import alias `@/` maps to the application/repository root.
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
- Reuse `requirePermission`/`authorizeUser` from `lib/authorization.ts` and module-specific capability
  checks. Role checks use `hasRole(primaryRole, additionalRoles, requiredRole)` from `lib/access.ts`;
  a role check alone does not replace granular resource authorization.
- Return `401` unauthenticated, `403` authenticated-but-not-permitted, `404` not-found-or-not-yours,
  `400` validation failure, `500` unexpected. Error bodies are `{ error: string }`.
- Scope queries to authorized ownership, organization, or workspace membership. Access to another
  member's record requires the appropriate scoped permission, not merely a supplied record ID.

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
- Providers: **Google** (`allowDangerousEmailAccountLinking: false`) and **Credentials** (`bcryptjs.compare`).
- Session strategy: **JWT**. The `jwt` callback attaches `role`, `id`, `tier`, `additionalRoles`; for Google
  SSO users missing a role it re-fetches from the database. The `session` callback mirrors these onto
  `session.user` (typed in `types/next-auth.d.ts`).
- On sign-in, `verificationLevel` auto-upgrades `NONE → EMAIL_VERIFIED` when `emailVerified` is set. This is
  wrapped in a non-blocking try/catch — it must never block login.
- Custom `state` and `pkceCodeVerifier` cookies: `httpOnly`, `sameSite: 'lax'`, `secure` in production.
- `pages.signIn = '/login'`.

### 5.2 Middleware (`middleware.ts`)

Middleware handles product hosts, canonical redirects, and private-page routing. Inspect its current
matcher and protected-path rules before adding an area. Preserve public booking/invitation exceptions,
legacy redirects, and safe authentication return URLs. Middleware is not a substitute for server-side
session, permission, and resource checks; revoked sessions must be rejected on the server.

### 5.3 Roles (`lib/access.ts`)

Read `UserRole` and the access helpers for the complete current role set, including Talent `MEMBER`
and staff roles; do not derive permissions from a historical role inventory.

- Public registration creates a neutral `MEMBER` through personal details, physical details, then
  selection of one or more of the seven services. Country is required; Basic address fields are optional.
  Verification precedes sign-in and the Accounts service chooser. Never accept public role/tier grants.
- New Google identities complete the same missing details, consent and service choices in Accounts.
  Trust verified email only from Google's verified provider claim; keep existing users grandfathered.
- Legacy `/register?role=<slug>` links are service-selection hints only. `/talent/register` uses the
  shared wizard with Talent preselected. Neither entry assigns a profession or staff role.
- Setup uses `lib/service-onboarding.ts` and `lib/service-setup.ts`: explicit validated intake can
  provision scoped service permissions, independently of checkbox enrollment, verification, membership,
  workspace invitations and paid entitlements. No self-service ADMIN, POLICYMAKER or staff grants.
- GPS is optional shared evidence. CHW/student categories and personal vision/motto belong only to
  Talent profiles; they may coexist and never grant clinical access. See `docs/ACCOUNT-ONBOARDING.md`.
- Multi-role support: `userRoles(primary, additional)` de-duplicates; `hasRole(primary, additional, required)`
  is the shared role helper. Preserve its admin behavior; granular permissions and workspace capabilities
  are separate checks and must not be bypassed by a new blanket admin shortcut.
- `homePathForRole()`: `INVESTOR → /investor`, `INNOVATOR → /innovator`, `EMPLOYER → /employer`,
  `POLICYMAKER → /policymaker`, `MEMBER → /talent`, everything else → `/dashboard`.

### 5.4 Tiers

| Enum | Rank | Label | Badge (`lib/credibility.ts`) | Colour |
|---|---|---|---|---|
| `TIER1_BASIC` | 1 | Basic | Basic Member | `#2D9B94` |
| `TIER2_PROFESSIONAL` | 2 | Professional | Verified Professional | `#F59E0B` |
| `TIER3_EXPERT` | 3 | Expert | Peer-Vouched Expert | `#8B7FD4` |

Helpers: `hasTier(userTier, minimum)`, `tierRank(tier)`, `tierLabel(tier)`.
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
Verify pilot and provider configuration in the target environment without exposing values. Do not
assume payments are live or dormant from this document. Platform billing is separate from marketplace
product transactions, which remain off-platform.

### 7.11 Practice Hub finance — `lib/hub-finance.ts`

`HUB_CURRENCY = 'KSh'`; `formatKsh()` uses the `en-KE` locale.
Payer types: `PATIENT`, `INSURER`, `EMPLOYER`, `SHA_NHIF`, `NGO_DONOR`, `OTHER`.
Payment methods: `CASH`, `MPESA`, `CARD`, `BANK_TRANSFER`, `INSURANCE`, `CHEQUE`, `OTHER`.
Payer status: `PENDING`, `PAID`, `OVERDUE`. Invoice status: `DRAFT`, `UNPAID`, `PARTIAL`, `PAID`.

---

## 8. Data Layer

- Prisma 6.7 against PostgreSQL. A single client instance is exported from `lib/db.ts` — **never instantiate
  a new client anywhere else**.
- Verify the actual database target before writes. Local isolated databases exist; historical preview
  and production shared a database. Treat unidentified or shared targets as production-sensitive.
- **Schema changes must be additive and backwards-compatible.** New columns are nullable or carry defaults.
  Destructive Prisma flags that reset or drop data require explicit human approval before use.
- Connection budget is tight: roughly 25 concurrent connections, 5 s statement timeout, 30 s
  idle-in-transaction timeout, short idle-session timeout. Reuse the shared client, keep transactions short,
  never hold a connection across an await on an external API.
- Seeding: `scripts/safe-seed.ts` (run via `yarn prisma db seed`). It **upserts only** — no deletes. If
  records need adding, edit the existing seed file rather than creating a new one.
- Avoid `mode: 'insensitive'` / `ILIKE` on indexed enum-like columns — it defeats the B-Tree index.

### 8.1 Historical model inventory (non-exhaustive)

Inspect `prisma/schema.prisma` for the current models; the original inventory below is retained for context.

`User` `Account` `Session` `VerificationToken` `PractitionerProfile` `Innovation` `Milestone` `Investment`
`DiligenceItem` `CashFlowEntry` `Endorsement` `GpsEntry` `ChallengeBrief` `ChallengeResponse` `GpsEvidence`
`GpsEndorsement` `Notification` `LedgerEntry` `Appointment` `BillingRecord` `AdverseDrugReport`
`ProductFeedback` `PatientNote` `HubPatient` `Insurer` `Invoice` `InvoicePayer` `PaymentReminder` `Debate`
`BriefPurchase` `InvestorMandate` `DebateContribution` `DebateStance` `ContributionUpvote`
`VaultAccessRequest` `MarketplaceVendor` `VendorDocument` `MarketplaceListing` `MarketplaceTransaction`
`MarketplaceReview` `MarketplaceBuyer` `VerificationRequest` `VerificationDocument`

### 8.2 Historical enum inventory (non-exhaustive)

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
- When adding a shipped image, add it to this asset mapping.

---

## 10. Components

**Reuse before you create.** The table below is the original component inventory, not current counts.
Search the current feature directories, including Practice, Talent, Account, and Profile, before adding UI.

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

- Approved palette (22 September 2026): Deep Purple `#3D2B7A` — primary brand; Teal `#2ABFB0` — accent,
  CTAs, highlights; Cream `#F5F0E8` — background/warm neutral. Admin Dashboard: background `#080F18`,
  green accent `#00C896`. These supersede prior general brand colour assignments, not semantic status
  meanings or the protected logo lockup. Documentation approval does not mean runtime adoption.

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
Provider variables include `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`; verify availability per
environment without printing values. This list is not exhaustive; inspect configuration and workers
for current feature, routing, upload, and notification variable names.

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

The legacy Python jobs live in `shared/` and use `DATABASE_URL`. Current deployment packages workers
and jobs in the same PAX image. Consult `docs/docker/README.md` and actual scheduler configuration;
do not assume the historical `/home/ubuntu/shared/` installation or that scheduling is active.
The following schedules describe the original Python jobs; also inspect TypeScript workers in `scripts/`.

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
- Reuse database-managed templates and the existing outbox, provider, retry/dead-letter, and preference
  handling. Do not send directly from a new code path that bypasses those controls.
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
6. Historical test caveats to confirm before classifying a new failure as a false positive: duplicate `mod-*.jpg` filenames;
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

*PAX Platform — confidential. © 2026 Praxis Exchange. Version 1.1, 20 September 2026.*

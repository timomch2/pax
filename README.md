# PAX Platform — Praxis Exchange

**Where Public Health Innovation Meets Impact.**
*Bridging the Gap from Idea to Impact.*

**Version:** 1.0 · **Date:** 12 August 2026 · **Status:** Pre-launch (built, deployed, not publicly announced)
**Production host:** `thepraxisexchange.abacusai.app`

Confidential. © 2026 Praxis Exchange.

---

## 1. Project Scope

PAX is a public-health innovation ecosystem. It brings five constituencies onto one evidence-first platform:

| User type | What they do on PAX |
|---|---|
| **Practitioner** | Build a verified Growth & Practice Signature, join debates, run a clinic through Practice Hub, report safety signals |
| **Innovator** | Submit innovations to a timestamped vault, track milestones, control investor access |
| **Investor** | Register a mandate, receive deterministically matched opportunities, run diligence, track a portfolio |
| **Employer** | Post roles and search credibility-ranked, verified talent |
| **Policymaker** | Access moderated expert debates, consensus briefs and non-public safety surveillance |

The organising idea is that **credibility is earned from evidence, not asserted**. A member's standing comes
from structured records of real work, endorsed by named people whose relationship to the work is declared.

### Membership tiers

| Tier | Badge | Notes |
|---|---|---|
| Tier 1 — Basic | Basic Member | Default on sign-up |
| Tier 2 — Professional | Verified Professional | Physical address, city, postal code and country become mandatory |
| Tier 3 — Expert | Peer-Vouched Expert | Peer vouching required |

---

## 2. Implemented Modules

PAX has **seven user-facing services**: Knowledge Exchange, Innovation Hub, Talent Marketplace, Medical Practitioner, Product Marketplace, Investment Platform and Pharmacovigilance. GPS and the credibility engine are shared evidence capabilities, not additional services. The implementation inventory below describes existing foundations, not production-readiness certification. Unpublished papers have a Coming soon page at `/knowledge/papers`.

### GPS — Growth & Practice Signature
Structured entries across five entry types (formal role, community initiative, research/policy, volunteer,
traditional knowledge), each with evidence attachments and endorsements. Endorsers are weighted by their
relationship to the work (supervisor and expert 1.0, community organisation 0.85, peer/beneficiary/academic
0.6), and each endorser type carries a fixed statement of what they are confirming. Eleven health areas are
supported. Entry completeness and measurable outcomes feed the credibility score.

### Credibility Engine
A transparent, weighted score out of 100: community endorsements 25%, peer endorsements 20%, measurable
outcomes 20%, GPS completeness 15%, debate participation 10%, engagement 10%. Bands are Highly Credible
(75+), Established (50+), Emerging (25+) and New Contributor. Nothing is a black box — every input is
visible to the member.

### Innovation Vault
Innovators submit innovations with problem, solution and evidence. Each submission is hashed (SHA-256) and
issued a certificate reference of the form `PAX-IP-XXXXXXXXXXXX`, giving a verifiable timestamp of what was
disclosed and when. Investors must request access; the innovator grants or refuses it. Milestones and stages
are tracked through to investment.

### Investment Desk
Investors register a mandate (sector, geography, stage, ticket size). Matching is **fully deterministic — no
AI** — weighted sector 30, geography 25, stage 25, ticket 20, with a KSh/USD conversion and a twelve-region
keyword map. Portfolio tracking, diligence checklists and cash-flow entries are implemented.

### Knowledge — Debates and Consensus Briefs
Structured expert debates with stances, contributions, upvotes and expert opinions. Contributions pass
through AI moderation that **flags only** — it never hides or removes content, and it fails open if the model
is unavailable. Debates are distilled into consensus briefs. A $0.99 brief price is coded but the paywall is
currently dormant (see §7).

### Practice Hub
Clinic operations for practitioners: patient records, appointments, notes, invoices, multi-payer allocation
(patient, insurer, employer, SHA/NHIF, NGO/donor), insurer directory, payment methods including M-Pesa,
ageing and overdue tracking. Currency is KSh, formatted for Kenya.

### Safety and Pharmacovigilance
Adverse drug reports and product feedback, weighted by reporter type (star 1, star + comment 1.5, expert
comment 3, expert with evidence 5). A daily background job scores signals by severity (mild 1, moderate 2,
severe 4, life-threatening 6) into Critical / Elevated / Watch / Low bands, with a 14-day per-drug cooldown.
**Safety data is visible only to administrators and policymakers — never publicly.**

### Marketplace
Vendor listings for health products and services across defined pillars. Vendors are verified through
document review and hold a 365-day licence, enforced lazily and automatically frozen on expiry.
**PAX is a passive intermediary**: it does not sell, hold, ship, price or take payment. There is no cart and
no checkout. Listings connect buyers to vendors; the transaction happens off-platform.

### Talent and Employer
Employer profiles, role posting, and talent search ranked by verified credibility rather than self-declared
experience.

### Platform-wide
Seven roles with multi-role support, three membership tiers, Google SSO and email/password sign-in,
verification requests with document upload, notifications, admin console (14 sub-pages covering users,
verification, moderation, safety, epidemiology, innovations, investments, marketplace, vault, analytics,
challenges, settings), public marketing pages, legal pages, dynamic robots and sitemap, Google Analytics,
and a WhatsApp contact channel.

---

## 3. Delivered Scale

| Metric | Count |
|---|---|
| TypeScript files | 366 |
| Lines of code | ~36,758 |
| Pages | 69 |
| API routes | 100 |
| React components | 149 |
| Business-logic modules (`lib/`) | 31 |
| Database models | 43 |
| Database enums | 32 |
| Scheduled background jobs | 4 |

---

## 4. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.28 (App Router), React 18.2.0 |
| Language | TypeScript 5.2.2 |
| Database | PostgreSQL via Prisma 6.7.0 |
| Authentication | NextAuth 4.24.11 with Prisma adapter (Google SSO + credentials) |
| Styling | Tailwind CSS 3.3.3, `tailwindcss-animate`, CSS custom properties |
| UI components | shadcn/ui on Radix UI primitives (~30 packages) |
| Animation | framer-motion 10.18.0 |
| Icons | lucide-react 0.446.0 |
| Notifications | sonner 1.5.0 |
| Charts | recharts 2.15.3, chart.js 4.4.9, plotly.js 2.35.3 |
| Forms | react-hook-form 7.53.0, yup 1.3.0, @hookform/resolvers (formik 2.4.5 legacy) |
| Data fetching | swr 2.2.4, @tanstack/react-query 5.0.0, jotai 2.6.0 |
| Dates | date-fns 3.6.0, dayjs |
| Security | bcryptjs 2.4.3, jsonwebtoken 9.0.2 |
| File storage | @aws-sdk/client-s3 with presigned URLs |
| Maps | maplibre-gl 4.7.1 |
| Other | qrcode, csv 6.3.11, embla-carousel, vaul, cmdk, next-themes 0.3.0 |
| Fonts | Outfit (display + body), JetBrains Mono (code, IDs, numerics) |

---

## 5. Repository Layout

```
pax_platform/
└── nextjs_space/          <- the application root
    ├── app/               # pages, layouts and API routes
    ├── components/        # 149 components (ui/, layouts/, brand/, feature folders)
    ├── lib/               # 31 business-logic modules
    ├── hooks/
    ├── prisma/            # schema.prisma
    ├── scripts/           # safe-seed.ts, seed.ts
    ├── public/            # static assets
    ├── types/
    ├── middleware.ts
    ├── AGENTS.md          # rules for agents/developers continuing the build
    ├── DESIGN.md          # styling and design standards
    └── README.md          # this file
```

---

## 6. Installation

### Prerequisites

- Node.js 22.23.2
- Yarn 4.18.0 through Corepack (this project uses **yarn exclusively** — do not use npm or npx)
- A PostgreSQL database

### Steps

```bash
cd pax_platform/nextjs_space

yarn install                 # install dependencies
yarn prisma generate         # generate the database client
yarn prisma db push          # apply the schema (additive changes only)
yarn prisma db seed          # seed reference data (upsert-only, never deletes)

yarn dev                     # start the development server on http://localhost:3000
```

Other scripts: `yarn build` (production build), `yarn start` (serve a build), `yarn lint`.

### Environment variables

Create a `.env` file in `nextjs_space/`. **Names only are listed — fill in your own values. Never commit
real values.**

```bash
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"

# Authentication
NEXTAUTH_SECRET="<random-secret>"
GOOGLE_CLIENT_ID="<google-oauth-client-id>"
GOOGLE_CLIENT_SECRET="<google-oauth-client-secret>"

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID="<ga4-measurement-id>"

# Platform services (AI moderation, notification email)
ABACUSAI_API_KEY="<platform-api-key>"
WEB_APP_ID="<platform-app-id>"
NOTIF_ID_CONTACT_FORM_SUBMISSION="<notification-id>"
NOTIF_ID_SAFETY_REPORT_ACKNOWLEDGEMENT="<notification-id>"
NOTIF_ID_DEVELOPMENT_UPDATE="<notification-id>"

# File storage
AWS_PROFILE="<profile>"
AWS_REGION="<region>"
AWS_BUCKET_NAME="<bucket>"
AWS_FOLDER_PREFIX="<prefix>/"

# Feature flags
BRIEF_PILOT_FREE="true"

# Optional — payments (currently unset, paywall dormant)
# PAYSTACK_SECRET_KEY=""
# PAYSTACK_PUBLIC_KEY=""
```

**`NEXTAUTH_URL` must not be set by hand.** The hosting platform injects the correct value for each
environment. Any file that reads it must declare `export const dynamic = 'force-dynamic'`.

---

## 7. Known Configuration State

- **Payments are dormant.** `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` are not set, so
  `isPaymentConfigured()` returns false and consensus briefs are free under the pilot flag. Supplying both
  keys activates the $0.99 paywall with no code change.
- **Dark theme is disabled.** Tokens exist but the app is hard-locked to light via `forcedTheme="light"`.
- **The database is shared between preview and production.** Every write is production data.

---

## 8. Deployment

PAX now has a single multi-purpose Docker image. The same immutable image runs the Next.js web process,
Prisma migrations, TypeScript workers and Python scheduled jobs. PostgreSQL remains a separate service and
is not baked into the application image.

For the complete copy/paste procedure, including Mac ARM64 development, GitHub Container Registry,
Ubuntu 24 deployment, backups, migrations, worker schedules, rollback and screenshots, read
[`docs/docker/README.md`](docs/docker/README.md).

### Quick local start

```bash
cp .env.docker.example .env.pax.local
mkdir -p .secrets
openssl rand -hex 32 > .secrets/postgres_password
openssl rand -base64 48 > .secrets/nextauth_secret
chmod 700 .secrets
chmod 600 .secrets/postgres_password .secrets/nextauth_secret

docker compose build app
docker compose up -d app
docker compose run --rm task yarn prisma db seed
curl --fail http://127.0.0.1:3000/api/health/live
curl --fail http://127.0.0.1:3000/api/health/ready
```

Open `http://127.0.0.1:3000`. Do not put real vendor credentials in the image or commit them to Git.

### Image publishing

`.github/workflows/container.yml` validates the quality target, builds `linux/amd64` and `linux/arm64`,
publishes to GitHub Container Registry, and emits provenance and an SBOM. Pull requests build without
publishing. Pushes to `main` and `v*` tags publish immutable `sha-*` images.

The previous Abacus deployment notes remain below for historical reference.

The application is hosted on the Abacus.AI platform and deployed from a saved checkpoint.

### Process

1. Make changes in `nextjs_space/`.
2. Run the project test tool (TypeScript compilation, production build, dev-server start-up, runtime checks).
3. Save a checkpoint once tests pass.
4. Deploy the checkpoint to `thepraxisexchange.abacusai.app`.
5. Allow up to five minutes for propagation.

### Build characteristics

- Output mode is **standalone**; the build directory is set by `NEXT_DIST_DIR`.
- `typescript.ignoreBuildErrors` is **false** — a type error fails the build.
- `eslint.ignoreDuringBuilds` is **true** — lint warnings do not fail the build.
- `images.unoptimized` is **true** — the Next image optimizer is off; size images correctly at source.
- `poweredByHeader` is off; production browser source maps are off.
- Packaging excludes `node_modules`, `.next`, lockfiles, `*.md` and `*.pdf`. The three documentation files
  therefore live with the source but add nothing to the deployment payload.

### Production environment constraints

The production runtime is deliberately minimal:

- **Only Node.js dependencies from `package.json` are available.** There is no Python, no ffmpeg, no
  Playwright, no system tooling. Media processing and PDF generation must go through the platform APIs.
- **Use relative paths.** The production directory layout differs from development; absolute paths fail.
- **Only files inside the project directory are packaged.** Anything referenced from outside must be copied
  into `public/` first.

### Background jobs

Four Python jobs run outside the application against the same database:

| Job | Schedule (UTC) |
|---|---|
| Pharmacovigilance signal alerts | Daily 06:00 |
| Invoice overdue reminders | Daily 08:00 |
| Quarterly surveillance summary | 1 Jan / Apr / Jul / Oct, 08:00 |
| Annual safety archive | 1 February |

These query the schema directly. A model or column rename must be reflected in them.

---

## 9. Database Notes

- Schema changes must be **additive and backwards-compatible**. New columns should be nullable or carry a
  default.
- Destructive Prisma operations that reset or drop data must never be run without explicit approval — the
  same database serves production.
- Seeding is upsert-only. To add reference data, edit `scripts/safe-seed.ts` rather than writing a new
  script.
- Connection budget is modest (about 25 concurrent connections, 5-second statement timeout). Reuse the
  shared Prisma client exported from `lib/db.ts`.

---

## 10. Further Documentation

| File | Contents |
|---|---|
| `AGENTS.md` | Rules, conventions, validation logic, business constants, asset mapping, component inventory — written for agents and developers continuing the build |
| `DESIGN.md` | Brand, colour tokens, typography, spacing, motion, layout primitives, component patterns, accessibility |
| `STYLE_GUIDE.md` | Original template baseline. Superseded by `DESIGN.md` where the two differ (notably fonts) |

---

*PAX Platform — confidential. © 2026 Praxis Exchange. Version 1.0, 12 August 2026.*
# pax

### Shared registration and service setup

New members use three-step registration (personal details, physical details, seven-service selection),
verify their email, sign in and choose their first service in Accounts. New Google users complete missing
account details and consent there. Service preferences do not assign roles or paid access. Validated
service intake is separate; existing profiles, staff invitations and review gates remain in place.
See [Account onboarding](docs/ACCOUNT-ONBOARDING.md) for routes, migration and verification boundaries.

### Database domains

PAX uses one PostgreSQL database with ten domain schemas and shared identity. See
[Database schemas and migration recovery](docs/DATABASE-SCHEMAS.md) for ownership, Prisma/worker
compatibility, verification, and the coordinated local migration procedure.

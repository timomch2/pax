# PAX refreshed snapshot — PDF line-by-line re-audit

**Audit date:** 19 August 2026  
**Reference:** `PAX TL;DR Comprehensive Report.pdf` (13 pages; SHA-256 ``)  
**Scope:** current local source in `/Users/mach/dev/nextjs/pax`, local PostgreSQL database `pax_dev`, all seven seeded roles, livgite local browser/API behavior, mocked credential-ready vendor paths, and current official vendor documentation.  
**Legend:** ✅ implemented and verified · ⚠️ partially implemented, code-ready but not end-to-end proven, or mixed safe/unsafe paths · ❌ absent, unsafe, contradicted, or failed

## TL;DR

**❌ Go-live verdict remains NO-GO.** The refreshed snapshot added useful privacy, consent, audit-log, account-lockout, and short-session foundations. It did **not** close the central launch blockers. Live tests still show cross-role patient access, broader-than-allowed safety access, an unauthenticated safety PDF route, a public consensus-brief leak, no granular CRUD permission system, unsafe/incomplete uploads, hardcoded non-durable notifications, incomplete payments, no M-Pesa, no migration history, no first-party test suite, and vulnerable dependencies.

The most important refreshed-snapshot comparison is:

- ✅ **New and real:** `AuditLog`, `ConsentRecord`, consent capture, privacy request routes, five-attempt credential lockout, login audit events, eight-hour JWT maximum age.
- ⚠️ **Partial:** S3 presigning mechanics, Abacus AI moderation fail-open behavior, Paystack initialization, privacy self-service, audit coverage.
- ❌ **Still blocking:** patient confidentiality, safety confidentiality, brief entitlement, granular permissions, upload trust lifecycle, database templates/outbox, webhook-first payments, M-Pesa/PayBill, Marketplace legal semantics, migrations/tests, dependency security, Talent/Employer completion, and WCAG/mobile acceptance.

## Test evidence summary

| Check                               | Current result                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| Immutable Yarn install              | ✅ Pass; Yarn 4.18.0, but peer warnings remain                                               |
| Prisma validation                   | ✅ Pass                                                                                      |
| Live DB/schema comparison           | ✅ `No difference detected`; local database confirmed as `pax_dev`                           |
| TypeScript                          | ✅ Pass                                                                                      |
| Production build                    | ✅ Pass; 73 static pages generated; lint was skipped by build config                         |
| Lint                                | ❌ Fails because ESLint 9 receives removed legacy options                                    |
| PDF-derived audit tests             | ❌ 9 passed / 38 failed / 47 total                                                           |
| First-party tests                   | ❌ 0 found                                                                                   |
| Prisma migrations                   | ❌ 0 found                                                                                   |
| Dependency audit                    | ❌ 42 advisories: 1 critical, 14 high, 22 moderate, 5 low                                    |
| Seed credentials                    | ✅ 7/7 users found; all requested password comparisons passed; hashes were not displayed     |
| Test-generated audit history        | ✅ 40 audit rows now exist; authenticated test logins added append-only login events         |
| Role browser journeys               | ✅ 7/7 authenticate and reach their currently coded landing routes                           |
| Cross-role authorization matrix     | ❌ Legacy patient and appointment APIs return 200 to all authenticated roles                 |
| Lighthouse mobile landing           | ⚠️ Performance 52, Accessibility 88, Best Practices 100, SEO 92                              |
| Lighthouse desktop landing          | ⚠️ Performance 97, Accessibility 88, Best Practices 100, SEO 92                              |
| S3 placeholder smoke test           | ⚠️ Signed HTTPS URL and sanitized key generated, but trust controls/UI contract fail         |
| Notification placeholder smoke test | ⚠️ Request constructed; user HTML was not escaped; provider contract not publicly verifiable |
| AI moderation without key           | ✅ Debate and Marketplace moderation return `OK` and fail open                               |

Current inventory: **375** TypeScript/TSX/Python source files, **105** API route files, **70** pages, **150** component TSX files, **45** Prisma models, and **33** enums. The counts in the older PDF (366/100/69/43/32) are therefore stale.

## Live role and authorization evidence

### Landing journeys

| Role         | Current landing | Status                                                                                |
| ------------ | --------------- | ------------------------------------------------------------------------------------- |
| ADMIN        | `/admin`        | ✅                                                                                    |
| PRACTITIONER | `/dashboard`    | ✅                                                                                    |
| INNOVATOR    | `/innovator`    | ✅                                                                                    |
| INVESTOR     | `/investor`     | ✅                                                                                    |
| EMPLOYER     | `/employer`     | ✅                                                                                    |
| POLICYMAKER  | `/policymaker`  | ✅                                                                                    |
| PATIENT      | `/dashboard`    | ⚠️ Route works, but it is a Practitioner-style shell rather than a patient experience |

### Direct HTTP authorization matrix

`200` is permitted by the current code, not necessarily correct authorization.

| Role         | Legacy patients | Scoped Hub patients | Appointments | Safety signals | Admin API | Privacy export | Notifications |
| ------------ | --------------: | ------------------: | -----------: | -------------: | --------: | -------------: | ------------: |
| Anonymous    |             401 |                 401 |          401 |            401 |       401 |            401 |           401 |
| ADMIN        |             200 |                 200 |          200 |            200 |       200 |            200 |           200 |
| PRACTITIONER |             200 |                 403 |          200 |        **200** |       403 |            200 |           200 |
| INNOVATOR    |         **200** |                 403 |      **200** |            403 |       403 |            200 |           200 |
| INVESTOR     |         **200** |                 403 |      **200** |            403 |       403 |            200 |           200 |
| EMPLOYER     |         **200** |                 403 |      **200** |            403 |       403 |            200 |           200 |
| POLICYMAKER  |         **200** |                 403 |      **200** |            200 |       403 |            200 |           200 |
| PATIENT      |         **200** |                 403 |      **200** |            403 |       403 |            200 |           200 |

The Innovator browser journey also loaded `/dashboard/calendar` and `/dashboard/patients`, displayed Practitioner navigation, and labelled the Innovator as “Admin.” The patient table happened to be empty, but the server authorization failure is still present and the legacy API would return identity/contact fields whenever rows exist.

## PDF page 1 — twelve launch blockers

1. ❌ **Patient information protected across roles:** still false. `/api/patients/list` returns all patient-role users to every authenticated role; `/api/appointments` is likewise broadly accessible.
2. ❌ **Safety information restricted to ADMIN/POLICYMAKER:** still false. PRACTITIONER is explicitly allowed, and the report-PDF route is public.
3. ❌ **Granular permission-based authorization:** still absent. There are no permission/grant/scope models and no centralized `authorize()` enforcement.
4. ⚠️ **Authentication security:** lockout, audit records, and an eight-hour JWT cap were added; MFA/OTP, email verification, reset, session revocation, rate limiting, and secure linking remain absent.
5. ❌ **DB-driven reliable notifications:** still absent. Templates, versions, outbox, retries, deliveries, preferences, and monitoring do not exist.
6. ❌ **Secure upload lifecycle:** still absent. Only authentication, key sanitation, S3 presigning, and signed download mechanics exist.
7. ❌ **Complete payments:** still absent. Paystack initialization is real code, verification is insufficient, and webhooks/plans/subscriptions/M-Pesa/reconciliation/refunds/entitlements are absent.
8. ❌ **Marketplace passive-intermediary compliance:** still contradicted by certification, transaction, fee, and settlement structures.
9. ❌ **Tests and migrations:** still 0 first-party tests and 0 Prisma migration files.
10. ❌ **Talent/Employer completion:** still no `Job` or `JobApplication` model or hiring lifecycle.
11. ❌ **Dependency safety:** current audit reports 42 advisories, including a critical Auth.js issue and 14 high advisories.
12. ❌ **Mobile/accessibility/design/copy acceptance:** not met; automated accessibility is 88/100, contrast/link-name failures remain, mobile performance is 52, and 1,942 hardcoded hex references remain.

## PDF pages 2–4 — critical launch blockers

### 1. Patient confidentiality

- ❌ Innovators and every other authenticated role can call `/api/patients/list` successfully.
- ❌ The legacy patient response still includes `id`, `name`, `email`, and `phone`.
- ❌ Every authenticated role can call the appointments collection endpoint successfully.
- ❌ Appointment creation checks authentication but not a practitioner permission or established patient relationship.
- ❌ Patient-note creation still lacks a strong practitioner/patient relationship policy.
- ✅ The newer `/api/hub/patients` route uses `requireHubPractitioner()` and returns 403 to non-practitioner roles.
- ⚠️ The newer safe Hub route coexists with unsafe legacy routes, so the module remains unsafe overall.
- ❌ No cross-role first-party regression tests protect these boundaries.
- ❌ Required containment—deny-by-default clinical permissions and relationship-scoped queries—has not been completed.

### 2. Safety and pharmacovigilance confidentiality

- ❌ `/api/safety/signals` still explicitly allows `PRACTITIONER`.
- ❌ The live Practitioner request returned 200.
- ❌ `/api/safety/report-pdf` has no session or role check; a syntactically valid anonymous request reached storage handling and returned 404 rather than 401/403.
- ❌ Route severity weights remain `1/3/8/15`, not the declared `1/2/4/6` source of truth.
- ❌ Route aggregation and the declared scheduled algorithm are not centralized into one implementation.
- ❌ No complete endpoint/page/counter/export/scheduler confidentiality proof exists.
- ❌ Required ADMIN/POLICYMAKER-only enforcement is not complete.

### 3. Consensus-brief entitlement

- ❌ The public debate detail DTO still includes the full `consensusBrief` field.
- ❌ A caller can therefore bypass the dedicated access/purchase route.
- ❌ Protected content is not isolated behind a server-side entitlement service.
- ⚠️ A `BriefPurchase` record and dedicated access routes exist, but they cannot secure content also returned publicly.

### 4. Marketplace legal/product constraints

- ❌ `MarketplaceListing.isPaxCertified` still exists.
- ❌ `paxCertifiedReason` still contains “PAX-approved” semantics.
- ❌ `MarketplaceTransaction` still exists.
- ❌ Transaction amount, 5% fee, fee amount, vendor net, and settlement status remain.
- ❌ Marketplace UI/source still contains certification and fee concepts.
- ❌ The legal isolation/deprecation layer required by the additive-schema rule has not been implemented.
- ⚠️ AI listing moderation is correctly flag-only and fails open, but that does not cure the transaction/certification model.
- ❌ Published-listing/vendor-state enforcement is not proven across every ID-based route.

## PDF pages 4–6 — authentication and granular permissions

### Current-state findings

- ❌ One primary `UserRole` remains the main authorization axis.
- ⚠️ `additionalRoles` exists, but API behavior remains inconsistent.
- ❌ Direct role comparisons remain common.
- ❌ `ADMIN` is still an unconditional `hasRole()` bypass.
- ❌ `Permission`, `RolePermission`, `UserPermission`, and scoped role-assignment models do not exist.
- ❌ No `OWN` / `ORGANIZATION` / `ALL` resource scope exists.
- ⚠️ `AuditLog` now exists and records selected events, but authorization decisions are not centrally recorded.
- ❌ Zero API routes use `hasRole()`; zero use `authorize()` or `requirePermission()`.
- ❌ Additional-role semantics therefore remain route-dependent.

### Authentication details

- ❌ Credentials email is looked up exactly as submitted; `trim().toLowerCase()` normalization is absent.
- ❌ Signup also stores/looks up unnormalized email.
- ❌ JWT role/additional-role claims can remain stale until token expiry; there is no permission/session version.
- ❌ Public registration still self-selects Investor and Policymaker.
- ❌ Signup has no meaningful server-side password-strength rule.
- ❌ No email-verification request/consume workflow exists.
- ❌ No forgot-password or reset-password workflow exists.
- ❌ MFA database fields exist, but no setup/challenge/disable flow exists.
- ❌ Recovery-code fields exist, but generation/use/rotation flows do not.
- ✅ Credential login has five-attempt / 15-minute account lockout code and matching DB fields.
- ❌ The redundant `/api/auth/login` endpoint bypasses that lockout logic and remains an extra brute-force surface.
- ❌ No account suspension/status lifecycle exists.
- ❌ No session revocation or “log out all devices” exists.
- ✅ Successful and failed NextAuth credential logins are written to `AuditLog`.
- ⚠️ Security-event history exists only as raw audit rows; there is no user/admin security-event experience or alerting.
- ❌ No rate limiting was found anywhere in first-party source.
- ❌ No CAPTCHA/bot protection exists.
- ❌ Signup reveals “Email already registered,” enabling account enumeration.
- ❌ Google provider still enables `allowDangerousEmailAccountLinking: true`.
- ⚠️ Google OAuth provider wiring is structurally conventional and should authenticate when correct credentials/callback configuration are supplied, but dangerous automatic linking and the absence of verified-email/linking policy prevent a security green tick.
- ✅ JWT/session maximum age is explicitly eight hours with a 15-minute update age.
- ❌ No step-up authentication exists for sensitive actions.

### Recommended permission model, item by item

- ❌ `AccessRole` model: absent.
- ❌ `Permission` model: absent.
- ❌ `RolePermission` model: absent.
- ❌ `UserRoleAssignment` model: absent.
- ❌ `UserPermission` model: absent.
- ⚠️ `AuditEvent`: a general `AuditLog` analogue now exists, but it is not an authorization-decision ledger.
- ❌ `permissionVersion` or session version: absent.
- ❌ Explicit CRUD permission keys such as `hub.patient.create/read/update/delete`: absent.
- ❌ `hub.note.create`: absent.
- ❌ `safety.signal.read`: absent.
- ❌ `marketplace.vendor.approve`: absent.
- ❌ `notification.template.update`: absent.
- ❌ `payment.refund`: absent.
- ❌ `OWN`, `ORGANIZATION`, and `ALL` scope model: absent.
- ❌ Central deny-by-default `authorize(session, permission, resource)` service: absent.
- ❌ Capability endpoint for frontend navigation/control visibility: absent.
- ❌ Auditable Superadmin permission grant/break-glass behavior: absent; ADMIN still bypasses role checks.

## PDF pages 6–7 — notifications

### Current implementation and gaps

- ❌ Notification titles/messages are still hardcoded in application and scheduler logic.
- ✅ The simple in-app `Notification` record exists.
- ⚠️ Direct Abacus notification API calls exist and the contact payload path completed under a mocked provider response.
- ❌ Email subject/body HTML remains hardcoded in routes.
- ❌ User-controlled contact-form values are interpolated into HTML without escaping; the smoke test confirmed raw script/event-handler text reaches the outbound body.
- ❌ The four documented external Python scheduled-job files are not present in this refreshed repository.
- ❌ `NotificationTemplate`: absent.
- ❌ Template versioning: absent.
- ❌ Localization: absent.
- ❌ Durable outbox: absent.
- ❌ Delivery queue: absent.
- ❌ Retry schedule: absent.
- ❌ Dead-letter state: absent.
- ❌ Per-channel delivery status: absent.
- ❌ Provider message ID: absent.
- ❌ Delivery idempotency: absent.
- ❌ User notification preferences: absent.
- ❌ Admin preview/test send: absent.
- ❌ Worker monitoring: absent.
- ❌ The notification bell still invokes `markAllRead()` when opened.
- ✅ Local notification row count is still zero; this observation was re-verified.
- ⚠️ Abacus’s `sendNotificationEmail` and HTML-to-PDF endpoints are platform-specific and lack a public official contract that could be independently checked. The request shape can be mocked, but credentials alone do not prove provider compatibility, retry semantics, or delivery.

### Recommended notification design

- ❌ `NotificationTemplate`: not implemented.
- ❌ `NotificationEvent`: not implemented.
- ❌ `NotificationDelivery`: not implemented.
- ❌ `NotificationPreference`: not implemented.
- ❌ Atomic business transaction + notification event: not implemented.
- ❌ Worker claiming pending events: not implemented.
- ❌ Allow-listed template-variable renderer: not implemented.
- ❌ Provider adapter abstraction: not implemented.
- ❌ Success/retry/dead-letter state: not implemented.
- ❌ Template slug/channel/locale/version: not implemented.
- ❌ Template subject/body/action label/action URL: not implemented.
- ❌ Required-variable schema: not implemented.
- ❌ Enable/disable state: not implemented.
- ❌ Preview/test/rollback: not implemented.
- ❌ Sensitive-data suppression policy for email/SMS: not centrally enforced.
- ❌ Non-disableable safety/security alerts: not modeled.
- ❌ Marketing preferences/unsubscribe: not implemented.

## PDF pages 7–8 — file uploads

- ✅ Direct-to-S3 presigned PUT architecture exists.
- ✅ Filename characters are sanitized.
- ✅ Generated keys use a timestamp and sanitized filename.
- ✅ Signed upload/download URLs use a one-hour expiration.
- ✅ Signed downloads set content disposition and restrict inline display to image/PDF/text.
- ✅ A placeholder-credential smoke test generated a signed HTTPS upload URL without contacting AWS.
- ❌ Upload size limits: absent.
- ❌ Purpose-specific MIME allowlists: absent.
- ❌ Purpose-specific extension allowlists: absent.
- ❌ UUID/unpredictable asset identifiers: absent; timestamp + filename is used.
- ❌ Object ownership record: absent.
- ❌ Checksums: absent.
- ❌ Upload-completion/HEAD verification: absent.
- ❌ Quarantine state: absent.
- ❌ Malware scanning: absent.
- ❌ Secure retention/expiry policy: absent.
- ❌ Upload/download access audit history: absent.
- ❌ Document-review authorization flow: incomplete.
- ❌ Submitted storage paths are not verified as belonging to the current user.
- ❌ `UploadAsset` model: absent.
- ❌ Asset-purpose/status/expected type/size/checksum/scan fields: absent.
- ❌ Application records accept browser-supplied storage paths instead of server-owned asset IDs.
- ❌ Verification upload UI still reads `{ url, cloudStoragePath }` while the API returns `{ uploadUrl, cloudStoragePath }`.
- ❌ The verification UI then calls `fetch(url)`, so the documented upload path remains broken.
- ❌ Admin approval still lacks a complete secured review/download workflow.
- ⚠️ AWS SDK v3 usage (`S3Client`, `PutObjectCommand`, `getSignedUrl`) matches AWS’s documented presigning mechanism, but feature security remains incomplete.

## PDF pages 8–9 — payments, plans, subscriptions, M-Pesa

### Billing architecture

- ❌ `Plan`: absent.
- ❌ `PlanPrice`: absent.
- ❌ `Subscription`: absent.
- ❌ Entitlement ledger/model: absent.
- ⚠️ `BriefPurchase` is a narrow purchase record, not a general durable payment-intent architecture.
- ❌ General `PaymentIntent`: absent.
- ❌ General `PaymentTransaction`: absent.
- ❌ `WebhookEvent`: absent.
- ❌ Refund model: absent.
- ❌ Receipt model: absent.
- ❌ Reconciliation model: absent.
- ❌ Provider-customer model: absent.
- ❌ Subscription renewal/cancellation lifecycle: absent.
- ❌ M-Pesa/Daraja API routes: absent.
- ❌ PayBill callback/reconciliation: absent.

### Paystack code contract

- ✅ Initialization is server-side.
- ✅ Initialization uses the official `transaction/initialize` endpoint.
- ✅ Authorization uses the secret key in a Bearer header.
- ✅ Amount is sent in minor units.
- ✅ Currency, callback URL, and metadata are sent.
- ✅ A pending `BriefPurchase` is upserted before initialization and stores the provider reference.
- ⚠️ Correct operation still depends on the platform-injected base URL and Paystack configuration.
- ❌ Verification only requires provider `status` + transaction `status === success`.
- ❌ Verification does not compare returned amount with expected amount.
- ❌ Verification does not compare returned currency.
- ❌ Verification does not compare returned customer/email.
- ❌ Verification does not compare returned metadata/purchase/user/debate identifiers.
- ⚠️ It does look up the stored provider reference scoped to user and debate, which is useful but insufficient.
- ❌ No Paystack webhook endpoint exists.
- ❌ No `x-paystack-signature` HMAC-SHA512 verification exists.
- ❌ No webhook replay/idempotency store exists.
- ❌ Browser return/callback remains the practical entitlement trigger, contrary to webhook-first reliability.
- ❌ No refund, reversal, chargeback, or reconciliation processing exists.

Paystack’s official documentation confirms the initialize/verify endpoints, minor-unit amount, server secret, and that signed webhooks should be verified before processing. The current initialization path matches those basics; the fulfillment path does not meet the documented reliability/security expectations.

### M-Pesa and payment boundaries

- ❌ No Safaricom Daraja authorization, STK Push, C2B, callback, query, or reconciliation code exists.
- ❌ Merely displaying `MPESA` as a Hub payment method is not an integration.
- ❌ No decision record selects Paystack mobile money versus direct Daraja/PayBill.
- ❌ No asynchronous callback idempotency/reconciliation exists for either provider.
- ❌ Payment replay/provider-outage tests do not exist.
- ❌ Marketplace vendor-buyer payment code still exists and should be isolated; Marketplace payment must remain off-platform.
- ⚠️ PAX-owned consensus-brief payment is conceptually permitted, but its implementation is not production-ready.

## PDF pages 9–10 — database, scalability, privacy, and operations

### Positive foundations

- ✅ Prisma schema validates.
- ✅ Live `pax_dev` and `schema.prisma` have no detected schema difference.
- ✅ A shared Prisma client is used.
- ⚠️ Many leading foreign-key columns are indexed, but no query-plan/load validation was supplied.
- ✅ Production build succeeds.
- ✅ Local rollback artifacts exist from the restoration: source archive and full PostgreSQL dump.
- ✅ Database now has 45 public tables and retains existing data.
- ✅ `AuditLog` and `ConsentRecord` tables exist.

### Schema and scalability gaps

- ❌ Prisma migration history/baseline: absent.
- ❌ Migration rollback rehearsal: absent.
- ❌ `paxId` is nullable/indexed but not unique.
- ❌ Financial amounts still use `Float`, including Marketplace money.
- ❌ Roles are partly stored as a string array.
- ❌ Many status/structured values remain loose strings or text/JSON strings.
- ✅ General audit model is now present; this specific previous finding is fixed.
- ❌ Notification template/delivery models remain absent.
- ❌ Upload asset/security models remain absent.
- ❌ General billing models remain absent.
- ⚠️ Login/security events use `AuditLog`, but there is no dedicated session/security-event lifecycle.
- ❌ Cascade deletion of clinical/financial records has not been retention-reviewed.
- ❌ Invoice numbering still relies on a count-based approach and is concurrency-unsafe.
- ❌ Several APIs remain unbounded.
- ❌ Talent search still loads and filters in application memory.
- ❌ Safety signals load up to 5,000 reports and 5,000 feedback rows then aggregate in application memory.
- ❌ Background-job observability: absent.
- ❌ Health/readiness endpoints: absent.
- ⚠️ A backup exists, but no successful restore rehearsal/RPO/RTO evidence exists.
- ❌ Disaster-recovery procedure: absent.
- ❌ The four external scheduled Python scripts are not versioned in this repository.
- ❌ Cursor pagination is not consistently implemented.
- ❌ Query-plan-driven index validation is not evidenced.
- ❌ Database-side safety aggregation is not implemented.
- ❌ Transactional outbox is absent.
- ❌ PgBouncer/equivalent pooling is not evidenced.
- ❌ Structured operational metrics/logging/error tracking/job health checks are not complete.

### Refreshed privacy features

- ✅ Signup requires privacy consent and stores policy/terms versions.
- ✅ Signup attempts to append privacy and account-term consent rows.
- ✅ Consent history/withdrawal route exists.
- ✅ Self-service data export route exists and excludes password, MFA secret, and recovery codes.
- ⚠️ Export includes practitioner-controlled patient/invoice data; legal controller/processor boundaries and recipient safety need review.
- ✅ Rectification route restricts updates to an allowlist.
- ✅ Objection route records an audit event and withdraws marketing consent when applicable.
- ⚠️ Erasure route records a request and withdraws consent but does not create an assignable case/workflow, deadline state, DPO queue, or actual erasure/de-identification job.
- ⚠️ Consent writes after signup user creation are not in the same database transaction; failures are logged but signup still succeeds.
- ❌ No privacy-impact assessment, retention map, DPO case workflow, or breach/incident procedure is present.
- ⚠️ Local DB has zero consent records because the seeded accounts predate/exclude signup consent; the feature has not been exercised with durable test fixtures.

## PDF page 10 — functional completeness

| Module           | Current line-by-line verdict                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GPS              | ⚠️ Substantial CRUD/scoring foundation; evidence downloads remain available to any authenticated member and ownership/privacy policy is insufficient.      |
| Innovation Vault | ⚠️ CRUD, matching, access requests, and timestamp certificates exist; NDA versioning, legal acceptance evidence, and file authorization remain incomplete. |
| Investment Desk  | ⚠️ Mandate/matching/portfolio concepts exist; KYC/AML, regulated transaction handling, and production diligence controls are absent.                       |
| Knowledge        | ❌ Debate/brief foundation exists, but the full brief leaks publicly and payment entitlement is incomplete.                                                |
| Practice Hub     | ❌ Patient, appointment, invoice, payer, and reminder concepts exist, but legacy clinical confidentiality failures make launch unsafe.                     |
| Safety           | ❌ Reporting and signal concepts exist, but confidentiality, score consistency, abuse protection, and scheduled reliability remain launch blockers.        |
| Marketplace      | ❌ Listings/vendor concepts exist, but certification/transaction/fee/settlement semantics contradict passive-intermediary rules.                           |
| Talent/Employer  | ❌ No `Job` or `JobApplication`; “Post & Manage Roles” is backed by Challenge Brief behavior, not a complete hiring workflow.                              |
| Admin            | ⚠️ Useful dashboards exist; granular permissions, complete access audits, template management, upload review, and payment reconciliation are absent.       |

Talent line items:

- ❌ Vacancy/job model: absent.
- ❌ Candidate/application model: absent.
- ❌ Application status workflow: absent.
- ❌ Employer/job ownership permissions: absent.
- ❌ Hiring notifications: absent.
- ❌ “Post roles” product copy is therefore not supported by a complete implementation.

## PDF page 11 — UI/UX and accessibility

- ✅ Desktop admin interface is visually coherent in the live browser.
- ⚠️ Mobile hero crop/scale concern is not closed; no responsive acceptance artifacts exist and mobile Lighthouse performance is 52.
- ❌ Mobile first-screen acceptance is not proven.
- ❌ PATIENT still receives `/dashboard`, the Practitioner-style experience.
- ❌ An Innovator can directly load Practitioner Calendar/Patients pages and sees Practitioner navigation.
- ❌ The Innovator patient page displayed the incorrect “Admin” role label.
- ❌ Lighthouse found links without discernible names.
- ❌ Lighthouse found insufficient color contrast.
- ❌ Lighthouse found links distinguishable only by color.
- ⚠️ Loading/empty/error states exist in places but remain inconsistent and untested across modules.
- ❌ Hardcoded colors increased from the PDF’s approximate 1,928 to **1,942** matches.
- ❌ Product copy still overstates phone/LinkedIn verification, reminders, messaging, availability, and Employer hiring functionality.
- ❌ Admin verification still permits approval without a complete secure document review flow.
- ❌ WCAG 2.2 AA acceptance has not passed.
- ❌ Manual keyboard and screen-reader acceptance has not been completed.
- ❌ Navigation is not generated from granular capabilities.
- ⚠️ The application remains correctly locked to light theme.
- ✅ The required hero phrase/tagline and overall brand are present in live surfaces.

## PDF pages 11–13 — course of action status

### Phase 0 — immediate containment

- ❌ Close patient authorization holes: pending.
- ❌ Close safety authorization holes: pending.
- ❌ Protect all safety exports: pending.
- ❌ Remove consensus-brief leak: pending.
- ❌ Stop certification/5% fee/settlement concepts: pending.
- ⚠️ Disable unconfigured controls: Paystack fails clearly when disabled; Google/upload controls are still shown and the upload contract is broken.
- ⚠️ Generic credential error exists in the main login UI, but account enumeration and redundant login surface remain.
- ❌ Basic rate limiting: pending.
- ❌ Baseline CSP/HSTS/security headers: pending; `next.config.js` defines none.
- ❌ Dependency patches: pending.
- ⚠️ Production onboarding freeze is a governance action, not enforced by code; the NO-GO recommendation remains.

### Phase 1 — security foundation

- ❌ Establish migration history: pending.
- ❌ Permission and resource-scope models: pending.
- ❌ Map all 105 current API routes to permissions: pending.
- ⚠️ Audit events: partial; selected privacy/login/Hub events exist, not all access decisions.
- ❌ Server-side request schemas: 63 body-reading API files found; 0 use Zod/Yup/safe-parse validation.
- ❌ Email verification: pending.
- ❌ Password reset: pending.
- ❌ MFA/OTP: pending.
- ❌ Session revocation: pending.
- ❌ Authorization/ownership/cross-role first-party tests: pending.
- ❌ CI gates for lint/typecheck/tests/build/migrations: not evidenced; lint/tests/migrations currently fail acceptance.

### Phase 2 — reliable infrastructure

- ❌ DB templates/outbox: pending.
- ❌ Worker retry/dead-letter/delivery monitoring: pending.
- ❌ Secure upload-asset/scanning lifecycle: pending.
- ❌ Scheduled tasks in repository/monitored deployment: pending.
- ❌ Logs/metrics/traces/health checks/alerting: pending.
- ⚠️ Backup exists, but a documented restore drill is pending.

### Phase 3 — product completion

- ❌ Talent/Employer jobs workflow: pending.
- ❌ Marketplace semantics correction: pending.
- ❌ Safety access and calculation correction: pending.
- ⚠️ Consent self-service exists, but clinical relationship/consent controls are pending.
- ❌ Vault NDA versioning/legal acceptance/file access completion: pending.
- ❌ Protected-content response contracts: pending.

### Phase 4 — billing

- ❌ Commercial plans/currencies/trials/entitlements decision and schema: pending.
- ❌ Webhook-first Paystack processing: pending.
- ❌ Paystack mobile money versus Daraja/PayBill decision: pending.
- ❌ M-Pesa/PayBill implementation: pending.
- ❌ Reconciliation/receipts/refunds/failed-payment recovery: pending.
- ❌ Idempotency/replay/provider-outage tests: pending.

### Phase 5 — release readiness

- ❌ Responsive redesign/accessibility remediation: pending.
- ❌ Product claims/legal terms audit: pending.
- ❌ Privacy-impact assessment/retention mapping: pending.
- ❌ Independent penetration test: no evidence.
- ❌ Load tests/failure drills: no evidence.
- ❌ Role-by-role staging UAT: local role smoke tests exist, but staging UAT is pending.
- ❌ Limited beta: pending and should not begin before containment gates pass.

## Required launch gates — final checklist

- ❌ Every API route has explicit permission and ownership policy.
- ❌ All P0/P1 findings resolved.
- ❌ Cross-role tests demonstrate zero unauthorized disclosure; current tests demonstrate the opposite.
- ❌ Lint, typecheck, first-party tests, and build all pass together; only typecheck/build pass.
- ❌ Migrations and rollback rehearsed.
- ⚠️ A real backup exists; successful restore rehearsal is not evidenced.
- ❌ Notification retries and delivery monitoring work.
- ❌ Malicious/unauthorized upload tests pass.
- ❌ Payment webhook/idempotency/reconciliation tests pass.
- ❌ No applicable critical/high dependency vulnerability remains; current audit has 1 critical and 14 high advisories.
- ❌ Mobile and WCAG AA acceptance passes; current accessibility score is 88 and named violations remain.
- ❌ Privacy, incident-response, and breach procedures are approved/evidenced.
- ✅ Seven role accounts remain seeded and all seven credentials authenticate.
- ✅ No destructive schema change, user creation, or business-entity mutation was made; live logins intentionally appended audit events.

## External-vendor readiness verdict

| Vendor/integration              | Verdict assuming credentials are supplied                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS S3                          | ⚠️ SDK/presigning mechanism is correct and smoke-tested, but the product flow is unsafe/incomplete and verification UI uses the wrong response key. Credentials will not fix those defects.     |
| Paystack                        | ⚠️ Initialization contract is substantially correct; verification, webhooks, signatures, idempotency, and reconciliation are incomplete. Credentials will not make fulfillment production-safe. |
| Safaricom Daraja/M-Pesa/PayBill | ❌ No implementation exists. Credentials alone cannot enable it.                                                                                                                                |
| Google OAuth                    | ⚠️ Provider wiring is present, but dangerous automatic email linking and missing account-linking/verification policy remain. Credentials may make login function, not make it secure.           |
| Abacus notification API         | ⚠️ Payload construction is present and mock-tested; the endpoint contract is not publicly verifiable, templates are hardcoded, HTML is unescaped, and there is no durability.                   |
| Abacus AI moderation            | ✅ With no key it fails open as required; request structure is present. Live model/endpoint compatibility still requires a configured sandbox test.                                             |
| Abacus HTML-to-PDF              | ⚠️ Create/status calls exist, but the private contract and end-to-end storage/download behavior cannot be independently proven from public documentation.                                       |
| WhatsApp                        | ✅ Uses link-based contact behavior rather than claiming a server-side messaging integration.                                                                                                   |
| Google Analytics                | ⚠️ Script integration exists, but production event/consent behavior was not proven in this local credential-free audit.                                                                         |

Official contract references used for the vendor assessment:

- [Paystack Transactions API](https://paystack.com/docs/api/transaction/)
- [Paystack payment verification](https://paystack.com/docs/payments/verify-payments/)
- [Paystack webhook signature guidance](https://paystack.com/docs/payments/webhooks/)
- [AWS SDK v3 S3 presigned URL examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html)
- [AWS S3 presigned URL security/behavior](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [Safaricom Daraja API catalogue](https://developer.safaricom.co.ke/apis)
- [NextAuth.js official site](https://next-auth.js.org/)

## Prioritized corrective action

1. **P0 containment:** close legacy patient/appointment/note access, restrict all safety routes/files, remove brief content from public DTOs, isolate Marketplace certification/transaction/fee behavior, patch critical/high dependencies, and add baseline security headers/rate limits.
2. **P1 authorization/authentication:** implement central permission + resource scopes; normalize identities; add verification/reset/MFA/session revocation; remove redundant login; enforce request schemas; create cross-role tests for every sensitive route.
3. **P1 data/infrastructure:** establish additive migrations; introduce notification outbox/templates/deliveries/preferences; add UploadAsset ownership/completion/scanning; version and monitor scheduled jobs; rehearse backup restore.
4. **P1/P2 payments:** finish Paystack webhook/signature/verification/idempotency/reconciliation first; then add plans/subscriptions/entitlements; implement Daraja only after the commercial channel decision.
5. **P2 product/UX:** complete Jobs/Applications, correct Marketplace and feature claims, build patient-specific UX, run authenticated mobile/responsive and WCAG AA acceptance, then stage UAT, load tests, penetration test, and limited beta.

Until steps 1–3 and all launch gates are green, public production should remain frozen.

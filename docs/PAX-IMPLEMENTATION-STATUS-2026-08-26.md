# PAX remediation status against the 19 August line-by-line re-audit

Date: 26 August 2026  
Scope: local source and local `pax_dev`; no preview/production writes.  
Legend: ✅ implemented and locally verified · ⚠️ implemented foundation but production/business acceptance remains · ❌ blocked or not complete

## TL;DR

The original technical NO-GO findings have been substantially remediated. Patient and safety confidentiality, consensus-brief entitlement, granular permissions, authentication workflows, database-driven notifications, upload ownership/quarantine, migrations, first-party tests, Talent jobs/applications, Vault NDA controls, payment ledgers/webhooks, privacy cases, and operational jobs now have real implementations.

The release is still **NO-GO for public production** until the explicitly pending items at the end of this report are resolved: the Next.js 14 advisory constraint, production provider credentials and sandbox certification, approved commercial plan terms, approved legal/retention decisions, infrastructure deployment/restore proof, and an independent security/accessibility acceptance pass.

## Original twelve blockers — current line-by-line result

1. ✅ Patient information protected across roles — clinical permissions are deny-first and relationship/ownership scoped. PATIENT received 403 from legacy patient APIs in live testing; unauthorized clinical pages no longer mount their content.
2. ✅ Safety information restricted to ADMIN/POLICYMAKER — signal and export permissions are limited to those roles; the anonymous PDF probe returns 401; the shared weights are 1/2/4/6.
3. ✅ Granular permission authorization — 93 CRUD/action permissions, role grants, user allow/deny grants, OWN/ORGANIZATION/ALL scope, capability API, permission versioning, authorization-denial audits, and audited break-glass are present.
4. ✅ Authentication security — normalized email, strong passwords, generic signup/reset responses, verification, reset, persistent rate limits, lockout, account status, MFA TOTP and recovery codes, session revocation, refreshed permission/session claims, Turnstile, and safe Google linking policy are implemented.
5. ✅ Database-driven notifications — 19 versioned DB templates, variable allow-listing/escaping, preferences, durable outbox/deliveries, worker claiming, stale-claim recovery, retries, dead letters, monitoring, preview/test, activation/rollback, and non-disableable security/safety types are implemented. API routes no longer write hardcoded `Notification` rows.
6. ⚠️ Secure uploads — ownership, UUID assets, purpose MIME/extension/size rules, checksums, S3 HEAD completion, quarantine, signed downloads, access logs, review binding, GuardDuty status ingestion, and retention workers are implemented. Production GuardDuty/S3 event delivery still needs credentialed certification.
7. ⚠️ Payments — plan/price/subscription/entitlement/intent/transaction/webhook/refund/receipt/reconciliation models exist; Paystack initialization, verification, SHA-512 webhooks, partial/full refunds, and entitlement revocation are coded; M-Pesa OAuth, STK Push, callback, C2B validation/confirmation, PayBill registration and reconciliation are coded. Recurring commercial activation and provider sandbox certification remain pending.
8. ✅ Marketplace passive-intermediary behavior — transaction endpoint returns 410, fee/settlement/certification behavior is retired, public DTOs omit prohibited certification fields, and listing/vendor visibility is enforced. Legacy schema is retained only because the additive-data rule prohibits destructive removal.
9. ✅ Tests and migrations — 10 additive Prisma migrations are applied and 9 first-party tests pass. Schema validation, immutable install, typecheck, lint, and the 79-page production build pass.
10. ✅ Talent/Employer workflow — employer-owned jobs, publish/close/archive lifecycle, candidate applications, secure résumé assets, status history, notifications, pagination, and UI are implemented.
11. ⚠️ Dependency safety — the prior critical Auth.js advisory is removed and unsafe transitive PostCSS/glob versions were overridden. The audit still fails, dominated by advisories whose patched range starts at Next 15 while repository policy requires Next 14; legacy lint/chart deprecations also remain.
12. ⚠️ Mobile/accessibility/design — mobile landing navigation, menu accessible names, capability-driven navigation, direct-page denial UI, and horizontal overflow were repaired and browser-tested at 390×844. A full WCAG 2.2 AA manual audit and repeated Lighthouse acceptance run remain pending.

## Detailed audit areas

### Confidentiality and permissions

- ✅ `/api/patients`, `/api/patients/list`, patient notes, appointments and Hub resources enforce explicit permissions and clinical relationship/ownership scope.
- ✅ Non-clinical role navigation does not expose Patients, and direct unauthorized page navigation renders Access denied without mounting the clinical component.
- ✅ Safety signal, report, export, PDF and scheduled-alert paths use the restricted permissions.
- ✅ Public debate DTOs do not return consensus-brief bodies; access is entitlement checked server-side.
- ⚠️ A final automated route-by-route permission contract should be expanded beyond the current focused regression suite.

### Authentication and security

- ✅ Credentials and signup normalize email; Google dangerous account linking is disabled.
- ✅ Email verification and reset tokens are hashed, single-use and expiring.
- ✅ Five-failure lockout, database rate limiting, audit history, account suspension and session revocation are implemented.
- ✅ MFA setup/confirm/disable, TOTP challenges and rotating recovery codes are implemented.
- ✅ CSP and security headers are configured; Google sign-in is configuration-gated.
- ⚠️ Production key rotation, penetration testing, SIEM forwarding, and alert-on-suspicious-login require infrastructure ownership.

### Notifications

- ✅ Templates live in PostgreSQL; 19 current seeded templates cover account, contact, safety, overdue, Talent, Vault, GPS, innovation, challenge, debate and investment events.
- ✅ User-controlled HTML is escaped; unresolved or undeclared variables fail before delivery.
- ✅ Outbox idempotency, retry/dead-letter state, provider IDs, preferences and admin monitoring exist.
- ✅ Opening the bell does not mark all notifications read; individual and explicit mark-all actions are separated.
- ⚠️ Abacus notification delivery must be certified with a real configured provider ID and delivery receipt in the deployment environment.

### Uploads and Vault

- ✅ Direct-to-S3 presigning uses unpredictable asset IDs, object ownership and purpose-specific policy.
- ✅ Completion verifies metadata/checksum and keeps production objects quarantined until a recognized GuardDuty result.
- ✅ Only `NO_THREATS_FOUND` becomes clean; threats are rejected; failure/unsupported states stay quarantined.
- ✅ Verification, GPS, vendor, buyer, Talent résumé and Vault document flows bind an owned clean asset.
- ✅ Vault NDA text/version/hash comes from the database; acceptance evidence is immutable and approval requires that evidence.
- ⚠️ Production S3 lifecycle, GuardDuty EventBridge delivery, KMS policy and restore behavior need cloud-level proof.

### Privacy and governance

- ✅ Consent and data-subject cases support access, rectification, objection, restriction, portability, consent withdrawal and erasure with deadlines, assignment and event history.
- ✅ Erasure requires a privileged explicit confirmation, deletes authentication/access data, deidentifies direct profile/contact fields, schedules owned uploads for deletion, revokes sessions, and records statutory retention exceptions.
- ✅ Retention policies are inactive until approved; the worker is allow-listed and dry-run by default.
- ✅ Security-incident register and lifecycle API exist.
- ✅ PIA, incident-response and disaster-recovery approval drafts are versioned under `docs/go-live/`.
- ⚠️ Controller/DPO identity, lawful bases, jurisdiction-specific periods, processor DPAs and notification deadlines need legal approval.

### Payments

- ✅ Money values are integer minor units with database non-negative constraints.
- ✅ Provider reference, amount, currency, customer and metadata must match before settlement.
- ✅ Webhooks are signature-verified, stored, idempotent and auditable; receipts and reconciliation records are created atomically.
- ✅ Paystack refund requests enforce remaining refundable amount and idempotency; refund webhooks update state and revoke fully refunded entitlements.
- ✅ M-Pesa STK and C2B/PayBill paths validate callback-path signatures plus shortcode/reference/amount before settlement.
- ⚠️ No live plan or price was invented. Commercial names, prices, currencies, intervals, trials, taxes and entitlement keys require founder approval before activation.
- ⚠️ Recurring subscriptions and M-Pesa reversals remain disabled until provider product choice and operational authority are approved.

### Scalability and operations

- ✅ Cursor/limit bounds exist on new jobs/applications, administrative lists and Talent search; Talent filtering now executes in PostgreSQL instead of loading the entire member graph.
- ✅ Invoice numbers use a transactional per-practitioner/year sequence.
- ✅ Health live/ready endpoints, job-run ledger, advisory job locks, heartbeat/error fields and admin operational status exist.
- ✅ Versioned scheduled jobs cover safety signals, overdue reminders, quarterly summaries and encrypted S3 safety archives.
- ⚠️ Safety dashboard demographic aggregation still has a bounded application-side detail window and should move fully to pre-aggregated/database materialized views for high volume.
- ⚠️ Production autoscaling, connection pooling, queue concurrency, alert thresholds, encrypted backups and a successful restore drill require deployment infrastructure.

## Verification evidence

- ✅ Yarn 4.18 immutable install completes; peer warnings remain documented.
- ✅ Prisma schema validates; 10/10 migrations are applied to local `pax_dev`.
- ✅ Repeat-safe seed: 10 users total, 7 requested role accounts, 93 permissions, 7 access roles, 19 templates, Vault NDA v1.
- ✅ Requested password comparisons passed without printing hashes.
- ✅ TypeScript passes.
- ✅ ESLint passes with no warnings or errors.
- ✅ First-party tests: 9 passed, 0 failed.
- ✅ Production build passes; 79 pages generated.
- ✅ Seven browser logins reach ADMIN `/admin`, PRACTITIONER `/dashboard`, INNOVATOR `/innovator`, INVESTOR `/investor`, EMPLOYER `/employer`, POLICYMAKER `/policymaker`, PATIENT `/dashboard`.
- ✅ Live PATIENT probes produced 403 on `/api/patients` and `/api/patients/list`; anonymous safety signals and PDF export produced 401.
- ✅ Mobile 390×844: hero present, mobile menu operable by accessible name, no horizontal overflow.
- ⚠️ Dependency audit remains non-zero because of Next 14 and legacy development/chart dependencies; there is no critical advisory in the current result.

## Decisions and external evidence still required before go-live

1. Approve plan names, prices, currencies, billing intervals, trial rules, tax handling and exact entitlements.
2. Decide whether recurring billing is Paystack-managed, internally scheduled, or excluded from the first release; authorize an M-Pesa reversal workflow if required.
3. Supply sandbox credentials/configuration for Paystack, Daraja/M-Pesa, S3/GuardDuty, Google and the notification provider; complete signed webhook and delivery certification tests.
4. Approve the PIA, retention schedule, incident contacts/timelines, processor agreements and launch jurisdictions.
5. Decide whether the Next.js 14-only deployment constraint can be relaxed. Current vendor advisories cannot all be cleared while remaining on 14.2.35.
6. Complete an independent penetration test, WCAG 2.2 AA review, load test, backup restore exercise and production observability acceptance.

# Practitioner MVP implementation and release ledger

The approved plan in task 01a07b01-22a6-7fc3-a2a1-d5d4d6bf2700 is the scope. Implementation is local and feature-flagged. Production release is not yet verified.

## Implemented

- Shared Kenyan NHFR directory, manual international facilities, search/population, duplicate checks, consulting relationships, administrator review of corrections and registry changes, paginated import leases/retries/resume/history. Distinct official identifiers distinguish registry branches; missing identity is counted rather than fabricated. Canonical JSON comparison prevents PostgreSQL key ordering from producing false changes.
- Practitioner-owned workspaces with live server-side permissions; individual reception/finance accounts, combined roles, multiple workspace selection, seven-day invitations/revocation and internal STAFF onboarding. Professional-or-higher owner membership unlocks the workspace; staff need no paid tier. Lapse makes the owner read/export-only and denies staff, bookings and reminders. Public registration roles remain unchanged.
- Shared practitioner-owned HubPatient directory, explicit legacy account links, duplicate suggestions with recorded distinct-patient decisions, owner-only clinical notes and privacy-specific staff DTOs.
- Patient appointments, blocking consulting sessions and professional meetings; daily/weekly/monthly recurrence, individual/future changes, immutable closed events, Nairobi dates, conflict locks and owner-only recorded overrides, ICS exports. Online/home/outreach work uses a location without requiring a facility.
- Configured availability/exceptions/buffers, public slots without calendar details, single-use email verification, non-reserving requests, atomic approval, decline, proposed-time confirmation and request limits. Patient accounts are unnecessary.
- Clinical service completion produces unbilled work. Facility/service rates, covered-service retainers and unique retainer periods; consolidated and split-payer invoices; immutable source lines and facility/rate snapshots; patient references by default.
- Integer minor-unit receipts, transactional partial/bulk allocations and payer-specific credits. Practitioner-approved discounts, charge changes, credit notes, voids, reversals, external refunds and evidence-backed withholding. No payment collection or transfer is initiated.
- Configured percentage taxes/withholding with exact rounding and explicit bases. Issued values remain intact; linked adjustments preserve history.
- Filtered reports, current ageing, dated cash counted once, credits/refunds/tax adjustments/withholding, running account statements, invoice/receipt PDFs and CSV/PDF exports. Original receipts and invoices remain in activity after reversal/void; those changes appear separately on their approval dates. Undated legacy settlements are explicitly separate from dated opening/closing balances.
- Existing database notification templates/preferences/outbox/retries/monitoring extended for practice invitations, verification, booking changes and reminders. Every retry checks current membership, recipient, event/version or balance. A practice scan failure does not stop unrelated queued notifications.
- Additive legacy review: explicit KSh-to-cents conversion, bounded source staging, unchanged-source checks and refresh, explicit duplicate/exclusion decisions, preserved old records and unknown receipt dates. Active workspace owners use the shared new calendar/financial screens; legacy mutations direct them there. Basic screens remain for members outside the expanded workspace.

## Local verification evidence

- All 14 migrations applied from scratch to the separate `pax_practice_rehearsal_20260909` database on local PostgreSQL port 5432. The four new migrations are additive. Docker port 5433 and production were not changed.
- Prisma validation, Yarn typecheck, lint, 21 unit tests, nine database integration suites and the Next.js 14 production build passed during implementation. Implementation checkpoint: `673e738` on `codex/practitioner-workspace-mvp`; final focused checks also passed.
- Integration coverage includes owner/reception/finance/combined roles, unrelated practitioners, revoked access, expired/replayed invitations, tier lapse, concurrent bookings/invoices/receipts/retainers, recurrence preservation, split payers/bulk receipts, credit/refund/withholding limits, tax adjustments, changed-source reconciliation, unknown receipt dates, report reversal/void history and protected PDFs.
- Headless system Chrome desktop and 390px mobile journeys passed: staff invitation/account acceptance, combined roles, facility addition and consulting selection, patient/clinical note, completed appointment, invoicing, PDF download, finance receipt/credit, account statement, reception privacy, public verification and approval, membership lapse. No browser JavaScript errors or horizontal overflow in the checked journeys.
- Invoice and statement PDFs were rendered with Poppler and visually inspected. Synthetic runtime artifacts are in `/tmp/pax-practice-runtime/`; tests generate their own random credentials and never print them.
- Initial official registry rehearsal processed all 18,380 records and resumed after interruption. The full repeat rehearsal `cmttxqnbf0004on7l3ixswf2n` completed 613 pages and processed 18,381 source rows, adding 2,433 previously deferred distinct official branches, queuing zero new corrections and skipping three rows without stable identity. The live source count changed during the run; paginated refreshes are not an immutable source snapshot. A database check found zero duplicate facility identifier groups. One initial-run review item remains pending: LOWLAND MEDICAL CENTRE (`KE_NHFR:fid:121144`); its review history is retained for administrator resolution rather than silently creating or merging it. Three initial source records lacked stable identity and were not invented or merged. Initial overly broad branch-review and JSON key-ordering issues were corrected and regression-tested.

## Release requirements still open

### Practitioner discovery additions — 7 October 2026

- Added `/find-a-doctor` with name/clinic, specialty and county filtering and optional user-initiated distance sorting. The landing and shared marketing navigation link to it. Existing hero imagery, teal/cream/gold styling and rounded cards follow the Abacus reference while retaining PAX's current seven-service structure.
- Existing profiles remain unpublished by default. Publication requires explicit consent, active practitioner status, Professional-or-higher tier, an owned workspace and an approved verification request containing professional licence evidence. This is a directory gate; it does not change existing clinical authorization or equate membership/payment with verification.
- Profile editing supports practice locations, coordinates and approved specialty groups/subspecialties. Practitioner suggestions appear on their own profile immediately, remain private in the shared taxonomy until approval, and require `verification.review` at `/admin/specialties`. Review records an audit entry and rejects concurrent repeat decisions. Service setup continues to accept its original intake fields; these public-profile fields are edited separately.
- Public appointment inquiries require name and phone; email, existing client reference, preferred date and reason are optional. Requests reserve no slot, authenticate no client and trigger no unverified email reminders. Authorized practice staff contact the client, agree a time, then approve or decline in Bookings. Approval checks owner-scoped client matches and calendar conflicts under the existing workspace lock. No cross-practitioner contact lookup or automatic clinical record transfer is introduced.
- Operational Practice copy now uses Clients and Practice Finance. Internal models, APIs and legacy routes retain compatibility. Active workspaces have one finance sidebar destination; unmigrated accounts retain legacy finance.
- Migration `20261007090000_practitioner_discovery` adds nullable profile fields, opt-in default false, specialty reference data and private inquiry storage. It was applied to the isolated `pax_practice_test` database and the verified local `pax_dev` database after a local database backup. No production database was changed.
- Verification: 60 unit tests, ten Practice database integration suites, Prisma validation, typecheck, lint and a production build passed during this addition. A real local browser phone-only request with no email showed successful receipt. Remaining signed-in desktop/mobile browser acceptance was blocked by a Brave extension panel; no complete browser acceptance is claimed for these additions.
- Product decisions remain open: stricter licence/MFA requirements for existing clinical access, automatic invoicing versus the current unbilled-service workflow, and the consent/authorization boundary for any cross-practitioner client contact lookup. Existing behavior is preserved pending those decisions. Research/funding/Reader Premium requirements from the separate exported Abacus project are outside these practitioner additions and require reconciliation with the current platform.

### Existing release requirements

1. Register the five provider templates declared in `lib/practice-notifications.ts`, configure their `NOTIF_ID_PRACTICE_*` values and the existing provider credentials, and verify actual delivery to an authorized test recipient. Local tests prove accurate failure/retry/suppression, not real delivery. Never paste secret values into this document or logs.
2. Verify the platform-injected `NEXTAUTH_URL` and scheduled worker in the target environment. Do not hand-set that variable. The development-only origin fallback accepts localhost addresses for browser tests.
3. Rehearse the production data snapshot and resolve every ambiguous opening-balance item with the practitioner. The synthetic migration rehearsal does not certify real production balances. Draft legacy invoices require exclusion and deliberate recreation, not automatic recognition as income.
4. Coordinate the existing external Python overdue job before cutover so migrated workspaces do not receive duplicate legacy reminders. The checked-in `shared/pax_overdue_reminders.py` now excludes workspace owners, and the TypeScript delivery guard suppresses previously queued legacy reminders after cutover, membership lapse or a flag pause. The actual SQL and delivery guard are covered by a local database regression test. Deploy the updated Python job alongside the app; new practice reminders use the existing TypeScript outbox worker.
5. Import/refresh the registry in the release database, review genuine identifier conflicts/changes and account for skipped source identity. Confirm HTTPS transport on the target host. This Mac's Node client rejects the registry certificate chain; `PRACTICE_REGISTRY_TRANSPORT=native-https` uses installed curl and native trust with TLS verification still enabled. The default remains Node fetch. No certificate validation is disabled.
6. Apply the reviewed additive migrations, enable the feature flag and run role acceptance in the deployment environment. No production migration, registry population, push or deployment has occurred here.

## Operations and defaults

- `PRACTICE_WORKSPACE_ENABLED=false` by default. Set true only in an environment prepared for the expanded schema and release checks.
- Admin facility screen: `/admin/facilities`. Workspace: `/practice`. Public patient link: `/practice/book/<workspace booking slug>`. Former dashboard and booking paths redirect to these canonical URLs. Staff acceptance: `/practice/invitation#<single-use token>`.
- An administrator starts imports. The CLI continues an existing admin-triggered run: `yarn practice:facilities <run-id>`. `--local-rehearsal` is guarded to the isolated test database only; `--native-https` is also available to the CLI.
- `yarn notifications:work` scans practice reminders/retainers when enabled and processes the existing outbox. `yarn practice:reminders` runs the scan separately. Schedule frequently enough for the selected reminder window; do not run overlapping external legacy reminders for migrated workspaces.
- Recurrence horizon: one year, up to 366 occurrences. Imported legacy appointments use an explicit 30-minute duration because the original model did not store duration. Closed history is preserved.
- Monthly retainers charge one configured monthly amount for an overlapping month; no implicit proration. Covered work is tracked at zero additional charge; uncovered services use an explicit fee.
- Operational money: KSh, integer cents, half-up decimal rounding, maximum KSh 20,000,000 per new document/receipt. No statutory tax is assumed. Patient-name inclusion on invoice lines is opt-in.
- Reports distinguish current balances from dated activity. Facility/patient/service cash attribution uses current invoice allocations; unapplied cash has no service attribution. Unknown-date legacy receipts do not appear as cash received on a fabricated date. A report with pending reconciliation is not a certified opening balance.
- New fonts are bundled locally under `lib/assets/` with their OFL license; financial documents are generated in memory, not uploaded to a conversion service.

## Repeatable checks

Use Yarn and the existing Node 22 runtime. All database test files reject a non-local or non-test database URL. Never run broad seed against production; the pre-existing seed resets audit-account credentials.

```sh
DATABASE_URL=postgresql://mach@127.0.0.1:5432/pax_practice_test yarn prisma migrate deploy
DATABASE_URL=postgresql://mach@127.0.0.1:5432/pax_practice_test PRACTICE_WORKSPACE_ENABLED=true yarn tsx --test tests/integration/*.test.ts
yarn prisma validate
yarn typecheck
yarn lint
yarn test
DATABASE_URL=postgresql://mach@127.0.0.1:5432/pax_practice_test PRACTICE_WORKSPACE_ENABLED=true NEXT_DIST_DIR=.next-practice-build yarn build
DATABASE_URL=postgresql://mach@127.0.0.1:5432/pax_practice_test PRACTICE_WORKSPACE_ENABLED=true yarn tsx tests/runtime/practice-journeys.ts
git diff --check
```

The browser suite expects a local preview at `http://127.0.0.1:3001` using the same isolated database and enabled flag. The normal local Docker app remains untouched. Tests retain synthetic fixtures only in the dedicated database. No real emails are sent by acceptance tests.

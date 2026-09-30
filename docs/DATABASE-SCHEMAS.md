# PAX PostgreSQL domain schemas

PAX uses one PostgreSQL database and one shared Prisma client. Seven user-facing services
share identity and evidence. Database schemas describe data ownership; they neither grant
service access nor replace API, ownership, workspace or professional-verification checks.

| Schema | Ownership |
| --- | --- |
| `core` | Identity, authentication, permission assignments, professional verification and service enrollment |
| `evidence` | Shared GPS entries, evidence and endorsements |
| `knowledge` | Debates, contributions, briefs and challenge briefs/responses |
| `innovation` | Innovations, milestones, innovation endorsements, IP/vault documents and NDA records |
| `talent` | Career/hiring profiles, jobs, applications, messaging and hiring teams |
| `practice` | Practitioner profiles, facilities, clinical relationships, workspaces, patients, calendars and clinical finance |
| `marketplace` | Vendors, buyers, listings, reviews and records of off-platform transactions |
| `investment` | Investor mandates, investments, diligence and investment cash flow |
| `safety` | Adverse-event reports and retained product feedback |
| `platform` | Shared billing/ledger, consent, audit, notifications, uploads, privacy operations and job tracking |
| `public` | Prisma migration history only; no application models |

`prisma/domain-schemas.json` is the complete model/enum ownership inventory. Every model and
enum in `prisma/schema.prisma` has an explicit `@@schema`. Cross-service references remain
foreign keys to existing records, including a single `core.User`. Shared enums have one owner:
for example `innovation.InnovationStage` is also used by investor mandates. No duplicate users,
profiles, enum types, copied rows or compatibility views are introduced.

Challenge briefs remain shared knowledge collaboration. Innovation endorsements belong to
Innovation; GPS endorsements belong to Evidence. Legacy clinical invoices stay in Practice;
platform subscriptions and payments stay in Platform. Marketplace transactions remain off-platform.

## Prisma and worker compatibility

The pinned Prisma 6.7 requires `previewFeatures = ["multiSchema"]`. Do not remove this flag or
upgrade the stack incidentally. Keep the connection URL's default `schema=public` so migration
history stays in its original location. Generated ORM queries use explicit model schemas.
Raw SQL must explicitly qualify application tables; never depend on a broad `search_path`.
Python jobs discard Prisma's `schema` URL parameter before passing the connection URL to libpq.
All other libpq options are retained.

A PostgreSQL role that can access all schemas still has that access across modules. These
namespaces are not independent security sandboxes. Existing application authorization remains
mandatory, especially for clinical data, private Talent records, vaults and safety reports.

## Migration and rollout

Migration `20260930090000_domain_schemas` creates ten namespaces and uses transactional
`ALTER TYPE ... SET SCHEMA` and `ALTER TABLE ... SET SCHEMA`. It does not drop/recreate tables,
change IDs, reset data, copy profiles, alter grants on tables or change enrollment choices.
PostgreSQL moves associated indexes and constraints with their table. `lock_timeout=10s`
prevents indefinite waits; a failure rolls back the namespace move.

This is a coordinated cutover, **not compatible with an old generated Prisma client**.
It preserves data but is not a rolling-release migration. Application and Python workers must
restart together with matching code. Do not run `db push`, reset, or accept generated drop/create
SQL as a substitute for this migration. Historical migration files remain unchanged.

Before an authorized rollout:

1. Confirm database host/name, roles, migration history, backup location and restore procedure.
   The local verification utility permits only named localhost test/preview databases.
2. Take a protected full backup and restore it into an isolated database. Rehearse the migration
   there first. Keep a backup of the previous application artifact, too.
3. Stop web traffic, scheduled jobs and all workers that can read/write this database. Ensure no
   other app or old Prisma client shares the target. Take the final backup after writes stop.
4. If deployment uses distinct migration/runtime roles, preflight schema permissions and prepare
   **USAGE** grants on the ten domain schemas for the actual runtime and worker roles. Apply those
   grants after migration, before restarting processes. New schemas are owned by the migration role.
   Preserve existing table grants and migration-role default privileges for future
   objects. Do not grant schema CREATE or sensitive table access to PUBLIC. A schema grant alone
   must not broaden a role's existing table privileges. The local rehearsal uses one owner role.
5. Run `yarn prisma migrate deploy`, `yarn prisma generate`, and build/start the matching artifact.
   On migration failure, inspect the cause and transaction outcome before using Prisma's documented
   migration-resolution workflow. Never mark an unsuccessful move as applied.
6. Compare before/after snapshots on the **same database**, check `prisma migrate diff`, health,
   authentication, enrollment/setup and allowed/denied access; then resume workers/traffic.

Read-only local evidence commands (snapshots contain hashes/counts, not row contents):

```sh
python3 scripts/verify-domain-schemas.py pax_schema_rehearsal public /private/tmp/before.json
# Apply the migration to that isolated database using its verified DATABASE_URL.
python3 scripts/verify-domain-schemas.py pax_schema_rehearsal domains /private/tmp/after.json
cmp /private/tmp/before.json /private/tmp/after.json
```

Object IDs differ between a backup and its restored copy. Compare each database with its own
pre-migration snapshot, not with another database's snapshot. Do not run full-table fingerprinting
under production load; it is an isolated/local verification utility.

### Recovery

If a migration fails before commit, the namespace changes roll back together. If the committed
release fails validation, keep all writers stopped and restore the final pre-cutover backup into
a clean recovery database with the previous application artifact. Validate it before switching
connections. This restores migration history consistently as well as data. Do not delete migration
history or manually move tables under a running app. Once post-cutover writes have resumed,
restoring an older backup would lose those writes: use a forward fix or a separately reviewed
recovery plan instead.

Local rehearsal also checks that all tables and enums can move back to public inside a transaction,
then rolls that transaction back, leaving the migrated rehearsal intact. This proves namespace
reversibility; it is not an automatic production rollback mechanism.

## Verification

- `tests/domain-schemas.test.ts`: complete ownership, non-destructive migration and Python URL handling.
- `tests/integration/domain-schemas.test.ts`: all 120 tables, cross-schema ORM relationships,
  migration history and PostgreSQL preparation of actual Python worker SQL (no external delivery).
- `scripts/verify-domain-schemas.py`: row hashes/counts, table/index/constraint OIDs, table privileges,
  and enum OIDs/values before and after a populated upgrade.
- Existing onboarding, Talent and Practice integration suites verify persistence and access boundaries.
- Fresh migration replay, normal local preview HTTP/browser checks, typecheck, lint and build complete
  the local checks. Provider delivery, live OAuth and production deployment require separate verification.

### Local verification record — 30 September 2026

- Populated clone of `pax_dev`: migration succeeded; identical before/after fingerprints for all
  120 tables and 74 enums, including OIDs, constraints, indexes, enum values and table privileges.
- Fresh isolated database: all 19 migrations replayed successfully; domain integration tests passed.
- Namespace reversal: moved all objects back inside a rehearsal transaction, then rolled it back;
  the migrated database fingerprint remained unchanged. Backup restoration was also exercised.
- Local `pax_dev`: backed up, migrated and compared successfully before runtime test writes.
- Unit tests: 55 passed. Existing Practice integration suites: 9 passed. Talent/onboarding:
  17 passed. Domain integration checks: 2 passed on both populated and fresh databases.
- Prisma validation/generation and drift comparison passed; typecheck, lint, production build and
  diff checks passed. All Python job sources parsed, and their actual SQL prepared successfully.
- Normal localhost preview: readiness passed; synthetic HTTP signup/verification/login, Accounts,
  service intake, Practice membership gate, buyer approval and Safety authorization checks passed.
  Browser sign-in, the seven-service Accounts view, and keyboard navigation to the public
  Pharmacovigilance reporting form passed without captured console errors.
- No production migration, push, deployment, external email delivery, live OAuth or S3 archive run.
  Python SQL compatibility was tested in PostgreSQL; full deployed Python/S3 execution was not run.

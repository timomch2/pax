# Account service enrollment

The first release tracks service choices without introducing paid plans or changing resource permissions. Work is local; deploy the additive migration before deploying code that queries enrollment.

## Account and launcher

`/account` contains My services for Medical Practitioner (`practice`), Talent Marketplace (`talent`), Product Marketplace (`market`), Knowledge Exchange (`community`), Innovation Hub (`innovation`), Investment Platform (`investment`), and Pharmacovigilance (`safety`). Home and Account remain core navigation. Users enable or disable services themselves. Unenabled launcher entries lead to the matching account card; enabled entries retain their existing product-origin destinations when accessible. Incomplete services open their Accounts setup. Explicit validated Innovation and Investment setup can provision their basic service access; selection alone cannot. Pharmacovigilance links directly to reporting regardless of enrollment. Profiles remain service-specific.

Enrollment is a preference in this release. Disabling does not revoke workspace membership, delete data, cancel billing, or prevent direct access permitted by existing authorization. The UI states this explicitly. Administrators inspect enrollment and workspace status in `/admin/users` and filter by service, enrollment state and workspace access status. Admin service suspension is intentionally not offered until service authorization is enforced consistently.

## Data and boundaries

- `UserService`: unique `(userId, serviceKey)`, enabled/disabled state, original enrollment source, latest enable/disable timestamps.
- `UserServiceEvent`: append-only history, action, actor and reason. Self-service changes and history commit in one serializable transaction with bounded conflict retries. Backfill creates history atomically and never overwrites a row.
- Setup summaries include explicit start/completion state. Existing accounts retain their established records and current rules; new intakes complete when profile data and service access are committed. An active summary is not authorization for every feature. Practice roles and membership, Talent email verification/team membership, and marketplace licence/verification checks remain independent.
- `/api/account/services` always derives the user from the authenticated session, returns private/no-store responses and rejects unrecognized input fields. Changes require a same-origin request and an active database account. Enable/disable and first-visit actions grant no role, verification or billing entitlement. Service setup is a separate validated transaction; see [Account onboarding](ACCOUNT-ONBOARDING.md).
- The existing account-data export includes service enrollments and their history.
- Client enrollment caches are scoped by account ID. Personalized results are separate from the public `/api/products` configuration.

There is no paid flag or synthetic subscription. No payment-expiry date or last-used timestamp is fabricated. Existing Plan, PlanPrice, Subscription and Entitlement models remain the future billing source of truth. Enrollment state does not measure actual usage.

## Migration and backfill

Run with the deployment environment already configured; do not override authentication origins:

```sh
yarn prisma migrate deploy
yarn prisma generate
yarn services:backfill
# Review the service counts before applying.
yarn services:backfill --apply
yarn services:backfill
```

The dry run reports aggregate candidate counts, without names or contact data. Evidence is a practitioner profile/workspace/current team membership, Talent candidate/hiring profile/current team membership, market buyer/vendor registration, authored debate/contribution/stance, owned innovation, investor mandate, investment, or vault access request. Safety is never backfilled from report history. Global roles, tiers, and public browsing are not evidence. Source `LEGACY` means imported from existing service records; `enabledAt` is the time tracking began, not an invented historical signup date. Existing disabled records are preserved. Rerunning safely discovers service records created through legacy direct-entry flows; those flows retain their existing access behavior in this tracking release.

Only the local `pax_dev` database was migrated and backfilled during implementation. No remote database or deployment was changed.

## Paid-access follow-up

Before introducing paywalls:

1. Map plan benefits to stable service/capability keys using existing billing entities. Support free, trial, paid, sponsored and administrative grants without changing professional credibility tiers.
2. Establish workspace versus personal billing ownership; an invited team member must not be charged simply for joining.
3. Centralize effective access checks across service APIs, pages and workers; distinguish enablement, setup, administrative suspension and valid grants. A successful payment must never reverse a user disablement or suspension.
4. Complete verified, idempotent subscription lifecycle handling. Current checkout supports one-time plans only; existing plan settlement does not establish recurring access periods. Scope refunds to their original grants so one refund cannot revoke another valid purchase.
5. Evaluate grant expiry at request time. Retain authorized read/export access after paid expiry while blocking paid mutations. Revoked membership or a restricted account still blocks access.
6. Roll out enforcement per service with explicit legacy access grants, audited overrides and tests for overlapping grants, expiry boundaries, delayed/replayed/out-of-order callbacks and refunds.

Marketplace service subscriptions must remain separate from vendor/buyer product transactions, which stay off-platform.

## Verification

```sh
yarn test
yarn typecheck
yarn lint
yarn build
# Requires local pax_dev, localhost:3000, and installed Chrome:
yarn tsx tests/runtime/service-enrollment.ts
```

The runtime check creates and removes only its own synthetic accounts, checks session ownership, cross-origin rejection, concurrency/audit behavior, persisted toggles, launcher destinations, responsive layout, admin filtering and restricted-account denial. It does not send emails or call payment providers.

The seven-service extension requires migration `20260924090000_seven_services` before its application release. It preserves existing service keys and disabled choices. Public service metadata contains no safety records or counters.

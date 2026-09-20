# Practice URL migration

Practice runs on the main domain at `/practice/*`. `PAX_ROOT_DOMAIN` supplies the real domain; examples are placeholders. Accounts and Talent retain their configured origins. With product routing disabled, all paths work on the current local host.

| Function | Canonical path |
| --- | --- |
| Facilities / workspace | `/practice` |
| Patients | `/practice/patients` |
| Calendar | `/practice/calendar` |
| Booking requests | `/practice/bookings` |
| Workspace billing | `/practice/billing` |
| Payer accounts | `/practice/accounts` |
| Reports | `/practice/reports` |
| Team | `/practice/team` |
| Reconciliation | `/practice/reconciliation` |
| Clinical profile | `/practice/profile` |
| Legacy finance | `/practice/finance` |
| Legacy invoices and details | `/practice/finance/invoices`, `/practice/finance/invoices/[id]` |
| Legacy patients and insurers | `/practice/finance/patients`, `/practice/finance/insurers` |
| Public booking | `/practice/book/[slug]` |
| Public staff invitation | `/practice/invitation#token` |

Old `/dashboard/practice`, `/dashboard/calendar`, `/dashboard/patients`, `/dashboard/billing`, `/dashboard/hub/*`, and `/book/[slug]` URLs redirect before sign-in. Query parameters are retained; browsers retain fragments on redirects without a replacement fragment. Invitation and booking tokens stay out of server URLs. Existing clinical and finance APIs retain their paths and authorization rules.

When product routing is enabled, the former `practitioners.<root>` host redirects page requests to the main domain, including its root to `/practice`. Existing sign-in return URLs for that host are normalized. Practice links from the product launcher and newly queued booking/reminder messages use the main domain. The main homepage remains public. Private Practice screens require authentication; public booking and invitation pages remain accessible without login. Accounts keeps the shared secure session cookie and server-side revocation checks.

Deployments retaining old-host compatibility must keep that host's DNS, TLS and ingress pointed at this application. This local change does not configure DNS or deploy anything. Clinical feature flags, permissions, membership restrictions, and existing release gates still apply.

## Verification

`tests/service-navigation.test.ts` covers canonical host routing, homepage availability, legacy redirects, query preservation, public/private routes, callback URLs, unknown hosts and unrelated service paths.

`tests/runtime/practice-journeys.ts` uses only `pax_practice_test`, synthetic accounts, local HTTPS on port 8443 and an app on port 3001 with Practice and product routing enabled. It checks all Practice pages, legacy invoice URLs, owner/reception/finance/combined access, clinical notes, calendars, receipts, PDFs, public token verification, booking approval, membership lapse and mobile overflow. Its temporary certificate files are the same local fixtures used by the Talent journey.

Run the existing unit, Practice integration and Talent integration suites, TypeScript, lint, production build, and both runtime journeys. External email delivery, cloud storage scanning, Google OAuth and production infrastructure remain separate release checks.

Local verification completed: 35 unit tests, all 9 Practice integration suites, 13 Talent integration checks, TypeScript, lint, production build, and both Chrome runtime journeys. Practice covered all 14 top-level/legacy screens plus an existing invoice detail, desktop and mobile, while Talent verified shared session continuity and global logout with no browser runtime errors. No production data or infrastructure was changed.

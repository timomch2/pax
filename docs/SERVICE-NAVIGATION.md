# Service navigation and profiles

The authenticated header places the five-service launcher immediately before the user's icon and first name. The user menu displays the full name, email, role and tier, a profile link for the current service, shared account security, and logout.

| Service | Entry | My Profile |
| --- | --- | --- |
| Home | `/` | `/dashboard/profile` |
| Practitioner | `/practice` | `/practice/profile` |
| Talent Search | `/talent` | `/talent/profile` |
| Market | `/marketplace` | `/marketplace/profile` |
| Pax Exchange | `/community` | `/community/profile` |

Configured product origins continue to be resolved server-side. Existing Talent and Practice feature flags remain in effect. No feature flags, credentials, or deployment settings are changed by this work.

## Practice routes

Workspace sections have stable URLs: `/practice`, `/practice/patients`, `/practice/calendar`, `/practice/bookings`, `/practice/billing`, `/practice/accounts`, `/practice/reports`, `/practice/team`, and `/practice/reconciliation`. The `workspace` query parameter preserves the selected workspace; access still comes from current server-side membership and capabilities. Accounts opens workspace payer accounts.

Old `/dashboard/practice`, `/dashboard/patients`, `/dashboard/calendar`, and `/dashboard/billing` links redirect to their Practice equivalents. `/dashboard/hub` and its nested invoice, patient, and insurer URLs redirect to `/practice/finance`, preserving identifiers and query parameters. Legacy clinical screens remain available before workspace cutover. Existing API URLs are unchanged. The public staff invitation URL stays `/practice/invitation`.

## Profile storage and permissions

No new database tables or data migrations are required. Practice edits its existing PractitionerProfile record; Community edits the existing community-facing User fields; Talent retains its existing TalentProfile. Market keeps separate vendor and buyer records, with contact editing and links to existing registration and vendor management. Registration identifiers, approval states, and legal declarations cannot be modified through the new contact forms.

New service-profile endpoints derive ownership from the authenticated session, require profile read/update permissions, validate service-specific field allowlists, and check write origins. Clinical updates also require a practitioner role; vendor updates also require vendor-management permission. Clinical and community biographies are saved separately. Account credentials remain managed through the shared account-security page.

## Local validation

- Unit tests cover canonical destinations, deployment origins, current-service profile selection, authenticated redirects, retained query parameters, profile ownership, field allowlists, and clinical/community persistence isolation.
- TypeScript, ESLint, and production build are checked.
- Desktop and 390px browser checks use a temporary synthetic authenticated-session preview, removed afterward. Both header menus, keyboard opening, Escape dismissal, and five service links were inspected.
- The local logout POST returned 200. Its redirect used the existing authentication server at localhost:3000, whose login page returned 500; the isolated UI preview ran at port 3002. Authentication configuration was not changed. No live account profile saves were performed.
- Work is local on main. Nothing is pushed or deployed.

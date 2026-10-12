# Service navigation and profiles

The authenticated header places the seven-service launcher (plus Home) immediately before the user's icon and first name. The user menu displays the full name, email, role and tier, a profile link for the current service, shared account security, and logout.

| Service | Entry | My Profile |
| --- | --- | --- |
| Home | `/` | `/dashboard/profile` |
| Medical Practitioner | `/practice` | `/practice/profile` |
| Talent Marketplace | `/talent` | `/talent/profile` |
| Product Marketplace | `/marketplace` | `/marketplace/profile` |
| Knowledge Exchange | `/community` | `/community/profile` |
| Innovation Hub | `/innovator` | No dedicated profile |
| Investment Platform | `/investor` | No dedicated profile |
| Pharmacovigilance | `/safety` | No dedicated profile |

GPS is shared evidence infrastructure. Services without dedicated profiles do not display invented profile links.
Innovation and Investment members without the required role return to access details in Accounts rather than a workspace redirect loop.
Pharmacovigilance always links to reporting; authorized primary ADMIN/POLICYMAKER roles also see their existing safety dashboard in Accounts. No report counts or signals enter the public catalog.
Knowledge Exchange links to `/knowledge/papers`, an authenticated Coming soon page without submission controls.

Configured product origins continue to be resolved server-side. Existing Talent and Practice feature flags remain in effect. No feature flags, credentials, or deployment settings are changed by this work.

## Practice routes

Workspace sections have stable URLs: `/practice`, `/practice/patients`, `/practice/calendar`, `/practice/bookings`, `/practice/billing`, `/practice/accounts`, `/practice/reports`, `/practice/team`, and `/practice/reconciliation`. The `workspace` query parameter preserves the selected workspace; access still comes from current server-side membership and capabilities. Accounts opens workspace payer accounts.

These sections appear in the Practitioner sidebar, filtered by the selected workspace's capabilities. The current-practitioner selector remains above the page content. Sidebar links retain the selected workspace, highlight the current section, and close the mobile drawer after navigation. The client section is labelled Clients and the workspace ledger is labelled Practice Finance. My Profile remains available alongside the workspace sections. Active workspaces use one finance destination; accounts without a workspace retain their legacy Practice Finance link and existing sidebar destinations.

Old `/dashboard/practice`, `/dashboard/patients`, `/dashboard/calendar`, and `/dashboard/billing` links redirect to their Practice equivalents. `/dashboard/hub` and its nested invoice, patient, and insurer URLs redirect to `/practice/finance`, preserving identifiers and query parameters. Legacy clinical screens remain available before workspace cutover. Existing API URLs are unchanged. The public staff invitation URL stays `/practice/invitation`.

## Profile storage and permissions

Profile storage is unchanged. The seven-service enrollment extension adds three enum values through an additive migration. Practice edits its existing PractitionerProfile record; Community edits the existing community-facing User fields; Talent retains its existing TalentProfile. Market keeps separate vendor and buyer records, with contact editing and links to existing registration and vendor management. Registration identifiers, approval states, and legal declarations cannot be modified through the new contact forms.

New service-profile endpoints derive ownership from the authenticated session, require profile read/update permissions, validate service-specific field allowlists, and check write origins. Clinical updates also require a practitioner role; vendor updates also require vendor-management permission. Clinical and community biographies are saved separately. Account credentials remain managed through the shared account-security page.

Practice profiles now include specialty groups/subspecialties, practice address/town/county and optional coordinates, plus explicit directory publication consent. `/find-a-doctor` is public when the Practice workspace feature is enabled. Publication additionally requires an active practitioner, Professional-or-higher membership, a workspace and an approved verification request containing professional licence evidence. Public results exclude account contacts, licence identifiers and clinical records. Public phone-only appointment inquiries enter the selected practice's private Bookings inbox; approval uses existing workspace permissions and calendar conflict checks.

## Local validation

- Unit tests cover canonical destinations, deployment origins, current-service profile selection, authenticated redirects, retained query parameters, profile ownership, field allowlists, and clinical/community persistence isolation.
- TypeScript, ESLint, and production build are checked.
- Desktop and 390px browser checks use a temporary synthetic authenticated-session preview, removed afterward. Both header menus, keyboard opening, Escape dismissal, and the then-current service links were inspected. These historical checks do not verify later changes.
- A subsequent local demo-account check verified real sign-in, the authenticated homepage menu, and logout back to the login page on localhost:3000. Guest Sign In and Join PAX actions remain visible after session loading on desktop and mobile, including when a stale session has no valid user. Authentication configuration was not changed. No live account profile saves were performed.
- Work is local on main. Nothing is pushed or deployed.

## Seven-service integration — 24 September 2026

The public service strip and footer use the same catalog as the launcher; existing overview URLs are preserved. Homepage service cards now list the seven services. The GPS overview remains linked as shared evidence, not counted as a separate service. Existing service workspaces are retained; no new profile forms or role grants are introduced.

Local verification covers all seven Accounts entries, saved choices, disabled-state retention, admin filters, role-denied Innovation/Investment launcher destinations, public reporting and denied private safety reads, authorized safety dashboard links, mobile layout, keyboard opening/Escape dismissal and the papers placeholder. Runtime tests use temporary synthetic accounts with signed local test sessions, not external SSO or live payment providers.

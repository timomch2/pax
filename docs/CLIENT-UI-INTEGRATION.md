# Client UI integration — 25 September 2026

## Reference and boundaries

The client reference is `https://thepraxisexchange.abacusai.app/`. A source archive downloaded
from the client's Abacus file browser on 25 September contains 514 extracted source/document files.
The reference was extracted outside the repository; hidden files, including environment files,
were excluded. No reference credentials, database configuration or source archive belong in Git.

The live reference and its source establish presentation and intended workflows. They do not
override PAX authorization, independent service enrollment, private clinical/safety data, protected
uploads, or the seven-service decision. Accounts remains shared infrastructure, with origins
resolved through `productUrl`. GPS remains a shared evidence capability.

## Implemented first pass

- `/dashboard/feed` reproduces the client's welcome panel, activity sections and responsive cards.
  Content comes from local records, with per-section failures and genuine empty states.
- `/hub` sends a successfully authenticated member to Home. Role workspaces retain their existing
  URLs. The authenticated launcher has a separate `homeHref`; the public homepage remains `/`.
- The shared shell provides Home / Debates / Talent / Market / More on mobile. More uses the
  existing accessible Sheet. User menu, Accounts, launcher and service-specific sidebars remain.
- The landing page retains seven services, uses the client's three-column service-card layout,
  and corrects the remaining eight-module heading. The duplicate public product-navigation row is removed; the shared launcher and Accounts remain. Card destinations remain keyboard accessible.
- Home selects free consensus abstracts only, scopes innovation summaries to the acting owner,
  excludes drafts and expired/unapproved marketplace vendors, and reuses published-job filters.
  It never reads clinical notes, safety reports, vault documents or paid consensus brief bodies.
  Product certification labels from the client reference are deliberately excluded under project rules.

The client Home exposes non-draft innovations to all members and links them to `/innovator`.
That is not copied: it would expand discovery and route unauthorized members into a role gate.
Broader innovation discovery needs an explicitly authorized public-summary destination.

## Source comparison and remaining work

The initial byte comparison found 106 identical component files and 92 identical App Router files.
This is a file inventory, not an assertion that every workflow was tested.

| Area | Finding / remaining work |
| --- | --- |
| Public site | Same hero assets, typography, core styling and most sections; seven-service grouping and shared account controls intentionally differ. |
| Innovation / Investment | Many screens are identical. Local secured vault documents and granular access must survive any presentation changes. Investor demo reaches an unaccepted Manifesto; it was not accepted during inspection. |
| Knowledge / Safety | Mostly existing presentation. Preserve seven-service labels, papers placeholder and restricted safety wording. |
| Talent | Client adds member connections, direct member messages, vision/motto, CHW/student categories and opportunity types. Local Talent has separate career/hiring profiles, applications, team permissions, reports, blocks and saved searches. This requires workflow/schema mapping, not replacing local components with the client API contracts. |
| Practice | Client uses older dashboard routes, licence upload and MFA gates. Preserve canonical `/practice` routes, workspace isolation and current upload pipeline. Claims-summary-only intent conflicts with existing clinical notes; retain records pending a decision. |
| Institutional | Client contains Finance, M&E and Project Management workspaces absent locally. Their placement and inclusion are pending scope clarification; they are not silently counted as new services. |
| Assistant / security | Client includes a Praxis assistant and email MFA implementation. These are integration/security features, not decorative widgets to copy without service design. |

Live inspection completed the homepage, practitioner calendar/patients/Talent profile surfaces,
innovator workspace/submission first step, and Investor Manifesto gate. Employer, policymaker,
CHW, student and administrator live journeys remain incomplete. Earlier Brave interruptions
were recoverable on 28 September; Employer inspection resumed as recorded below. Source access remains available. No legal declarations were accepted,
clinical records changed, or client-site forms submitted beyond authorized demo sign-in.

## Verification record

Final checkpoint checks: 47 tests passed; typecheck, lint, production build and diff checks passed.
Authenticated local browser verification used one disposable synthetic member in confirmed
`localhost/pax_dev`, with desktop and 390px inspection, no horizontal overflow, working More
drawer/Escape dismissal and no captured browser errors. External demo credentials did not sign in
locally. The final source-alignment refinements were rebuilt and verified in the in-app browser: guest redirect, sign-in, seven-service launcher, Home destination, keyboard menu dismissal, desktop resize dismissal, logout and seven public service cards. Temporary viewport overrides were reset and the synthetic account was removed. A concurrent build/typecheck attempt initially raced on generated Next types; the sequential typecheck rerun passed.

No migration, push or deployment is part of this UI pass. This document records partial progress,
not full seven-service UI parity or production readiness.

## Talent presentation checkpoint — 28 September 2026

- Talent's existing sidebar now uses the client's icon-row spacing, active-page treatment and
  keyboard focus indication. Exact and nested routes highlight their own section; job details
  belong to Find jobs. The protected logo, shared shell and Accounts destinations are retained.
- Job result cards use the client's compact typography, description, location metadata and hover
  treatment, retaining local apply/save controls and explainable match results. Empty results use
  the client's dashed panel treatment. No networking counters or disconnected controls were added.
- No API, authorization, schema, profile visibility or service enrollment behavior changed.

Verification: 47 tests, lint, production build, sequential typecheck and diff checks passed.
The rebuilt normal localhost preview passed desktop (1280px) and mobile (390px) inspection,
keyboard link activation, active-page attributes, drawer closure after navigation and anonymous
profile-to-login redirection with the return URL preserved. Mobile content did not overflow.
The local database had no published jobs, so populated-card visual verification and authenticated
save/apply journeys were not repeated in this checkpoint. Background RSC prefetch requests for
private pages logged fetch failures; direct navigation reached login correctly. No server exception
was observed; the preview emitted the existing missing NEXTAUTH_URL warning. These are limitations,
not a claim of an error-free browser run. No records or environment settings were changed.

Additional client inspection: Employer demo sign-in, Home, Employer overview, role management,
the unsaved Post a Challenge Brief dialog and Organisation Profile. Client role management uses
challenge briefs (title, organisation, health area, geography, deadline, problem and desired response),
while its Organisation Profile displays shared personal/GPS fields. Keep our distinct job/application
and hiring-organisation workflows; those client labels do not establish equivalent functionality.
No client form was saved or submitted beyond demo sign-in.

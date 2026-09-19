# PAX Talent implementation and release record

Local implementation on `codex/talent-marketplace`. Production deployment and DNS changes are not part of this checkpoint. Existing Practice release requirements remain in [PRACTITIONER-MVP-IMPLEMENTATION.md](PRACTITIONER-MVP-IMPLEMENTATION.md).

## Product and identity architecture

One Next.js 14 application, one PostgreSQL identity, and independently authorized products:

| Host | Entry point |
| --- | --- |
| `domanname.com` | Main PAX platform and existing modules |
| `accounts.domanname.com` | Registration, login, verification, recovery and account security |
| `practitioners.domanname.com` | Existing Practice workspace |
| `talent.domanname.com` | Health-sector jobs, career profiles and hiring |

`TALENT_ENABLED` enables the new workflows. `PAX_PRODUCT_ROUTING_ENABLED` enables host validation, root routing, accounts-host sign-in and the shared cookie. Both default off. Without product routing, Talent is available under `/talent` on the existing host. `PAX_ROOT_DOMAIN` configures the root without putting deployment configuration in client bundles.

Authentication retains NextAuth 4, Google and credentials with the existing password/MFA controls. The browser receives an encrypted JWT in `__Secure-pax.session-token`: HttpOnly, Secure, SameSite=Lax, path `/`, domain `domanname.com`. Tokens are not exposed through localStorage. Sessions have an eight-hour absolute limit. Every server session evaluation refreshes account status, session version and authorization state from PostgreSQL; suspension and global logout revoke access. The accounts screen supports password recovery, authenticator setup, recovery codes and global logout. Google-only users manage second-factor protection with Google.

This shared-cookie architecture requires every subdomain to remain trusted and controlled by PAX. It is not a general third-party SSO provider. A future independently hosted or untrusted product should use an OIDC authorization-code exchange instead. Redirects allow only the four explicit origins; Talent mutations require the browser Origin to match the configured request host, including behind an HTTPS reverse proxy.

New Talent registrations receive MEMBER permissions only. Career-profile enrollment adds only MEMBER permissions to an existing account. It never grants practitioner, patient, clinical, finance, safety or administrative access. The existing product modules and role grants remain authoritative.

## Workflows implemented

- Career profiles: experience, education, credentials, skills, languages, interests, location, availability, preferences, private saved CV/photo and selected existing GPS entries. PRIVATE is the default. Recruiter-only and public discovery are explicit choices. Existing GPS creation and endorsement behavior is reused. Self-declared career history is distinguished from GPS credibility. Applying snapshots the selected professional data; later edits do not rewrite applications or infer a new employment record.
- Hiring: individual and organization profiles, human identity review before publication, private verification evidence, public company pages, owner/admin/recruiter/reviewer roles, single-use email-bound invitations, revocation and ownership transfer. Recruiters and reviewers need job assignments; reviewers can read applications and add internal notes but cannot change stages or message candidates.
- Jobs: drafts, publication, edits with version checks, closing, archival, responsibilities, requirements, health areas, skills, experience, location/remote eligibility, employment terms, salary and deadline. Public search supports pagination, filters and explainable matching independent of GPS credibility. No automatic rejection or hiring decisions.
- Applications: drafts, required/optional/hidden CV and cover letter, supporting documents, up to ten screening questions, explicit sharing consent, ownership-checked documents, one submission per candidate/job, immutable professional snapshot, status history and candidate withdrawal. Hiring notes remain private to the authorized team. Withdrawn documents and snapshots disappear from hiring views.
- Recruitment: status transitions through review, shortlist, interview, offer, hire or rejection; consent-based job invitations; scoped messaging with idempotency, rate limits, blocking and human reports. Administrators can review reported content, close reported jobs, suspend hiring identities and record retention holds.
- Saved jobs and saved searches with opt-in daily alerts. Activity and team-invitation notifications use the existing outbox and platform notification provider. Delivery checks current access and invitation validity; emails contain generic notices rather than application or message bodies.

## Documents and retention

Uploads use the existing direct-to-S3 presigned flow and `lib/s3.ts`. Only cloud keys and asset IDs are stored. CVs/letters accept PDF or DOCX; supporting files accept PDF/JPG/PNG. Metadata, checksum, ownership, size and content format are checked before completion. DOCX ZIP inspection is bounded and rejects macros, embedded objects, encrypted archives and unsafe entries. Production files remain quarantined until the configured scanner marks them CLEAN; new Talent documents also require successful content validation. Application submission rejects pending, unowned or invalid files. Signed downloads are generated only after a fresh access check.

Recruitment is concluded explicitly after every application has a final outcome. Personal application and conversation content then expires after twelve calendar months. Holds suspend removal. Retention clears snapshots, answers, notes, messages and unreferenced documents while preserving minimal lifecycle metadata. A still-saved CV or another active reference prevents cloud deletion. Unused drafts expire after 90 days. Existing approved account export/erasure includes Talent data and respects holds. Cloud deletion failures remain retryable rather than being marked successfully deleted.

`TALENT_RECRUITMENT` is seeded as an inactive retention policy so existing operational approval controls are preserved. The release administrator must activate it and run the existing retention and upload workers. Retention does not begin merely because an application is rejected: it begins when recruitment is concluded.

## Local verification and repeatable commands

Verified for this checkpoint: Prisma validation/generation; fresh migration of all 15 migrations into `pax_talent_test`; additive upgrade of the existing isolated `pax_practice_test`; 25 project unit tests; 13 Talent integration checks; all 9 existing Practice integration suites; TypeScript; lint; production build; and real Chrome desktop/mobile acceptance. The HTTPS journey passed publication with multi-choice screening, candidate draft/submission, private hiring notes, status updates, messaging, public-profile opt-in, anonymous document denial, email-bound team acceptance, all four shared-cookie hosts, global logout and recovery from a separately retained revoked session. Screenshots were visually inspected. No real provider delivery, cloud malware scan, DNS change or production migration was performed.

Run from the repository root with Yarn. Tests refuse non-loopback or incorrectly named Talent databases. The integration suite creates only synthetic records. Never point these commands at the shared application database.

```sh
yarn prisma validate
yarn prisma generate
yarn test
yarn typecheck
yarn lint
DATABASE_URL=postgresql://mach@127.0.0.1:5432/pax_talent_test yarn prisma migrate deploy
DATABASE_URL=postgresql://mach@127.0.0.1:5432/pax_talent_test yarn tsx --test tests/integration/talent.test.ts
DATABASE_URL=postgresql://mach@127.0.0.1:5432/pax_talent_test TALENT_ENABLED=true NEXT_DIST_DIR=.next-talent-build yarn build
```

`tests/runtime/talent-journeys.ts` runs real Chrome against a built server on local port 3001 through an ephemeral HTTPS proxy on 8443. It maps the four public-looking hostnames locally, uses generated test credentials, and writes screenshots to `/tmp/pax-talent-runtime`. It requires temporary self-signed certificate/key files at `/tmp/pax-talent-local-{cert,key}.pem`; never commit those files. Browser upload selection uses a synthetic CLEAN fixture asset; real cloud scanner/provider acceptance remains a deployment check.

## Production activation requirements

1. Back up and rehearse the additive migration `20260920090000_talent_marketplace` against a production-shaped copy. Apply via `yarn prisma migrate deploy` during the authorized release. No destructive schema flags are required.
2. Run `yarn prisma db seed -- --talent-only` to add only the MEMBER role/permissions, Talent templates and inactive retention policy. This deliberately avoids the broad development seed and its account changes.
3. Point the four owned hostnames to the application with valid TLS, preserve the original Host header and forward HTTPS correctly. Have the platform inject the accounts origin for NextAuth; do not hand-set `NEXTAUTH_URL` in repository environment files. Register the accounts-host Google callback with the existing OAuth provider.
4. Register `NOTIF_ID_TALENT_ACTIVITY` and `NOTIF_ID_TALENT_TEAM_INVITATION` with the existing platform notification provider. Verify signup/recovery templates, notification worker delivery, failed delivery monitoring and opt-out behavior. No provider emails were sent during local tests.
5. Verify S3 CORS for the trusted hosts, production IAM, presigned uploads, malware quarantine/scanner callbacks, signed downloads and deletion retries. Keep production quarantine enabled.
6. Record and activate the recruitment retention policy; schedule the existing notification, privacy-retention and upload-retention workers. Review the human verification/report queue operationally.
7. Enable Talent, then host routing, and run role-aware acceptance against the actual domains. Existing cookies will require users to sign in again when changing to the domain-shared cookie. Keep all subdomains under trusted PAX control.

Rollback disables both feature flags and restores the previous application artifact while retaining the additive schema. Managed Talent records remain excluded from the legacy job APIs. No database reset is required. Existing legacy jobs can be linked by their owner to a hiring identity; verification still controls public visibility.

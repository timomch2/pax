# Shared account registration and service onboarding

PAX has seven services. GPS is shared evidence, not an eighth service. The approved brand palette remains unchanged.

## Account journey

`/register` and `/talent/register` render the same three-step form:

1. Full name, email, phone, password and confirmation. The password rules match the server policy.
2. Required country; optional physical address, city and postal code for Basic members.
3. One or more service preferences and explicit current privacy/account-terms consent.

Back/Next preserves in-memory values. Passwords are not written to browser storage. Only the final valid submission creates the account. `/api/signup` rejects role, tier, ownership and other undeclared input fields. It creates a Basic `MEMBER`, service preferences/history, consent, verification token and notification outbox event atomically. Duplicate email receives the same generic acknowledgement; existing rate limits and bot verification remain.

The journey is create → verify email → sign in → Accounts → first service. Legacy role query parameters preselect the corresponding service only. Talent's dedicated registration route preselects Talent, with editable choices.

New Google identities use the MEMBER adapter and must complete `/account/onboarding`. Only a verified Google provider claim establishes email verification. The authenticated completion endpoint accepts shared details, consent and service choices, never replacement identity or role fields. Concurrent/repeated completion is idempotent. Existing accounts (`registrationVersion` absent) keep their current behavior.

## Service entry

`lib/service-enrollment.ts` supplies setup state, destination, availability and access explanations for Accounts and the launcher. The selected services appear first. A first-visit POST acknowledges the chooser without granting access. Direct service layouts use `guardServiceEntry`; new enabled intakes redirect to `/account/services/[service]` before professional role checks.

| Service | Intake and boundary |
|---|---|
| Knowledge Exchange | Existing contributor fields, all optional; skip preserves existing values. |
| Innovation Hub | Existing self-assessment/declaration and submission form. Drafts remain drafts; publication/IP timestamp logic is shared with the normal API. |
| Talent Marketplace | Career, hiring or both. Existing career form keeps adult confirmation/private default; hiring keeps its review workflow. |
| Medical Practitioner | Registration/licence number and specialty with existing optional practice details. Professional membership is still required before an operational workspace. Staff use invitations. |
| Product Marketplace | Browse without a business profile, buyer application or vendor application. Approval, clean owned documents and licence gates remain; transactions stay off-platform. |
| Investment Platform | Explicit manifesto acceptance and the existing mandate form in one final transaction. Diligence/vault access remains separate. |
| Pharmacovigilance | Reporting opens directly; no invented profile questionnaire. No signal/report-reading permissions granted. |

`lib/service-onboarding.ts` validates the authenticated actor and intake. `lib/service-setup.ts` provisions only server-allowlisted OWN permissions and, where needed, the relevant additional practitioner/innovator/investor role. It never grants ADMIN, POLICYMAKER, staff, verification, a workspace, a tier or paid entitlement. Direct denies and expired service assignments prevent activation. Profile/grant/history/audit writes commit together; failed activation rolls them back. Repeated completion does not duplicate submissions. Buyer/vendor intake routes commit activation with their applications.

Existing profiles bypass repeat intake for grandfathered accounts. New interrupted Talent or marketplace intake resumes from saved records until explicit completion; partial records alone are not an access grant. Disabling a preference keeps completed setup, records and otherwise-authorized access.

Relevant completed services offer the existing GPS form and **Skip for now**. Saved entries and endorsement rules are reused. Talent additionally stores optional vision, motto, CHW unit/county and student institution/course/year, under its existing profile visibility rules. These categories can coexist and are not professional permissions.

## Migration and verification

`20260928120000_account_onboarding` adds nullable/defaulted account markers, service progress and Talent fields. It adds MEMBER's own reporting and verification-request permissions without changing roles, existing disabled choices or confidential history. The existing `yarn prisma db seed -- --talent-only` foundation command must provision MEMBER and its baseline permissions before accepting registrations (it does not seed users). Apply only to a confirmed isolated database for local tests; production rollout remains separate.

Local checks:

```sh
yarn test
yarn typecheck
yarn lint
yarn build
git diff --check
# DATABASE_URL must target localhost/pax_talent_test:
yarn tsx --test tests/integration/onboarding.test.ts
# With localhost:3000 development preview and localhost/pax_dev:
yarn tsx tests/runtime/onboarding-http.ts
```

The integration suite captures verification outbox messages without delivery, covers seven-service setup, failed/duplicate setup, private Talent profiles, separate profile writes, Practice membership, restricted safety, concurrent Google completion, denied grants and disabled-choice persistence. The HTTP journey uses real local signup/verification/credentials sessions and service endpoints. Browser checks cover the wizard's validation, Back navigation, multiple checkboxes, focus and responsive layout.

Google provider behavior is tested through its adapter/callbacks; this is not a live Google OAuth-provider test. Uploaded document scanning, external email delivery, payment providers and full client-workflow parity are not established by these local checks. No push or deployment is included.

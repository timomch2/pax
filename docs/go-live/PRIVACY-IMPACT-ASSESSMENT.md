# PAX Privacy Impact Assessment — approval draft

Status: operational draft; requires approval by the designated data-protection officer and legal counsel before production launch.

## Processing scope

PAX processes member identity and profile data, clinical relationship and Practice Hub records, pharmacovigilance reports, employment applications, innovation-vault documents, signed NDA evidence, notification delivery metadata, and billing records. Marketplace transactions remain outside PAX; the Marketplace is a directory and referral surface only.

## High-risk processing and controls

| Risk | Required control | Implementation evidence |
|---|---|---|
| Cross-role clinical disclosure | deny-by-default CRUD permissions plus active practitioner/patient relationship | `lib/authorization.ts`, `ClinicalRelationship`, Hub and appointment APIs |
| Safety disclosure | ADMIN/POLICYMAKER permissions only; no public exports/counters | `safety.signal.read`, `safety.export` |
| Vault/IP disclosure | immutable NDA acceptance and owner-approved access | `NdaAcceptance`, `VaultDocument`, scoped download checks |
| Uploaded malware | direct storage, ownership, checksum/HEAD completion, quarantine and GuardDuty result | `UploadAsset`, upload scan worker |
| Account takeover | verification, lockout, MFA, reset-token hashing, rate limits and session revocation | authentication routes and `AuthToken` |
| Excess retention | approved DB policies, dry-run first, allow-listed worker, DPO cases | `DataRetentionPolicy`, privacy retention worker |

## Decisions required before approval

- Name the data controller, data-protection officer, processors, and lawful basis for every data category.
- Approve country-specific clinical, pharmacovigilance, employment, tax, and payment retention periods.
- Complete vendor DPAs and cross-border transfer assessments for hosting, storage, mail/notification, analytics, Paystack, and Safaricom.
- Approve breach-notification timelines and supervisory-authority contacts for each launch jurisdiction.
- Perform a production penetration test and restore exercise, then attach the evidence to this assessment.

No inactive draft retention policy is executed automatically. Erasure preserves pseudonymized regulated records only with a documented exception in the data-subject case.

# Security and privacy incident response runbook

Status: operational draft; production contacts and legal notification periods must be approved before launch.

1. Record the incident immediately in the admin incident register; preserve timestamps, reporter, affected systems, personal-data involvement, and evidence.
2. Contain without destroying evidence: revoke affected sessions/credentials, isolate storage objects, stop compromised jobs, and deny exposed permissions.
3. Assess scope and severity, including affected people, data categories, jurisdictions, safety impact, payment impact, and ongoing access.
4. Preserve immutable audit, webhook, storage-access, notification, and infrastructure logs. Do not place secrets or raw clinical data in tickets.
5. Notify the designated security lead and DPO. The DPO determines regulator and data-subject notification obligations and records those timestamps in `SecurityIncident`.
6. Remediate, rotate exposed credentials, verify containment with targeted tests, and monitor for recurrence.
7. Close only after written remediation, evidence review, and a blameless post-incident review with assigned follow-up actions.

Severity guide: CRITICAL means active large-scale exposure, account compromise, safety impact, or payment-key compromise; HIGH means confirmed limited exposure or exploitable privileged access; MEDIUM means contained exposure with low impact; LOW means no confirmed disclosure.

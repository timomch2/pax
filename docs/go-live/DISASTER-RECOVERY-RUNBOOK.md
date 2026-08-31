# PAX disaster recovery and restore runbook

Status: operational draft; infrastructure owners must approve production RPO/RTO values.

## Preconditions

- Encrypted PostgreSQL backups with point-in-time recovery and retention independent of the primary account.
- Versioned application artifacts, migration history, storage versioning, environment-variable inventory, and a recovery account with least privilege.
- Monitoring for backup age, failed jobs, database readiness, notification dead letters, webhook failures, upload quarantine backlog, and reconciliation mismatches.

## Restore exercise

1. Declare the exercise or incident, freeze non-essential writes, and record the recovery point.
2. Restore PostgreSQL into an isolated database. Never restore over the only production copy.
3. Restore or reconnect object storage, then deploy the matching application artifact.
4. Apply only committed forward migrations and run readiness checks.
5. Verify row counts and referential integrity; test authentication, clinical boundaries, safety boundaries, paid entitlements, a signed upload download, and notification outbox processing.
6. Reconcile provider transactions and replay only verified, idempotent webhooks/outbox events.
7. Obtain business and security approval before switching traffic.
8. Record actual recovery-point loss, recovery duration, defects, and assigned remediation.

Run this exercise before launch and at least twice yearly. A backup is not accepted as recoverable until this procedure succeeds and evidence is retained.

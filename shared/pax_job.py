"""Shared, observable and idempotent runner for PAX scheduled jobs."""

from __future__ import annotations

import json
import os
import sys
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg2
from psycopg2.extras import Json


def log(event: str, **fields: object) -> None:
    print(json.dumps({"timestamp": datetime.now(timezone.utc).isoformat(), "event": event, **fields}, default=str), flush=True)


def database_connection():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is required")
    # Prisma's schema option is not a libpq parameter; SQL below names its schemas explicitly.
    parts = urlsplit(url)
    query = urlencode([(key, value) for key, value in parse_qsl(parts.query, keep_blank_values=True) if key != "schema"])
    connection_url = urlunsplit(parts._replace(query=query))
    return psycopg2.connect(connection_url, connect_timeout=10, options="-c statement_timeout=30000 -c idle_in_transaction_session_timeout=30000")


@contextmanager
def observed_job(job_key: str, run_key: str):
    connection = database_connection()
    connection.autocommit = False
    cursor = connection.cursor()
    cursor.execute("SELECT pg_try_advisory_lock(hashtext(%s))", (job_key,))
    if not cursor.fetchone()[0]:
        log("job_skipped", job=job_key, reason="lock_not_acquired")
        cursor.close()
        connection.close()
        sys.exit(0)
    run_id = str(uuid.uuid4())
    cursor.execute(
        'INSERT INTO platform."OperationalJobRun" ("id", "jobKey", "runKey", "status", "startedAt", "heartbeatAt") '
        'VALUES (%s, %s, %s, \'RUNNING\', NOW(), NOW()) ON CONFLICT ("runKey") DO NOTHING RETURNING "id"',
        (run_id, job_key, run_key),
    )
    if cursor.fetchone() is None:
        connection.rollback()
        cursor.execute("SELECT pg_advisory_unlock(hashtext(%s))", (job_key,))
        connection.commit()
        cursor.close()
        connection.close()
        log("job_skipped", job=job_key, reason="run_already_recorded", run_key=run_key)
        sys.exit(0)
    connection.commit()
    state = {"processed": 0, "failed": 0, "details": {}}
    try:
        yield connection, cursor, state
        cursor.execute(
            'UPDATE platform."OperationalJobRun" SET "status"=\'SUCCEEDED\', "finishedAt"=NOW(), "heartbeatAt"=NOW(), "processed"=%s, "failed"=%s, "details"=%s WHERE "id"=%s',
            (state["processed"], state["failed"], Json(state["details"]), run_id),
        )
        connection.commit()
        log("job_succeeded", job=job_key, run_key=run_key, processed=state["processed"], failed=state["failed"])
    except Exception as error:
        connection.rollback()
        cursor.execute(
            'UPDATE platform."OperationalJobRun" SET "status"=\'FAILED\', "finishedAt"=NOW(), "heartbeatAt"=NOW(), "processed"=%s, "failed"=%s, "error"=%s WHERE "id"=%s',
            (state["processed"], state["failed"] + 1, str(error)[:4000], run_id),
        )
        connection.commit()
        log("job_failed", job=job_key, run_key=run_key, error=type(error).__name__)
        raise
    finally:
        cursor.execute("SELECT pg_advisory_unlock(hashtext(%s))", (job_key,))
        connection.commit()
        cursor.close()
        connection.close()


def enqueue_email(cursor, *, template_slug: str, user_id: str | None, recipient: str, variables: dict, idempotency_key: str, priority: int = 0) -> bool:
    cursor.execute(
        'SELECT "version" FROM platform."NotificationTemplate" WHERE "slug"=%s AND "channel"=\'EMAIL\' AND "locale"=\'en\' AND "enabled"=true ORDER BY "version" DESC LIMIT 1',
        (template_slug,),
    )
    row = cursor.fetchone()
    if not row:
        raise RuntimeError(f"No active notification template: {template_slug}")
    event_id = str(uuid.uuid4())
    cursor.execute(
        'INSERT INTO platform."NotificationEvent" ("id", "userId", "templateSlug", "templateVersion", "locale", "variables", "idempotencyKey", "priority", "status", "availableAt", "createdAt", "updatedAt") '
        'VALUES (%s,%s,%s,%s,\'en\',%s,%s,%s,\'PENDING\',NOW(),NOW(),NOW()) ON CONFLICT ("idempotencyKey") DO NOTHING RETURNING "id"',
        (event_id, user_id, template_slug, row[0], Json(variables), idempotency_key, priority),
    )
    created = cursor.fetchone()
    if not created:
        return False
    cursor.execute(
        'INSERT INTO platform."NotificationDelivery" ("id", "eventId", "channel", "recipient", "status", "nextAttemptAt", "createdAt", "updatedAt") VALUES (%s,%s,\'EMAIL\',%s,\'PENDING\',NOW(),NOW(),NOW())',
        (str(uuid.uuid4()), event_id, recipient.strip().lower()),
    )
    return True


def authorized_safety_recipients(cursor):
    cursor.execute('SELECT "id", "email" FROM core."User" WHERE "role" IN (\'ADMIN\', \'POLICYMAKER\') AND "accountStatus"=\'ACTIVE\' AND "emailVerified" IS NOT NULL')
    return cursor.fetchall()

"""Quarterly confidential safety surveillance summary for authorized roles."""

from datetime import datetime, timezone

from pax_job import authorized_safety_recipients, enqueue_email, observed_job


def main() -> None:
    now = datetime.now(timezone.utc)
    quarter = (now.month - 1) // 3 + 1
    period = f"{now.year} Q{quarter}"
    with observed_job("pax_quarterly_surveillance", f"pax_quarterly_surveillance:{period}") as (connection, cursor, state):
        cursor.execute('SELECT count(*)::int FROM "AdverseDrugReport" WHERE "createdAt" >= date_trunc(\'quarter\', NOW()) - INTERVAL \'3 months\' AND "createdAt" < date_trunc(\'quarter\', NOW())')
        report_count = cursor.fetchone()[0]
        cursor.execute('SELECT count(*)::int FROM "ProductFeedback" WHERE "createdAt" >= date_trunc(\'quarter\', NOW()) - INTERVAL \'3 months\' AND "createdAt" < date_trunc(\'quarter\', NOW())')
        feedback_count = cursor.fetchone()[0]
        for user_id, email in authorized_safety_recipients(cursor):
            if enqueue_email(cursor, template_slug="safety.quarterly-summary", user_id=user_id, recipient=email,
                             variables={"reportCount": report_count, "feedbackCount": feedback_count, "period": period},
                             idempotency_key=f"safety-quarter:{period}:{user_id}", priority=5):
                state["processed"] += 1
        connection.commit()


if __name__ == "__main__":
    main()

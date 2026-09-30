"""Daily confidential pharmacovigilance signal scoring with a 14-day cooldown."""

from datetime import datetime, timezone

from pax_job import authorized_safety_recipients, enqueue_email, observed_job


def level(score: int) -> str:
    if score >= 12:
        return "CRITICAL"
    if score >= 6:
        return "ELEVATED"
    if score >= 3:
        return "WATCH"
    return "LOW"


def main() -> None:
    today = datetime.now(timezone.utc).date().isoformat()
    with observed_job("pax_signal_alerts", f"pax_signal_alerts:{today}") as (connection, cursor, state):
        cursor.execute(
            '''SELECT lower(trim("drugName")) AS key, min("drugName") AS name, count(*)::int,
                      sum(CASE "severity" WHEN 'MILD' THEN 1 WHEN 'MODERATE' THEN 2 WHEN 'SEVERE' THEN 4 WHEN 'LIFE_THREATENING' THEN 6 END)::int AS score
               FROM safety."AdverseDrugReport" WHERE "createdAt" >= NOW() - INTERVAL '14 days'
               GROUP BY lower(trim("drugName"))'''
        )
        recipients = authorized_safety_recipients(cursor)
        for drug_key, drug_name, report_count, score in cursor.fetchall():
            band = level(score)
            if band == "LOW":
                continue
            cursor.execute(
                '''SELECT 1 FROM platform."NotificationEvent" WHERE "templateSlug"='safety.signal-alert'
                   AND "createdAt" >= NOW() - INTERVAL '14 days' AND "variables"->>'drugName'=%s LIMIT 1''',
                (drug_name,),
            )
            if cursor.fetchone():
                continue
            for user_id, email in recipients:
                if enqueue_email(cursor, template_slug="safety.signal-alert", user_id=user_id, recipient=email,
                                 variables={"level": band, "drugName": drug_name, "score": score, "reportCount": report_count},
                                 idempotency_key=f"safety-signal:{drug_key}:{today}:{user_id}", priority=10):
                    state["processed"] += 1
        connection.commit()


if __name__ == "__main__":
    main()

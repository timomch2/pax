"""Daily overdue payer detection and confidential practitioner notification."""

from datetime import datetime, timezone

from pax_job import enqueue_email, observed_job


# Keep legacy balances out of reminders once a practitioner uses the new ledger, including on lapse.
WORKSPACE_EXCLUSION = ' AND NOT EXISTS (SELECT 1 FROM practice."PracticeWorkspace" w WHERE w."ownerId"=i."practitionerId") '


def main() -> None:
    today = datetime.now(timezone.utc).date().isoformat()
    with observed_job("pax_overdue_reminders", f"pax_overdue_reminders:{today}") as (connection, cursor, state):
        cursor.execute("SELECT to_regclass('practice.\"PracticeWorkspace\"') IS NOT NULL")
        workspace_filter = WORKSPACE_EXCLUSION if cursor.fetchone()[0] else ""
        cursor.execute(
            '''UPDATE practice."InvoicePayer" p SET "status"='OVERDUE', "updatedAt"=NOW()
               FROM practice."Invoice" i WHERE i."id"=p."invoiceId" AND p."dueDate" < NOW()
               AND p."amountPaid" < p."amount" AND p."status" <> 'OVERDUE' ''' + workspace_filter + ' RETURNING p."id"'
        )
        state["details"]["newlyOverdue"] = cursor.rowcount
        cursor.execute(
            '''SELECT p."id", i."invoiceNumber", (p."amount"-p."amountPaid")::int, u."id", u."email"
               FROM practice."InvoicePayer" p JOIN practice."Invoice" i ON i."id"=p."invoiceId" JOIN core."User" u ON u."id"=i."practitionerId"
               WHERE p."status"='OVERDUE' AND p."dueDate" < NOW() AND u."accountStatus"='ACTIVE' ''' + workspace_filter
        )
        for payer_id, invoice_number, outstanding, user_id, email in cursor.fetchall():
            if enqueue_email(cursor, template_slug="hub.overdue-payer-alert", user_id=user_id, recipient=email,
                             variables={"invoiceNumber": invoice_number, "outstanding": outstanding},
                             idempotency_key=f"hub-overdue:{payer_id}:{today}"):
                state["processed"] += 1
        connection.commit()


if __name__ == "__main__":
    main()

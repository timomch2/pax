"""Daily overdue payer detection and confidential practitioner notification."""

from datetime import datetime, timezone

from pax_job import enqueue_email, observed_job


def main() -> None:
    today = datetime.now(timezone.utc).date().isoformat()
    with observed_job("pax_overdue_reminders", f"pax_overdue_reminders:{today}") as (connection, cursor, state):
        cursor.execute(
            '''UPDATE "InvoicePayer" SET "status"='OVERDUE', "updatedAt"=NOW()
               WHERE "dueDate" < NOW() AND "amountPaid" < "amount" AND "status" <> 'OVERDUE' RETURNING "id"'''
        )
        state["details"]["newlyOverdue"] = cursor.rowcount
        cursor.execute(
            '''SELECT p."id", i."invoiceNumber", (p."amount"-p."amountPaid")::int, u."id", u."email"
               FROM "InvoicePayer" p JOIN "Invoice" i ON i."id"=p."invoiceId" JOIN "User" u ON u."id"=i."practitionerId"
               WHERE p."status"='OVERDUE' AND p."dueDate" < NOW() AND u."accountStatus"='ACTIVE' '''
        )
        for payer_id, invoice_number, outstanding, user_id, email in cursor.fetchall():
            if enqueue_email(cursor, template_slug="hub.overdue-payer-alert", user_id=user_id, recipient=email,
                             variables={"invoiceNumber": invoice_number, "outstanding": outstanding},
                             idempotency_key=f"hub-overdue:{payer_id}:{today}"):
                state["processed"] += 1
        connection.commit()


if __name__ == "__main__":
    main()

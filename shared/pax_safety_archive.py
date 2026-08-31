"""Annual encrypted-at-rest S3 archive for safety records past the five-year online window."""

import gzip
import json
import os
from datetime import datetime, timezone

import boto3

from pax_job import observed_job


def main() -> None:
    year = datetime.now(timezone.utc).year
    with observed_job("pax_safety_archive", f"pax_safety_archive:{year}") as (connection, cursor, state):
        bucket = os.environ.get("AWS_BUCKET_NAME")
        if not bucket:
            raise RuntimeError("AWS_BUCKET_NAME is required")
        prefix = os.environ.get("AWS_FOLDER_PREFIX", "").strip("/")
        cursor.execute('SELECT row_to_json(r) FROM (SELECT * FROM "AdverseDrugReport" WHERE "createdAt" < NOW() - INTERVAL \'5 years\' AND "archivedAt" IS NULL ORDER BY "createdAt") r')
        reports = [row[0] for row in cursor.fetchall()]
        cursor.execute('SELECT row_to_json(r) FROM (SELECT * FROM "ProductFeedback" WHERE "createdAt" < NOW() - INTERVAL \'5 years\' AND "archivedAt" IS NULL ORDER BY "createdAt") r')
        feedback = [row[0] for row in cursor.fetchall()]
        if not reports and not feedback:
            state["details"]["archiveCreated"] = False
            return
        payload = gzip.compress(json.dumps({"schemaVersion": 1, "createdAt": datetime.now(timezone.utc).isoformat(), "adverseDrugReports": reports, "productFeedback": feedback}, default=str).encode("utf-8"))
        key = "/".join(filter(None, [prefix, "safety-archive", f"pax-safety-{year}.json.gz"]))
        kwargs = {"Bucket": bucket, "Key": key, "Body": payload, "ContentType": "application/gzip", "ServerSideEncryption": "AES256"}
        if os.environ.get("AWS_KMS_KEY_ID"):
            kwargs.update({"ServerSideEncryption": "aws:kms", "SSEKMSKeyId": os.environ["AWS_KMS_KEY_ID"]})
        boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-east-1")).put_object(**kwargs)
        report_ids = [record["id"] for record in reports]
        feedback_ids = [record["id"] for record in feedback]
        if report_ids:
            cursor.execute('UPDATE "AdverseDrugReport" SET "archivedAt"=NOW(), "archiveRef"=%s WHERE "id"=ANY(%s)', (key, report_ids))
        if feedback_ids:
            cursor.execute('UPDATE "ProductFeedback" SET "archivedAt"=NOW(), "archiveRef"=%s WHERE "id"=ANY(%s)', (key, feedback_ids))
        state["processed"] = len(reports) + len(feedback)
        state["details"] = {"archiveCreated": True, "objectKey": key}
        connection.commit()


if __name__ == "__main__":
    main()

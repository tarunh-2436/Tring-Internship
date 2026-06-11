import os

import boto3

s3 = boto3.client("s3")

BUCKET_NAME = os.environ["STORAGE_BUCKET"]

STORAGE_BUCKET = os.environ["STORAGE_BUCKET"]


def verify_feedback_uploads(owner_id, feedback_id, attachments):

    try:

        for attachment in attachments:

            filename = attachment["filename"]

            key = f"uploads/" f"{owner_id}/" f"{feedback_id}/" f"{filename}"

            s3.head_object(
                Bucket=BUCKET_NAME,
                Key=key,
            )

        return True

    except Exception as e:

        print(str(e))

        return False


def delete_feedback_uploads(owner_id, feedback_id):

    prefix = f"uploads/" f"{owner_id}/" f"{feedback_id}/"

    response = s3.list_objects_v2(
        Bucket=BUCKET_NAME,
        Prefix=prefix,
    )

    objects = response.get("Contents", [])

    if not objects:

        return

    s3.delete_objects(
        Bucket=BUCKET_NAME,
        Delete={"Objects": [{"Key": obj["Key"]} for obj in objects]},
    )


def delete_selected_uploads(
    owner_id,
    feedback_id,
    attachments,
):

    try:

        objects = []

        for attachment in attachments:

            filename = attachment["filename"]

            key = f"uploads/" f"{owner_id}/" f"{feedback_id}/" f"{filename}"

            objects.append({"Key": key})

        if not objects:

            return

        s3.delete_objects(
            Bucket=BUCKET_NAME,
            Delete={"Objects": objects},
        )

    except Exception as e:

        print(str(e))

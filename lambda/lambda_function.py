import json
import boto3
from boto3.dynamodb.conditions import Key
import uuid
import os
from datetime import datetime, timezone
from helpers.auth import get_owner_information
from helpers.uploads import (
    verify_feedback_uploads,
    delete_feedback_uploads,
    delete_selected_uploads,
    build_s3_key,
)

TABLE_NAME = os.environ["DYNAMODB_TABLE"]
BUCKET_NAME = os.environ["STORAGE_BUCKET"]

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

s3 = boto3.client("s3")

AUTHENTICATED = "AUTHENTICATED"
ANONYMOUS = "ANONYMOUS"
ENTITY_TYPE = "FEEDBACK"


def get_body(event):

    body = event["body"]

    if isinstance(body, str):
        body = json.loads(body)

    return body


def current_timestamp():

    return datetime.now(timezone.utc).isoformat()


def generate_upload_response(
    owner_id, attachments, feedback_id=None, include_owner=False
):

    if not feedback_id:
        feedback_id = str(uuid.uuid4())

    uploads = []

    for attachment in attachments:

        filename = attachment["filename"]
        content_type = attachment["contentType"]
        key = build_s3_key(owner_id, feedback_id, filename)

        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=900,
        )

        uploads.append(
            {
                "filename": filename,
                "uploadUrl": upload_url,
                "contentType": content_type,
            }
        )

    response_body = {
        "feedbackId": feedback_id,
        "uploads": uploads,
    }

    if include_owner:
        response_body["ownerId"] = owner_id

    return {
        "statusCode": 200,
        "body": json.dumps(response_body),
    }


def lambda_handler(event, context):

    print(json.dumps(event))

    method = event["requestContext"]["http"]["method"]

    path = event["requestContext"]["http"]["path"]

    parts = path.strip("/").split("/")

    if parts[0] == event["requestContext"]["stage"]:
        parts = parts[1:]

    if method == "POST" and path.endswith("/feedback/init"):
        return initiate_feedback(event)

    if method == "POST" and path.endswith("/feedback/complete"):
        return complete_feedback(event)

    if method == "POST" and path.endswith("/feedback/anonymous/init"):
        return initiate_anonymous_feedback(event)

    if method == "POST" and path.endswith("/feedback/anonymous/complete"):
        return complete_anonymous_feedback(event)

    if method == "GET" and path.endswith("/feedback/admin"):
        return get_admin_feedback(event)

    if method == "GET" and path.endswith("/feedback"):
        return get_user_feedback(event)

    if (
        method == "GET"
        and len(parts) == 4
        and parts[0] == "feedback"
        and parts[3] == "download"
    ):
        return download_feedback(event, parts)

    if method == "GET" and len(parts) == 3 and parts[0] == "feedback":
        return get_single_feedback(event, parts)

    if (
        method == "PUT"
        and len(parts) == 4
        and parts[0] == "feedback"
        and parts[3] == "init"
    ):
        return initiate_edit_feedback(event, parts)

    if (
        method == "PUT"
        and len(parts) == 4
        and parts[0] == "feedback"
        and parts[3] == "complete"
    ):
        return complete_edit_feedback(event, parts)

    if method == "DELETE" and len(parts) == 3 and parts[0] == "feedback":
        return delete_feedback(event, parts)

    return {"statusCode": 405, "body": json.dumps({"message": "Method not allowed"})}


def initiate_feedback(event):

    body = get_body(event)

    owner_info = get_owner_information(event)

    if not owner_info.get("ownerId"):

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    return generate_upload_response(
        owner_info["ownerId"],
        body["attachments"],
    )


def complete_feedback(event):

    body = get_body(event)

    owner_info = get_owner_information(event)

    if not owner_info.get("ownerId"):

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    owner_id = owner_info["ownerId"]

    feedback_id = body.get("feedbackId")

    title = body.get("title")

    content = body.get("content")

    attachments = body.get("attachments", [])

    if not feedback_id or not title or not content:

        return {
            "statusCode": 400,
            "body": json.dumps({"message": "Invalid Request"}),
        }

    timestamp = current_timestamp()

    try:

        verified = verify_feedback_uploads(
            owner_id,
            feedback_id,
            attachments,
        )

        if not verified:

            delete_feedback_uploads(
                owner_id,
                feedback_id,
            )

            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Attachment verification failed"}),
            }

        item = {
            "ownerId": owner_id,
            "ownerType": owner_info["ownerType"],
            "feedbackId": feedback_id,
            "title": title,
            "content": content,
            "attachments": attachments,
            "status": "ACTIVE",
            "createdAt": timestamp,
            "lastUpdated": timestamp,
            "entityType": ENTITY_TYPE,
        }

        table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(ownerId) AND attribute_not_exists(feedbackId)",
        )

        return {
            "statusCode": 201,
            "body": json.dumps(
                {
                    "message": "Feedback stored successfully",
                    "feedbackId": feedback_id,
                }
            ),
        }

    except Exception as e:

        print(str(e))

        delete_feedback_uploads(
            owner_id,
            feedback_id,
        )

        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error storing feedback"}),
        }


def initiate_anonymous_feedback(event):

    body = get_body(event)

    anonymous_owner = str(uuid.uuid4())

    return generate_upload_response(
        anonymous_owner,
        body["attachments"],
        include_owner=True,
    )


def complete_anonymous_feedback(event):

    body = get_body(event)

    owner_id = body.get("ownerId")

    feedback_id = body.get("feedbackId")

    title = body.get("title")

    content = body.get("content")

    attachments = body.get("attachments", [])

    if not owner_id or not feedback_id or not title or not content:

        return {
            "statusCode": 400,
            "body": json.dumps({"message": "Invalid Request"}),
        }

    timestamp = current_timestamp()

    try:

        verified = verify_feedback_uploads(
            owner_id,
            feedback_id,
            attachments,
        )

        if not verified:

            delete_feedback_uploads(
                owner_id,
                feedback_id,
            )

            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Attachment verification failed"}),
            }

        item = {
            "ownerId": owner_id,
            "ownerType": ANONYMOUS,
            "feedbackId": feedback_id,
            "title": title,
            "content": content,
            "attachments": attachments,
            "status": "ACTIVE",
            "createdAt": timestamp,
            "lastUpdated": timestamp,
            "entityType": ENTITY_TYPE,
        }

        table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(ownerId) AND attribute_not_exists(feedbackId)",
        )

        return {
            "statusCode": 201,
            "body": json.dumps(
                {
                    "message": "Feedback stored successfully",
                    "feedbackId": feedback_id,
                }
            ),
        }

    except Exception as e:

        print(str(e))

        delete_feedback_uploads(
            owner_id,
            feedback_id,
        )

        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error storing feedback"}),
        }


def get_admin_feedback(event):

    owner_info = get_owner_information(event)

    if not owner_info["isAdmin"]:

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    try:

        response = table.query(
            IndexName="admin_last_updated_index",
            KeyConditionExpression=Key("entityType").eq(ENTITY_TYPE),
            ScanIndexForward=False,
        )

        return {"statusCode": 200, "body": json.dumps(response.get("Items", []))}

    except Exception as e:

        print(str(e))

        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error retrieving feedback"}),
        }


def get_user_feedback(event):

    owner_info = get_owner_information(event)

    if not owner_info["ownerId"]:

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    try:

        response = table.query(
            IndexName="last_updated_index",
            KeyConditionExpression=Key("ownerId").eq(owner_info["ownerId"]),
            ScanIndexForward=False,
        )

        return {"statusCode": 200, "body": json.dumps(response.get("Items", []))}

    except Exception as e:

        print(str(e))

        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error retrieving feedback"}),
        }


def get_single_feedback(event, parts):

    owner_id, feedback_id = parts[1], parts[2]

    owner_info = get_owner_information(event)

    if not owner_info.get("ownerId"):

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    if owner_info["ownerId"] != owner_id and not owner_info["isAdmin"]:

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    try:

        response = table.get_item(
            Key={
                "ownerId": owner_id,
                "feedbackId": feedback_id,
            }
        )

        item = response.get("Item")

        if not item:
            return {
                "statusCode": 404,
                "body": json.dumps({"message": "Feedback not found"}),
            }

        return {"statusCode": 200, "body": json.dumps(item)}

    except Exception as e:
        print(str(e))

        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error retrieving feedback"}),
        }


def initiate_edit_feedback(event, parts):

    body = get_body(event)

    owner_id = parts[1]

    feedback_id = parts[2]

    owner_info = get_owner_information(event)

    if not owner_info.get("ownerId"):

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    if owner_info["ownerId"] != owner_id:

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    attachments = body.get(
        "newAttachments",
        [],
    )

    response = table.get_item(
        Key={
            "ownerId": owner_id,
            "feedbackId": feedback_id,
        }
    )

    item = response.get("Item")

    if not item:

        return {
            "statusCode": 404,
            "body": json.dumps({"message": "Feedback not found"}),
        }

    return generate_upload_response(
        owner_id=owner_id,
        feedback_id=feedback_id,
        attachments=attachments,
        include_owner=False,
    )


def complete_edit_feedback(event, parts):

    body = get_body(event)

    owner_id = parts[1]

    feedback_id = parts[2]

    owner_info = get_owner_information(event)

    if not owner_info.get("ownerId"):

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    if owner_info["ownerId"] != owner_id and not owner_info["isAdmin"]:

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    title = body.get("title")

    content = body.get("content")

    new_attachments = body.get(
        "newAttachments",
        [],
    )

    deleted_attachments = body.get(
        "deletedAttachments",
        [],
    )

    try:

        response = table.get_item(
            Key={
                "ownerId": owner_id,
                "feedbackId": feedback_id,
            }
        )

        item = response.get("Item")

        if not item:

            return {
                "statusCode": 404,
                "body": json.dumps({"message": "Feedback not found"}),
            }

        verified = verify_feedback_uploads(
            owner_id,
            feedback_id,
            new_attachments,
        )

        if not verified:

            delete_selected_uploads(
                owner_id,
                feedback_id,
                new_attachments,
            )

            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Attachment verification failed"}),
            }

        existing_attachments = item.get(
            "attachments",
            [],
        )

        deleted_names = {attachment["filename"] for attachment in deleted_attachments}

        final_attachments = [
            attachment
            for attachment in existing_attachments
            if attachment["filename"] not in deleted_names
        ]

        final_attachments.extend(new_attachments)

        table.update_item(
            Key={
                "ownerId": owner_id,
                "feedbackId": feedback_id,
            },
            UpdateExpression="""
                SET
                    title = :title,
                    content = :content,
                    attachments = :attachments,
                    lastUpdated = :lastUpdated
            """,
            ExpressionAttributeValues={
                ":title": title,
                ":content": content,
                ":attachments": final_attachments,
                ":lastUpdated": datetime.now(timezone.utc).isoformat(),
            },
        )

        delete_selected_uploads(
            owner_id,
            feedback_id,
            deleted_attachments,
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Feedback updated successfully"}),
        }

    except Exception as e:

        print(str(e))

        delete_selected_uploads(
            owner_id,
            feedback_id,
            new_attachments,
        )

        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error updating feedback"}),
        }


def delete_feedback(event, parts):

    owner_id = parts[1]

    feedback_id = parts[2]

    owner_info = get_owner_information(event)

    if not owner_info.get("ownerId"):

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    if owner_info["ownerId"] != owner_id:

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    try:

        response = table.get_item(
            Key={
                "ownerId": owner_id,
                "feedbackId": feedback_id,
            }
        )

        item = response.get("Item")

        if not item:

            return {
                "statusCode": 404,
                "body": json.dumps({"message": "Feedback not found"}),
            }

        delete_feedback_uploads(
            owner_id,
            feedback_id,
        )

        table.delete_item(
            Key={
                "ownerId": owner_id,
                "feedbackId": feedback_id,
            }
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Feedback deleted successfully"}),
        }

    except Exception as e:

        print(str(e))

        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error deleting feedback"}),
        }


def download_feedback(event, parts):

    owner_id = parts[1]

    feedback_id = parts[2]

    owner_info = get_owner_information(event)

    if not owner_info.get("ownerId"):

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    if owner_info["ownerId"] != owner_id and not owner_info["isAdmin"]:

        return {
            "statusCode": 403,
            "body": json.dumps({"message": "Access denied"}),
        }

    try:

        response = table.get_item(
            Key={
                "ownerId": owner_id,
                "feedbackId": feedback_id,
            }
        )

        item = response.get("Item")

        if not item:

            return {
                "statusCode": 404,
                "body": json.dumps({"message": "Feedback not found"}),
            }

        attachments = item.get("attachments", [])

        download_attachments = []

        for attachment in attachments:

            filename = attachment.get("filename")

            content_type = attachment.get("contentType")

            key = build_s3_key(owner_id, feedback_id, filename)

            download_url = s3.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": BUCKET_NAME,
                    "Key": key,
                    "ResponseContentDisposition": f'attachment; filename="{filename}"',
                },
                ExpiresIn=900,
            )

            download_attachments.append(
                {
                    "filename": filename,
                    "contentType": content_type,
                    "downloadUrl": download_url,
                }
            )

        attachment_list = "\n".join(
            attachment.get("filename") for attachment in attachments
        )

        text = f"""
Feedback ID
------------
{feedback_id}

Owner ID
---------
{owner_id}

Status
------
{item.get("status")}

Title
-----
{item.get("title")}

Content
-------
{item.get("content")}

Created At
----------
{item.get("createdAt")}

Last Updated
------------
{item.get("lastUpdated")}

Attachments
-----------
{attachment_list}
"""

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "filename": f"feedback-{feedback_id}.txt",
                    "content": text,
                    "attachments": download_attachments,
                }
            ),
        }

    except Exception as e:

        print(str(e))

        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error downloading feedback"}),
        }

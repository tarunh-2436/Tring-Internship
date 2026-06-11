import json
import boto3
from boto3.dynamodb.conditions import Key
import uuid
import os
from datetime import datetime, timezone
from helpers.auth import get_owner_information

TABLE_NAME = os.environ["DYNAMODB_TABLE"]

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

AUTHENTICATED = "AUTHENTICATED"
ANONYMOUS = "ANONYMOUS"
ENTITY_TYPE = "FEEDBACK"


def lambda_handler(event, context):

    print(json.dumps(event))

    method = event["requestContext"]["http"]["method"]

    path = event["requestContext"]["http"]["path"]

    parts = path.strip("/").split("/")

    if parts[0] == event["requestContext"]["stage"]:
        parts = parts[1:]

    if method == "POST" and path.endswith("/anonymous"):
        return create_anonymous_feedback(event)

    if method == "POST" and path.endswith("/feedback"):
        return create_authenticated_feedback(event)

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

    if method == "PUT" and len(parts) == 3 and parts[0] == "feedback":
        return edit_feedback(event, parts)

    if method == "DELETE" and len(parts) == 3 and parts[0] == "feedback":
        return delete_feedback(event, parts)

    return {"statusCode": 405, "body": json.dumps({"message": "Method not allowed"})}


def create_anonymous_feedback(event):

    body = event["body"]

    if isinstance(body, str):
        body = json.loads(body)

    content = body.get("feedback")

    if not content:
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "Feedback is required"}),
        }

    timestamp = datetime.now(timezone.utc).isoformat()

    feedback_id = str(uuid.uuid4())

    item = {
        "ownerId": str(uuid.uuid4()),
        "ownerType": ANONYMOUS,
        "feedbackId": feedback_id,
        "title": "Untitled",
        "content": content,
        "attachments": [],
        "status": "ACTIVE",
        "createdAt": timestamp,
        "lastUpdated": timestamp,
        "entityType": ENTITY_TYPE,
    }

    try:

        table.put_item(Item=item)

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

        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error storing feedback"}),
        }


def create_authenticated_feedback(event):

    body = event["body"]

    if isinstance(body, str):
        body = json.loads(body)

    content = body.get("feedback")

    if not content:
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "Feedback is required"}),
        }

    timestamp = datetime.now(timezone.utc).isoformat()

    feedback_id = str(uuid.uuid4())

    owner_info = get_owner_information(event)

    item = {
        "ownerId": owner_info["ownerId"],
        "ownerType": owner_info["ownerType"],
        "feedbackId": feedback_id,
        "title": "Untitled",
        "content": content,
        "attachments": [],
        "status": "ACTIVE",
        "createdAt": timestamp,
        "lastUpdated": timestamp,
        "entityType": ENTITY_TYPE,
    }

    try:

        table.put_item(Item=item)

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


def edit_feedback(event, parts):

    owner_id, feedback_id = parts[1], parts[2]

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

        body = event["body"]

        if isinstance(body, str):
            body = json.loads(body)

        title = body.get("title")

        content = body.get("content")

        if title is None or content is None:

            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Title and content are required"}),
            }

        timestamp = datetime.now(timezone.utc).isoformat()

        response = table.update_item(
            Key={
                "ownerId": owner_id,
                "feedbackId": feedback_id,
            },
            UpdateExpression="SET title=:t, content=:c, lastUpdated=:u",
            ExpressionAttributeValues={
                ":t": title,
                ":c": content,
                ":u": timestamp,
            },
            ConditionExpression="attribute_exists(ownerId) AND attribute_exists(feedbackId)",
            ReturnValues="ALL_NEW",
        )

        return {
            "statusCode": 200,
            "body": json.dumps(response["Attributes"]),
        }

    except Exception as e:

        print(str(e))

        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error updating feedback"}),
        }


def delete_feedback(event, parts):

    owner_id, feedback_id = parts[1], parts[2]

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

        table.delete_item(
            Key={"ownerId": owner_id, "feedbackId": feedback_id},
            ConditionExpression="attribute_exists(ownerId) AND attribute_exists(feedbackId)",
        )

        return {"statusCode": 200, "body": json.dumps({"message": "Feedback deleted"})}

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

        response = table.get_item(Key={"ownerId": owner_id, "feedbackId": feedback_id})

        item = response.get("Item")

        if not item:

            return {
                "statusCode": 404,
                "body": json.dumps({"message": "Feedback not found"}),
            }

        text = f"""
Feedback ID
------------
{feedback_id}

Owner ID
---------
{owner_id}

Status
------
{item.get("status", "")}

Title
-----
{item.get("title", "")}

Content
-------
{item.get("content", "")}

Created At
----------
{item.get("createdAt", "")}

Last Updated
------------
{item.get("lastUpdated", "")}
"""

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "text/plain",
                "Content-Disposition": f'attachment; filename="{feedback_id}.txt"',
            },
            "body": text,
        }

    except Exception as e:

        print(str(e))

        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error downloading feedback"}),
        }

import json
import boto3
from boto3.dynamodb.conditions import Key
import uuid
import os
from datetime import datetime, timezone

TABLE_NAME = os.environ["DYNAMODB_TABLE"]

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

AUTHENTICATED = "AUTHENTICATED"
ANONYMOUS = "ANONYMOUS"
ENTITY_TYPE = "FEEDBACK"


def get_owner_information(event):

    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )

    groups = claims.get("cognito:groups", [])

    if isinstance(groups, str):
        groups = groups.strip("[]").split(",")
        groups = [g.strip() for g in groups if g.strip()]

    is_admin = "admins" in groups

    owner_id = claims.get("sub")

    return {
        "ownerId": owner_id,
        "ownerType": AUTHENTICATED,
        "isAdmin": is_admin,
    }


def lambda_handler(event, context):

    print(json.dumps(event))

    method = event["requestContext"]["http"]["method"]

    path = event["rawPath"]

    if method == "POST" and path.endswith("/anonymous"):
        return create_feedback(event, anonymous=True)

    if method == "POST":
        return create_feedback(event, anonymous=False)

    if method == "GET" and path.endswith("/feedback"):
        return get_feedback(event)

    return {"statusCode": 405, "body": json.dumps({"message": "Method not allowed"})}


def create_feedback(event, anonymous=False):

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

    if anonymous:
        owner_info = {
            "ownerId": str(uuid.uuid4()),
            "ownerType": ANONYMOUS,
            "isAdmin": False,
        }

    else:
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


def get_feedback(event):

    owner_info = get_owner_information(event)

    if owner_info["isAdmin"]:
        return get_admin_feedback(owner_info)
    return get_user_feedback(owner_info)


def get_admin_feedback(owner_info):

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


def get_user_feedback(owner_info):

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

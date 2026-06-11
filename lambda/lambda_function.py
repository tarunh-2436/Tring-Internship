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

    path = event["requestContext"]["http"]["path"]

    if method == "POST" and path.endswith("/anonymous"):
        return create_anonymous_feedback(event)

    if method == "POST" and path.endswith("/feedback"):
        return create_authenticated_feedback(event)

    if method == "GET" and path.endswith("/feedback"):
        return get_user_feedback(event)

    if method == "GET" and path.endswith("/feedback/admin"):
        return get_admin_feedback(event)

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

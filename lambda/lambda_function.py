# import json
# import boto3
# import uuid
# import os
# from datetime import datetime, timezone

# s3 = boto3.client("s3")

# BUCKET_NAME = os.environ["STORAGE_BUCKET"]


# def lambda_handler(event, context):

#     print(json.dumps(event))

#     if event["requestContext"]["http"]["method"] == "POST":
#         return submit_feedback(event)
#     elif event["requestContext"]["http"]["method"] == "GET":
#         return retrieve_feedback(event)

#     return {"statusCode": 405, "body": json.dumps({"message": "Method not allowed"})}


# def submit_feedback(event):
#     body = event["body"]
#     if isinstance(body, str):
#         body = json.loads(body)
#     name = body.get("name")
#     feedback = body.get("feedback")

#     if not name or not feedback:
#         return {
#             "statusCode": 400,
#             "body": json.dumps({"message": "Name and feedback are required"}),
#         }

#     feedback_object = {
#         "name": name,
#         "feedback": feedback,
#         "timestamp": datetime.now(timezone.utc).isoformat(),
#     }

#     try:
#         object_key = f"feedbacks/{str(uuid.uuid4())}.json"
#         s3.put_object(
#             Bucket=BUCKET_NAME,
#             Key=object_key,
#             Body=json.dumps(feedback_object),
#             ContentType="application/json",
#         )

#         print(f"Name from request : {name}")
#         print(f"Feedback from request : {feedback}")
#         print(f"Writing object {object_key}")

#         return {
#             "statusCode": 201,
#             "body": json.dumps({"message": "Object stored successfully in S3"}),
#         }

#     except Exception as e:
#         print("Error storing feedback in S3 :", str(e))
#         return {
#             "statusCode": 500,
#             "body": json.dumps({"message": "Error storing feedback in S3"}),
#         }


# def retrieve_feedback(event):

#     try:

#         claims = (
#             event.get("requestContext", {})
#             .get("authorizer", {})
#             .get("jwt", {})
#             .get("claims", {})
#         )

#         groups = claims.get("cognito:groups", [])

#         if isinstance(groups, str):

#             groups = groups.strip("[]").split(",")

#             groups = [g.strip() for g in groups if g.strip()]

#         is_admin = "admins" in groups

#         print(f"Admin Access: {is_admin}")

#         retrieved_feedbacks = s3.list_objects_v2(
#             Bucket=BUCKET_NAME, Prefix="feedbacks/"
#         )

#         feedbacks = []

#         for feedback in retrieved_feedbacks.get("Contents", []):

#             response = s3.get_object(Bucket=BUCKET_NAME, Key=feedback["Key"])

#             raw_content = response["Body"].read()

#             feedback_content = json.loads(raw_content.decode("utf-8"))

#             if not is_admin:

#                 feedback_content["name"] = "Anonymous"

#             feedbacks.append(feedback_content)

#         feedbacks.sort(key=lambda x: x["timestamp"], reverse=True)

#         return {
#             "statusCode": 200,
#             "body": json.dumps(feedbacks),
#         }

#     except Exception as e:

#         print("Error retrieving feedbacks:", str(e))

#         return {
#             "statusCode": 500,
#             "body": json.dumps({"message": "Error retrieving feedbacks"}),
#         }

import json
import boto3
import uuid
import os
from datetime import datetime, timezone

TABLE_NAME = os.environ["DYNAMODB_TABLE"]

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):

    print(json.dumps(event))

    method = event["requestContext"]["http"]["method"].upper()

    if method == "POST":
        return create_feedback(event)

    if method == "GET":
        return get_all_feedback(event)

    return {"statusCode": 405, "body": json.dumps({"message": "Method not allowed"})}


def create_feedback(event):

    body = event["body"]

    if isinstance(body, str):
        body = json.loads(body)

    name = body.get("name")
    feedback = body.get("feedback")

    if not name or not feedback:
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "Name and feedback are required"}),
        }

    timestamp = datetime.now(timezone.utc).isoformat()

    feedback_id = str(uuid.uuid4())

    item = {
        "userId": name.lower().strip().replace(" ", "_"),
        "feedbackId": feedback_id,
        "title": "Untitled",
        "content": feedback,
        "attachments": [],
        "status": "ACTIVE",
        "createdAt": timestamp,
        "lastUpdated": timestamp,
        "entityType": "FEEDBACK",
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


def get_all_feedback(event):

    try:

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

        response = table.scan()

        feedbacks = response.get("Items", [])

        for item in feedbacks:

            if not is_admin:

                item["userId"] = "Anonymous"

        feedbacks.sort(
            key=lambda x: x["lastUpdated"],
            reverse=True,
        )

        return {
            "statusCode": 200,
            "body": json.dumps(feedbacks),
        }

    except Exception as e:

        print(str(e))

        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error retrieving feedback"}),
        }

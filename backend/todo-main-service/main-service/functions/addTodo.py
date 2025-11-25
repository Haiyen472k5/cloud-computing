import boto3
import json
import os
import uuid
from datetime import datetime, timezone
import logging

dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-1')
table = dynamodb.Table(os.environ['TODO_TABLE'])

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

def lambda_handler(event, context):
    logger.info(event)

    body = json.loads(event['body'])
    try:
        userID = event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]
    except (KeyError, TypeError):
        userID = "test-user" # hoặc raise error

    todoID = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    item = {
        "todoID": todoID,
        "userID": userID,
        "dateCreated": now,
        "title": body["title"],
        "description": body["description"],
        "notes": "",
        "dateDue": body["dateDue"],
        "completed": False
    }

    table.put_item(Item=item)

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "GET, POST",
        },
        "body": json.dumps({
            "status": "success",
            "item": item
        })
    }


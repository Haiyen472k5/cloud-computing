import boto3
import json
import os
import logging
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb", region_name="ap-southeast-1")
table = dynamodb.Table(os.environ["TODO_TABLE"])

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

def search_todos(keyword, items):
    keyword_lower = keyword.lower()
    return [
        item for item in items
        if keyword_lower in item["title"].lower()
    ]
def  lambda_handler(event, context):
    logger.info(event)

    try:
        userID = event["pathParameters"]["userID"]
        query_params = event.get("queryStringParameters") or {}
        search = query_params.get("search", None)

        # Lay tat co todos theo userID
        response = table.query(
            IndexName="userIDIndex",
            KeyConditionExpression=Key("userID").eq(userID)
        )

        items = response.get("Items", [])

        # Loc todos theo search term neu co
        if search:
            items = search_todos(search, items)
        
        # Sort logic: chua complete -> som nhat -> moi nhat
        items.sort(
            key=lambda x: (
                x.get("completed", False),
                x.get("dateDue", ""),
                x.get("dateCreated", "")
            )
        )

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "GET",
            },
            "body": json.dumps({
                "status": "success",
                "todos": items
            })
        }

    except Exception as e:
        logger.error(e)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            },
            "body": json.dumps({
                "status": "error",
                "message": str(e)
            })
        }
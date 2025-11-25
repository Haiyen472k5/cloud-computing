import boto3
import os
import logging
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-1')
table = dynamodb.Table(os.environ['TODO_TABLE'])

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

def lambda_handler(event, context): 
    logger.info(event)

    try:
        todoID = event["pathParameters"]["todoID"]
        userID = event["pathParameters"]["userID"]

        # Lay todo theo ID tu DynamoDB
        response = table.get_item(Key={"todoID": todoID, "userID": userID})
        item = response.get("Item")

        if not item:
            return {
                "statusCode": 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
                },
                "body": json.dumps({"error": "Todo not found"})
            }
        
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "GET"
            },
            "body": json.dumps(
                {
                    "status": "success",
                    "item": item
                }
            )
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
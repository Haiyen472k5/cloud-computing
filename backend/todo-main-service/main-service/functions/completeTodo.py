import boto3
import json
import os
import logging

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

        # Update completed field = True
        table.update_item(
            Key = {"todoID": todoID, "userID": userID},
            UpdateExpression = "SET completed = :c",
            ExpressionAttributeValues = {":c" : True}
        )

        respond_body = {
            "status": "success",
            "todoID": todoID,
            "completed": True
        }

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "POST, GET"
            },
            "body": json.dumps(respond_body)
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
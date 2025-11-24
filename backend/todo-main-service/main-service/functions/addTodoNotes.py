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
        body = json.loads(event['body'])
        notes = body.get("notes", "")   
        todoID = event["pathParameters"]["todoID"]
        userID = event["pathParameters"]["userID"]

        # Update notes field in DynamoDB
        table.update_item(
            Key={
                'todoID': todoID,
                'userID': userID
            },
            UpdateExpression="set notes = :n",
            ExpressionAttributeValues={
                ':n': notes
            }
        )

        respond_body = {
            "status": "success",
            "todoID": todoID,
            "notes": notes
        }

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE"
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
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "GET, POST"
            },
            "body": json.dumps({
                "status": "error",
                "message": str(e)
            })
        }

import boto3
import json
import os
import logging
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb', region_name="ap-southeast-1")
table = dynamodb.Table(os.environ["TODOFILES_TABLE"])

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")

def lambda_handler(event, context):
    logger.info(event)

    # Lấy todoID từ path parameters
    todo_id = event["pathParameters"]["todoID"]

    # Truy vấn DynamoDB để lấy danh sách file liên quan đến todoID
    try:
        response = table.query(
            IndexName="todoIDIndex",
            KeyConditionExpression=Key("todoID").eq(todo_id)
        )

    except Exception as e:
        logger.error("Error querying DynamoDB: %s", e)
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
                "Content-Type": "application/json"
            },
            "body": json.dumps({"error": "Could not retrieve files"})
        }
    files = response.get("Items", [])

    file_list = {
        "files": [
            {
                "fileID": file["fileID"],
                "todoID": file["todoID"],
                "fileName": file["fileName"],
                "filePath": file["filePath"]
            }
            for file in files
        ]
    }

    # Trả về danh sách file
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
            "Content-Type": "application/json",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        },
        "body": json.dumps(file_list)
    }
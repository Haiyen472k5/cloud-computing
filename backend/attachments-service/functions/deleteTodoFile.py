import boto3
import os
import json
import logging
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb', region_name="ap-southeast-1")
table = dynamodb.Table(os.environ["TODOFILES_TABLE"])
s3_client = boto3.client('s3')

BUCKET = os.environ["TODOFILES_BUCKET"]
CDN_DOMAIN = os.environ.get("TODOFILES_BUCKET_CDN")
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")

def error(message, status_code=500):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
            "Content-Type": "application/json"
        },
        "body": json.dumps({"error": message})
    }

def lambda_handler(event, context):
    logger.info(event)

    # Get parameters
    try:
        file_id = event["pathParameters"]["fileID"]
        todo_id = event["pathParameters"]["todoID"]
        logger.info(f"Parameters - fileID: {file_id}, todoID: {todo_id}")
    except KeyError as e:
        logger.error(f"Missing path parameter: {e}")
        return error("Missing required parameters", 400)

    # Retrieve file info from DynamoDB
    try:
        db_res = table.get_item(
            Key={"fileID": file_id,
                "todoID": todo_id
            }
        )
    
        
    except ClientError as e:
        logger.error(f"DynamoDB ClientError: {e.response['Error']}", exc_info=True)
        return error(f"Database failure: {e.response['Error']['Message']}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return error(f"Database failure: {str(e)}")
    
    if "Item" not in db_res:
        return error(f"File ID {file_id} not found", 404)

    item = db_res["Item"]
    file_url = item["filePath"]
    file_name = item["fileName"]

    if CDN_DOMAIN:
        prefix = f"https://{CDN_DOMAIN}/"
    else:
        prefix = f"https://{BUCKET}.s3.amazonaws.com/"

    if not file_url.startswith(prefix):
        return error("Invalid file path in database")
    
    file_key = file_url.replace(prefix, "")

    # Delete file from S3
    try:
        s3_client.delete_object(Bucket=BUCKET, Key=file_key)
        logger.info(f"S3 delete OK: {file_key}")
    except ClientError as e:
        logger.error("S3 delete_object failed", exc_info=e)
        return error("File deletion from storage failed")
    
    # Delete file record from DynamoDB
    try:
        table.delete_item(
            Key={"fileID": file_id,
                "todoID": todo_id}
        )
        logger.info(f"DynamoDB delete OK: {file_id}")
    except Exception as e:
        logger.error("DynamoDB delete_item failed", exc_info=e)
        return error("File record deletion failed")
    
    # Return success response
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
            "Content-Type": "application/json",
            "Access-Control-Allow-Methods": "GET, DELETE",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        },
        "body": json.dumps({
            "message": f"File {file_name} deleted successfully"
        })
    }


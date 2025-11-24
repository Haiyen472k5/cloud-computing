import boto3
import json
import os
import logging
import uuid
from botocore.exceptions import ClientError

logger = logging.getLogger()    
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb', region_name = "ap-southeast-1")
table = dynamodb.Table(os.environ['TODOFILES_TABLE'])

s3_client = boto3.client('s3')

BUCKET = os.environ['TODOFILES_BUCKET']
CDN_DOMAIN = os.environ.get('TODOFILES_BUCKET_CDN')
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')

def lambda_handler(event, context):
    logger.info(event)

    # Lay du lieu
    body = json.loads(event['body'])
    todo_id = event["pathParameters"]["todoID"]
    file_name = body["fileName"]

    #user id tu token (de phan biet nguoi dung upload file)
    try:
        user_id = event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]
    except (KeyError, TypeError):
        logger.warning("Missing auth claims, using default.")
        user_id = "test-user"


    # Tao ID va key cua file trong S3
    file_id = str(uuid.uuid4())
    file_key = f"{user_id}/{todo_id}/{file_id}-{file_name}"

    # Tao pre-sign url de upload file len S3
    try:
        upload_url = s3_client.generate_presigned_url(
            "put_object",
            Params = {"Bucket": BUCKET, "Key": file_key},
            ExpiresIn = 3600
        )
    
    except ClientError as e:
        logger.error("Error generating presigned URL: %s", e)
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
                "Content-Type": "application/json"
            },
            "body": json.dumps({"error": str(e)})
        }

    # url để frontend hiển thì file qua cdn
    if CDN_DOMAIN:
        file_url = f"https://{CDN_DOMAIN}/{file_key}"
    else:
        file_url = f"https://{BUCKET}.s3.amazonaws.com/{file_key}"

    # Lưu thông tin file vào DynamoDB
    try:
        table.put_item(
            Item = {
                "fileID": file_id,
                "todoID": todo_id,
                "fileName": file_name,
                "filePath": file_url,
            }
        )
    except ClientError as e:
        logger.error("Error writing to DynamoDB: %s", e)
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
                "Content-Type": "application/json"
            },
            "body": json.dumps({"error": "Could not save file info"})
        }
    
    response = {
        "status": "success",
        "fileID": file_id,
        "fileURL": file_url, # dung de hien thi file tren frontend
        "uploadURL": upload_url # dung de upload file binary len S3
    }

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
            "Content-Type": "application/json",
            "Access-Control-Allow-Methods": "POST,GET",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
        },
        "body": json.dumps(response)
    }

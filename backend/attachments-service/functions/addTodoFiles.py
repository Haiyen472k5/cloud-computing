import boto3
import json
import os
import logging
import uuid
from botocore.exceptions import ClientError
from botocore.config import Config

logger = logging.getLogger()    
logger.setLevel(logging.INFO)

# Khởi tạo DynamoDB
dynamodb = boto3.resource('dynamodb', region_name="ap-southeast-1")
table = dynamodb.Table(os.environ['TODOFILES_TABLE'])

# Khởi tạo S3 client với signature version v4 (bắt buộc cho presigned URLs)
s3_client = boto3.client(
    's3',
    region_name='ap-southeast-1',
    config=Config(signature_version='s3v4')
)

BUCKET = os.environ['TODOFILES_BUCKET']
CDN_DOMAIN = os.environ.get('TODOFILES_BUCKET_CDN')
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')

def lambda_handler(event, context):
    logger.info(f"Event: {json.dumps(event)}")

    # Lấy dữ liệu
    try:
        body = json.loads(event['body'])
        todo_id = event["pathParameters"]["todoID"]
        file_name = body["fileName"]
    except (KeyError, json.JSONDecodeError) as e:
        logger.error(f"Invalid request: {e}")
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
                "Content-Type": "application/json"
            },
            "body": json.dumps({"error": "Invalid request body"})
        }

    # User ID từ token
    try:
        user_id = event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]
    except (KeyError, TypeError):
        logger.warning("Missing auth claims, using default.")
        user_id = "test-user"

    # Tạo ID và key của file trong S3
    file_id = str(uuid.uuid4())
    file_key = f"{user_id}/{todo_id}/{file_id}-{file_name}"

    logger.info(f"Generating presigned URL for key: {file_key}")

    # Tạo pre-signed URL để upload file lên S3
    try:
        upload_url = s3_client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': BUCKET,
                'Key': file_key
            },
            ExpiresIn=3600,
            HttpMethod='PUT'
        )
        
        logger.info(f"Presigned URL generated successfully")
    
    except ClientError as e:
        logger.error(f"Error generating presigned URL: {e}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
                "Content-Type": "application/json"
            },
            "body": json.dumps({"error": str(e)})
        }

    # URL để frontend hiển thị file qua CDN
    if CDN_DOMAIN:
        file_url = f"https://{CDN_DOMAIN}/{file_key}"
    else:
        file_url = f"https://{BUCKET}.s3.ap-southeast-1.amazonaws.com/{file_key}"

    # Lưu thông tin file vào DynamoDB
    try:
        table.put_item(
            Item={
                "fileID": file_id,
                "todoID": todo_id,
                "fileName": file_name,
                "filePath": file_url,
            }
        )
        logger.info(f"File info saved to DynamoDB: {file_id}")
    except ClientError as e:
        logger.error(f"Error writing to DynamoDB: {e}")
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
        "fileURL": file_url,
        "uploadURL": upload_url
    }

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
            "Content-Type": "application/json"
        },
        "body": json.dumps(response)
    }
import boto3
import json
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-1')
todo_table = dynamodb.Table(os.environ['TODO_TABLE'])
files_table = dynamodb.Table(os.environ["TODOFILES_TABLE"])

s3 = boto3.resource("s3")
bucket = s3.Bucket(os.environ["TODOFILES_BUCKET"])

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

    
def delete_todo_files_s3(userID, todoID):
    # Xoa tat ca file trong S3: userID/todoID/*

    prefix = f"{userID}/{todoID}/"

    logger.info(userID)

    for obj in bucket.objects.filter(Prefix=prefix):
        logger.info(f"Deleting S3 object: {obj.key}")
        obj.delete()
    return f"{todoID} files deleted from S3"




def delete_todo_files_dynamo(todoID):
    # Xoa tat ca file trong DynamoDB: todoID

    response = files_table.query(
        IndexName="todoIDIndex",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("todoID").eq(todoID)
    )

    items = response.get("Items", [])

    if not items:
        return f"{todoID}: no files to delete from DynamoDB"

    for item in items:
        logger.info(f"Deleting DynamoDB item: {item['fileID']}")
        files_table.delete_item(Key={"fileID": item["fileID"], "todoID": todoID})

    return f"{todoID} files deleted from DynamoDB"

def delete_todo(todoID, userID):
    # Xoa todo trong DynamoDB
    logger.info(f"Deleting todo: {todoID}")
    todo_table.delete_item(Key={"todoID": todoID, "userID": userID})

    return f"Todo {todoID} deleted from DynamoDB"

def lambda_handler(event, context):
    logger.info(event)

    try: 
        todoID = event["pathParameters"]["todoID"]
        userID = event["pathParameters"]["userID"]

        user_id = event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]


        
        # Delete files from S3
        delete_todo_files_s3(user_id, todoID)

        # Delete files from DynamoDB
        delete_todo_files_dynamo(todoID)

        # Delete todo from DynamoDB
        delete_todo(todoID, userID)

        respond_body = {
            "status": "success",
            "todoID": todoID
        }

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "GET, POST, DELETE"
            },
            "body": json.dumps(respond_body)
        }

    except Exception as e:
        logger.error(e)

        return {
            "statusCode": 500,
            "headers":{
                "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "status": "error",
                "message": str(e)
            })
        }


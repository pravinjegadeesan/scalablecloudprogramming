import json
import base64
import boto3
import uuid
from datetime import datetime

# DynamoDB
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("music-events")

# S3
s3 = boto3.client("s3")

BUCKET_NAME = "music-charts-data-lake"


def lambda_handler(event, context):

    print("Received Kinesis records")

    records = event.get("Records", [])
    if not records:
        return {
            "statusCode": 400,
            "body": "No Kinesis records were provided"
        }

    for record in records:

        try:
            # Decode Kinesis record
            payload = base64.b64decode(
                record["kinesis"]["data"]
            ).decode("utf-8")

            music_event = json.loads(payload)

        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            print(f"Skipping invalid record: {exc}")
            continue

        if not isinstance(music_event, dict):
            print("Skipping non-object payload")
            continue

        # Add unique ID
        music_event["event_id"] = str(uuid.uuid4())

        # Add processing timestamp
        music_event["processed_at"] = (
            datetime.utcnow().isoformat()
        )

        # Store in DynamoDB
        table.put_item(
            Item=music_event
        )

        print("Stored in DynamoDB")

        # Create S3 path
        now = datetime.utcnow()

        file_key = (
            f"music-events/"
            f"{now.year}/"
            f"{now.month:02d}/"
            f"{now.day:02d}/"
            f"{music_event['event_id']}.json"
        )

        # Store raw event in S3
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=file_key,
            Body=json.dumps(music_event, indent=4),
            ContentType="application/json"
        )

        print(f"Stored in S3: {file_key}")

    return {
        "statusCode": 200,
        "body": "Stored successfully in DynamoDB and S3"
    }
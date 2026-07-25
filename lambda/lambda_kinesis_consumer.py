import json
import base64
from datetime import datetime


def lambda_handler(event, context):

    print("Received Kinesis records")


    for record in event["Records"]:

        # Decode Kinesis data
        payload = base64.b64decode(
            record["kinesis"]["data"]
        ).decode("utf-8")


        music_event = json.loads(payload)


        print("Music Event:")
        print(json.dumps(
            music_event,
            indent=4
        ))


        # Add processing timestamp
        music_event["processed_at"] = datetime.utcnow().isoformat()


        print(
            "Processed Event:",
            music_event
        )


    return {
        "statusCode": 200,
        "body": "Records processed successfully"
    }
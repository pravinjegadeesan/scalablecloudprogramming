import json
import time

import boto3


STREAM_NAME = "music-stream"

REGION = "us-east-1"


kinesis_client = boto3.client(
    "kinesis",
    region_name=REGION
)


def send_event(event):

    event["sent_time"] = time.time()

    response = kinesis_client.put_record(
        StreamName=STREAM_NAME,
        Data=json.dumps(event),
        PartitionKey=event["artist"]
    )

    print(
        "Event sent:",
        event["sent_time"]
    )

    return response
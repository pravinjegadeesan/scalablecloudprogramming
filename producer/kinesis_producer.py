import boto3
import json


STREAM_NAME = "music-stream"

REGION = "us-east-1"


kinesis_client = boto3.client(
    "kinesis",
    region_name=REGION
)


def send_event(event):

    response = kinesis_client.put_record(
        StreamName=STREAM_NAME,
        Data=json.dumps(event),
        PartitionKey=event["artist"]
    )

    print(
        "Event sent to Kinesis:",
        response["SequenceNumber"]
    )

    return response
import base64
import csv
import io
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    total_records = 0
    for record in event["Records"]:
        try:
            payload = base64.b64decode(
                record["kinesis"]["data"]
            ).decode("utf-8")
            csv_reader = csv.DictReader(io.StringIO(payload))
            for row in csv_reader:
                logger.info(json.dumps(row))
                total_records += 1
        except Exception as e:
            logger.error(f"Error processing record: {str(e)}")
    return {
        "statusCode": 200,
        "processed_records": total_records
    }
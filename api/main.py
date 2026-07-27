from fastapi import FastAPI
import boto3
import pandas as pd
import io
import json
from botocore.exceptions import ClientError


app = FastAPI(
    title="Music Charts Analytics API",
    version="1.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------
# AWS Clients
# --------------------------------

dynamodb = boto3.resource(
    "dynamodb",
    region_name="us-east-1"
)


s3 = boto3.client(
    "s3",
    region_name="us-east-1"
)

kinesis = boto3.client(
    "kinesis",
    region_name="us-east-1"
)


# --------------------------------
# DynamoDB Tables
# --------------------------------

events_table = dynamodb.Table(
    "music-events"
)


trend_table = dynamodb.Table(
    "music-trending-window"
)



# --------------------------------
# S3 Bucket
# --------------------------------

BUCKET = "music-charts-data-lake"



# --------------------------------
# Health Check
# --------------------------------

@app.get("/")
def home():

    return {
        "message": "Music Analytics API Running"
    }



# --------------------------------
# Latest Real-Time Events
# AWS Kinesis Stream Direct Ingest
# --------------------------------

@app.get("/latest-events")
def latest_events():

    try:
        import datetime
        now = datetime.datetime.now(datetime.timezone.utc)
        start_time = now - datetime.timedelta(minutes=5)

        response = kinesis.describe_stream(StreamName="music-stream")
        shards = response['StreamDescription']['Shards']
        
        events = []
        for shard in shards:
            shard_id = shard['ShardId']
            try:
                # 1. Try AT_TIMESTAMP from 5 minutes ago
                iterator_response = kinesis.get_shard_iterator(
                    StreamName="music-stream",
                    ShardId=shard_id,
                    ShardIteratorType='AT_TIMESTAMP',
                    Timestamp=start_time
                )
                shard_iterator = iterator_response['ShardIterator']
                records_response = kinesis.get_records(
                    ShardIterator=shard_iterator,
                    Limit=20
                )
                records = records_response.get('Records', [])
                
                # 2. Fallback to TRIM_HORIZON if no recent records are found
                if not records:
                    iterator_response = kinesis.get_shard_iterator(
                        StreamName="music-stream",
                        ShardId=shard_id,
                        ShardIteratorType='TRIM_HORIZON'
                    )
                    shard_iterator = iterator_response['ShardIterator']
                    records_response = kinesis.get_records(
                        ShardIterator=shard_iterator,
                        Limit=20
                    )
                    records = records_response.get('Records', [])
                    
                for record in records:
                    try:
                        data = json.loads(record['Data'].decode('utf-8'))
                        events.append(data)
                    except Exception:
                        pass
            except Exception:
                pass
                    
        events.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return events[:20]

    except Exception as e:

        return {
            "error": str(e)
        }



# --------------------------------
# Trending Songs
# Sliding Window Speed Layer
# --------------------------------

@app.get("/trending-now")
def trending_now():
    try:
        import datetime
        current_time = datetime.datetime.utcnow()
        window_start = current_time - datetime.timedelta(minutes=5)
        
        current_time_str = current_time.isoformat()
        window_start_str = window_start.isoformat()
        
        # Scan DynamoDB table and filter for events within the 5-minute window
        response = trend_table.scan(
            FilterExpression="(#ua BETWEEN :wstart AND :cend) OR (#ts BETWEEN :wstart AND :cend)",
            ExpressionAttributeNames={
                "#ua": "updated_at",
                "#ts": "timestamp"
            },
            ExpressionAttributeValues={
                ":wstart": window_start_str,
                ":cend": current_time_str
            }
        )

        items = response.get(
            "Items",
            []
        )

        # Sort items by play count descending
        items.sort(
            key=lambda x:
            int(
                x.get(
                    "play_count",
                    0
                )
            ),
            reverse=True
        )

        return items[:5]

    except Exception as e:

        return {
            "error": str(e)
        }



# --------------------------------
# Function:
# Read Spark Results From S3
# --------------------------------

def read_spark_result(folder):


    try:

        response = s3.list_objects_v2(

            Bucket=BUCKET,

            Prefix=f"results/{folder}/"

        )


        files = response.get(
            "Contents",
            []
        )


        csv_files = [

            obj["Key"]

            for obj in files

            if obj["Key"].endswith(".csv")

        ]


        if not csv_files:

            return {

                "error":
                f"No CSV file found in results/{folder}"

            }


        csv_file = csv_files[0]



        obj = s3.get_object(

            Bucket=BUCKET,

            Key=csv_file

        )



        df = pd.read_csv(
            io.BytesIO(
                obj["Body"].read()
            ),
            on_bad_lines='skip'
        )


        return df.head(10).to_dict(

            orient="records"

        )


    except ClientError as e:


        return {

            "error":
            str(e)

        }




# --------------------------------
# Batch Top Artists
# EMR + S3
# --------------------------------

@app.get("/top-artists")
def top_artists():

    return read_spark_result(
        "top-artists"
    )



# --------------------------------
# Batch Top Tracks
# EMR + S3
# --------------------------------

@app.get("/top-tracks")
def top_tracks():

    return read_spark_result(
        "top-tracks"
    )



# --------------------------------
# Batch Top Albums
# EMR + S3
# --------------------------------

@app.get("/top-albums")
def top_albums():

    return read_spark_result(
        "top-albums"
    )
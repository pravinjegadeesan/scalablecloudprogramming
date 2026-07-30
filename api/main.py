from fastapi import FastAPI
import boto3
import pandas as pd
import io
import json
import time
import csv
from datetime import datetime
from zoneinfo import ZoneInfo
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

athena = boto3.client(
    "athena",
    region_name="us-east-1"
)

ATHENA_DATABASE = "music_analytics"
ATHENA_OUTPUT = "s3://music-charts-data-lake/athena-results/"


# --------------------------------
# DynamoDB Tables
# --------------------------------

events_table = dynamodb.Table(
    "music-events"
)


trend_table = dynamodb.Table(
    "music-trending-window"
)

performance_table = dynamodb.Table(
    "stream-performance"
)


# --------------------------------
# S3 Bucket
# --------------------------------

BUCKET = "music-charts-data-lake"


def run_athena_query(query):

    response = athena.start_query_execution(
        QueryString=query,
        QueryExecutionContext={
            "Database": ATHENA_DATABASE
        },
        ResultConfiguration={
            "OutputLocation": ATHENA_OUTPUT
        }
    )

    query_id = response["QueryExecutionId"]

    while True:

        status = athena.get_query_execution(
            QueryExecutionId=query_id
        )

        state = status["QueryExecution"]["Status"]["State"]

        if state == "SUCCEEDED":
            break

        elif state in ["FAILED", "CANCELLED"]:
            return []

        time.sleep(1)

    result = athena.get_query_results(
        QueryExecutionId=query_id
    )

    rows = result["ResultSet"]["Rows"]

    if len(rows) < 2:
        return []

    headers = [
        c.get("VarCharValue", "")
        for c in rows[0]["Data"]
    ]

    data = []

    for row in rows[1:]:

        values = [
            c.get("VarCharValue", "")
            for c in row["Data"]
        ]

        data.append(
            dict(zip(headers, values))
        )

    return data


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
        ireland_tz = ZoneInfo("Europe/Dublin")
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        window_start_utc = now_utc - datetime.timedelta(minutes=15)
        current_time_str = datetime.datetime.now(ireland_tz).isoformat()

        response = events_table.scan()
        items = response.get("Items", [])
        filtered_items = []

        for item in items:
            item_ts = item.get("processed_at") or item.get("timestamp")
            if not item_ts:
                continue
            try:
                parsed_ts = datetime.datetime.fromisoformat(str(item_ts).replace("Z", "+00:00"))
            except ValueError:
                continue

            if parsed_ts.tzinfo is None:
                parsed_ts = parsed_ts.replace(tzinfo=datetime.timezone.utc)

            if window_start_utc <= parsed_ts <= now_utc:
                filtered_items.append(item)

        aggregate = {}

        for item in filtered_items:
            track = item.get("track", "Unknown")
            artist = item.get("artist", "Unknown")
            playcount = int(item.get("playcount", 0) or 0)
            key = (artist, track)
            aggregate[key] = aggregate.get(key, 0) + playcount

        results = [
            {
                "artist": artist,
                "track": track,
                "play_count": play_total,
                "window": "15_minutes",
                "updated_at": current_time_str
            }
            for (artist, track), play_total in aggregate.items()
        ]

        results.sort(key=lambda x: x["play_count"], reverse=True)
        return results[:5]

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
# Read Performance Metrics
# --------------------------------

def read_performance():

    try:

        response = performance_table.scan()

        items = response.get(
            "Items",
            []
        )

        if not items:

            return {

                "average_latency_ms":0,

                "samples":0

            }

        total = 0

        for item in items:

            total += float(
                item.get(
                    "latency_ms",
                    0
                )
            )

        average = total / len(items)

        return {

            "average_latency_ms":
            round(
                average,
                2
            ),

            "samples":
            len(items)

        }

    except Exception as e:

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


@app.get("/athena/top-artists")
def athena_top_artists():

    query = """
    SELECT
        artist,
        SUM(playcount) AS total_playcount
    FROM music_events
    GROUP BY artist
    ORDER BY total_playcount DESC
    LIMIT 10;
    """

    return run_athena_query(query)


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


# --------------------------------
# Hybrid Serving View
# Batch + Speed + Performance
# --------------------------------

@app.get("/dashboard")
def dashboard():

    return {

        "system":

        {

            "service":
            "Music Analytics Dashboard",

            "updated":
            datetime.now(ZoneInfo("Europe/Dublin")).isoformat()

        },

        "batch_layer":

        {

            "top_artists":

            read_spark_result(
                "top-artists"
            ),

            "top_tracks":

            read_spark_result(
                "top-tracks"
            ),

            "top_albums":

            read_spark_result(
                "top-albums"
            )

        },

        "speed_layer":

        {

            "trending_now":

            trending_now()

        },

        "performance":

        {

            "stream_latency":

            read_performance(),

            "spark_execution_time":

            "38 seconds"

        }

    }
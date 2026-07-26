from fastapi import FastAPI
import boto3
import pandas as pd
import io
from botocore.exceptions import ClientError


app = FastAPI(
    title="Music Charts Analytics API",
    version="1.0"
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
# DynamoDB Speed Layer
# --------------------------------

@app.get("/latest-events")
def latest_events():

    try:

        response = events_table.scan(
            Limit=20
        )


        return response.get(
            "Items",
            []
        )


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

        response = trend_table.scan()


        items = response.get(
            "Items",
            []
        )


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

            )

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
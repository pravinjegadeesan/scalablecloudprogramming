from pyspark.sql import SparkSession
from pyspark.sql.functions import count, desc


# -------------------------------
# Create Spark Session
# -------------------------------

spark = (
    SparkSession.builder
    .appName("LastFM Batch Analytics")
    .getOrCreate()
)


# -------------------------------
# Read LastFM Dataset from S3
# -------------------------------

input_path = (
    "s3://music-charts-data-lake/"
    "batch-data/lastfm_dataset.csv"
)

df = (
    spark.read
    .option("header", "true")
    .option("inferSchema", "true")
    .csv(input_path)
)


print("========== Dataset Preview ==========")

df.show(10)


print("========== Dataset Schema ==========")

df.printSchema()


# -------------------------------
# Check Required Columns
# -------------------------------

required_columns = [
    "Artist",
    "Track",
    "Album"
]


for column in required_columns:
    if column not in df.columns:
        raise Exception(
            f"Missing column: {column}. "
            f"Available columns: {df.columns}"
        )


# -------------------------------
# 1. Top Artists
# -------------------------------

top_artists = (
    df
    .groupBy("Artist")
    .agg(
        count("*").alias("listen_count")
    )
    .orderBy(
        desc("listen_count")
    )
)


print("========== Top Artists ==========")

top_artists.show(10)


top_artists.write \
    .mode("overwrite") \
    .option("header", "true") \
    .csv(
        "s3://music-charts-data-lake/results/top-artists/"
    )


# -------------------------------
# 2. Top Tracks
# -------------------------------

top_tracks = (
    df
    .groupBy("Track")
    .agg(
        count("*").alias("listen_count")
    )
    .orderBy(
        desc("listen_count")
    )
)


print("========== Top Tracks ==========")

top_tracks.show(10)


top_tracks.write \
    .mode("overwrite") \
    .option("header", "true") \
    .csv(
        "s3://music-charts-data-lake/results/top-tracks/"
    )


# -------------------------------
# 3. Top Albums
# -------------------------------

top_albums = (
    df
    .groupBy("Album")
    .agg(
        count("*").alias("listen_count")
    )
    .orderBy(
        desc("listen_count")
    )
)


print("========== Top Albums ==========")

top_albums.show(10)


top_albums.write \
    .mode("overwrite") \
    .option("header", "true") \
    .csv(
        "s3://music-charts-data-lake/results/top-albums/"
    )


# -------------------------------
# Finish
# -------------------------------

print("========== Batch Analytics Completed ==========")


spark.stop()
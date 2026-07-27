import time

from pyspark.sql import SparkSession
from pyspark.sql.functions import count

start = time.time()

spark = (
    SparkSession.builder
    .appName("BenchmarkSparkLastFM")
    .master("local[*]")
    .getOrCreate()
)

df = (
    spark.read
    .option("header", "true")
    .option("inferSchema", "true")
    .csv("datasets/lastfm_dataset.csv")
)

result = (
    df.groupBy("Artist")
    .agg(count("*").alias("count"))
    .orderBy("count", ascending=False)
)

result.show(5)

spark.stop()
end = time.time()

print("Spark:", round(end - start, 2), "seconds")

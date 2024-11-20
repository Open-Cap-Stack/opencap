import pytest
from pyspark.sql import SparkSession
import pandas as pd
import os

@pytest.fixture(scope="session")
def spark():
    return SparkSession.builder \
        .appName("test") \
        .master("local[*]") \
        .config("spark.driver.host", "localhost") \
        .getOrCreate()

def test_spark_data_processing(spark):
    # Create test data
    test_data = [
        (1, "Alice", 100),
        (2, "Bob", 200),
        (3, "Charlie", 300)
    ]
    
    # Create Spark DataFrame
    df = spark.createDataFrame(
        test_data,
        ["id", "name", "value"]
    )
    
    # Perform transformations
    result = df.groupBy("name") \
        .sum("value") \
        .orderBy("name")
        
    # Convert to Pandas for assertions
    pandas_df = result.toPandas()
    
    assert len(pandas_df) == 3
    assert pandas_df.iloc[0]["name"] == "Alice"
    assert pandas_df.iloc[0]["sum(value)"] == 100

def test_spark_minio_integration(spark):
    # Assuming MinIO is configured
    spark.conf.set("spark.hadoop.fs.s3a.endpoint", "http://localhost:9000")
    spark.conf.set("spark.hadoop.fs.s3a.access.key", "minioadmin")
    spark.conf.set("spark.hadoop.fs.s3a.secret.key", "minioadmin")
    spark.conf.set("spark.hadoop.fs.s3a.path.style.access", "true")
    spark.conf.set("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
    
    # Write test data to MinIO
    test_df = spark.createDataFrame([(1, "test")], ["id", "name"])
    test_df.write.mode("overwrite").parquet("s3a://test-bucket/test-data")
    
    # Read back and verify
    read_df = spark.read.parquet("s3a://test-bucket/test-data")
    assert read_df.count() == 1

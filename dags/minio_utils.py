"""
MinIO Utility Functions for Airflow DAGs

This module provides utilities for interacting with MinIO storage from Airflow DAGs.
Following the BDD/TDD approach from Semantic Seed Venture Studio Coding Standards.
"""
from minio import Minio
import os

def upload_to_minio(bucket_name, file_path, object_name):
    """
    Upload a file to MinIO storage
    
    Args:
        bucket_name (str): The name of the bucket
        file_path (str): The path to the file to upload
        object_name (str): The name to give the object in MinIO
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        client = Minio(
            endpoint='172.18.0.7:9000',
            access_key='minio',
            secret_key='minio123',
            secure=False
        )
        
        # Create bucket if it doesn't exist
        if not client.bucket_exists(bucket_name):
            print(f"Bucket {bucket_name} does not exist, creating it.")
            client.make_bucket(bucket_name)
            print(f"Bucket {bucket_name} created successfully.")
            
        # Upload file
        result = client.fput_object(
            bucket_name,
            object_name,
            file_path,
        )
        
        print(f"Successfully uploaded {object_name} to bucket {bucket_name}")
        return True
    except Exception as e:
        print(f"Error in upload_to_minio: {str(e)}")
        raise e

def download_from_minio(bucket_name, object_name, file_path):
    """
    Download a file from MinIO storage.
    
    Args:
        bucket_name (str): Name of the bucket to download from
        object_name (str): Name of the object in MinIO
        file_path (str): Local path to save the downloaded file
        
    Returns:
        bool: True if download was successful
        
    Raises:
        Exception: If download fails
    """
    try:
        client = Minio(
            endpoint='172.18.0.7:9000',
            access_key='minio',
            secret_key='minio123',
            secure=False
        )
        
        # Download file
        client.fget_object(
            bucket_name,
            object_name,
            file_path
        )
        print(f"Successfully downloaded {object_name} to {file_path}")
        return True
    except Exception as e:
        print(f"Error in download_from_minio: {str(e)}")
        raise e

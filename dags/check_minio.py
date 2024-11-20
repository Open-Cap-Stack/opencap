from minio import Minio

client = Minio(
    "localhost:9000",
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)

try:
    # List objects in bucket
    objects = client.list_objects('lakehouse-bucket', prefix='datasets/')
    print("\nObjects in lakehouse-bucket/datasets/:")
    for obj in objects:
        print(f" - {obj.object_name}: {obj.size} bytes")
    
    # Get the file content to verify
    try:
        data = client.get_object('lakehouse-bucket', 'datasets/test-dataset.csv')
        print("\nFile contents:")
        print(data.read().decode())
    except Exception as e:
        print(f"Error reading file: {str(e)}")
        
except Exception as e:
    print(f"Error listing objects: {str(e)}")

        client = Minio(
            endpoint='127.0.0.1:9000',
            access_key='minioadmin',
            secret_key='minioadmin',
            secure=False
        )
        # Upload file
        result = client.fput_object(
            bucket_name,
            object_name,
            file_path,
        )
        print(f"Successfully uploaded {result.object_name} of size {result.size} bytes")
        return True
    except Exception as e:
        print(f"Error in upload_to_minio: {str(e)}")
        raise e
EOL
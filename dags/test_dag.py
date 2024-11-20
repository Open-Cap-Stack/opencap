cd /Users/tobymorning/opencap-main/dags
cat > test_dag.py << 'EOL'
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
from minio_utils import upload_to_minio
import os

# DAG definition
default_args = {
    "owner": "airflow",
    "start_date": datetime(2024, 10, 21),
    "retries": 1
}

dag = DAG(
    "test_dag",
    default_args=default_args,
    description="Test DAG with MinIO integration",
    schedule_interval="@once",
    catchup=False
)

def upload_data_to_minio(**context):
    try:
        # Get the absolute path to the test file
        dags_folder = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(dags_folder)
        file_path = os.path.join(project_root, "__tests__", "test-dataset.csv")
        
        print(f"Looking for file at: {file_path}")
        
        # Verify file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found at {file_path}")
        
        bucket_name = "lakehouse-bucket"
        object_name = "datasets/test-dataset.csv"
        
        # Upload file to MinIO
        upload_to_minio(bucket_name, file_path, object_name)
        
        print(f"Successfully uploaded {object_name} to {bucket_name}")
        return True
    except Exception as e:
        print(f"Error in upload_data_to_minio: {str(e)}")
        raise e

# Task: Upload data to MinIO
upload_task = PythonOperator(
    task_id="upload_data_to_minio",
    python_callable=upload_data_to_minio,
    provide_context=True,
    dag=dag
)

# Task execution sequence
upload_task
EOL
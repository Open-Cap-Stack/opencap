"""
OpenCap Test Pipeline DAG

This DAG tests the data pipeline infrastructure for OpenCap, including:
- MinIO integration for object storage
- Pandas for data processing
- Integration with MongoDB and PostgreSQL

Following the BDD/TDD approach from Semantic Seed Venture Studio Coding Standards.
"""
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta
from minio_utils import upload_to_minio, download_from_minio
import os
import json
import tempfile

# Define default arguments
default_args = {
    'owner': 'opencap',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
    'start_date': datetime(2025, 3, 15)
}

# Initialize the DAG
dag = DAG(
    'opencap_test_pipeline',
    default_args=default_args,
    description='Test DAG for OpenCap data pipeline',
    schedule_interval=None,
    catchup=False
)

# Task 1: Create a test dataset
def create_test_dataset(**context):
    """Generate a test CSV file for data pipeline testing"""
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, 'opencap_test_data.csv')
    
    # Create a sample CSV file
    with open(file_path, 'w') as f:
        f.write("employee_id,name,department,salary\n")
        f.write("1,John Doe,Engineering,120000\n")
        f.write("2,Jane Smith,Finance,110000\n")
        f.write("3,Bob Johnson,Marketing,95000\n")
        f.write("4,Sarah Williams,Engineering,125000\n")
        f.write("5,Michael Brown,Finance,105000\n")
    
    # Pass the file path to the next task
    context['ti'].xcom_push(key='test_file_path', value=file_path)
    print(f"Created test dataset at: {file_path}")
    return file_path

# Task 2: Upload the dataset to MinIO
def upload_dataset_to_minio(**context):
    """Upload the test dataset to MinIO storage"""
    ti = context['ti']
    file_path = ti.xcom_pull(key='test_file_path')
    
    # Define the bucket and object name
    bucket_name = 'opencap-test'
    object_name = 'datasets/employee_data.csv'
    
    # Upload to MinIO
    result = upload_to_minio(bucket_name, file_path, object_name)
    
    # Pass the MinIO information to the next task
    minio_info = {
        'bucket_name': bucket_name,
        'object_name': object_name
    }
    ti.xcom_push(key='minio_info', value=minio_info)
    
    return result

# Task 3: Process the data with pandas
def process_data_with_pandas(**context):
    """Process data using pandas instead of PySpark for testing"""
    import os
    import tempfile
    import pandas as pd
    
    # Get MinIO info from XCom
    ti = context['ti']
    minio_info = ti.xcom_pull(task_ids='upload_dataset_to_minio', key='minio_info')
    bucket_name = minio_info['bucket_name']
    object_name = minio_info['object_name']
    
    print(f"Processing data from bucket: {bucket_name}, object: {object_name}")
    
    try:
        # Download the file locally for processing
        temp_dir = tempfile.gettempdir()
        local_file = os.path.join(temp_dir, 'downloaded_data.csv')
        download_from_minio(bucket_name, object_name, local_file)
        
        # Process with pandas instead of Spark
        df = pd.read_csv(local_file)
        print(f"Downloaded data with {len(df)} rows")
        
        # Perform data transformations
        dept_avg_salary = df.groupby('department')['salary'].mean().reset_index()
        dept_avg_salary.columns = ['department', 'avg_salary']
        print(f"Calculated department salary averages for {len(dept_avg_salary)} departments")
        
        # Save results locally
        result_path = os.path.join(temp_dir, 'department_salary_avg.csv')
        dept_avg_salary.to_csv(result_path, index=False)
        
        # Upload results back to MinIO
        result_object = "datasets/department_salary_avg.csv"
        upload_to_minio(bucket_name, result_path, result_object)
        
        # Return the result info
        result_info = {
            'bucket': bucket_name,
            'object': result_object,
            'record_count': len(dept_avg_salary)
        }
        ti.xcom_push(key='result_info', value=result_info)
        
        return result_info
        
    except Exception as e:
        print(f"Error in process_data_with_pandas: {str(e)}")
        raise e

# Task 4: Verify the results
def verify_results(**context):
    """Verify the results of the data pipeline"""
    ti = context['ti']
    result_info = ti.xcom_pull(key='result_info')
    
    # Download the results
    temp_dir = tempfile.gettempdir()
    results_file = os.path.join(temp_dir, 'verification_results.csv')
    
    try:
        # Download the processed data
        download_from_minio(result_info['bucket'], result_info['object'], results_file)
        
        # Check the file exists and has content
        if not os.path.exists(results_file):
            raise Exception(f"Results file not found: {results_file}")
            
        with open(results_file, 'r') as f:
            content = f.read()
            print(f"Verification Results Content:\n{content}")
            
        # Log success
        print(" Data pipeline verification complete")
        return True
        
    except Exception as e:
        print(f"Error in verification: {str(e)}")
        raise e

# Define the tasks
create_dataset_task = PythonOperator(
    task_id='create_test_dataset',
    python_callable=create_test_dataset,
    provide_context=True,
    dag=dag
)

upload_to_minio_task = PythonOperator(
    task_id='upload_dataset_to_minio',
    python_callable=upload_dataset_to_minio,
    provide_context=True,
    dag=dag
)

pandas_processing_task = PythonOperator(
    task_id='process_data_with_pandas',
    python_callable=process_data_with_pandas,
    provide_context=True,
    dag=dag
)

verify_results_task = PythonOperator(
    task_id='verify_results',
    python_callable=verify_results,
    provide_context=True,
    dag=dag
)

# Define the task dependencies
create_dataset_task >> upload_to_minio_task >> pandas_processing_task >> verify_results_task

#!/bin/bash
# Airflow initialization script - Following Semantic Seed Coding Standards V2.0

echo "Initializing Airflow database..."

# Wait for Airflow database to be ready
sleep 10

# Initialize Airflow database
docker exec -it opencap_airflow_webserver airflow db init

# Create admin user
docker exec -it opencap_airflow_webserver airflow users create \
    --username admin \
    --password admin \
    --firstname Admin \
    --lastname User \
    --role Admin \
    --email admin@opencap.org

echo "Airflow initialization complete!"

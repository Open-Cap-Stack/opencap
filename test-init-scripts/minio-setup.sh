#!/bin/bash
# MinIO setup script for test environment
# This script creates buckets and sets policies for the test environment

set -e

# Wait for MinIO to be fully up and running
echo "Waiting for MinIO test container to be ready..."
sleep 5

# Configure MinIO client
mc config host add minio-test http://minio-test:9000 minioadmin minioadmin

# Create test buckets
echo "Creating test buckets..."
mc mb -p minio-test/test-bucket
mc mb -p minio-test/financial-reports
mc mb -p minio-test/documents
mc mb -p minio-test/datasets

# Set policies for test access
echo "Setting bucket policies..."
mc policy set download minio-test/test-bucket
mc policy set download minio-test/financial-reports
mc policy set download minio-test/documents
mc policy set download minio-test/datasets

echo "MinIO test setup complete!"

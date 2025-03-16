# OpenCap Project Context

## Project Overview
OpenCap is a financial management system designed for banking and compliance-based clients. The application follows Semantic Seed Venture Studio Coding Standards V2.0, emphasizing code quality, security, collaboration, and Behavior-Driven Development (BDD).

## Environment Architecture

### Core Services

#### 1. Database Services
- **MongoDB**
  - Image: `mongo:5.0`
  - Container: `opencap_mongodb`
  - Purpose: Document-oriented database for storing unstructured data
  - Credentials:
    - Root User: opencap
    - Root Password: password123
    - Database: opencap
  - Port Mapping: 27017:27017
  - Volumes:
    - `/data/db` → `mongodb_data`
    - Initialization scripts: `./init-scripts/mongo:/docker-entrypoint-initdb.d`
  - Key Collections:
    - financialReport
    - users
    - documents
    - activities
    - notifications
    - complianceChecks
    - communications

- **PostgreSQL**
  - Image: `postgres:15-alpine`
  - Container: `opencap_postgres`
  - Purpose: Relational database for structured data storage
  - Credentials:
    - User: postgres
    - Password: password
    - Database: opencap
  - Port Mapping: 5432:5432
  - Volumes:
    - `/var/lib/postgresql/data` → `postgres_data`

#### 2. Storage Service
- **MinIO**
  - Image: `minio/minio:latest`
  - Container: `opencap_minio`
  - Purpose: S3-compatible object storage service
  - Credentials:
    - User: minio
    - Password: minio123
  - Command: `server /data`
  - Port Mapping: 
    - 9000:9000 (API)
    - 9001:9001 (Console)
  - Volumes:
    - `/data` → `minio_data`

#### 3. Big Data Processing
- **Apache Spark Master**
  - Image: `bitnami/spark:latest`
  - Container: `opencap_spark`
  - Purpose: Distributed data processing coordinator
  - Configuration:
    - Mode: master
    - Master Port: 7077
    - Web UI Port: 8080
  - Port Mapping:
    - 7077:7077 (Spark master)
    - 8080:8080 (Spark UI)
  - Volumes:
    - `/opt/bitnami/spark` → `spark_data`

- **Apache Spark Worker**
  - Image: `bitnami/spark:latest`
  - Container: `opencap_spark_worker`
  - Purpose: Process execution node for Spark tasks
  - Configuration:
    - Mode: worker
    - Master URL: spark://spark:7077
    - Worker Memory: 1G
    - Worker Cores: 1
  - Volumes:
    - `/opt/bitnami/spark` → `spark_worker_data`
  - Dependencies:
    - Requires Spark master to be running

#### 4. Workflow Orchestration
- **Airflow Webserver**
  - Image: `apache/airflow:2.7.2`
  - Container: `opencap_airflow_webserver`
  - Purpose: Web interface for monitoring and managing workflows
  - Command: webserver
  - Port Mapping: 8085:8080
  - Environment Variables:
    - AIRFLOW__CORE__EXECUTOR: CeleryExecutor
    - AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION: True
    - AIRFLOW__CORE__LOAD_EXAMPLES: False
    - AIRFLOW__DATABASE__SQL_ALCHEMY_CONN: postgresql+psycopg2://airflow:airflow@airflow-db:5432/airflow
    - AIRFLOW__CELERY__RESULT_BACKEND: db+postgresql://airflow:airflow@airflow-db:5432/airflow
    - AIRFLOW__CELERY__BROKER_URL: redis://airflow-redis:6379/0
  - Volumes:
    - `/opt/airflow` → `airflow_data`
  - Dependencies:
    - Airflow Scheduler
    - Airflow DB
    - Airflow Redis
    - Airflow Init

- **Airflow Scheduler**
  - Image: `apache/airflow:2.7.2`
  - Container: `opencap_airflow_scheduler`
  - Purpose: Schedules and triggers workflows
  - Command: scheduler
  - Environment Variables: (Same as Airflow Webserver)
  - Volumes: (Same as Airflow Webserver)
  - Dependencies:
    - Airflow DB
    - Airflow Redis
    - Airflow Init

- **Airflow Database**
  - Image: `postgres:15-alpine`
  - Container: `opencap_airflow_db`
  - Purpose: Metadata storage for Airflow
  - Credentials:
    - User: airflow
    - Password: airflow
    - Database: airflow
  - Volumes:
    - `/var/lib/postgresql/data` → `airflow_db_data`

- **Airflow Redis**
  - Image: `redis:6-alpine`
  - Container: `opencap_airflow_redis`
  - Purpose: Message broker for Airflow Celery executor
  - Port Mapping: 6379:6379

- **Airflow Initialization**
  - Image: `apache/airflow:2.7.2`
  - Container: `opencap_airflow_init`
  - Purpose: One-time initialization of Airflow database and admin user
  - Command: `-c "airflow db init && airflow users create --username admin --password admin --firstname Admin --lastname User --role Admin --email admin@opencap.org && exit 0"`
  - Dependencies:
    - Airflow DB

#### 5. Application
- **Node.js App**
  - Image: Built from Dockerfile in root directory
  - Container: `opencap-app-1`
  - Purpose: Main application service
  - Port Mapping: 3000:3000
  - Environment Variables:
    - DATABASE_URL: postgres://postgres:password@postgres:5432/opencap
    - MINIO_ENDPOINT: http://minio:9000
    - MINIO_ACCESS_KEY: minio
    - MINIO_SECRET_KEY: minio123
    - NODE_ENV: development
  - Volumes:
    - `.:/app`
    - `/app/node_modules`
  - Command: `nodemon app.js`
  - Dependencies:
    - PostgreSQL
    - MinIO
    - Spark
    - Airflow Webserver

## Test Environment

A separate Docker Compose configuration (`docker-compose.test.yml`) is provided for running integration tests with a streamlined set of services:

- **MongoDB Test**
  - Database: opencap_test
  - Test User: testapp (password: password123)
  - Roles: readWrite, dbAdmin

- **PostgreSQL Test**
  - Database: opencap_test

- **MinIO Test**
  - For test object storage

## Test Environment Troubleshooting

### MongoDB Authentication Issues

#### Problem Overview
The MongoDB authentication in the test environment was failing due to several issues:
1. Incorrect credentials in the connection string
2. User creation scripts not executing properly during container initialization
3. Test isolation issues causing duplicate key errors

#### Diagnosis Process
1. **Connection Verification**
   - Manually tested direct connection to MongoDB outside Docker with `mongosh`
   - Verified MongoDB was running with `mongosh --eval "db.runCommand({ connectionStatus: 1 })"`
   - Created a standalone connection test script (`simple-mongodb-test.js`) to isolate the issue

2. **Authentication Configuration**
   - Found discrepancies between the MongoDB initialization scripts:
     - `00-create-users.js` contained references to users that didn't match `init-mongo.sh`
     - The Docker container wasn't executing the initialization scripts properly
   - MongoDB was running without proper user creation

3. **Docker Configuration Issues**
   - The `docker-compose.test.yml` needed modifications to properly run MongoDB with authentication
   - Initial configuration included unnecessary authentication mechanisms

#### Solutions Implemented

1. **User Creation**
   - Manually created the root user with appropriate permissions:
   ```javascript
   db.getSiblingDB('admin').createUser({
     user: 'opencap', 
     pwd: 'password123', 
     roles: [{role: 'root', db: 'admin'}]
   });
   ```

2. **Connection String Updates**
   - Updated the MongoDB connection string in test environment:
   ```
   mongodb://opencap:password123@localhost:27017/opencap_test?authSource=admin
   ```
   - Standardized connection parameters across all test files

3. **Test Isolation**
   - Implemented proper test isolation by:
     - Using unique IDs for each test case
     - Adding proper cleanup in `beforeAll` and `afterAll` hooks
     - Creating a database cleanup script (`clean-test-db.js`) for test reset

4. **Docker Configuration Improvements**
   - Simplified MongoDB Docker configuration:
   ```yaml
   command: mongod  # Removed unnecessary --auth flag
   ```
   - Removed explicit SCRAM-SHA-1 mechanism that was causing issues

#### Best Practices for MongoDB Testing

1. **Database Connection**
   - Always verify MongoDB connection with authentication before running tests
   - Use consistent connection strings across all test files
   - Include proper error handling for connection failures

2. **Test Isolation**
   - Create unique test data for each test case
   - Clean up database before and after tests
   - Use proper hooks (`beforeAll`, `afterAll`) for setup and teardown

3. **Authentication Management**
   - Store MongoDB credentials in environment variables
   - Verify initialization scripts create the expected users
   - Test authentication with different user roles

4. **Docker Configuration**
   - Use consistent naming conventions for containers
   - Verify container health before running tests
   - Remove old volumes when recreating containers

#### Future Improvements
1. Update initialization scripts to create test users reliably
2. Add health checks to verify MongoDB users are created properly
3. Implement consistent cleanup between test runs
4. Document MongoDB authentication schema for developers

### Container Connection IPv4/IPv6 Issues

#### Problem Overview
The integration tests were failing with connection errors to Docker containers due to IPv6 resolution issues.

#### Diagnosis Process
1. **Container Connectivity Verification**
   - Verified that all Docker containers were running: `docker ps`
   - Tested direct connections to containers from the host using: `nc -zv localhost PORT`
   - Confirmed containers were accessible via IPv4 but tests were failing due to IPv6 lookups

2. **Root Cause**
   - Tests were failing because Node.js was preferring IPv6 (`::1`) when resolving `localhost`
   - Docker containers were only listening on IPv4 interfaces

3. **Solution**
   - Modified Docker test environment configuration to use explicit IPv4 addresses
   - Updated connection strings in `docker-test-env.js`:
     ```javascript
     // Changed from localhost to explicit IPv4
     process.env.MONGO_URI = 'mongodb://opencap:password123@127.0.0.1:27017/opencap_test?authSource=admin';
     process.env.DATABASE_URL = 'postgres://postgres:password@127.0.0.1:5433/opencap_test';
     process.env.PG_HOST = '127.0.0.1';
     process.env.MINIO_ENDPOINT = '127.0.0.1';
     ```
   - Integration tests now reliably connect to Docker containers

#### Verification
All tests now pass successfully with proper connections to:
- MongoDB test container at 127.0.0.1:27017
- PostgreSQL test container at 127.0.0.1:5433
- MinIO test container at 127.0.0.1:9090

### Container State Verification

To verify that all required containers for OpenCap are running properly:

1. **Check Test Environment Containers**
   ```bash
   docker-compose -f docker-compose.test.yml ps
   ```

2. **Check Production/Development Environment Containers**
   ```bash
   docker-compose ps
   ```

3. **Resolve Port Conflicts**
   - If starting both test and production environments simultaneously, port conflicts may occur
   - Stop test containers before starting production containers:
     ```bash
     docker-compose -f docker-compose.test.yml down
     docker-compose up -d
     ```

4. **Container Access Points**

## Initialization Scripts

### MongoDB Initialization
- Production: `/init-scripts/mongo/01-init-mongo.js`
  - Creates application user with appropriate roles
  - Sets up database collections with proper schema validation
  - Inserts initial admin user

- Test: `/test-init-scripts/mongo/01-init-mongo.js`
  - Creates test database user with appropriate roles
  - Sets up test collections
  - Inserts test data

### Airflow Initialization
- Performed by the `airflow-init` container
- Creates admin user (admin/admin)
- Initializes the Airflow database schema

## Access Information

### Service URLs
- **Main Application**: http://localhost:3000
- **MinIO Console**: http://localhost:9001
- **Spark Master UI**: http://localhost:8080
- **Airflow UI**: http://localhost:8085 (admin/admin)

### Database Connection Strings
- **MongoDB**: mongodb://opencap:password123@localhost:27017/opencap
- **PostgreSQL**: postgres://postgres:password@localhost:5432/opencap

## Development Workflow

1. Start the environment: `docker-compose up -d`
2. Run tests: `docker-compose -f docker-compose.test.yml up -d`
3. Stop services: `docker-compose down`
4. Remove volumes: `docker-compose down -v`

## Project Standards
This project follows the Semantic Seed Venture Studio Coding Standards V2.0, which emphasizes:

1. Test-Driven Development (TDD) and Behavior-Driven Development (BDD)
2. XP-oriented development practices
3. Secure coding practices for banking and compliance applications
4. Comprehensive testing using Jest/Mocha for BDD-style tests

## Security Considerations
- Database credentials are stored in environment variables
- MongoDB users have specific role-based permissions
- MinIO uses access/secret keys for authentication
- Database data is persisted in Docker volumes

## Running the Application
The Node.js application automatically starts when running `docker-compose up -d`. The application is built from the Dockerfile in the project root, which installs all necessary dependencies from package.json.

# OpenCap Project Structure

This document outlines the OpenCap project structure, following the Semantic Seed Venture Studio Coding Standards V2.0.

## Root Directory

The root directory contains essential project files:

- **Docker Files**:
  - `Dockerfile` - Development container configuration
  - `Dockerfile.prod` - Production container configuration
  - `docker-compose.yml` - Main production environment with all services
  - `docker-compose.test.yml` - Test environment configuration

- **Package Management**:
  - `package.json` - Project dependencies and scripts
  - `package-lock.json` - Locked versions of dependencies

- **Core Application Files**:
  - `app.js` - Main application entry point
  - `server.js` - Server configuration
  - `db.js` - Database connection utilities

- **Project Documentation**:
  - `README.md` - Project overview and getting started guide
  - `LICENSE` - Project license information
  - `CODE_OF_CONDUCT.md` - Community guidelines

- **Configuration**:
  - `babel.config` - Babel transpiler configuration
  - `jest.config.js` - Jest test framework configuration
  - `jest.config.integration.js` - Integration test configuration

## Directory Structure

- **`/config`**: Configuration files
  - `/database` - Database-specific configuration

- **`/controllers`**: Request handlers for routes
  - Contains business logic for API endpoints

- **`/models`**: Database models and schemas
  - Data structure definitions

- **`/routes`**: API route definitions
  - URL endpoint mapping to controllers

- **`/utils`**: Utility functions and helpers
  - Reusable code used across the application

- **`/docs`**: Project documentation
  - `context.md` - Environment and setup documentation
  - `project-structure.md` - This file

- **`/client`**: Frontend application code
  - React components and UI logic

- **`/dags`**: Airflow DAG definitions
  - Workflow definitions for Airflow

- **`/init-scripts`**: Initialization scripts
  - `/mongo` - MongoDB initialization scripts

- **`/test-init-scripts`**: Test initialization scripts
  - `/mongo` - Test MongoDB initialization

- **`/__tests__`**: Jest test files
  - Unit and integration tests
  - `/setup` - Test setup utilities

- **`/test`**: Additional test files
  - Legacy or alternative test frameworks

- **`/mocha-tests`**: Mocha-specific tests
  - BDD-style tests

- **`/reports`**: Generated reports
  - Test coverage and other outputs

- **`/src`**: Source code organization
  - `/app` - Application-specific code
  - `/database` - Database utilities
  - `/utils` - Additional utilities

## Docker Services Architecture

The project uses Docker Compose to manage multiple services:

1. **MongoDB** - Document storage (port 27017)
2. **PostgreSQL** - Relational database (port 5432)
3. **MinIO** - Object storage (ports 9000, 9001)
4. **Apache Spark** - Data processing
   - Master node (ports 7077, 8080)
   - Worker node
5. **Airflow** - Workflow orchestration
   - Webserver (port 8085)
   - Scheduler
   - Database
   - Redis
   - Initialization service
6. **Node.js Application** - Main application (port 3000)

## Development Workflow

1. Start the environment: `docker-compose up -d`
2. Run tests: `docker-compose -f docker-compose.test.yml up -d`
3. Access services via their respective ports
4. Follow the TDD/BDD approach outlined in the Semantic Seed Coding Standards

## Best Practices

- Follow the Semantic Seed Venture Studio Coding Standards V2.0
- Use Test-Driven Development (TDD) and Behavior-Driven Development (BDD)
- Maintain consistent code style with ESLint and Prettier
- Document code changes and features
- Write comprehensive tests for all features

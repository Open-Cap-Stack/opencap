# OpenCap Stack 🚀

**OpenCap Stack** is a comprehensive financial management application designed to manage stakeholders, share classes, documents, activities, notifications, equity simulations, tax calculations, and financial reporting. The project follows a Test-Driven Development (TDD) approach to ensure code quality and reliability and is fully aligned with the Open Cap Table Alliance (OCTA) schema.

## Architecture Overview 🏗️

OpenCap Stack uses a modern, cloud-native architecture:

| Component | Technology | Description |
|-----------|------------|-------------|
| **Primary Database** | ZeroDB (AINative) | NoSQL tables, vector search, event streaming |
| **Backend** | Node.js + Express | REST API server |
| **File Storage** | MinIO / ZeroDB | S3-compatible file storage |
| **API Gateway** | Kong | Rate limiting, authentication |
| **Containerization** | Docker | Deployment and development |

**ZeroDB provides:**
- NoSQL table storage for all application data
- Vector search for semantic document search
- Memory management for AI agent context
- Event streaming for real-time updates
- File metadata storage

## Development Workflow 📝

This project follows the Semantic Seed Venture Studio Coding Standards (SSCS) which emphasizes:

- **Structured Backlog Management** with proper story IDs (OCAE-XXX, OCDI-XXX format)
- **Test-Driven Development (TDD)** with Red-Green-Refactor cycle
- **Consistent Branch Naming** (`feature/OCAE-XXX`, `bug/OCAE-XXX`, `chore/OCAE-XXX`)
- **Daily Commits** with proper prefixes (including "WIP:" for work in progress)
- **Pull Request Process** that maintains traceability to backlog items

For detailed workflow guidelines, see [SSCS_Workflow_Guide.md](docs/SSCS_Workflow_Guide.md).

## Installation 🛠️

Follow these steps to set up the project on your local machine:

### Prerequisites ✅

- Node.js (v14 or higher)
- Docker and Docker Compose (for containerized development)
- Git
- ZeroDB Account (sign up at https://api.ainative.studio/)

### Clone the Repository 📂

```bash
git clone https://github.com/Open-Cap-Stack/opencap.git
cd opencap
```

### Install Dependencies 📦

```bash
npm install
```

### Set Up Environment Variables 🔐

## Environment Variables

Create a `.env` file in the root directory based on the `.env.example` template:

```bash
cp .env.example .env
```

### Required Configuration

#### Primary Database: ZeroDB (REQUIRED)

OpenCap Stack uses ZeroDB (via AINative Studio) as its **primary database** for all operations including:
- NoSQL table storage for all application data
- Vector search for semantic document search
- Memory management for agent context
- Event streaming for real-time updates
- File storage for document uploads

**ZeroDB is required to run OpenCap Stack.**

```bash
# ZeroDB API Configuration
ZERODB_API_KEY=your_zerodb_api_key_here
ZERODB_BASE_URL=https://api.ainative.studio/api/v1
ZERODB_PROJECT_ID=your_project_id_here
```

**Setting up ZeroDB:**

1. **Create an AINative Studio Account**:
   - Visit [https://api.ainative.studio/](https://api.ainative.studio/)
   - Sign up for an account or log in

2. **Obtain API Credentials**:
   - Navigate to your account settings
   - Generate an API token
   - Copy the token to `ZERODB_API_KEY` in your `.env` file

3. **Create a ZeroDB Project**:
   - Option A: Create via API (recommended for automation):
     ```bash
     curl -X POST https://api.ainative.studio/api/v1/projects/ \
       -H "Authorization: Bearer YOUR_API_KEY" \
       -H "Content-Type: application/json" \
       -d '{"name": "OpenCap", "description": "OpenCap Financial Management System with Lakehouse Analytics"}'
     ```
   - Option B: Create via AINative Studio dashboard
   - Copy the project ID from the response to `ZERODB_PROJECT_ID`

4. **Verify ZeroDB Setup**:
   ```bash
   curl -X GET https://api.ainative.studio/api/v1/projects/YOUR_PROJECT_ID/database/status \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```
   You should see `status: ACTIVE` and `database_enabled: true`

For complete migration instructions from MongoDB, see the [ZeroDB Migration Guide](docs/zerodb-migration-guide.md).

For detailed API documentation, see the [ZeroDB API Reference](docs/zerodb-api-reference.md).

If you encounter any issues, check the [Troubleshooting Guide](docs/troubleshooting.md).

#### MongoDB Configuration (OPTIONAL - For Continuous Sync Only)

**MongoDB is completely optional** and only needed if you want to use the continuous sync feature (GitHub Issue #14).

**To run OpenCap Stack without MongoDB:**
1. Set `SYNC_ENABLED=false` in your `.env` file (or omit it entirely)
2. Comment out or remove `MONGODB_URI`
3. Start the application normally - it will use ZeroDB as the sole database

**To enable MongoDB for continuous sync:**

If you have an existing MongoDB database and want real-time synchronization to ZeroDB, you can enable the continuous sync feature:

```bash
# MongoDB connection (only needed if SYNC_ENABLED=true)
MONGODB_URI=mongodb://localhost:27017/opencap

# Enable real-time sync
SYNC_ENABLED=true

# Batch processing configuration
SYNC_BATCH_SIZE=50
SYNC_BATCH_TIMEOUT_MS=5000

# Retry configuration
SYNC_RETRY_ATTEMPTS=3
SYNC_RETRY_DELAY_MS=1000
SYNC_MAX_RETRY_DELAY_MS=30000

# Collections to sync (comma-separated, leave empty for all)
SYNC_COLLECTIONS=users,companies,stakeholders,transactions,documents

# Operation types to sync
SYNC_OPERATION_TYPES=insert,update,delete,replace
```

**Continuous Sync Features:**
- Real-time change detection using MongoDB Change Streams
- Automatic resume on connection loss with resume tokens
- Batch processing for high performance
- Exponential backoff retry with dead letter queue
- Comprehensive metrics and health monitoring
- Graceful shutdown with state persistence

For detailed documentation, see [MongoDB to ZeroDB Sync Guide](./docs/mongodb-zerodb-sync.md)

#### Server Configuration

```bash
PORT=3001
NODE_ENV=development
```

#### Authentication

```bash
JWT_SECRET=your_jwt_secret_change_this_in_production
JWT_EXPIRATION=24h
```

**Important**: Change the default JWT_SECRET to a strong, random value in production.

## Running the Project ▶️

### Start the Development Server 🌐

```bash
npm start
```

This command starts the server on [http://localhost:5000](http://localhost:5000).

### Start the Development Server 🔄

For automatic restarts on code changes, use:

```bash
npm run dev
```

## Running with Docker 🐳

For a containerized development environment:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Running Tests with Docker 🧪

```bash
docker-compose -f docker-compose.test.yml up --build
```

This will run all tests in a containerized environment, ensuring consistent test results across different development machines.

## Running Tests 🧪

The project uses Jest for testing. To run the tests, use the following command:

```bash
npm test
```

This command runs all the test cases defined in the `tests` directory.

### Code Coverage

We measure test coverage locally for development purposes only:

```bash
npm run test:coverage
```

**Important Note**: We do NOT integrate with Codecov or any other third-party coverage service. All coverage reporting should be performed locally and documented in pull requests when relevant.

## CI/CD Pipeline 🔄

Our continuous integration and deployment pipeline focuses on:

1. **Docker Hub**: For container image storage and versioning
2. **Digital Ocean**: For deployment and hosting

### Required GitHub Secrets

The following secrets are required for our CI/CD pipeline:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `DIGITALOCEAN_ACCESS_TOKEN`

### Deployment

We follow the deployment plan outlined in [OpenCap_TestCoverage_DigitalOceanDeployment.md](docs/OpenCap_TestCoverage_DigitalOceanDeployment.md).

## Resource Management Best Practices 🔧

To maintain codebase integrity and avoid conflicts:

1. **Verify Existing Docker Resources**:
   ```bash
   docker ps -a        # Check existing containers
   docker volume ls    # Check existing volumes
   ```

2. **Check Existing Files and Directories**:
   ```bash
   ls -la [directory]  # List directory contents
   find . -name "pattern"  # Find files matching pattern
   ```

3. **Review Configurations**: Always check current configuration before making changes
4. **Database Schema Changes**: Analyze existing schemas before modifications

These practices prevent duplication, conflicts, and ensure proper integration with the existing codebase.

## API Endpoints 📡

Here are the primary API endpoints for the project:

### Users 👤

- **POST /api/users**: Create a new user
- **GET /api/users**: Get all users
- **GET /api/users/:id**: Get a user by ID
- **PUT /api/users/:id**: Update a user by ID
- **DELETE /api/users/:id**: Delete a user by ID

### Stakeholders 👥

- **POST /api/stakeholders**: Create a new stakeholder
- **GET /api/stakeholders**: Get all stakeholders
- **GET /api/stakeholders/:id**: Get a stakeholder by ID
- **PUT /api/stakeholders/:id**: Update a stakeholder by ID
- **DELETE /api/stakeholders/:id**: Delete a stakeholder by ID

### Communication API 💬

- **POST /api/communications**: Create a new communication
- **GET /api/communications**: Get all communications
- **GET /api/communications/:id**: Get a communication by ID
- **PUT /api/communications/:id**: Update a communication
- **GET /api/communications/threads/:threadId**: Get communications by thread ID
- **POST /api/communications/threads**: Create a new thread

### SPV (Special Purpose Vehicle) API 🏢

- **POST /api/spv**: Create a new SPV
- **GET /api/spv**: Get all SPVs
- **GET /api/spv/:id**: Get an SPV by ID
- **PUT /api/spv/:id**: Update an SPV
- **GET /api/spv/status/:statusId**: Get SPVs by status

### SPV Asset API 💰

- **POST /api/spv-assets**: Create a new SPV asset
- **GET /api/spv-assets**: Get all SPV assets
- **GET /api/spv-assets/:id**: Get an SPV asset by ID
- **PUT /api/spv-assets/:id**: Update an SPV asset
- **POST /api/spv-assets/:id/valuation**: Add a valuation to an SPV asset

### Compliance Check API ✓

- **POST /api/compliance-checks**: Create a new compliance check
- **GET /api/compliance-checks**: Get all compliance checks
- **GET /api/compliance-checks/:id**: Get a compliance check by ID
- **PUT /api/compliance-checks/:id**: Update a compliance check

### Tax Calculator API 📊

- **POST /api/taxCalculations**: Create a new tax calculation
- **GET /api/taxCalculations**: Get all tax calculations
- **GET /api/taxCalculations/:id**: Get a tax calculation by ID
- **PUT /api/taxCalculations/:id**: Update a tax calculation

### Share Classes 🏦

- **POST /api/share-classes**: Create a new share class
- **GET /api/share-classes**: Get all share classes
- **GET /api/share-classes/:id**: Get a share class by ID
- **PUT /api/share-classes/:id**: Update a share class by ID
- **DELETE /api/share-classes/:id**: Delete a share class by ID

### Documents 📄

- **POST /api/documents**: Create a new document
- **GET /api/documents**: Get all documents
- **GET /api/documents/:id**: Get a document by ID
- **PUT /api/documents/:id**: Update a document by ID
- **DELETE /api/documents/:id**: Delete a document by ID

### Activities 📋

- **POST /api/activities**: Create a new activity
- **GET /api/activities**: Get all activities
- **GET /api/activities/:id**: Get an activity by ID
- **PUT /api/activities/:id**: Update an activity by ID
- **DELETE /api/activities/:id**: Delete an activity by ID

### Notifications 🔔

- **POST /api/notifications**: Create a new notification
- **GET /api/notifications**: Get all notifications
- **GET /api/notifications/:id**: Get a notification by ID
- **PUT /api/notifications/:id**: Update a notification by ID
- **DELETE /api/notifications/:id**: Delete a notification by ID

### Equity Simulations 📊

- **POST /api/equity-simulations**: Create a new equity simulation
- **GET /api/equity-simulations**: Get all equity simulations
- **GET /api/equity-simulations/:id**: Get an equity simulation by ID
- **PUT /api/equity-simulations/:id**: Update an equity simulation by ID
- **DELETE /api/equity-simulations/:id**: Delete an equity simulation by ID

### Tax Calculations 💰

- **POST /api/tax-calculations**: Create a new tax calculation
- **GET /api/tax-calculations**: Get all tax calculations
- **GET /api/tax-calculations/:id**: Get a tax calculation by ID
- **PUT /api/tax-calculations/:id**: Update a tax calculation by ID
- **DELETE /api/tax-calculations/:id**: Delete a tax calculation by ID

### Financial Reporting 📈

- **POST /api/financial-reports**: Create a new financial report
- **GET /api/financial-reports**: Get all financial reports
- **GET /api/financial-reports/:id**: Get a financial report by ID
- **PUT /api/financial-reports/:id**: Update a financial report by ID
- **DELETE /api/financial-reports/:id**: Delete a financial report by ID

## Project Structure 🗂️

The project structure is organized as follows:

```bash
opencap/
├── controllers/           # Controllers for handling API requests
├── models/                # Data models (Mongoose schemas, compatible with ZeroDB)
├── routes/                # API routes
│   └── v1/                # Versioned API routes
├── services/              # Business logic and external service integrations
│   ├── zerodbService.js   # ZeroDB API client
│   ├── databaseAdapter.js # Database abstraction layer
│   └── ...                # Other services
├── middleware/            # Express middleware (auth, validation, etc.)
├── tests/                 # Test cases
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── e2e/               # End-to-end tests
│   └── security/          # Security tests
├── docs/                  # Project documentation
│   ├── api/               # API documentation
│   ├── security/          # Security documentation
│   └── reports/           # Generated reports
├── scripts/               # Utility scripts
├── deployment/            # Deployment configurations
│   ├── kubernetes/        # K8s manifests
│   └── terraform/         # Infrastructure as code
├── config/                # Configuration files
├── .env.example           # Environment template
├── docker-compose.yml     # Docker compose for development
├── package.json           # Project metadata and dependencies
└── README.md              # This file
```

## Contributing 🤝

Contributions are welcome! This project follows the Semantic Seed Venture Studio Coding Standards (SSCS) with a Test-Driven Development (TDD) approach. All contributions should adhere to these standards for consistent workflow and code quality.

### Code of Conduct 📝

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please read the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details on our code of conduct.

### Guidelines for Contributing 📝

1. **Fork the repository**:

    ```bash
    git fork https://github.com/Open-Cap-Stack/opencap.git
    ```

2. **Create a new branch following SSCS naming conventions**:

    ```bash
    git checkout -b feature/OCAE-XXX  # For new features
    git checkout -b bug/OCAE-XXX      # For bug fixes
    git checkout -b chore/OCAE-XXX    # For maintenance tasks
    ```

3. **Write tests first (Red Tests)**:
    - Write tests that demonstrate the functionality is NOT already present.
    - Make a WIP commit:

    ```bash
    git add .
    git commit -m "WIP: OCAE-XXX: Red Tests for feature description"
    ```

4. **Implement code to pass the tests (Green Tests)**:
    - Write the minimum amount of code required to pass the tests.
    - Make a WIP commit when tests pass:

    ```bash
    git add .
    git commit -m "WIP: OCAE-XXX: Green Tests for feature description"
    ```

5. **Refactor your code**:
    - Refactor to improve code quality without changing functionality.
    - Re-run the tests and commit with a final message:

    ```bash
    git add .
    git commit -m "OCAE-XXX: Implement feature description"
    ```

6. **Push your branch and create a pull request**:

    ```bash
    git push origin feature/OCAE-XXX
    ```

    - Create a PR on GitHub with the story ID in the title.
    - Include story details in the description.
    - Mark the story as "Finished" in Shortcut.

7. **Daily Commits Required**:
    - Even for incomplete work, commit daily with "WIP:" prefix.
    - This ensures visibility and allows for collaboration.

For more detailed guidelines, refer to our [SSCS_Workflow_Guide.md](docs/SSCS_Workflow_Guide.md).

## Submitting Changes 🚀

Follow these steps to submit your code changes:

1. **Create a new branch**:

    ```bash
    git checkout -b feature/{story-id}  # For features
    git checkout -b bug/{story-id}      # For bugs
    git checkout -b chore/{story-id}    # For chores
    ```

2. **Make your changes**:
    - Ensure your code follows the coding standards (see below).

3. **Write failing tests**:
    - Write tests that demonstrate the functionality is NOT already present.
    - Make a WIP commit:

    ```bash
    git add .
    git commit -m "WIP: Red Tests."
    ```

4. **Implement code to pass the tests**:
    - Make WIP commits as you go, and commit code when your tests are green:

    ```bash
    git add .
    git commit -m "WIP: Green Tests."
    ```

5. **Refactor your code**:
    - Refactor to improve code quality. Re-run the tests and commit:

    ```bash
    git add .
    git commit -m "Refactor complete."
    ```

6. **Submit a pull request**:

    ```bash
    git push origin feature/{story-id}  # Push your branch
    ```

    - Go to the repository on GitHub and create a pull request from your branch to the main branch.

7. **Review process**:
    - Review outstanding pull requests, comment on, approve and merge open pull requests, or request changes on any PRs that need improvement.

## Coding Standards 🎨

Please follow these coding standards to maintain code quality and consistency:

- **Indentation**: Use 4 spaces for indentation.

- **Naming Conventions**:
  - Variables and functions: camelCase
  - Classes and components: PascalCase
  - Constants: UPPERCASE_SNAKE_CASE

- **Comments**:
  - Use JSDoc style comments for functions and classes.
  -

 Provide meaningful comments for complex code segments and functions.

- Document any public APIs and classes with clear explanations of their purpose and usage.
- Remove or update outdated comments as code changes.

- **Code Structure**:
  - Organize code into modules and components.
  - Keep functions small and focused on a single task.

- **Lint**: Ensure your code passes ESLint checks:

    ```bash
    npm run lint
    ```

- **Testing**:
  - Write unit tests using BDD-style frameworks like Mocha or Jasmine.
  - Follow the Arrange, Act, and Assert (AAA) pattern:

    ```javascript
    it('should correctly add two positive numbers', () => {
      // Arrange
      const num1 = 5;
      const num2 = 7;

      // Act
      const result = add(num1, num2);

      // Assert
      expect(result).to.equal(12);
    });
    ```

  - Write integration tests to validate interactions between different parts of the application.
  - Write functional tests to validate the application's functionality.

## License 📜

This project is licensed under the MIT License. See the LICENSE file for details.

# OpenCap Stack 🚀

[![Website](https://img.shields.io/badge/Website-opencapstack.com-blue)](https://opencapstack.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Open-Cap-Stack/opencap)](https://github.com/Open-Cap-Stack/opencap/stargazers)
[![Database](https://img.shields.io/badge/Database-ZeroDB-purple)](https://ainative.studio)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933)](https://nodejs.org)

**Open-source cap table & equity management platform — a free Carta alternative for startups.**

Manage stakeholders, share classes, SAFE notes, equity grants, 409A valuations, documents, data rooms, board management, and financial reporting. Powered by [ZeroDB](https://ainative.studio) — a NoSQL cloud database with built-in vector search, quantum-ready indexing, and real-time sync. Built with Test-Driven Development (TDD) and fully aligned with the [Open Cap Table Alliance (OCTA)](https://www.opencaptablecoalition.com/) schema.

🌐 **[opencapstack.com](https://opencapstack.com)** | 📖 **[Documentation](https://opencapstack.com/docs)** | 💬 **[Community](https://github.com/Open-Cap-Stack/opencap/discussions)**

## Powered by ZeroDB 🗄️

OpenCap Stack uses **[ZeroDB](https://ainative.studio)** as its primary database — a modern NoSQL cloud database that replaces MongoDB, PostgreSQL, and Pinecone with a single unified API.

**Why ZeroDB?**
- **NoSQL + Vector Search** — Document storage and semantic search in one database
- **Zero Infrastructure** — Fully managed cloud database, no servers to maintain
- **Built-in File Storage** — S3-compatible object storage included
- **Quantum-Ready Indexing** — Future-proof vector ranking algorithms
- **Real-Time Events** — Subscribe to data changes via WebSocket
- **One API, One Bill** — Replaces your entire data stack

OpenCap Stack migrated from MongoDB to ZeroDB in early 2026, eliminating 3 separate database dependencies while gaining vector search, file storage, and real-time capabilities out of the box.

👉 **Get started with ZeroDB**: [ainative.studio](https://ainative.studio)

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

- Node.js (v18 or higher)
- ZeroDB account ([ainative.studio](https://ainative.studio))
- Docker and Docker Compose (for containerized development)
- Git

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

Create a `.env` file in the root directory and add the following:

```bash
# ZeroDB (Primary Database)
ENABLE_ZERODB=true
ZERODB_API_KEY=your-zerodb-api-key
ZERODB_BASE_URL=https://api.ainative.studio/api/v1
AINATIVE_API_TOKEN=your-ainative-token

# Server
PORT=5000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

Get your ZeroDB API key at [ainative.studio](https://ainative.studio).

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
├── controllers/       # Controllers for handling API requests
├── models/            # Data models (ZeroDB compatible)
├── routes/            # API routes
├── __tests__/         # Test cases (unit, integration)
├── docs/              # Project documentation
├── dags/              # Airflow DAGs for data pipelines
├── services/          # Business logic (ZeroDB client, adapters)
├── .env               # Environment variables
├── .github/           # GitHub workflows for CI/CD
├── docker-compose.yml # Docker compose configuration
├── .gitignore         # Files to ignore in Git
├── CODE_OF_CONDUCT.md # Contributor code of conduct
├── package.json       # Project metadata and dependencies
├── README.md          # Project documentation
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

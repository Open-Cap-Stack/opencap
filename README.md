# OpenCap Stack 🚀

**OpenCap Stack** is a comprehensive MERN stack application designed to manage stakeholders, share classes, documents, activities, notifications, equity simulations, tax calculations, and financial reporting. The project follows a Test-Driven Development (TDD) approach to ensure code quality and reliability and is fully aligned with the Open Cap Table Alliance (OCTA) schema.

## Installation 🛠️

Follow these steps to set up the project on your local machine:

### Prerequisites ✅

- Node (v14 or higher)
- MongoDB

### Clone the Repository 📂

```bash
git clone https://github.com/your-username/your-repository.git
cd your-repository
```

### Install Dependencies 📦

```bash
npm install
```

### Set Up Environment Variables 🔐

## Environment Variables

Create a `.env` file in the root directory and add the following:

```bash
MONGODB_URI=mongodb://mongo:27017/opencap
PORT=5000
```

Replace `mongodb://mongo:27017/opencap` with your MongoDB connection string if it's different.

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

## Running Tests 🧪

The project uses Jest for testing. To run the tests, use the following command:

```bash
npm test
```

This command runs all the test cases defined in the `tests` directory.

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
├── models/            # Mongoose models
├── routes/            # API routes
├── tests/             # Test cases
├── .env               # Environment variables
├── .gitignore         # Files to ignore in Git
├── db.js              # Database connection
├── package.json       # Project metadata and dependencies
├── README.md          # Project documentation
```

## Contributing 🤝

Contributions are welcome! Please fork the repository and submit a pull request for any changes. This project follows a Test-Driven Development (TDD) approach, and all contributions should adhere to this coding style.

### Guidelines for Contributing 📝

1. **Fork the repository**:

    ```bash
    git fork https://github.com/Open-Cap-Stack/opencap.git
    ```

2. **Create a new branch**:

    ```bash
    git checkout -b feature-branch
    ```

3. **Write tests first**:
    - Ensure you write test cases for any new functionality or changes before writing the actual code.
    - Place your tests in the `tests` directory.

4. **Implement the functionality**:
    - Write the minimum amount of code required to pass the tests.

5. **Run tests**:

    ```bash
    npm test
    ```

    - Ensure all tests pass before committing your changes.

6. **Commit your changes**:

    ```bash
    git commit -am 'Add new feature'
    ```

7. **Push to your branch**:

    ```bash
    git push origin feature-branch
    ```

8. **Create a Pull Request**:
    - Go to the repository on GitHub and create a pull request from your branch.

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

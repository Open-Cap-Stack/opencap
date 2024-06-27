
```markdown
# OpenCap Stack

OpenCap Stack is a MERN stack application designed to manage stakeholders, share classes, documents, and activities. This project follows a Test-Driven Development (TDD) approach to ensure code quality and reliability.

## Table of Contents

- [Installation](#installation)
- [Running the Project](#running-the-project)
- [Running Tests](#running-tests)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Installation

Follow these steps to set up the project on your local machine:

### Prerequisites

- Node.js (v14 or higher)
- MongoDB

### Clone the Repository

```bash
git clone https://github.com/Open-Cap-Stack/opencap.git
cd your-repository
```

### Install Dependencies

```bash
npm install
```

### Set Up Environment Variables

Create a `.env` file in the root of the project and add the following environment variables:

```plaintext
MONGODB_URI=mongodb://localhost:27017/open-cap-stack
PORT=5000
```

Replace `mongodb://localhost:27017/open-cap-stack` with your MongoDB connection string if it's different.

## Running the Project

### Start the Development Server

```bash
npm start
```

This command starts the server on `http://localhost:5000`.

### Start the Development Server with Nodemon

For automatic restarts on code changes, use:

```bash
npm run dev
```

## Running Tests

The project uses Jest for testing. To run the tests, use the following command:

```bash
npm test
```

This command runs all the test cases defined in the `tests` directory.

## API Endpoints

Below are the primary API endpoints for the project:

### Users

- `POST /api/users`: Create a new user
- `GET /api/users`: Get all users
- `GET /api/users/:id`: Get a user by ID
- `PUT /api/users/:id`: Update a user by ID
- `DELETE /api/users/:id`: Delete a user by ID

### Stakeholders

- `POST /api/stakeholders`: Create a new stakeholder
- `GET /api/stakeholders`: Get all stakeholders
- `GET /api/stakeholders/:id`: Get a stakeholder by ID
- `PUT /api/stakeholders/:id`: Update a stakeholder by ID
- `DELETE /api/stakeholders/:id`: Delete a stakeholder by ID

### Share Classes

- `POST /api/shareclasses`: Create a new share class
- `GET /api/shareclasses`: Get all share classes
- `GET /api/shareclasses/:id`: Get a share class by ID
- `PUT /api/shareclasses/:id`: Update a share class by ID
- `DELETE /api/shareclasses/:id`: Delete a share class by ID

### Documents

- `POST /api/documents`: Create a new document
- `GET /api/documents`: Get all documents
- `GET /api/documents/:id`: Get a document by ID
- `PUT /api/documents/:id`: Update a document by ID
- `DELETE /api/documents/:id`: Delete a document by ID

### Activities

- `POST /api/activities`: Create a new activity
- `GET /api/activities`: Get all activities
- `GET /api/activities/:id`: Get an activity by ID
- `PUT /api/activities/:id`: Update an activity by ID
- `DELETE /api/activities/:id`: Delete an activity by ID

## Project Structure

The project structure is organized as follows:

```
open-cap-stack/
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

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any changes.

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Create a new Pull Request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
```

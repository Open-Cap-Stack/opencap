# Coding Standards

## Overview

This document outlines the coding standards for the OpenCap Stack project.

## General Principles

- Write clean, maintainable, and well-documented code
- Follow consistent naming conventions
- Use meaningful variable and function names
- Keep functions small and focused
- Write tests for all new features

## JavaScript/Node.js Standards

### Naming Conventions

- Use camelCase for variables and functions
- Use PascalCase for classes and constructors
- Use UPPER_SNAKE_CASE for constants
- Use descriptive names that convey purpose

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings (except in JSON)
- Add semicolons at the end of statements
- Use async/await instead of callbacks when possible

### Documentation

- Add JSDoc comments for all exported functions
- Include parameter types and return types
- Document complex logic with inline comments

### Error Handling

- Always handle errors explicitly
- Use try-catch blocks for async operations
- Log errors with appropriate context
- Return meaningful error messages to clients

## Testing Standards

- Write unit tests for all business logic
- Aim for at least 80% code coverage
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies

## Database Standards

- Use ZeroDB as the primary database
- Follow the migration guide for schema changes
- Validate input data before database operations
- Use transactions for multi-step operations

## API Standards

- Follow RESTful conventions
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Return appropriate HTTP status codes
- Include pagination for list endpoints
- Document all endpoints in the API reference

## Security Standards

- Never commit secrets or API keys to version control
- Use environment variables for configuration
- Validate and sanitize all user input
- Implement proper authentication and authorization
- Follow OWASP security guidelines

## Git Standards

- Write clear, concise commit messages
- Use feature branches for new development
- Keep commits focused and atomic
- Reference issue numbers in commit messages
- Request code reviews before merging

## Documentation Standards

- Keep README.md up to date
- Document all configuration options
- Include setup instructions
- Provide troubleshooting guides
- Add examples for common use cases

## Performance Standards

- Optimize database queries
- Use caching when appropriate
- Implement pagination for large datasets
- Monitor application performance
- Profile and optimize bottlenecks

## Review Checklist

Before submitting code for review:

- [ ] All tests pass
- [ ] Code coverage meets threshold
- [ ] Documentation is updated
- [ ] No linting errors
- [ ] Code follows naming conventions
- [ ] Error handling is comprehensive
- [ ] Security best practices are followed
- [ ] Performance has been considered

## Additional Resources

- [ZeroDB API Reference](./zerodb-api-reference.md)
- [Migration Guide](./zerodb-migration-guide.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Performance Tuning](./performance-tuning.md)

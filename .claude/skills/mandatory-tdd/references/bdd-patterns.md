# BDD Test Patterns

## Unit Tests

**Given/When/Then Structure:**
```js
describe('UserService', () => {
  describe('createUser', () => {
    it('creates a user with valid data', () => {
      // Given
      const userData = { name: 'John', email: 'john@example.com' };

      // When
      const user = userService.createUser(userData);

      // Then
      expect(user.name).to.equal('John');
      expect(user.email).to.equal('john@example.com');
      expect(user.id).to.exist;
    });
  });
});
```

## Integration Tests

**API Endpoint Testing:**
```python
describe('User API', () => {
  describe('POST /users', () => {
    it('creates a new user with valid data', async () => {
      // Given
      const payload = { name: 'Jane', email: 'jane@example.com' };

      // When
      const response = await request(app).post('/users').send(payload);

      // Then
      expect(response.status).to.equal(201);
      expect(response.body.name).to.equal('Jane');
      expect(response.body.email).to.equal('jane@example.com');
    });

    it('returns 400 when email is invalid', async () => {
      // Given
      const payload = { name: 'Jane', email: 'invalid-email' };

      // When
      const response = await request(app).post('/users').send(payload);

      // Then
      expect(response.status).to.equal(400);
      expect(response.body.error).to.include('email');
    });
  });
});
```

## Functional/API Tests

**End-to-End Workflow:**
```python
def describe_user_registration_workflow():
    def it_completes_full_registration_flow():
        """Test complete user registration flow"""
        # Given - user data
        user_data = {"name": "Test User", "email": "test@example.com", "password": "SecurePass123!"}

        # When - register user
        response = client.post("/api/v1/auth/register", json=user_data)

        # Then - registration succeeds
        assert response.status_code == 201
        assert "id" in response.json()
        user_id = response.json()["id"]

        # When - login with credentials
        login_response = client.post("/api/v1/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })

        # Then - login succeeds and token returned
        assert login_response.status_code == 200
        assert "access_token" in login_response.json()
```

## Assertion Patterns

**Common Assertions:**
```js
// Equality
expect(actual).to.equal(expected);
expect(actual).to.deep.equal(expectedObject);

// Existence
expect(value).to.exist;
expect(value).to.be.null;
expect(value).to.be.undefined;

// Type checks
expect(value).to.be.a('string');
expect(value).to.be.an('array');
expect(value).to.be.instanceOf(User);

// Collections
expect(array).to.have.length(3);
expect(array).to.include(item);
expect(object).to.have.property('name');

// Async
await expect(promise).to.eventually.equal(value);
await expect(promise).to.be.rejected;
```

## Deterministic Selectors (UI Tests)

```js
// ✅ GOOD - Deterministic selectors
screen.getByTestId('submit-button');
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Email address');

// ❌ BAD - Brittle selectors
document.querySelector('.btn-primary');
document.querySelector('div > div > button:nth-child(2)');
```

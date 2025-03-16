// MongoDB initialization script for test database
// Following Semantic Seed Coding Standards V2.0 for BDD/TDD test environments

print('Starting MongoDB test database setup...');

// Create test database user
db.getSiblingDB('opencap_test').createUser({
  user: 'testapp',
  pwd: 'password123',
  roles: [
    { role: 'readWrite', db: 'opencap_test' },
    { role: 'dbAdmin', db: 'opencap_test' }
  ]
});

print('Test database user created successfully');

// Create collections with schema validation
db = db.getSiblingDB('opencap_test');

db.createCollection('financialReport');
db.createCollection('users');
db.createCollection('documents');
db.createCollection('activities');
db.createCollection('notifications');
db.createCollection('complianceChecks');
db.createCollection('communications');

print('Collections created for testing');

// Create test data
db.users.insertOne({
  username: "testuser",
  email: "user@test.com",
  password: "$2a$10$JGZhscRZIvRUnaLOeOXAQOBJGRb2BA6QrNQx1V7Zjd2lVlLS9Id4i", // Hashed 'password123'
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date()
});

print('MongoDB test database setup completed');

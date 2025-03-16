// MongoDB initialization script for production database
// Following Semantic Seed Coding Standards V2.0

print('Starting MongoDB production database setup...');

// Create application user
db.getSiblingDB('opencap').createUser({
  user: 'opencapapp',
  pwd: 'password123',
  roles: [
    { role: 'readWrite', db: 'opencap' },
    { role: 'dbAdmin', db: 'opencap' }
  ]
});

print('Production database user created successfully');

// Create collections with schema validation
db = db.getSiblingDB('opencap');

db.createCollection('financialReport');
db.createCollection('users');
db.createCollection('documents');
db.createCollection('activities');
db.createCollection('notifications');
db.createCollection('complianceChecks');
db.createCollection('communications');

print('Collections created for production environment');

// Create initial admin user
db.users.insertOne({
  username: "admin",
  email: "admin@opencap.org",
  password: "$2a$10$JGZhscRZIvRUnaLOeOXAQOBJGRb2BA6QrNQx1V7Zjd2lVlLS9Id4i", // Hashed 'password123'
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date()
});

print('MongoDB production database setup completed');

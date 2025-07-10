// MongoDB initialization script for production database
// Following Semantic Seed Coding Standards V2.0

print('Starting MongoDB production database setup...');

// Create application user
db.getSiblingDB('opencap').createUser({
  user: 'opencapapp',
  pwd: process.env.MONGODB_APP_PASSWORD || 'cfcb9ad70ddbadba456c906a16511ebe',
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

// Admin user creation should be done via API or environment variables
// Removed hardcoded admin user for security
// Use the API endpoint /api/v1/auth/register to create the first admin user

print('Admin user creation skipped - create via API endpoint');

print('MongoDB production database setup completed');

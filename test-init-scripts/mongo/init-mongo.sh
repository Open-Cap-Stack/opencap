#!/bin/bash
# MongoDB initialization script that runs the JS files in sequence
# Following Semantic Seed Coding Standards V2.0

echo "Creating MongoDB test users and databases..."

# Start MongoDB without authentication for initial setup
mongod --bind_ip_all --port 27017 --fork --logpath /tmp/mongod.log

# Wait for MongoDB to start
sleep 5

# Create admin user and database
mongosh --quiet << EOF
use admin
db.createUser({
  user: "opencap",
  pwd: "password123",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ]
})

use opencap_test
db.createUser({
  user: "testapp",
  pwd: "password123",
  roles: [
    { role: "readWrite", db: "opencap_test" },
    { role: "dbAdmin", db: "opencap_test" }
  ]
})

// Create collections
db.createCollection('financialReport')
db.createCollection('users')
db.createCollection('documents')
db.createCollection('activities')
db.createCollection('notifications')
db.createCollection('complianceChecks')
db.createCollection('communications')

// Create test data
db.users.insertOne({
  username: "testuser",
  email: "test@example.com",
  password: "hashedpassword",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date()
})

print("MongoDB test setup complete!")
EOF

# Shut down MongoDB
mongod --dbpath /data/db --shutdown

# Let Docker restart MongoDB with authentication enabled
echo "MongoDB initialization complete"

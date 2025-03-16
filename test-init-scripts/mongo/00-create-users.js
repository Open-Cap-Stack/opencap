// MongoDB admin user initialization script
// This creates the necessary admin user for the MongoDB test instance

print("Starting MongoDB user initialization...");

// Create admin user in admin database
db.createUser({
  user: "root",
  pwd: "password",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ]
});

print("Admin user created successfully");

// Switch to test database and create application user
db = db.getSiblingDB('opencap_test');

db.createUser({
  user: "testuser",
  pwd: "testpassword",
  roles: [
    { role: "readWrite", db: "opencap_test" },
    { role: "dbAdmin", db: "opencap_test" }
  ]
});

print("Test database user created successfully");
print("MongoDB user initialization completed");

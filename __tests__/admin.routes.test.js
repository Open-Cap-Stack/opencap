const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const Admin = require("../models/admin");
const { connectDB, disconnectDB } = require('../db');

// Initialize Express app
const app = express();
app.use(express.json());
app.use("/api/admins", require("../routes/adminRoutes"));

let dbConnection;

beforeAll(async () => {
  try {
    dbConnection = await connectDB();
    // Ensure we have a valid connection
    if (!dbConnection || dbConnection.readyState !== 1) {
      throw new Error('Failed to establish database connection');
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}, 30000); // Increase timeout to 30 seconds

afterAll(async () => {
  try {
    // Only attempt to drop database if we have a valid connection
    if (dbConnection && dbConnection.readyState === 1) {
      await dbConnection.db.dropDatabase();
    }
  } catch (error) {
    console.error('Error dropping test database:', error);
  } finally {
    // Always attempt to close the connection
    await disconnectDB();
  }
}, 30000);

beforeEach(async () => {
  try {
    await Admin.deleteMany({});
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    throw error;
  }
});

describe("Admin API Tests", () => {
  it("should create a new admin", async () => {
    const res = await request(app)
      .post("/api/admins")
      .send({
        UserID: "admin123",
        Name: "Admin",
        Email: "admin@example.com",
        UserRoles: ["admin"],
        NotificationSettings: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          notificationFrequency: "Immediate"
        }
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("UserID", "admin123");
    expect(res.body).toHaveProperty("Name", "Admin");
    expect(res.body).toHaveProperty("Email", "admin@example.com");
  });

  it("should get all admins", async () => {
    await new Admin({
      UserID: "admin123",
      Name: "Admin",
      Email: "admin@example.com",
      UserRoles: ["admin"],
      NotificationSettings: {}
    }).save();

    const res = await request(app).get("/api/admins");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toHaveProperty("Name", "Admin");
  });

  it("should get an admin by ID", async () => {
    const admin = new Admin({
      UserID: "admin123",
      Name: "Admin",
      Email: "admin@example.com",
      UserRoles: ["admin"],
      NotificationSettings: {}
    });
    await admin.save();

    const res = await request(app).get(`/api/admins/${admin._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("_id", admin._id.toString());
    expect(res.body).toHaveProperty("Name", "Admin");
  });

  it("should update an admin by ID", async () => {
    const admin = new Admin({
      UserID: "admin123",
      Name: "Admin",
      Email: "admin@example.com",
      UserRoles: ["admin"],
      NotificationSettings: {}
    });
    await admin.save();

    const res = await request(app)
      .put(`/api/admins/${admin._id}`)
      .send({
        Name: "Updated Admin",
        UserRoles: ["admin", "superadmin"]
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("Name", "Updated Admin");
    expect(res.body.UserRoles).toContain("superadmin");
  });

  it("should delete an admin by ID", async () => {
    const admin = new Admin({
      UserID: "admin123",
      Name: "Admin",
      Email: "admin@example.com",
      UserRoles: ["admin"],
      NotificationSettings: {}
    });
    await admin.save();

    const res = await request(app).delete(`/api/admins/${admin._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Admin deleted");
  });

  it("should login an admin", async () => {
    const admin = new Admin({
      UserID: "admin123",
      Name: "Admin",
      Email: "admin@example.com",
      Password: "password", // Ensure your model supports this field
      UserRoles: ["admin"],
      NotificationSettings: {}
    });
    await admin.save();

    const res = await request(app)
      .post("/api/admins/login")
      .send({
        Email: "admin@example.com",
        Password: "password"
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
  });

  it("should logout an admin", async () => {
    const res = await request(app).post("/api/admins/logout");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Admin logged out");
  });

  it("should change an admin's password", async () => {
    const admin = new Admin({
      UserID: "admin123",
      Name: "Admin",
      Email: "admin@example.com",
      Password: "password",
      UserRoles: ["admin"],
      NotificationSettings: {}
    });
    await admin.save();

    const res = await request(app)
      .put(`/api/admins/${admin._id}/change-password`)
      .send({
        oldPassword: "password",
        newPassword: "newpassword"
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Password changed");
  });
});

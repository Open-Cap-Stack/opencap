const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const Admin = require("../models/admin"); // Assuming you have an Admin model
const connectDB = require("../db");

const app = express();
app.use(express.json());
app.use("/api/admins", require("../routes/adminRoutes"));

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Admin.deleteMany({});
});

describe("Admin API Test", () => {
  it("should create a new admin", async () => {
    const res = await request(app)
      .post("/api/admins")
      .send({
        name: "Admin",
        email: "admin@example.com",
        password: "password",
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("message", "Admin created");
    expect(res.body).toHaveProperty("admin");
    expect(res.body.admin).toHaveProperty("_id");
    expect(res.body.admin).toHaveProperty("email", "admin@example.com");
  }, 10000);

  it("should get all admins", async () => {
    await new Admin({
      name: "Admin",
      email: "admin@example.com",
      password: "password",
    }).save();

    const res = await request(app).get("/api/admins");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("admins");
    expect(res.body.admins).toBeInstanceOf(Array);
    expect(res.body.admins.length).toBe(1);
  }, 10000);

  it("should get an admin by ID", async () => {
    const admin = new Admin({
      name: "Admin",
      email: "admin@example.com",
      password: "password",
    });
    await admin.save();

    const res = await request(app).get(`/api/admins/${admin._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("admin");
    expect(res.body.admin).toHaveProperty("_id", admin._id.toString());
  }, 10000);

  it("should update an admin by ID", async () => {
    const admin = new Admin({
      name: "Admin",
      email: "admin@example.com",
      password: "password",
    });
    await admin.save();

    const res = await request(app)
      .put(`/api/admins/${admin._id}`)
      .send({
        name: "Updated Admin",
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Admin updated");
    expect(res.body.admin).toHaveProperty("name", "Updated Admin");
  }, 10000);

  it("should delete an admin by ID", async () => {
    const admin = new Admin({
      name: "Admin",
      email: "admin@example.com",
      password: "password",
    });
    await admin.save();

    const res = await request(app).delete(`/api/admins/${admin._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Admin deleted");
  }, 10000);

  it("should login an admin", async () => {
    const admin = new Admin({
      name: "Admin",
      email: "admin@example.com",
      password: "password",
    });
    await admin.save();

    const res = await request(app)
      .post("/api/admins/login")
      .send({
        email: "admin@example.com",
        password: "password",
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
  }, 10000);

  it("should logout an admin", async () => {
    // Assuming the logout functionality requires an authenticated session
    const res = await request(app).post("/api/admins/logout");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Admin logged out");
  }, 10000);

  it("should change an admin password", async () => {
    const admin = new Admin({
      name: "Admin",
      email: "admin@example.com",
      password: "password",
    });
    await admin.save();

    const res = await request(app)
      .put(`/api/admins/${admin._id}/change-password`)
      .send({
        oldPassword: "password",
        newPassword: "newpassword",
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Password changed");
  }, 10000);
});

const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const Activity = require("../models/Activity");
const connectDB = require("../db");

const app = express();
app.use(express.json());
app.use("/api/activities", require("../routes/activity"));

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Activity.deleteMany({});
});

describe("Activity API Test", () => {
  it("should create a new activity", async () => {
    const res = await request(app)
      .post("/api/activities")
      .send({
        activityId: "5",
        name: "activity10",
        description: "I am description!",
        date: "2024-07-20T00:00:00.000Z",
        type: "meeting",
        participants: [new mongoose.Types.ObjectId()],
        status: "pending",
        createdBy: new mongoose.Types.ObjectId(),
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("description");
    expect(res.body.document).toHaveProperty("_id");
    expect(res.body.document).toHaveProperty("name", "activity10");
  }, 10000);

  it("should fail to create an activity with missing fields", async () => {
    const res = await request(app).post("/api/activities").send({
      activityId: "4",
    });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty("error");
  }, 10000);

  it("should get all activities", async () => {
    const res = await request(app).get("/api/activities");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("activities");
    expect(res.body.activities).toBeInstanceOf(Array);
  }, 10000);

  it("should get an activity by ID", async () => {
    const activity = new Activity({
      activityId: "5",
      name: "Test Activity",
      description: "This is a test activity",
      date: "2024-07-20T00:00:00.000Z",
      type: "meeting",
      participants: [new mongoose.Types.ObjectId()],
      status: "pending",
      createdBy: new mongoose.Types.ObjectId(),
    });
    await activity.save();

    const res = await request(app).get(
      `/api/activities/${activity.activityId}`
    );

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("description");
    expect(res.body.activity).toHaveProperty("_id", activity._id.toString());
  }, 10000);

  it("should update an activity by ID", async () => {
    const activity = new Activity({
      activityId: "6",
      name: "Test Activity 6",
      description: "This is a test activity 6",
      date: "2024-07-20T00:00:00.000Z",
      type: "meeting",
      participants: [new mongoose.Types.ObjectId()],
      createdBy: new mongoose.Types.ObjectId(),
    });
    await activity.save();

    const res = await request(app)
      .put(`/api/activities/${activity.activityId}`)
      .send({
        name: "updated 6",
        description: "updated This is a test activity 6",
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("description");
    expect(res.body.activity).toHaveProperty("name", "updated 6");
  }, 10000);

  it("should delete an activity by ID", async () => {
    const activity = new Activity({
      activityId: "7",
      name: "Test Activity 7",
      description: "This is a test activity 7",
      date: "2024-07-20T00:00:00.000Z",
      type: "meeting",
      participants: [new mongoose.Types.ObjectId()],
      status: "pending",
      createdBy: new mongoose.Types.ObjectId(),
    });
    await activity.save();

    const res = await request(app).delete(
      `/api/activities/${activity.activityId}`
    );

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Activity deleted");
  }, 10000);
});
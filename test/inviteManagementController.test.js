const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const inviteManagementController = require("../controllers/inviteManagementController");
const Invite = require("../models/invitemanagement");

// Set up the Express app
const app = express();
app.use(bodyParser.json());
app.use("/api", require("../routes/inviteManagement"));

// Mock the Invite model
jest.mock("../models/invitemanagement");

// Sample data
const sampleInvite = {
  InviteID: "test123",
  ReceiverID: "receiver123",
  Status: "Pending",
  Timestamp: "2024-08-10T02:14:16.582Z",
};

describe("Invite Management Controller", () => {
  beforeAll(async () => {
    const mongoUri = "mongodb://127.0.0.1/inviteManagementTestDB";
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Test for creating a new invite
  it("should create a new invite", async () => {
    const mockSave = jest.fn().mockResolvedValue(sampleInvite);
    Invite.prototype.save = mockSave;

    const response = await request(app).post("/api/invites").send(sampleInvite);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject(sampleInvite);
    expect(mockSave).toHaveBeenCalled();
  });

  // Test for getting all invites
  it("should get all invites", async () => {
    const mockFind = jest.fn().mockResolvedValue([sampleInvite]);
    Invite.find = mockFind;

    const response = await request(app).get("/api/invites");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([sampleInvite]);
    expect(mockFind).toHaveBeenCalled();
  });

  // Test for getting an invite by ID
  it("should get an invite by ID", async () => {
    const mockFindById = jest.fn().mockResolvedValue(sampleInvite);
    Invite.findById = mockFindById;

    const response = await request(app).get(
      `/api/invites/${sampleInvite.InviteID}`
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(sampleInvite);
    expect(mockFindById).toHaveBeenCalledWith(sampleInvite.InviteID);
  });

  // Test for updating an invite
  it("should update an invite", async () => {
    const updatedInvite = { ...sampleInvite, Status: "Accepted" };
    const mockFindByIdAndUpdate = jest.fn().mockResolvedValue(updatedInvite);
    Invite.findByIdAndUpdate = mockFindByIdAndUpdate;

    const response = await request(app)
      .put(`/api/invites/${sampleInvite.InviteID}`)
      .send({ Status: "Accepted" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(updatedInvite);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      sampleInvite.InviteID,
      { Status: "Accepted" },
      { new: true }
    );
  });

  // Test for deleting an invite
  it("should delete an invite", async () => {
    const mockDelete = jest.fn().mockResolvedValue(sampleInvite);
    Invite.findByIdAndDelete = mockDelete;

    const response = await request(app).delete(
      `/api/invites/${sampleInvite.InviteID}`
    );

    expect(response.status).toBe(204);
    expect(mockDelete).toHaveBeenCalledWith(sampleInvite.InviteID);
  });

  // Test for handling invite not found
  it("should return 404 if invite not found", async () => {
    Invite.findById = jest.fn().mockResolvedValue(null);

    const response = await request(app).get(`/api/invites/invalidID`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Invite not found" });
  });
});

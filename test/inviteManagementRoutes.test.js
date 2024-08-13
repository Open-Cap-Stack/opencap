const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const inviteRoutes = require("../routes/inviteManagement");
const Invite = require("../models/invitemanagement");

// Set up the Express app
const app = express();
app.use(bodyParser.json());
app.use("/api", inviteRoutes);

// Mock the Invite model
jest.mock("../models/inviteManagement");

const sampleInvite = {
  InviteID: "test123",
  ReceiverID: "receiver123",
  Status: "Pending",
  Timestamp: new Date(),
};

describe("Invite Management Routes", () => {
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

  it("POST /invites should create a new invite", async () => {
    const mockSave = jest.fn().mockResolvedValue({
      ...sampleInvite,
      Timestamp: sampleInvite.Timestamp.toISOString(), // Convert Timestamp to string
    });
    Invite.prototype.save = mockSave;

    const response = await request(app)
      .post("/api/invites")
      .send({
        ...sampleInvite,
        Timestamp: sampleInvite.Timestamp.toISOString(), // Convert Timestamp to string
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ...sampleInvite,
      Timestamp: sampleInvite.Timestamp.toISOString(), // Convert Timestamp to string
    });
    expect(mockSave).toHaveBeenCalled();
  });

  it("GET /invites/:id should get an invite by ID", async () => {
    const sampleInviteWithStringTimestamp = {
      ...sampleInvite,
      Timestamp: sampleInvite.Timestamp.toISOString(), // Convert Timestamp to string
    };

    const mockFindById = jest
      .fn()
      .mockResolvedValue(sampleInviteWithStringTimestamp);
    Invite.findById = mockFindById;

    const response = await request(app).get(
      `/api/invites/${sampleInvite.InviteID}`
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(sampleInviteWithStringTimestamp);
    expect(mockFindById).toHaveBeenCalledWith(sampleInvite.InviteID);
  });

  it("PUT /invites/:id should update an invite", async () => {
    const updatedInvite = { ...sampleInvite, Status: "Accepted" };
    updatedInvite.Timestamp = updatedInvite.Timestamp.toISOString();

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

  it("DELETE /invites/:id should delete an invite", async () => {
    const mockFindByIdAndDelete = jest.fn().mockResolvedValue(sampleInvite);
    Invite.findByIdAndDelete = mockFindByIdAndDelete;

    const response = await request(app).delete(
      `/api/invites/${sampleInvite.InviteID}`
    );

    expect(response.status).toBe(204);
    expect(mockFindByIdAndDelete).toHaveBeenCalledWith(sampleInvite.InviteID);
  });
});

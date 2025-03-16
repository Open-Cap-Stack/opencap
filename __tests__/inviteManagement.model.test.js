const mongoose = require("mongoose");
const Invite = require("../models/inviteManagementModel");

beforeEach(async () => {
  await Invite.deleteMany({}); // Clear the collection
});

// Connect to a test database
beforeAll(async () => {
  const mongoUri = "mongodb://127.0.0.1/inviteManagementTestDB";
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Invite Management Model", () => {
  it("should create a new invite", async () => {
    const sampleInvite = {
      InviteID: "test123",
      ReceiverID: "receiver123",
      Status: "Pending",
    };

    const invite = new Invite(sampleInvite);
    const savedInvite = await invite.save();

    expect(savedInvite.InviteID).toBe(sampleInvite.InviteID);
    expect(savedInvite.ReceiverID).toBe(sampleInvite.ReceiverID);
    expect(savedInvite.Status).toBe(sampleInvite.Status);
  });

  it("should not create an invite without required fields", async () => {
    const invalidInvite = new Invite({}); // No fields provided

    let err;
    try {
      await invalidInvite.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.InviteID).toBeDefined();
  });

  // More tests for other model validations and methods
});

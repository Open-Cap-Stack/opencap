const mongoose = require('mongoose');
const { expect } = require('chai');
const Communication = require('../models/Communication');
const { connectDB, disconnectDB } = require('../db');

beforeAll(async function () {
  await connectDB();
});

afterAll(async function () {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('Communication Model', function () {
  it('should create a communication with valid fields', async function () {
    const communicationData = {
      communicationId: 'unique-communication-id',
      MessageType: 'email',
      Sender: mongoose.Types.ObjectId(), // Use a valid ObjectId
      Recipient: mongoose.Types.ObjectId(), // Use a valid ObjectId
      Timestamp: new Date(),
      Content: 'This is a test communication.',
    };

    const communication = new Communication(communicationData);
    const savedCommunication = await communication.save();

    expect(savedCommunication.communicationId).to.equal(communicationData.communicationId);
    expect(savedCommunication.MessageType).to.equal(communicationData.MessageType);
    expect(savedCommunication.Sender.toString()).to.equal(communicationData.Sender.toString());
    expect(savedCommunication.Recipient.toString()).to.equal(communicationData.Recipient.toString());
    expect(new Date(savedCommunication.Timestamp).toISOString()).to.equal(new Date(communicationData.Timestamp).toISOString());
    expect(savedCommunication.Content).to.equal(communicationData.Content);
  });

  it('should not create a communication without required fields', async function () {
    const communicationData = {
      MessageType: 'email',
    };

    const communication = new Communication(communicationData);

    try {
      await communication.save();
    } catch (error) {
      expect(error).to.exist;
      expect(error.errors.communicationId).to.exist;
      expect(error.errors.Sender).to.exist;
      expect(error.errors.Recipient).to.exist;
      expect(error.errors.Timestamp).to.exist; // Ensure these fields are required in the schema
      expect(error.errors.Content).to.exist;   // Ensure these fields are required in the schema
    }
  });

  it('should not create a communication with duplicate communicationId', async function () {
    const communicationData1 = {
      communicationId: 'duplicate-communication-id',
      MessageType: 'SMS',
      Sender: mongoose.Types.ObjectId(),
      Recipient: mongoose.Types.ObjectId(),
      Timestamp: new Date(),
      Content: 'First communication.',
    };

    const communicationData2 = {
      communicationId: 'duplicate-communication-id',
      MessageType: 'email',
      Sender: mongoose.Types.ObjectId(),
      Recipient: mongoose.Types.ObjectId(),
      Timestamp: new Date(),
      Content: 'Second communication.',
    };

    const communication1 = new Communication(communicationData1);
    await communication1.save();

    const communication2 = new Communication(communicationData2);

    try {
      await communication2.save();
    } catch (error) {
      expect(error).to.exist;
      expect(error.code).to.equal(11000); // Duplicate key error code
    }
  });
});

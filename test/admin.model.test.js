const mongoose = require('mongoose');
const chai = require('chai');
const expect = chai.expect;
const Admin = require('../models/admin');

before(async function () {
  await mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });
  await mongoose.connection.dropDatabase();
});

after(async function () {
  await mongoose.disconnect();
});

describe('Admin Model', function () {
  it('should create an admin with valid fields', async function () {
    const adminData = {
      UserID: 'user123',
      Name: 'Test User',
      Email: 'testuser@example.com',
      UserRoles: ['admin', 'superuser'],
      NotificationSettings: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        notificationFrequency: 'Immediate',
      },
    };

    const admin = new Admin(adminData);
    const savedAdmin = await admin.save();

    expect(savedAdmin.UserID).to.equal(adminData.UserID);
    expect(savedAdmin.Name).to.equal(adminData.Name);
    expect(savedAdmin.Email).to.equal(adminData.Email);
    expect(savedAdmin.UserRoles).to.deep.equal(adminData.UserRoles);
    expect(savedAdmin.NotificationSettings.emailNotifications).to.equal(adminData.NotificationSettings.emailNotifications);
    expect(savedAdmin.NotificationSettings.smsNotifications).to.equal(adminData.NotificationSettings.smsNotifications);
    expect(savedAdmin.NotificationSettings.pushNotifications).to.equal(adminData.NotificationSettings.pushNotifications);
    expect(savedAdmin.NotificationSettings.notificationFrequency).to.equal(adminData.NotificationSettings.notificationFrequency);
  });

  it('should not create an admin without required fields', async function () {
    const adminData = {
      Name: 'Test User',
    };

    const admin = new Admin(adminData);

    try {
      await admin.save();
    } catch (error) {
      expect(error).to.exist;
      expect(error.errors.UserID).to.exist;
      expect(error.errors.Email).to.exist;
    }
  });

  it('should not create an admin with duplicate UserID or Email', async function () {
    const adminData1 = {
      UserID: 'duplicateUserID',
      Name: 'First User',
      Email: 'firstuser@example.com',
      UserRoles: ['admin'],
    };

    const adminData2 = {
      UserID: 'duplicateUserID',
      Name: 'Second User',
      Email: 'seconduser@example.com',
      UserRoles: ['user'],
    };

    const admin1 = new Admin(adminData1);
    await admin1.save();

    const admin2 = new Admin(adminData2);

    try {
      await admin2.save();
    } catch (error) {
      expect(error).to.exist;
      expect(error.code).to.equal(11000); // Duplicate key error code
    }
  });
});

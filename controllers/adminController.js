const Admin = require('../models/admin');
const mongoose = require('mongoose');

exports.createAdmin = async (req, res) => {
  const { UserID, Name, Email, UserRoles, NotificationSettings } = req.body;

  if (!UserID || !Name || !Email || !UserRoles || !NotificationSettings) {
    return res.status(400).json({ message: "Invalid admin data" });
  }

  const newAdmin = new Admin({
    UserID,
    Name,
    Email,
    UserRoles,
    NotificationSettings,
  });

  try {
    const createdAdmin = await newAdmin.save();
    return res.status(201).json(createdAdmin);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.status(200).json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const updatedAdmin = await Admin.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json(updatedAdmin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const deletedAdmin = await Admin.findByIdAndDelete(req.params.id);

    if (!deletedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({ message: "Admin deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.loginAdmin = async (req, res) => {
  // Implement login logic
  res.status(200).json({ token: "fake-token" }); // Mock response
};

exports.logoutAdmin = async (req, res) => {
  // Implement logout logic
  res.status(200).json({ message: "Admin logged out" });
};

exports.changePassword = async (req, res) => {
  // Implement password change logic
  res.status(200).json({ message: "Password changed" });
};

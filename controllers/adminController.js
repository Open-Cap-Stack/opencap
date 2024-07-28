const Admin = require("../models/Admin");
const mongoose = require("mongoose");

exports.createAdmin = async (req, res) => {
  const { UserID, Name, Email, UserRoles, NotificationSettings } = req.body;

  if (!UserID || !Name || !Email || !UserRoles || !NotificationSettings) {
    return res.status(400).json({ message: "Invalid admin data" });
  }

  const newAdmin = new Admin({
    UserID: new mongoose.Types.ObjectId(UserID),
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

exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    if (!admins) {
      return res.status(404).json({ message: "No admins found" });
    }
    res.status(200).json(admins);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getAdminById = async (req, res) => {
  try {
    const adminId = req.params.id;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res.status(200).json(admin);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateAdminById = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Invalid admin ID" });
  }

  try {
    const updatedAdmin = await Admin.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedAdmin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    return res.status(200).json(updatedAdmin);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Invalid admin ID" });
  }

  try {
    const deletedAdmin = await Admin.findByIdAndDelete(id);

    if (!deletedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res.status(200).json({ message: "Admin deleted" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
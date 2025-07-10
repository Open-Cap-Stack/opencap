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
    if (admins.length === 0) {
      return res.status(404).json({ message: 'No admins found' });
    }
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
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    
    // Find admin by email
    const admin = await Admin.findOne({ Email: email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // In a real implementation, you would verify the password here
    // For now, we'll require the JWT_SECRET environment variable
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    // Return success without a token (requires proper JWT implementation)
    res.status(501).json({ 
      message: "Login functionality requires proper JWT implementation",
      error: "JWT authentication not yet implemented"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.logoutAdmin = async (req, res) => {
  // Implement logout logic
  res.status(200).json({ message: "Admin logged out" });
};

exports.changePassword = async (req, res) => {
  // Implement password change logic
  res.status(200).json({ message: "Password changed" });
};

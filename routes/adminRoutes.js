const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Route for creating a new admin
router.post('/admins', adminController.createAdmin);

// Route for retrieving all admins
router.get('/admins', adminController.getAllAdmins);

// Route for retrieving a single admin by ID
router.get('/admins/:id', adminController.getAdminById);

// Route for updating an admin by ID
router.put('/admins/:id', adminController.updateAdmin);

// Route for deleting an admin by ID
router.delete('/admins/:id', adminController.deleteAdmin);

// Route for admin login
router.post('/admins/login', adminController.loginAdmin);

// Route for admin logout
router.post('/admins/logout', adminController.logoutAdmin);

// Route for changing admin password
router.put('/admins/:id/change-password', adminController.changePassword);

module.exports = router;

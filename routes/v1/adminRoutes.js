const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminController');

// Route for creating a new admin
router.post('/admins', adminController.createAdmin);

// Add more routes for admin-related functionality here
router.post('/admins', adminController.createAdmin);                       // Route for creating a new admin
router.get('/admins', adminController.getAllAdmins);                       // Route for retrieving all admins
router.get('/admins/:id', adminController.getAdminById);                   // Route for retrieving a single admin by ID
router.put('/admins/:id', adminController.updateAdmin);                    // Route for updating an admin by ID
router.delete('/admins/:id', adminController.deleteAdmin);                 // Route for deleting an admin by ID
router.post('/admins/login', adminController.loginAdmin);                  // Route for admin login
router.post('/admins/logout', adminController.logoutAdmin);                // Route for admin logout
router.put('/admins/:id/change-password', adminController.changePassword); // Route for changing admin password

module.exports = router;
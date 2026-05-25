const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { requireUserNotAgent } = require('../../middleware/rbacMiddleware');
const adminController = require('../../controllers/adminController');

// Apply authentication middleware to all routes — agents are blocked from admin panel
router.use(authenticateToken);
router.use(requireUserNotAgent);

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

// Issue #513: Bulk-activate pending user accounts
router.post('/users/activate-pending', adminController.activatePendingUsers);

module.exports = router;
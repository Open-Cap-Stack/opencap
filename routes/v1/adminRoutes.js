const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { requireUserNotAgent, hasRole } = require('../../middleware/rbacMiddleware');
const adminController = require('../../controllers/adminController');

// Apply authentication middleware to all routes — agents are blocked from admin panel
router.use(authenticateToken);
router.use(requireUserNotAgent);

// Route for creating a new admin
router.post('/admins', hasRole(['super_admin', 'admin']), adminController.createAdmin);

// Add more routes for admin-related functionality here
router.post('/admins', hasRole(['super_admin', 'admin']), adminController.createAdmin);                       // Route for creating a new admin
router.get('/admins', hasRole(['super_admin', 'admin']), adminController.getAllAdmins);                       // Route for retrieving all admins
router.get('/admins/:id', hasRole(['super_admin', 'admin']), adminController.getAdminById);                   // Route for retrieving a single admin by ID
router.put('/admins/:id', hasRole(['super_admin', 'admin']), adminController.updateAdmin);                    // Route for updating an admin by ID
router.delete('/admins/:id', hasRole(['super_admin', 'admin']), adminController.deleteAdmin);                 // Route for deleting an admin by ID
router.post('/admins/login', adminController.loginAdmin);                  // Route for admin login
router.post('/admins/logout', adminController.logoutAdmin);                // Route for admin logout
router.put('/admins/:id/change-password', hasRole(['super_admin', 'admin']), adminController.changePassword); // Route for changing admin password

// Issue #513: Bulk-activate pending user accounts
router.post('/users/activate-pending', hasRole(['super_admin', 'admin']), adminController.activatePendingUsers);

module.exports = router;
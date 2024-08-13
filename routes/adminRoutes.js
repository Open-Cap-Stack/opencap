const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Define the routes and associate them with the controller methods
router.post('/', adminController.createAdmin); 
router.get('/', adminController.getAllAdmins);  // Use `/` for getting all admins
router.get('/:id', adminController.getAdminById);
router.put('/:id', adminController.updateAdmin);
router.delete('/:id', adminController.deleteAdmin);
router.post('/login', adminController.loginAdmin); // Use `/login` for login
router.post('/logout', adminController.logoutAdmin); // Use `/logout` for logout
router.put('/:id/change-password', adminController.changePassword);

module.exports = router;

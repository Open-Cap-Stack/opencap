const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee
} = require('../../controllers/employeeController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'employee']), createEmployee);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'employee']), getEmployees);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'employee']), getEmployeeById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'employee']), updateEmployee);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'employee']), deleteEmployee);

module.exports = router;
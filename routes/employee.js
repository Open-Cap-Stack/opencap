const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");

router.post("/employees", employeeController.createEmployee);
router.get("/employees", employeeController.getEmployees);
router.get("/employees/:id", employeeController.getEmployeeById);
router.put("/employees/:id", employeeController.updateEmployee);
router.delete("/employees/:id", employeeController.deleteEmployee);

module.exports = router;

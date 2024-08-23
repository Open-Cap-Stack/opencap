const express = require('express');
const router = express.Router();
const compensationController = require('../controllers/compensationController');

router.get('/benchmarks/attributes', compensationController.getBenchmarkAttributes);
router.get('/benchmarks', compensationController.getBenchmarks);
router.put('/benchmarks/:id', compensationController.updateBenchmark);

module.exports = router;

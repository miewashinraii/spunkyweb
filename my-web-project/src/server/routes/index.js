const express = require('express');
const router = express.Router();
const controller = require('../controllers/index');

// Define your routes here
router.get('/', controller.home);
router.get('/api/data', controller.getData);

module.exports = router;
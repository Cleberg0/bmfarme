const express = require('express');
const authMiddleware = require('../middleware/auth');
const infraController = require('../controllers/infra.controller');

const router = express.Router();

router.post('/deploy', authMiddleware, infraController.deploy);

module.exports = router;
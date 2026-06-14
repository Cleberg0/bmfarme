const express = require('express');
const authMiddleware = require('../middleware/auth');
const bmController = require('../controllers/bm.controller');

const router = express.Router();

router.post('/register', authMiddleware, bmController.register);
router.get('/list', authMiddleware, bmController.list);
router.get('/stats', authMiddleware, bmController.stats);

module.exports = router;
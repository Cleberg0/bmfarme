const express = require('express');
const authMiddleware = require('../middleware/auth');
const cnpjController = require('../controllers/cnpj.controller');

const router = express.Router();

router.get('/:cnpj', authMiddleware, cnpjController.getCnpj);

module.exports = router;
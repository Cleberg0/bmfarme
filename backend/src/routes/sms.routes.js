const express = require('express');
const authMiddleware = require('../middleware/auth');
const smsController = require('../controllers/sms.controller');

const router = express.Router();

// Gera um novo número virtual para receber SMS
router.post('/generate', authMiddleware, smsController.generate);

// Verifica se o código SMS foi recebido
router.get('/check/:logId', authMiddleware, smsController.check);

// Libera/cancela o número no provedor
router.post('/release/:logId', authMiddleware, smsController.release);

// Consulta saldo da conta SMS24h
router.get('/balance', authMiddleware, smsController.balance);

module.exports = router;

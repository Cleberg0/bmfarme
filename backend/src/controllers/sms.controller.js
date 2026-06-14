const prisma = require('../lib/prisma');
const { buyNumber, activateNumber, checkCode, releaseNumber, getBalance } = require('../services/sms24hrs.service');

/**
 * POST /sms/generate
 * Compra um número virtual e salva no banco como WAITING.
 * Body: { clientId, service? }
 */
async function generate(req, res) {
  try {
    const { clientId, service } = req.body;
    const userId = req.user.id;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId é obrigatório.' });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    // Compra o número no SMS24h
    const smsData = await buyNumber(service);

    // Ativa o número (informa ao servidor que estamos aguardando)
    if (smsData.externalId) {
      await activateNumber(smsData.externalId);
    }

    const smsLog = await prisma.smsLog.create({
      data: {
        phoneNumber: smsData.phoneNumber,
        externalId: smsData.externalId || null,
        provider: smsData.provider,
        status: 'WAITING',
        clientId,
        userId
      }
    });

    return res.status(201).json(smsLog);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao gerar número SMS.'
    });
  }
}

/**
 * GET /sms/check/:logId
 * Verifica se o código SMS foi recebido para o número do log.
 */
async function check(req, res) {
  try {
    const { logId } = req.params;
    const userId = req.user.id;

    const smsLog = await prisma.smsLog.findUnique({ where: { id: logId } });

    if (!smsLog || smsLog.userId !== userId) {
      return res.status(404).json({ error: 'SMS log não encontrado.' });
    }

    // Se já recebeu ou expirou, retorna o estado atual sem chamar a API
    if (['RECEIVED', 'EXPIRED', 'FAILED'].includes(smsLog.status)) {
      return res.status(200).json(smsLog);
    }

    if (!smsLog.externalId) {
      return res.status(422).json({ error: 'Este log não possui externalId para polling.' });
    }

    const smsResult = await checkCode(smsLog.externalId);

    const updatedSmsLog = await prisma.smsLog.update({
      where: { id: logId },
      data: {
        smsCode: smsResult.code ?? smsLog.smsCode,
        status: smsResult.status
      }
    });

    return res.status(200).json(updatedSmsLog);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao verificar código SMS.'
    });
  }
}

/**
 * POST /sms/release/:logId
 * Libera/cancela o número no provedor.
 * Body: { confirmed? } — true se o código foi usado com sucesso
 */
async function release(req, res) {
  try {
    const { logId } = req.params;
    const { confirmed = false } = req.body;
    const userId = req.user.id;

    const smsLog = await prisma.smsLog.findUnique({ where: { id: logId } });

    if (!smsLog || smsLog.userId !== userId) {
      return res.status(404).json({ error: 'SMS log não encontrado.' });
    }

    if (smsLog.externalId) {
      await releaseNumber(smsLog.externalId, confirmed);
    }

    const updatedSmsLog = await prisma.smsLog.update({
      where: { id: logId },
      data: {
        status: confirmed ? 'RECEIVED' : 'EXPIRED'
      }
    });

    return res.status(200).json(updatedSmsLog);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao liberar número SMS.'
    });
  }
}

/**
 * GET /sms/balance
 * Retorna o saldo atual da conta SMS24h.
 */
async function balance(req, res) {
  try {
    const value = await getBalance();
    if (value === null) {
      return res.status(502).json({ error: 'Não foi possível obter o saldo.' });
    }
    return res.status(200).json({ balance: value });
  } catch (error) {
    return res.status(500).json({ error: 'Falha ao consultar saldo.' });
  }
}

module.exports = {
  generate,
  check,
  release,
  balance
};

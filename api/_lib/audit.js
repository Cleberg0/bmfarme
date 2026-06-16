/**
 * Helper de auditoria — registra operações no banco.
 * Uso: await audit(userId, 'SMS_GENERATE', { phone: '...' }, true);
 */
const prisma = require('./prisma');

async function audit(userId, action, details = null, success = true, error = null, clientId = null) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details: details ? JSON.stringify(details) : null,
        success,
        error: error ? String(error).slice(0, 500) : null,
        clientId,
      },
    });
  } catch (err) {
    // Não bloqueia a operação se o log falhar
    console.error('[audit] Erro ao salvar log:', err.message);
  }
}

module.exports = { audit };

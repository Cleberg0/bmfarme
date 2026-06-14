const prisma = require('../../_lib/prisma');
const { verifyAuth, setCors } = require('../../_lib/auth');
const { releaseNumber } = require('../../_services/sms');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const user = verifyAuth(req, res);
  if (!user) return;

  try {
    const { logId } = req.query;
    const { confirmed = false } = req.body;

    const smsLog = await prisma.smsLog.findUnique({ where: { id: logId } });
    if (!smsLog || smsLog.userId !== user.id)
      return res.status(404).json({ error: 'SMS log não encontrado.' });

    if (smsLog.externalId) await releaseNumber(smsLog.externalId, confirmed);

    const updated = await prisma.smsLog.update({
      where: { id: logId },
      data: { status: confirmed ? 'RECEIVED' : 'EXPIRED' }
    });

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

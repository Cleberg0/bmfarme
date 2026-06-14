const prisma = require('../../_lib/prisma');
const { verifyAuth, setCors } = require('../../_lib/auth');
const { checkCode } = require('../../_services/sms');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const user = verifyAuth(req, res);
  if (!user) return;

  try {
    const { logId } = req.query;
    const smsLog = await prisma.smsLog.findUnique({ where: { id: logId } });

    if (!smsLog || smsLog.userId !== user.id)
      return res.status(404).json({ error: 'SMS log não encontrado.' });

    if (['RECEIVED', 'EXPIRED', 'FAILED'].includes(smsLog.status))
      return res.status(200).json(smsLog);

    if (!smsLog.externalId)
      return res.status(422).json({ error: 'Este log não possui externalId para polling.' });

    const result = await checkCode(smsLog.externalId);
    const updated = await prisma.smsLog.update({
      where: { id: logId },
      data: { smsCode: result.code ?? smsLog.smsCode, status: result.status }
    });

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

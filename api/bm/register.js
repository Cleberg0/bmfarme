const prisma = require('../_lib/prisma');
const { verifyAuth, setCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const user = verifyAuth(req, res);
  if (!user) return;

  try {
    const { bmId, profileUsed, notes, clientId, domainId, smsLogId } = req.body;
    if (!bmId || !profileUsed || !clientId || !domainId || !smsLogId)
      return res.status(400).json({ error: 'bmId, profileUsed, clientId, domainId e smsLogId são obrigatórios.' });

    const [client, domain, smsLog] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId } }),
      prisma.domain.findUnique({ where: { id: domainId } }),
      prisma.smsLog.findUnique({ where: { id: smsLogId } })
    ]);

    if (!client || !domain || !smsLog)
      return res.status(404).json({ error: 'Cliente, domínio ou SMS log não encontrado.' });

    if (domain.clientId !== clientId || smsLog.clientId !== clientId)
      return res.status(400).json({ error: 'Domínio e SMS log devem pertencer ao cliente informado.' });

    const bmAsset = await prisma.bmAsset.create({
      data: { bmId, profileUsed, notes, clientId, domainId, smsLogId, userId: user.id }
    });

    return res.status(201).json(bmAsset);
  } catch (error) {
    if (error.code === 'P2002')
      return res.status(409).json({ error: 'BM asset já existe para este cliente.' });
    return res.status(500).json({ error: error.message });
  }
};

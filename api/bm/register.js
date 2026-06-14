const prisma = require('../_lib/prisma');
const { verifyAuth, setCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyAuth(req, res);
  if (!user) return;

  // POST — registra novo BM
  if (req.method === 'POST') {
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
        data: { bmId, profileUsed, notes, clientId, domainId, smsLogId, userId: user.id, status: 'ACTIVE' }
      });
      return res.status(201).json(bmAsset);
    } catch (error) {
      if (error.code === 'P2002')
        return res.status(409).json({ error: 'BM asset já existe para este cliente.' });
      return res.status(500).json({ error: error.message });
    }
  }

  // PATCH — atualiza status/notas de um BM
  if (req.method === 'PATCH') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id é obrigatório.' });
      const { status, notes } = req.body;
      const data = {};
      if (status) data.status = status;
      if (notes !== undefined) data.notes = notes;
      const updated = await prisma.bmAsset.update({ where: { id }, data });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
};

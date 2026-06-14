const prisma = require('../_lib/prisma');
const { verifyAuth, setCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const user = verifyAuth(req, res);
  if (!user) return;

  try {
    const [totalBmAssets, totalClients, totalDomains, totalSmsLogs] = await Promise.all([
      prisma.bmAsset.count(),
      prisma.client.count(),
      prisma.domain.count(),
      prisma.smsLog.count()
    ]);

    return res.status(200).json({ totalBmAssets, totalClients, totalDomains, totalSmsLogs });
  } catch {
    return res.status(500).json({ error: 'Falha ao buscar estatísticas.' });
  }
};

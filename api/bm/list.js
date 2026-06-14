const prisma = require('../_lib/prisma');
const { verifyAuth, setCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const user = verifyAuth(req, res);
  if (!user) return;

  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 100);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.bmAsset.findMany({
        skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          client: true,
          domain: true,
          smsLog: true,
          user: { select: { id: true, email: true, name: true, role: true } }
        }
      }),
      prisma.bmAsset.count()
    ]);

    return res.status(200).json({
      items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Falha ao listar BM assets.' });
  }
};

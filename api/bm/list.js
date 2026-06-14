const prisma = require('../_lib/prisma');
const { verifyAuth, setCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const user = verifyAuth(req, res);
  if (!user) return;

  try {
    const page     = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
    const skip     = (page - 1) * pageSize;

    // Filtros
    const where = {};
    if (req.query.userId)   where.userId   = req.query.userId;
    if (req.query.status)   where.status   = req.query.status;
    if (req.query.clientId) where.clientId = req.query.clientId;
    if (req.query.search) {
      where.OR = [
        { bmId:        { contains: req.query.search, mode: 'insensitive' } },
        { profileUsed: { contains: req.query.search, mode: 'insensitive' } },
        { client:      { razaoSocial: { contains: req.query.search, mode: 'insensitive' } } },
      ];
    }
    // Filtro por data
    if (req.query.since) {
      where.createdAt = { gte: new Date(req.query.since) };
    }

    const [items, total] = await Promise.all([
      prisma.bmAsset.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, razaoSocial: true, cnpj: true } },
          domain: { select: { id: true, domainName: true } },
          smsLog: { select: { id: true, phoneNumber: true, smsCode: true } },
          user:   { select: { id: true, name: true, role: true } }
        }
      }),
      prisma.bmAsset.count({ where })
    ]);

    return res.status(200).json({
      items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Falha ao listar BM assets.' });
  }
};

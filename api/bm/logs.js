const prisma = require('../_lib/prisma');
const { verifyAuth, setCors } = require('../_lib/auth');
const { rateLimit } = require('../_lib/rateLimit');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  if (!rateLimit(req, res)) return;

  const user = verifyAuth(req, res);
  if (!user) return;

  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const action = req.query.action || undefined;

    const where = {};
    if (action) where.action = action;
    // Operadores só veem seus próprios logs
    if (user.role !== 'ADMIN') where.userId = user.id;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

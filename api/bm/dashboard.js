const prisma = require('../_lib/prisma');
const { verifyAuth, setCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const user = verifyAuth(req, res);
  if (!user) return;

  try {
    // Período: últimos 30 dias por padrão, ou range customizado
    const days = Math.min(Number(req.query.days || 30), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // BMs por operador no período
    const byOperator = await prisma.bmAsset.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Busca nomes dos operadores
    const userIds = byOperator.map(r => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    // BMs por dia (todos operadores) no período
    const allBms = await prisma.bmAsset.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        createdAt: true,
        userId: true,
        bmId: true,
        client: { select: { razaoSocial: true, cnpj: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Agrupa por dia
    const byDay = {};
    for (const bm of allBms) {
      const day = bm.createdAt.toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = 0;
      byDay[day]++;
    }

    // Total geral
    const total = await prisma.bmAsset.count({ where: { createdAt: { gte: since } } });
    const totalAll = await prisma.bmAsset.count();

    // BMs de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.bmAsset.count({ where: { createdAt: { gte: today } } });

    return res.status(200).json({
      period: { days, since },
      summary: { total, totalAll, todayCount },
      byOperator: byOperator.map(r => ({
        user: userMap[r.userId] || { id: r.userId, name: 'Desconhecido' },
        count: r._count.id,
      })),
      byDay: Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      recent: allBms.slice(0, 20).map(bm => ({
        id: bm.id,
        bmId: bm.bmId,
        createdAt: bm.createdAt,
        operator: userMap[bm.userId]?.name || 'Desconhecido',
        client: bm.client?.razaoSocial || '—',
        cnpj: bm.client?.cnpj || '—',
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

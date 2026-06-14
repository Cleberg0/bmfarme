const prisma = require('../lib/prisma');

async function register(req, res) {
  try {
    const { bmId, profileUsed, notes, clientId, domainId, smsLogId } = req.body;
    const userId = req.user.id;

    if (!bmId || !profileUsed || !clientId || !domainId || !smsLogId) {
      return res.status(400).json({
        error: 'bmId, profileUsed, clientId, domainId and smsLogId are required.'
      });
    }

    const [client, domain, smsLog] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId } }),
      prisma.domain.findUnique({ where: { id: domainId } }),
      prisma.smsLog.findUnique({ where: { id: smsLogId } })
    ]);

    if (!client || !domain || !smsLog) {
      return res.status(404).json({ error: 'Related client, domain or SMS log not found.' });
    }

    if (domain.clientId !== clientId || smsLog.clientId !== clientId) {
      return res.status(400).json({ error: 'Domain and SMS log must belong to the provided client.' });
    }

    const bmAsset = await prisma.bmAsset.create({
      data: {
        bmId,
        profileUsed,
        notes,
        clientId,
        domainId,
        smsLogId,
        userId
      }
    });

    return res.status(201).json(bmAsset);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'BM asset already exists for this client.' });
    }

    return res.status(500).json({ error: error.message || 'Failed to register BM asset.' });
  }
}

async function list(req, res) {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 100);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.bmAsset.findMany({
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          client: true,
          domain: true,
          smsLog: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      }),
      prisma.bmAsset.count()
    ]);

    return res.status(200).json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to list BM assets.' });
  }
}

async function stats(req, res) {
  try {
    const [totalBmAssets, totalClients, totalDomains, totalSmsLogs] = await Promise.all([
      prisma.bmAsset.count(),
      prisma.client.count(),
      prisma.domain.count(),
      prisma.smsLog.count()
    ]);

    return res.status(200).json({
      totalBmAssets,
      totalClients,
      totalDomains,
      totalSmsLogs
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch BM stats.' });
  }
}

module.exports = {
  register,
  list,
  stats
};
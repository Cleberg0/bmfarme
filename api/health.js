const prisma = require('./_lib/prisma');
const { setCors } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: 'ok' });
  } catch {
    return res.status(500).json({ status: 'error' });
  }
};

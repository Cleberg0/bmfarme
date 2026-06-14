const { verifyAuth, setCors } = require('../_lib/auth');
const { getBalance } = require('../_services/sms');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const user = verifyAuth(req, res);
  if (!user) return;

  try {
    const value = await getBalance();
    if (value === null) return res.status(502).json({ error: 'Não foi possível obter o saldo.' });
    return res.status(200).json({ balance: value });
  } catch {
    return res.status(500).json({ error: 'Falha ao consultar saldo.' });
  }
};

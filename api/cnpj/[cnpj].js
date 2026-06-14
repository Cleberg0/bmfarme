const prisma = require('../_lib/prisma');
const { verifyAuth, setCors } = require('../_lib/auth');
const { lookupCnpj } = require('../_services/cnpj');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const user = verifyAuth(req, res);
  if (!user) return;

  try {
    const { cnpj } = req.query;
    const cnpjData = await lookupCnpj(cnpj);

    const client = await prisma.client.upsert({
      where: { cnpj: cnpjData.cnpj },
      update: {
        razaoSocial: cnpjData.razaoSocial,
        endereco: cnpjData.endereco,
        cep: cnpjData.cep,
        userId: user.id
      },
      create: {
        cnpj: cnpjData.cnpj,
        razaoSocial: cnpjData.razaoSocial,
        endereco: cnpjData.endereco,
        cep: cnpjData.cep,
        userId: user.id
      }
    });

    return res.status(200).json(client);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

const prisma = require('../lib/prisma');
const { lookupCnpj } = require('../services/vera.service');

async function getCnpj(req, res) {
  try {
    const { cnpj } = req.params;
    const userId = req.user.id;
    const cnpjData = await lookupCnpj(cnpj);

    const client = await prisma.client.upsert({
      where: {
        cnpj: cnpjData.cnpj
      },
      update: {
        razaoSocial: cnpjData.razaoSocial,
        endereco: cnpjData.endereco,
        cep: cnpjData.cep,
        userId
      },
      create: {
        cnpj: cnpjData.cnpj,
        razaoSocial: cnpjData.razaoSocial,
        endereco: cnpjData.endereco,
        cep: cnpjData.cep,
        userId
      }
    });

    return res.status(200).json(client);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch CNPJ data.'
    });
  }
}

module.exports = {
  getCnpj
};
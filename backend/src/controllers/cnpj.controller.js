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
        nomeFantasia: cnpjData.nomeFantasia || null,
        endereco: cnpjData.endereco,
        cep: cnpjData.cep,
        municipio: cnpjData.municipio || null,
        uf: cnpjData.uf || null,
        situacao: cnpjData.situacao || null,
        atividadePrincipal: cnpjData.atividadePrincipal || null,
        telefone: cnpjData.telefone || null,
        email: cnpjData.email || null,
        userId
      },
      create: {
        cnpj: cnpjData.cnpj,
        razaoSocial: cnpjData.razaoSocial,
        nomeFantasia: cnpjData.nomeFantasia || null,
        endereco: cnpjData.endereco,
        cep: cnpjData.cep,
        municipio: cnpjData.municipio || null,
        uf: cnpjData.uf || null,
        situacao: cnpjData.situacao || null,
        atividadePrincipal: cnpjData.atividadePrincipal || null,
        telefone: cnpjData.telefone || null,
        email: cnpjData.email || null,
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

const axios = require('axios');
const env = require('../_lib/env');

const dataApi = axios.create({ baseURL: 'https://data-api.click/api', timeout: 15000 });

function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '');
}

async function lookupCnpj(cnpj) {
  const normalized = normalizeCnpj(cnpj);
  if (normalized.length !== 14)
    throw Object.assign(new Error('CNPJ deve conter 14 dígitos.'), { statusCode: 400 });

  let response;
  try {
    response = await dataApi.get('/funcionarios.php', {
      params: { funcionarios: normalized, key: env.dataApiKey }
    });
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    throw Object.assign(new Error(message), { statusCode: error.response?.status || 502 });
  }

  const payload = response.data;
  const data = Array.isArray(payload) ? payload[0] : payload;
  if (!data)
    throw Object.assign(new Error('data-api.click retornou resposta vazia.'), { statusCode: 404 });

  const razaoSocial =
    data.razao_social || data.razaoSocial || data.nome || data.empresa || data.nome_empresarial || null;
  if (!razaoSocial)
    throw Object.assign(new Error('Resposta da API não contém razão social.'), { statusCode: 502 });

  const endereco = [
    data.logradouro || data.endereco || '',
    data.numero ? `nº ${data.numero}` : '',
    data.complemento || '',
    data.bairro || '',
    data.municipio || data.cidade || '',
    data.uf || ''
  ].filter(Boolean).join(', ');

  return {
    cnpj: normalized,
    razaoSocial,
    endereco,
    cep: (data.cep || '').replace(/\D/g, ''),
    raw: data
  };
}

module.exports = { lookupCnpj, normalizeCnpj };

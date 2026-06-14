/**
 * Serviço de consulta de CNPJ via data-api.click
 * Endpoint: GET https://data-api.click/api/funcionarios.php?funcionarios={CNPJ}&key={KEY}
 */

const axios = require('axios');
const env = require('../config/env');

const dataApi = axios.create({
  baseURL: 'https://data-api.click/api',
  timeout: 15000
});

function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '');
}

async function lookupCnpj(cnpj) {
  const normalizedCnpj = normalizeCnpj(cnpj);

  if (normalizedCnpj.length !== 14) {
    const error = new Error('CNPJ deve conter 14 dígitos.');
    error.statusCode = 400;
    throw error;
  }

  let response;
  try {
    response = await dataApi.get('/funcionarios.php', {
      params: {
        funcionarios: normalizedCnpj,
        key: env.dataApiKey
      }
    });
  } catch (error) {
    const statusCode = error.response?.status || 502;
    const message =
      error.response?.data?.message ||
      error.message ||
      'Falha ao consultar CNPJ na data-api.click.';
    const serviceError = new Error(message);
    serviceError.statusCode = statusCode;
    throw serviceError;
  }

  const payload = response.data;

  // A API pode retornar array ou objeto único
  const data = Array.isArray(payload) ? payload[0] : payload;

  if (!data) {
    const error = new Error('data-api.click retornou resposta vazia para este CNPJ.');
    error.statusCode = 404;
    throw error;
  }

  // Campos possíveis retornados pela API
  const razaoSocial =
    data.razao_social ||
    data.razaoSocial ||
    data.nome ||
    data.empresa ||
    data.nome_empresarial ||
    null;

  if (!razaoSocial) {
    const error = new Error('Resposta da API não contém razão social.');
    error.statusCode = 502;
    throw error;
  }

  // Monta endereço a partir dos campos disponíveis
  const enderecoParts = [
    data.logradouro || data.endereco || data.address || '',
    data.numero ? `nº ${data.numero}` : '',
    data.complemento || '',
    data.bairro || '',
    data.municipio || data.cidade || data.city || '',
    data.uf || data.estado || ''
  ].filter(Boolean);

  const endereco = enderecoParts.join(', ');
  const cep = (data.cep || data.zipCode || '').replace(/\D/g, '');

  return {
    cnpj: normalizedCnpj,
    razaoSocial,
    endereco,
    cep,
    // Dados extras retornados pela API (útil para exibir no frontend)
    raw: data
  };
}

module.exports = {
  lookupCnpj,
  normalizeCnpj
};

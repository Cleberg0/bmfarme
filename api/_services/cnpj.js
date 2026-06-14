/**
 * Consulta CNPJ via BrasilAPI (gratuita, sem chave, dados da Receita Federal)
 * https://brasilapi.com.br/api/cnpj/v1/:cnpj
 *
 * Fallback: ReceitaWS
 * https://receitaws.com.br/v1/cnpj/:cnpj
 */
const axios = require('axios');

function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '');
}

async function lookupViaBrasilAPI(cnpj) {
  const res = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    timeout: 15000,
    headers: { 'Accept': 'application/json' }
  });
  const d = res.data;

  const enderecoParts = [
    d.descricao_tipo_de_logradouro ? `${d.descricao_tipo_de_logradouro} ${d.logradouro}` : d.logradouro,
    d.numero,
    d.complemento,
    d.bairro,
    d.municipio,
    d.uf
  ].filter(Boolean);

  return {
    cnpj,
    razaoSocial: d.razao_social || d.nome_fantasia || '',
    nomeFantasia: d.nome_fantasia || '',
    endereco: enderecoParts.join(', '),
    cep: (d.cep || '').replace(/\D/g, ''),
    municipio: d.municipio || '',
    uf: d.uf || '',
    situacao: d.descricao_situacao_cadastral || '',
    atividadePrincipal: d.cnae_fiscal_descricao || '',
    telefone: d.ddd_telefone_1 ? `(${d.ddd_telefone_1}) ${d.telefone_1 || ''}`.trim() : '',
    email: d.email || '',
    raw: d
  };
}

async function lookupViaReceitaWS(cnpj) {
  const res = await axios.get(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
    timeout: 15000,
    headers: { 'Accept': 'application/json' }
  });
  const d = res.data;
  if (d.status === 'ERROR') throw new Error(d.message || 'CNPJ não encontrado.');

  const enderecoParts = [
    d.logradouro,
    d.numero,
    d.complemento,
    d.bairro,
    d.municipio,
    d.uf
  ].filter(Boolean);

  return {
    cnpj,
    razaoSocial: d.nome || '',
    nomeFantasia: d.fantasia || '',
    endereco: enderecoParts.join(', '),
    cep: (d.cep || '').replace(/\D/g, ''),
    municipio: d.municipio || '',
    uf: d.uf || '',
    situacao: d.situacao || '',
    atividadePrincipal: d.atividade_principal?.[0]?.text || '',
    telefone: d.telefone || '',
    email: d.email || '',
    raw: d
  };
}

async function lookupCnpj(cnpj) {
  const normalized = normalizeCnpj(cnpj);
  if (normalized.length !== 14)
    throw Object.assign(new Error('CNPJ deve conter 14 dígitos.'), { statusCode: 400 });

  // Tenta BrasilAPI primeiro, fallback para ReceitaWS
  try {
    return await lookupViaBrasilAPI(normalized);
  } catch (errBrasil) {
    try {
      return await lookupViaReceitaWS(normalized);
    } catch (errReceita) {
      const msg = errBrasil.response?.data?.message || errReceita.message || 'Falha ao consultar CNPJ.';
      throw Object.assign(new Error(msg), { statusCode: 404 });
    }
  }
}

module.exports = { lookupCnpj, normalizeCnpj };

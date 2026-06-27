/**
 * Porkbun API — registra domínios com DNS instantâneo (powered by Cloudflare)
 * API: https://api.porkbun.com/api/json/v3/
 */
const axios = require('axios');

const PORKBUN_API = 'https://api.porkbun.com/api/json/v3';

function getKeys() {
  const apiKey = process.env.PORKBUN_API_KEY || '';
  const secretKey = process.env.PORKBUN_SECRET_KEY || '';
  if (!apiKey || !secretKey) throw new Error('PORKBUN_API_KEY ou PORKBUN_SECRET_KEY não configurado');
  return { apikey: apiKey, secretapikey: secretKey };
}

/**
 * Verifica disponibilidade e preço de um domínio
 */
async function checkDomain(domain) {
  const keys = getKeys();
  const res = await axios.post(`${PORKBUN_API}/domain/checkDomain/${domain}`, keys, { timeout: 15000 });
  const data = res.data;
  if (data.status === 'SUCCESS') {
    return {
      domain,
      available: data.response?.avail === 'yes',
      price: data.response?.registration,
      renewal: data.response?.renewal,
      currency: 'USD',
    };
  }
  throw new Error(data.message || 'Erro ao verificar domínio no Porkbun');
}

/**
 * Registra um domínio no Porkbun
 * Precisa: saldo na conta, email/phone verificado, agreeToTerms
 */
async function registerDomain(domain) {
  const keys = getKeys();

  // Primeiro pega o preço atual
  const check = await checkDomain(domain);
  if (!check.available) throw new Error(`Domínio ${domain} não está disponível.`);

  // Preço em centavos (pennies)
  const cost = Math.round(parseFloat(check.price) * 100);

  const res = await axios.post(`${PORKBUN_API}/domain/create/${domain}`, {
    ...keys,
    cost,
    agreeToTerms: 'yes',
  }, { timeout: 30000 });

  const data = res.data;
  if (data.status === 'SUCCESS') {
    console.log(`[Porkbun] Domínio registrado: ${domain} ($${check.price})`);
    return { success: true, domain, price: check.price };
  }

  throw new Error(`Porkbun register error: ${data.message || JSON.stringify(data)}`);
}

/**
 * Configura DNS com A record pro Netlify (75.2.60.5)
 * Porkbun usa Cloudflare DNS = propagação instantânea
 */
async function setDnsForNetlify(domain) {
  const keys = getKeys();

  // Deleta registros existentes primeiro (limpa o padrão)
  try {
    await axios.post(`${PORKBUN_API}/dns/deleteByNameType/${domain}/A/`, keys, { timeout: 15000 });
  } catch { /* ignora se não existe */ }

  // Cria A record pro Netlify
  const res = await axios.post(`${PORKBUN_API}/dns/create/${domain}`, {
    ...keys,
    type: 'A',
    name: '',
    content: '75.2.60.5',
    ttl: 300,
  }, { timeout: 15000 });

  const data = res.data;
  if (data.status === 'SUCCESS') {
    console.log(`[Porkbun] DNS A record criado: ${domain} -> 75.2.60.5 (instantâneo)`);
    return true;
  }

  throw new Error(`Porkbun DNS error: ${data.message || JSON.stringify(data)}`);
}

module.exports = { checkDomain, registerDomain, setDnsForNetlify };

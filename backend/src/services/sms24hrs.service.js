/**
 * SMS24h.org service — protocolo compatível com sms-activate.ru
 * Endpoint: http://api.sms24h.org/stubs/handler_api
 * Docs: usa parâmetros ?action=...&api_key=...
 *
 * ATENÇÃO: a API requer HTTP (não HTTPS) conforme documentação do provedor.
 */

const axios = require('axios');
const env = require('../config/env');

// País padrão: Brazil (código 73 no sms-activate / sms24h)
const DEFAULT_COUNTRY = 73;
// Serviço padrão: "fb" = Facebook. Ajuste conforme necessidade.
const DEFAULT_SERVICE = 'fb';

const smsApi = axios.create({
  baseURL: env.sms24ApiUrl, // deve ser http://api.sms24h.org/stubs/handler_api
  timeout: 20000
});

/**
 * Faz a requisição à API e retorna o texto bruto da resposta.
 * A API retorna strings como "ACCESS_NUMBER:id:phone" ou "NO_NUMBERS", etc.
 */
async function apiRequest(params) {
  const response = await smsApi.get('', {
    params: {
      api_key: env.sms24ApiKey,
      ...params
    }
  });
  // A resposta é texto puro (não JSON)
  return typeof response.data === 'string' ? response.data.trim() : String(response.data).trim();
}

/**
 * Compra um número virtual para receber SMS.
 * action=getNumber
 * Retorna: ACCESS_NUMBER:<id>:<phoneNumber>
 */
async function buyNumber(service = DEFAULT_SERVICE, country = DEFAULT_COUNTRY) {
  let raw;
  try {
    raw = await apiRequest({ action: 'getNumber', service, country });
  } catch (error) {
    const msg = error.response?.data || error.message || 'Falha ao conectar com SMS24h.';
    const err = new Error(String(msg));
    err.statusCode = error.response?.status || 502;
    throw err;
  }

  // Resposta esperada: ACCESS_NUMBER:12345:5511999998888
  if (raw.startsWith('ACCESS_NUMBER:')) {
    const parts = raw.split(':');
    // parts[0] = "ACCESS_NUMBER", parts[1] = id, parts[2] = número
    if (parts.length < 3) {
      throw Object.assign(new Error('Resposta inesperada da API: ' + raw), { statusCode: 502 });
    }
    return {
      externalId: parts[1],
      phoneNumber: parts[2],
      provider: 'SMS24H'
    };
  }

  // Erros conhecidos do protocolo
  const knownErrors = {
    NO_NUMBERS: 'Sem números disponíveis no momento. Tente novamente em breve.',
    NO_BALANCE: 'Saldo insuficiente na conta SMS24h.',
    WRONG_SERVICE: 'Serviço inválido informado.',
    BAD_KEY: 'API key inválida ou sem permissão.',
    ERROR_SQL: 'Erro interno no servidor SMS24h.',
    BAD_ACTION: 'Ação inválida na requisição.'
  };

  const errMsg = knownErrors[raw] || `Erro desconhecido da API: ${raw}`;
  throw Object.assign(new Error(errMsg), { statusCode: 422 });
}

/**
 * Informa ao servidor que o número foi usado e pode aguardar o SMS.
 * action=setStatus&status=1&id=<externalId>
 * Deve ser chamado após buyNumber para "ativar" o número.
 */
async function activateNumber(externalId) {
  try {
    const raw = await apiRequest({ action: 'setStatus', status: 1, id: externalId });
    // Resposta esperada: ACCESS_READY
    return raw === 'ACCESS_READY' || raw.includes('ACCESS');
  } catch {
    // Não é crítico — o polling de código ainda pode funcionar
    return false;
  }
}

/**
 * Consulta o código SMS recebido para um número.
 * action=getStatus&id=<externalId>
 * Respostas:
 *   STATUS_WAIT_CODE     — aguardando SMS
 *   STATUS_WAIT_RETRY    — SMS recebido mas inválido, aguardando reenvio
 *   STATUS_WAIT_RESEND   — aguardando reenvio
 *   STATUS_CANCEL        — cancelado
 *   STATUS_OK:<code>     — código recebido com sucesso
 */
async function checkCode(externalId) {
  let raw;
  try {
    raw = await apiRequest({ action: 'getStatus', id: externalId });
  } catch (error) {
    const msg = error.response?.data || error.message || 'Falha ao verificar código SMS.';
    const err = new Error(String(msg));
    err.statusCode = error.response?.status || 502;
    throw err;
  }

  if (raw.startsWith('STATUS_OK:')) {
    const code = raw.split(':')[1];
    return { code, status: 'RECEIVED' };
  }

  const statusMap = {
    STATUS_WAIT_CODE: { code: null, status: 'WAITING' },
    STATUS_WAIT_RETRY: { code: null, status: 'WAITING' },
    STATUS_WAIT_RESEND: { code: null, status: 'WAITING' },
    STATUS_CANCEL: { code: null, status: 'EXPIRED' },
    STATUS_CANCEL_TIMEOUT: { code: null, status: 'EXPIRED' }
  };

  if (statusMap[raw]) return statusMap[raw];

  // Fallback para respostas desconhecidas
  return { code: null, status: 'WAITING' };
}

/**
 * Cancela/libera o número após uso (ou timeout).
 * action=setStatus&status=8&id=<externalId>  → STATUS_CANCEL
 * action=setStatus&status=6&id=<externalId>  → marcar como concluído (código confirmado)
 */
async function releaseNumber(externalId, confirmed = false) {
  try {
    // status=6: código confirmado e usado; status=8: cancelar sem usar
    const status = confirmed ? 6 : 8;
    await apiRequest({ action: 'setStatus', status, id: externalId });
    return true;
  } catch {
    return false;
  }
}

/**
 * Consulta o saldo da conta.
 * action=getBalance
 * Retorna: ACCESS_BALANCE:<valor>
 */
async function getBalance() {
  try {
    const raw = await apiRequest({ action: 'getBalance' });
    if (raw.startsWith('ACCESS_BALANCE:')) {
      return parseFloat(raw.split(':')[1]);
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = {
  buyNumber,
  activateNumber,
  checkCode,
  releaseNumber,
  getBalance
};

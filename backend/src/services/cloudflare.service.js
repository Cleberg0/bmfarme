const axios = require('axios');
const env = require('../config/env');

const cloudflareApi = axios.create({
  baseURL: 'https://api.cloudflare.com/client/v4',
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${env.cloudflareApiToken}`,
    'Content-Type': 'application/json'
  }
});

async function createZone(domainName) {
  try {
    const response = await cloudflareApi.post('/zones', {
      account: {
        id: env.cloudflareAccountId
      },
      name: domainName,
      type: 'full'
    });

    if (!response.data?.success || !response.data?.result?.id) {
      throw new Error('Cloudflare zone creation returned an invalid response.');
    }

    return response.data.result;
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.message || error.message || 'Failed to create Cloudflare zone.';
    const serviceError = new Error(message);
    serviceError.statusCode = error.response?.status || 502;
    throw serviceError;
  }
}

async function createARecord(zoneId, domainName) {
  try {
    const response = await cloudflareApi.post(`/zones/${zoneId}/dns_records`, {
      type: 'A',
      name: domainName,
      content: env.vpsIp,
      ttl: 1,
      proxied: false
    });

    if (!response.data?.success) {
      throw new Error('Cloudflare DNS record creation returned an invalid response.');
    }

    return response.data.result;
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.message || error.message || 'Failed to create Cloudflare DNS record.';
    const serviceError = new Error(message);
    serviceError.statusCode = error.response?.status || 502;
    throw serviceError;
  }
}

async function deleteZone(zoneId) {
  try {
    await cloudflareApi.delete(`/zones/${zoneId}`);
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.message || error.message || 'Failed to delete Cloudflare zone.';
    const serviceError = new Error(message);
    serviceError.statusCode = error.response?.status || 502;
    throw serviceError;
  }
}

module.exports = {
  createZone,
  createARecord,
  deleteZone
};
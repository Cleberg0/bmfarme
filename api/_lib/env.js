// Validação lazy de variáveis — segura para cold start serverless
function get(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

module.exports = {
  get jwtSecret()          { return get('JWT_SECRET'); },
  get dataApiKey()         { return get('DATA_API_KEY'); },
  get cloudflareApiToken() { return get('CLOUDFLARE_API_TOKEN'); },
  get cloudflareAccountId(){ return get('CLOUDFLARE_ACCOUNT_ID'); },
  get vpsIp()              { return get('VPS_IP'); },
  get sms24ApiKey()        { return get('SMS24_API_KEY'); },
  get sms24ApiUrl()        { return get('SMS24_API_URL'); },
};

const dotenv = require('dotenv');

dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'DATABASE_URL_NON_POOLING',
  'JWT_SECRET',
  'DATA_API_KEY',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'VPS_IP',
  'SMS24_API_KEY',
  'SMS24_API_URL'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  dataApiKey: process.env.DATA_API_KEY,
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  vpsIp: process.env.VPS_IP,
  sms24ApiKey: process.env.SMS24_API_KEY,
  sms24ApiUrl: process.env.SMS24_API_URL
};
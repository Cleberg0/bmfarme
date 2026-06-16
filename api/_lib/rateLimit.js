/**
 * Rate limiter simples em memória para Vercel Serverless.
 * Limita por IP — padrão: 60 requests por minuto.
 */
const rateLimitMap = new Map();

const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 60;

function rateLimit(req, res, { windowMs = WINDOW_MS, max = MAX_REQUESTS } = {}) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';

  const now = Date.now();
  const key = ip;

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, startTime: now });
    return true;
  }

  const entry = rateLimitMap.get(key);

  if (now - entry.startTime > windowMs) {
    // Reset window
    entry.count = 1;
    entry.startTime = now;
    return true;
  }

  entry.count++;

  if (entry.count > max) {
    res.status(429).json({ error: 'Muitas requisições. Tente novamente em breve.' });
    return false;
  }

  return true;
}

// Limpa entradas antigas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.startTime > WINDOW_MS * 2) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

module.exports = { rateLimit };

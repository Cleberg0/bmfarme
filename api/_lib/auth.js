const jwt = require('jsonwebtoken');
const env = require('./env');

/**
 * Verifica o token JWT do request.
 * Se inválido, responde 401 e retorna null.
 * Se válido, retorna o payload { id, email, role }.
 */
function verifyAuth(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autorização é obrigatório.' });
    return null;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
    return null;
  }
}

/**
 * Adiciona headers CORS padrão à resposta.
 */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = { verifyAuth, setCors };

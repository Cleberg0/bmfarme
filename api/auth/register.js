const bcrypt = require('bcryptjs');
const prisma = require('../_lib/prisma');
const env = require('../_lib/env');
const { setCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: 'email, password e name são obrigatórios.' });

    const existing = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() }
    });
    if (existing) return res.status(409).json({ error: 'Usuário já existe.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: String(email).toLowerCase(),
        password: hashedPassword,
        name,
        role: role === 'ADMIN' ? 'ADMIN' : 'OPERATOR'
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });

    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Falha ao registrar usuário.' });
  }
};

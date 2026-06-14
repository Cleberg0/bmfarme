const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const env = require('../config/env');

async function register(req, res) {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password and name are required.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: String(email).toLowerCase(),
        password: hashedPassword,
        name,
        role: role === 'ADMIN' ? 'ADMIN' : 'OPERATOR'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to register user.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      {
        email: user.email,
        role: user.role
      },
      env.jwtSecret,
      {
        subject: user.id,
        expiresIn: '12h'
      }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to login.' });
  }
}

module.exports = {
  register,
  login
};
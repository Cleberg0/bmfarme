const { PrismaClient } = require('@prisma/client');

// Singleton para evitar múltiplas conexões em ambiente serverless
const globalForPrisma = globalThis;
const prisma = globalForPrisma._prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma._prisma = prisma;

module.exports = prisma;

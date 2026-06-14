# bmfarme

Sistema de gerenciamento de BM Farm com backend Node.js + Prisma e frontend React + Vite.

## Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite
- **Backend**: Node.js, Express, Prisma ORM, PostgreSQL
- **Infra**: Docker, Cloudflare, SMS24h

## Estrutura

```
├── frontend/   # React + Vite (deploy na Vercel)
├── backend/    # Express API (deploy separado / Docker)
├── docker-compose.yml
└── deploy.env.example
```

## Desenvolvimento local

```bash
# Backend
cd backend
cp .env.example .env   # preencha as variáveis
npm install
npx prisma migrate dev
npm run dev

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Variáveis de ambiente

Veja `deploy.env.example` para a lista completa de variáveis necessárias.

const prisma = require('../_lib/prisma');
const { verifyAuth, setCors } = require('../_lib/auth');

function buildCardHtml({ razaoSocial, nomeFantasia, cnpj, endereco, cep, municipio, uf, situacao, atividadePrincipal, telefone, email, smsPhone, workerUrl }) {
  function esc(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function formatCnpj(c) {
    const d = String(c || '').replace(/\D/g, '');
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') || c;
  }
  function formatCep(c) {
    const d = String(c || '').replace(/\D/g, '');
    return d.replace(/^(\d{5})(\d{3})$/, '$1-$2') || c;
  }

  const name = esc(nomeFantasia || razaoSocial);
  const rows = [
    ['Razão Social',           esc(razaoSocial)],
    nomeFantasia               ? ['Nome Fantasia',        esc(nomeFantasia)]         : null,
    cnpj                       ? ['CNPJ',                 formatCnpj(cnpj)]          : null,
    situacao                   ? ['Situação',             esc(situacao)]             : null,
    atividadePrincipal         ? ['Atividade Principal',  esc(atividadePrincipal)]   : null,
    endereco                   ? ['Endereço',             esc(endereco)]             : null,
    cep                        ? ['CEP',                  formatCep(cep)]            : null,
    municipio && uf            ? ['Município / UF',       `${esc(municipio)} - ${esc(uf)}`] : null,
    telefone                   ? ['Telefone',             esc(telefone)]             : null,
    email                      ? ['E-mail',               esc(email)]                : null,
    smsPhone                   ? ['Número SMS (verificação)', `<strong style="color:#1a7f4b;font-size:1.05em">${esc(smsPhone)}</strong>`] : null,
    workerUrl                  ? ['Site de verificação',  `<a href="${esc(workerUrl)}" style="color:#2563eb">${esc(workerUrl)}</a>`] : null,
  ].filter(Boolean);

  const rowsHtml = rows.map(([label, value]) => `
    <tr><td class="lbl">${label}</td><td class="val">${value}</td></tr>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Cartão CNPJ – ${name}</title>
<style>
@page{size:A4;margin:20mm 18mm;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#111;font-size:13px;}
.card{border:2px solid #1a7f4b;border-radius:12px;overflow:hidden;max-width:600px;margin:0 auto;}
.hdr{background:linear-gradient(135deg,#1a365d,#1a7f4b);padding:24px 28px;color:#fff;}
.hdr h1{font-size:1.35rem;font-weight:700;margin-bottom:4px;}
.hdr p{font-size:0.8rem;opacity:0.75;}
.badge{display:inline-block;margin-top:10px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);padding:3px 12px;border-radius:999px;font-size:0.72rem;font-weight:600;letter-spacing:0.06em;}
table{width:100%;border-collapse:collapse;}
tr:nth-child(even){background:#f8fdf9;}
td{padding:10px 20px;vertical-align:top;}
td.lbl{width:38%;font-weight:600;color:#4a5568;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;padding-right:8px;}
td.val{color:#1a202c;font-size:0.88rem;}
.ftr{background:#f0fdf4;border-top:1px solid #bbf7d0;padding:12px 20px;text-align:center;font-size:0.72rem;color:#6b7280;}
.actions{display:flex;gap:10px;justify-content:center;margin:20px;}
.btn{padding:10px 28px;border:none;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;}
.btn-print{background:#1a7f4b;color:#fff;}
.btn-close{background:#e5e7eb;color:#374151;}
@media print{.actions{display:none;}body{background:#fff;}}
</style>
</head>
<body>
<div class="card">
  <div class="hdr">
    <h1>${name}</h1>
    <p>Cartão CNPJ</p>
    <span class="badge">🇧🇷 Receita Federal do Brasil</span>
  </div>
  <table>${rowsHtml}</table>
  <div class="ftr">Documento gerado em ${new Date().toLocaleString('pt-BR')} • Dados da Receita Federal</div>
</div>
<div class="actions">
  <button class="btn btn-print" onclick="window.print()">🖨️ Salvar como PDF</button>
  <button class="btn btn-close" onclick="window.close()">✕ Fechar</button>
</div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyAuth(req, res);
  if (!user) return;

  // GET — gera HTML ou retorna JSON com os dados
  if (req.method === 'GET') {
    try {
      const { clientId, format } = req.query;
      if (!clientId) return res.status(400).json({ error: 'clientId é obrigatório.' });

      const [client, smsLog, domain] = await Promise.all([
        prisma.client.findUnique({ where: { id: clientId } }),
        prisma.smsLog.findFirst({
          where: { clientId, status: { in: ['RECEIVED', 'WAITING'] } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.domain.findFirst({
          where: { clientId, status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      if (!client) return res.status(404).json({ error: 'Cliente não encontrado.' });

      const env = require('../_lib/env');
      const workerUrl = domain
        ? `https://${domain.cloudflareZoneId}.${env.cloudflareWorkersSubdomain}.workers.dev`
        : null;

      // Retorna JSON para o modal de edição
      if (format === 'json') {
        return res.status(200).json({
          razaoSocial:        client.razaoSocial        || '',
          nomeFantasia:       client.nomeFantasia        || '',
          cnpj:               client.cnpj               || '',
          endereco:           client.endereco            || '',
          cep:                client.cep                 || '',
          municipio:          client.municipio           || '',
          uf:                 client.uf                  || '',
          situacao:           client.situacao            || '',
          atividadePrincipal: client.atividadePrincipal  || '',
          telefone:           client.telefone            || '',
          email:              client.email               || '',
          smsPhone:           smsLog?.phoneNumber        || '',
          workerUrl:          workerUrl                  || '',
        });
      }

      const html = buildCardHtml({
        razaoSocial:        client.razaoSocial,
        nomeFantasia:       client.nomeFantasia,
        cnpj:               client.cnpj,
        endereco:           client.endereco,
        cep:                client.cep,
        municipio:          client.municipio,
        uf:                 client.uf,
        situacao:           client.situacao,
        atividadePrincipal: client.atividadePrincipal,
        telefone:           client.telefone,
        email:              client.email,
        smsPhone:           smsLog?.phoneNumber || null,
        workerUrl,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST — gera com dados customizados (editados no frontend)
  if (req.method === 'POST') {
    try {
      const { razaoSocial, nomeFantasia, cnpj, endereco, cep, municipio, uf, situacao, atividadePrincipal, telefone, email, smsPhone, workerUrl } = req.body;
      if (!razaoSocial) return res.status(400).json({ error: 'razaoSocial é obrigatório.' });

      const html = buildCardHtml({ razaoSocial, nomeFantasia, cnpj, endereco, cep, municipio, uf, situacao, atividadePrincipal, telefone, email, smsPhone, workerUrl });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
};

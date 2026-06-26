const prisma = require('../_lib/prisma');
const { verifyAuth, setCors } = require('../_lib/auth');
const { buildLandingHtml } = require('../_services/cloudflare');
const { checkDomain, registerDomain, setDnsForNetlify } = require('../_services/dynadot');
const { deployNetlifySite } = require('../_services/netlify');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyAuth(req, res);
  if (!user) return;

  // POST — registrar domínio + publicar site (fluxo completo)
  if (req.method === 'POST') {
    try {
      const { domainName, clientId, metaVerificationCode, customRazao, customFantasia } = req.body;
      if (!domainName || !clientId || !metaVerificationCode)
        return res.status(400).json({ error: 'domainName, clientId e metaVerificationCode são obrigatórios.' });

      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) return res.status(404).json({ error: 'Cliente não encontrado.' });

      // 1. Verifica disponibilidade
      const check = await checkDomain(domainName);
      if (!check.available) {
        return res.status(422).json({ error: `Domínio ${domainName} não está disponível.` });
      }

      // 2. Registra o domínio
      await registerDomain(domainName);

      // 3. Configura DNS pra Netlify
      await setDnsForNetlify(domainName);

      // 4. Busca SMS mais recente
      const smsLog = await prisma.smsLog.findFirst({
        where: { clientId, status: { in: ['WAITING', 'RECEIVED'] } },
        orderBy: { createdAt: 'desc' },
      });

      // 5. Gera HTML
      const siteParams = {
        razaoSocial: customRazao || client.razaoSocial,
        nomeFantasia: customFantasia || client.nomeFantasia,
        cnpj: client.cnpj, endereco: client.endereco, numero: client.numero,
        bairro: client.bairro, cep: client.cep,
        municipio: client.municipio, uf: client.uf, situacao: client.situacao,
        atividadePrincipal: client.atividadePrincipal, telefone: client.telefone,
        email: client.email,
        smsPhone: smsLog?.phoneNumber || null,
        smsCode: smsLog?.smsCode || null,
        metaVerificationCode, verificationMethod: 'meta_tag',
      };
      const html = buildLandingHtml(siteParams);

      // 6. Deploy no Netlify com domínio customizado
      const siteName = domainName.replace(/\./g, '-');
      const result = await deployNetlifySite(siteName, html, domainName);

      // 7. Salva no banco
      const domain = await prisma.domain.create({
        data: {
          domainName,
          cloudflareZoneId: siteName,
          metaVerificationCode,
          status: 'ACTIVE',
          clientId,
          userId: user.id,
        }
      });

      return res.status(201).json({
        ...domain,
        workerUrl: `https://${domainName}`,
        domainName,
        message: `Domínio ${domainName} registrado e site publicado!`,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  // GET — verifica disponibilidade
  if (req.method === 'GET') {
    try {
      const { domain } = req.query;
      if (!domain) return res.status(400).json({ error: 'domain é obrigatório.' });
      const result = await checkDomain(domain);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
};

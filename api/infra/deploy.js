const prisma = require('../_lib/prisma');
const { verifyAuth, setCors } = require('../_lib/auth');
const { createZone, createARecord, deleteZone } = require('../_services/cloudflare');
const { writeVerificationIndex, removeDomainDirectory } = require('../_services/vps');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const user = verifyAuth(req, res);
  if (!user) return;

  let zoneId = null;
  let createdDomain = null;

  try {
    const { domainName, metaVerificationCode, clientId } = req.body;
    if (!domainName || !metaVerificationCode || !clientId)
      return res.status(400).json({ error: 'domainName, metaVerificationCode e clientId são obrigatórios.' });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado.' });

    const existing = await prisma.domain.findFirst({ where: { clientId, domainName } });
    if (existing) return res.status(409).json({ error: 'Domínio já existe para este cliente.' });

    const zone = await createZone(domainName);
    zoneId = zone.id;
    createdDomain = domainName;

    await createARecord(zone.id, domainName);
    const directory = await writeVerificationIndex(domainName, metaVerificationCode);

    const domain = await prisma.domain.create({
      data: {
        domainName,
        cloudflareZoneId: zone.id,
        metaVerificationCode,
        status: 'ACTIVE',
        clientId,
        userId: user.id
      }
    });

    return res.status(201).json({ ...domain, directory });
  } catch (error) {
    // Rollback
    if (createdDomain) await removeDomainDirectory(createdDomain).catch(() => null);
    if (zoneId) await deleteZone(zoneId).catch(() => null);

    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

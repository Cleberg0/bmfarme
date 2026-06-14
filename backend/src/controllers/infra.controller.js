const prisma = require('../lib/prisma');
const { createZone, createARecord, deleteZone } = require('../services/cloudflare.service');
const { writeVerificationIndex, removeDomainDirectory } = require('../services/fileSystem.service');

async function deploy(req, res) {
  let zoneId = null;
  let createdDomain = null;

  try {
    const { domainName, metaVerificationCode, clientId } = req.body;
    const userId = req.user.id;

    if (!domainName || !metaVerificationCode || !clientId) {
      return res.status(400).json({ error: 'domainName, metaVerificationCode and clientId are required.' });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const existingDomain = await prisma.domain.findFirst({
      where: {
        clientId,
        domainName
      }
    });

    if (existingDomain) {
      return res.status(409).json({ error: 'Domain already exists for this client.' });
    }

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
        userId
      }
    });

    return res.status(201).json({
      ...domain,
      directory
    });
  } catch (error) {
    if (createdDomain) {
      await removeDomainDirectory(createdDomain).catch(() => null);
    }

    if (zoneId) {
      await deleteZone(zoneId).catch(() => null);
    }

    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to deploy infrastructure.'
    });
  }
}

module.exports = {
  deploy
};
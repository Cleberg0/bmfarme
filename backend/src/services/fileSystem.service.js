const fs = require('fs/promises');
const path = require('path');

const baseWebRoot = process.platform === 'win32' ? path.join(process.cwd(), 'var', 'www') : '/var/www';

function sanitizeDomainName(domainName) {
  return String(domainName || '').trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function ensureDomainDirectory(domainName) {
  const sanitizedDomain = sanitizeDomainName(domainName);

  if (!sanitizedDomain) {
    const error = new Error('Domain name is required.');
    error.statusCode = 400;
    throw error;
  }

  const domainDirectory = path.join(baseWebRoot, sanitizedDomain);
  await fs.mkdir(domainDirectory, { recursive: true });
  return domainDirectory;
}

async function writeVerificationIndex(domainName, metaVerificationCode) {
  const domainDirectory = await ensureDomainDirectory(domainName);
  const safeDomainName = escapeHtml(domainName);
  const safeMetaVerificationCode = escapeHtml(metaVerificationCode);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="facebook-domain-verification" content="${safeMetaVerificationCode}" />
  <title>${safeDomainName}</title>
</head>
<body>
  <main>
    <h1>${safeDomainName}</h1>
  </main>
</body>
</html>
`;

  await fs.writeFile(path.join(domainDirectory, 'index.html'), html, 'utf8');
  return domainDirectory;
}

async function removeDomainDirectory(domainName) {
  const sanitizedDomain = sanitizeDomainName(domainName);

  if (!sanitizedDomain) {
    return;
  }

  const domainDirectory = path.join(baseWebRoot, sanitizedDomain);
  await fs.rm(domainDirectory, { recursive: true, force: true });
}

module.exports = {
  ensureDomainDirectory,
  writeVerificationIndex,
  removeDomainDirectory
};
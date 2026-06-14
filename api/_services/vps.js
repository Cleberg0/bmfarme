/**
 * Serviço para executar comandos na VPS via SSH.
 * Usado para criar os arquivos de verificação de domínio do Facebook
 * em /var/www/<domainName>/index.html diretamente na VPS.
 *
 * Variáveis de ambiente necessárias:
 *   VPS_IP          — IP da VPS
 *   VPS_SSH_USER    — usuário SSH (ex: root)
 *   VPS_SSH_KEY     — chave privada SSH em formato PEM (string completa com \n)
 */

const { NodeSSH } = require('node-ssh');
const env = require('../_lib/env');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildVerificationHtml(domainName, metaVerificationCode) {
  const safe = escapeHtml(domainName);
  const safeMeta = escapeHtml(metaVerificationCode);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="facebook-domain-verification" content="${safeMeta}" />
  <title>${safe}</title>
</head>
<body><main><h1>${safe}</h1></main></body>
</html>`;
}

async function writeVerificationIndex(domainName, metaVerificationCode) {
  const ssh = new NodeSSH();
  const sshKey = process.env.VPS_SSH_KEY;
  const sshUser = process.env.VPS_SSH_USER || 'root';

  if (!sshKey) throw Object.assign(
    new Error('VPS_SSH_KEY não configurada.'), { statusCode: 500 }
  );

  await ssh.connect({
    host: env.vpsIp,
    username: sshUser,
    privateKey: sshKey.replace(/\\n/g, '\n')
  });

  const safeDomain = domainName.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');
  const dir = `/var/www/${safeDomain}`;
  const html = buildVerificationHtml(domainName, metaVerificationCode);

  // Cria o diretório e escreve o arquivo via heredoc
  const escapedHtml = html.replace(/'/g, `'\\''`);
  await ssh.execCommand(`mkdir -p ${dir} && printf '%s' '${escapedHtml}' > ${dir}/index.html`);
  ssh.dispose();
  return dir;
}

async function removeDomainDirectory(domainName) {
  const ssh = new NodeSSH();
  const sshKey = process.env.VPS_SSH_KEY;
  const sshUser = process.env.VPS_SSH_USER || 'root';
  if (!sshKey) return;

  try {
    await ssh.connect({
      host: env.vpsIp,
      username: sshUser,
      privateKey: sshKey.replace(/\\n/g, '\n')
    });
    const safeDomain = domainName.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');
    await ssh.execCommand(`rm -rf /var/www/${safeDomain}`);
    ssh.dispose();
  } catch { /* rollback silencioso */ }
}

module.exports = { writeVerificationIndex, removeDomainDirectory };

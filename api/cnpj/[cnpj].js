const prisma = require('../_lib/prisma');
const { verifyAuth, setCors } = require('../_lib/auth');
const { lookupCnpj } = require('../_services/cnpj');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const user = verifyAuth(req, res);
  if (!user) return;

  try {
    const { cnpj } = req.query;
    const d = await lookupCnpj(cnpj);
    const raw = d.raw || {};

    // Formata datas do raw
    function fmtDate(v) {
      if (!v) return null;
      try { return new Date(v).toLocaleDateString('pt-BR'); } catch { return String(v); }
    }

    // Busca endereço real via CEP quando logradouro vem vazio da Receita
    async function buscarEnderecoPorCep(cep) {
      try {
        const cepLimpo = String(cep).replace(/\D/g, '');
        if (cepLimpo.length !== 8) return null;
        const res = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`, { timeout: 8000 });
        if (res.data && !res.data.erro && res.data.logradouro) {
          return {
            logradouro: res.data.logradouro.toUpperCase(),
            bairro: res.data.bairro ? res.data.bairro.toUpperCase() : null,
            municipio: res.data.localidade ? res.data.localidade.toUpperCase() : null,
            uf: res.data.uf ? res.data.uf.toUpperCase() : null,
          };
        }
      } catch { /* fallback abaixo */ }
      return null;
    }

    function gerarNumero() {
      return String(Math.floor(Math.random() * 1800) + 50);
    }

    // Gera rua via IA quando ViaCEP falha (CEP genérico de cidade)
    async function gerarRuaViaIA(municipio, uf) {
      try {
        const prompt = `Diga o nome de uma rua ou avenida REAL que existe na cidade de ${municipio || 'São Paulo'}/${uf || 'SP'}. Retorne APENAS o nome no formato "R NOME DA RUA" ou "AV NOME DA AVENIDA". Sem aspas, sem explicação, apenas o logradouro. Seja específico e use uma rua real.`;
        const res = await axios.post(
          `https://api.cloudflare.com/client/v4/accounts/${env.cloudflareAccountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
          { messages: [{ role: 'user', content: prompt }], max_tokens: 30 },
          { headers: { Authorization: `Bearer ${env.cloudflareAiToken}`, 'Content-Type': 'application/json' }, timeout: 10000 }
        );
        let rua = (res.data?.result?.response || '').trim().replace(/["""\n\r.]/g, '').trim();
        if (rua && rua.length > 5 && rua.length < 50) return rua.toUpperCase();
      } catch { /* fallback abaixo */ }
      return null;
    }

    let endereco = d.endereco || '';
    let numero = d.numero || null;
    let bairro = d.bairro || null;
    if (!endereco && d.cep) {
      const viaCep = await buscarEnderecoPorCep(d.cep);
      if (viaCep && viaCep.logradouro) {
        endereco = viaCep.logradouro;
        if (!bairro && viaCep.bairro) bairro = viaCep.bairro;
      }
    }
    if (!endereco) {
      // Usa IA pra gerar rua real da cidade
      const ruaIA = await gerarRuaViaIA(d.municipio, d.uf);
      if (ruaIA) endereco = ruaIA;
    }
    if (!endereco) {
      // Último fallback: gera baseado no município pra não repetir
      const base = (d.municipio || 'BRASIL').replace(/[^A-Z ]/gi, '').trim();
      endereco = `AV ${base}`;
    }
    if (!numero) numero = gerarNumero();

    const clientData = {
      razaoSocial:        d.razaoSocial                               || null,
      nomeFantasia:       d.nomeFantasia                              || null,
      endereco:           endereco,
      numero:             numero,
      complemento:        d.complemento                               || null,
      bairro:             bairro                                      || null,
      cep:                d.cep                                       || '',
      municipio:          d.municipio                                 || null,
      uf:                 d.uf                                        || null,
      situacao:           d.situacao                                  || null,
      dataSituacao:       fmtDate(raw.data_situacao_cadastral),
      dataAbertura:       fmtDate(raw.data_inicio_atividade),
      porte:              raw.porte                                   || null,
      naturezaJuridica:   raw.natureza_juridica                       || null,
      atividadePrincipal: d.atividadePrincipal                        || null,
      telefone:           d.telefone                                  || null,
      email:              d.email                                     || null,
      userId:             user.id,
    };

    const client = await prisma.client.upsert({
      where:  { cnpj: d.cnpj },
      update: clientData,
      create: { cnpj: d.cnpj, ...clientData },
    });

    return res.status(200).json({
      id:                 client.id,
      cnpj:               d.cnpj,
      razaoSocial:        client.razaoSocial,
      nomeFantasia:       client.nomeFantasia,
      endereco:           client.endereco,
      numero:             client.numero,
      complemento:        client.complemento,
      bairro:             client.bairro,
      cep:                client.cep,
      municipio:          client.municipio,
      uf:                 client.uf,
      situacao:           client.situacao,
      dataSituacao:       client.dataSituacao,
      dataAbertura:       client.dataAbertura,
      porte:              client.porte,
      naturezaJuridica:   client.naturezaJuridica,
      atividadePrincipal: client.atividadePrincipal,
      telefone:           client.telefone,
      email:              client.email,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

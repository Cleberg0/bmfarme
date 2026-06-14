import { useState } from 'react';
import api from '../../api/client';
import CopyButton from '../ui/CopyButton';
import axios from 'axios';

type InfraBlockProps = {
  clientId: string | null;
  onDomainReady: (domainId: string) => void;
};

export default function InfraBlock({ clientId, onDomainReady }: InfraBlockProps) {
  const [domainName, setDomainName] = useState('');
  const [metaCode, setMetaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deployed, setDeployed] = useState<{ domainName: string; domainId: string } | null>(null);

  const handleDeploy = async () => {
    if (!clientId || !domainName || !metaCode) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/infra/deploy', {
        domainName,
        metaVerificationCode: metaCode,
        clientId,
      });
      const id: string = data.id ?? data.domain?.id ?? '';
      setDeployed({ domainName, domainId: id });
      onDomainReady(id);
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.error || err.message
          : err instanceof Error ? err.message : 'Falha ao subir infraestrutura.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-300">
            Domínio
          </label>
          <input
            value={domainName}
            onChange={(e) => setDomainName(e.target.value)}
            placeholder="ex: meucliente.com.br"
            disabled={!!deployed}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-300">
            Meta Verification Code
          </label>
          <input
            value={metaCode}
            onChange={(e) => setMetaCode(e.target.value)}
            placeholder="Cole o código do Meta"
            disabled={!!deployed}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
          />
        </div>
      </div>

      {!deployed && (
        <button
          type="button"
          onClick={handleDeploy}
          disabled={loading || !domainName || !metaCode}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" className="stroke-current opacity-20" strokeWidth="4" />
                <path d="M22 12a10 10 0 0 0-10-10" className="stroke-current" strokeWidth="4" strokeLinecap="round" />
              </svg>
              Provisionando...
            </>
          ) : '🚀 Subir Domínio'}
        </button>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          ❌ {error}
        </div>
      )}

      {deployed && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
          <p className="text-sm font-bold text-emerald-300">✅ Domínio provisionado com sucesso!</p>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Domínio</p>
              <p className="mt-1 font-mono text-slate-100">{deployed.domainName}</p>
            </div>
            <CopyButton value={deployed.domainName} label="domínio" />
          </div>
        </div>
      )}
    </div>
  );
}

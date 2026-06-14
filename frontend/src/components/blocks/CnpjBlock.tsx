import { useMemo, useState } from 'react';
import api from '../../api/client';
import CopyButton from '../ui/CopyButton';
import axios from 'axios';

type ClientPayload = {
  id: string;
  cnpj: string;
  razaoSocial: string;
  endereco: string;
  cep: string;
};

type CnpjBlockProps = {
  onClientReady: (clientId: string, data: { razaoSocial: string; endereco: string; cep: string }) => void;
};

function formatCnpj(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-100 break-words flex-1">{value || '—'}</p>
        {value && <CopyButton value={value} label={label} />}
      </div>
    </div>
  );
}

export default function CnpjBlock({ onClientReady }: CnpjBlockProps) {
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [client, setClient] = useState<ClientPayload | null>(null);

  const rawDigits = useMemo(() => cnpj.replace(/\D/g, ''), [cnpj]);
  const isReady = rawDigits.length === 14;

  const handleSearch = async () => {
    if (!isReady) return;
    setLoading(true);
    setError('');
    setClient(null);
    try {
      const { data } = await api.get<ClientPayload>(`/cnpj/${rawDigits}`);
      setClient(data);
      onClientReady(data.id, {
        razaoSocial: data.razaoSocial,
        endereco: data.endereco,
        cep: data.cep,
      });
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.error || err.message
          : err instanceof Error ? err.message : 'Falha ao consultar CNPJ.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Input + botão */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-semibold text-slate-300">
            CNPJ da empresa
          </label>
          <input
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpj(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-lg text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={!isReady || loading}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" className="stroke-current opacity-20" strokeWidth="4" />
                <path d="M22 12a10 10 0 0 0-10-10" className="stroke-current" strokeWidth="4" strokeLinecap="round" />
              </svg>
              Buscando...
            </>
          ) : '🔍 Consultar CNPJ'}
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          ❌ {error}
        </div>
      )}

      {/* Dados retornados */}
      {client && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">✅ Empresa encontrada</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Razão Social" value={client.razaoSocial} />
            <Field label="Endereço" value={client.endereco} />
            <Field label="CEP" value={client.cep} />
          </div>
        </div>
      )}
    </div>
  );
}

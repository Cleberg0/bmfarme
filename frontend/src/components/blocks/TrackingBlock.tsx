import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import CopyButton from '../ui/CopyButton';
import axios from 'axios';

type TrackingBlockProps = {
  clientId: string | null;
  domainId: string | null;
  smsLogId: string | null;
};

type BmRecord = {
  id: string;
  bmId: string;
  profileUsed: string;
  notes?: string;
  createdAt: string;
  user?: { name?: string };
};

export default function TrackingBlock({ clientId, domainId, smsLogId }: TrackingBlockProps) {
  const [bmId, setBmId] = useState('');
  const [profileUsed, setProfileUsed] = useState('');
  const [notes, setNotes] = useState('');
  const [records, setRecords] = useState<BmRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const loadRecords = useCallback(async () => {
    try {
      const { data } = await api.get('/bm/list');
      setRecords(Array.isArray(data) ? data : (data.items ?? []));
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const handleRegister = async () => {
    if (!clientId || !domainId || !smsLogId || !bmId || !profileUsed) return;
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await api.post('/bm/register', { bmId, profileUsed, notes, clientId, domainId, smsLogId });
      setBmId('');
      setProfileUsed('');
      setNotes('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadRecords();
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.error || err.message
          : err instanceof Error ? err.message : 'Falha ao registrar BM.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-300">BM ID</label>
          <div className="flex gap-2">
            <input
              value={bmId}
              onChange={(e) => setBmId(e.target.value)}
              placeholder="Ex: 123456789"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500"
            />
            {bmId && <CopyButton value={bmId} label="BM ID" />}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-300">Perfil Utilizado</label>
          <input
            value={profileUsed}
            onChange={(e) => setProfileUsed(e.target.value)}
            placeholder="Nome do perfil"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-300">Observações <span className="text-slate-500 font-normal">(opcional)</span></label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anotações sobre este farm..."
          className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRegister}
          disabled={loading || !bmId || !profileUsed}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" className="stroke-current opacity-20" strokeWidth="4" />
                <path d="M22 12a10 10 0 0 0-10-10" className="stroke-current" strokeWidth="4" strokeLinecap="round" />
              </svg>
              Registrando...
            </>
          ) : '✅ Registrar BM'}
        </button>

        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            🎉 BM registrado com sucesso!
          </div>
        )}
        {error && <p className="text-sm text-red-400">❌ {error}</p>}
      </div>

      {/* Histórico */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Histórico de BMs</p>
          <button
            type="button"
            onClick={loadRecords}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 transition hover:text-slate-200"
          >
            🔄 Atualizar
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-700/60">
          <table className="min-w-full divide-y divide-slate-700/60">
            <thead className="bg-slate-800/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">BM ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Perfil</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hidden md:table-cell">Operador</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hidden md:table-cell">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 text-sm font-mono text-slate-100">{r.bmId}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.profileUsed}</td>
                  <td className="px-4 py-3 text-sm text-slate-400 hidden md:table-cell">{r.user?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-400 hidden md:table-cell">{new Date(r.createdAt).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <CopyButton value={r.bmId} label="BM ID" />
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    Nenhum BM registrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

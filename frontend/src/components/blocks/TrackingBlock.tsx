import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import CopyButton from '../ui/CopyButton';
import axios from 'axios';

type TrackingBlockProps = {
  clientId: string | null;
  domainId: string | null;
  smsLogId: string | null;
};

type BmStatus = 'ACTIVE' | 'SUSPENDED' | 'RESTRICTED' | 'DISABLED';

type BmRecord = {
  id: string;
  bmId: string;
  profileUsed: string;
  status: BmStatus;
  notes?: string;
  createdAt: string;
  user?: { name?: string };
  client?: { razaoSocial?: string; cnpj?: string };
};

const STATUS_STYLES: Record<BmStatus, string> = {
  ACTIVE:     'bg-emerald-500/20 text-emerald-300',
  SUSPENDED:  'bg-amber-500/20 text-amber-300',
  RESTRICTED: 'bg-orange-500/20 text-orange-300',
  DISABLED:   'bg-red-500/20 text-red-300',
};
const STATUS_LABELS: Record<BmStatus, string> = {
  ACTIVE:     '✅ Ativa',
  SUSPENDED:  '⏸️ Suspensa',
  RESTRICTED: '⚠️ Restrita',
  DISABLED:   '🚫 Desativada',
};

export default function TrackingBlock({ clientId, domainId, smsLogId }: TrackingBlockProps) {
  const [bmId, setBmId]             = useState('');
  const [profileUsed, setProfileUsed] = useState('');
  const [notes, setNotes]           = useState('');
  const [records, setRecords]       = useState<BmRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');

  // Filtros
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUser, _setFilterUser] = useState('');

  // Edição inline de status
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<BmStatus>('ACTIVE');
  const [editNotes, setEditNotes]   = useState('');
  const [saving, setSaving]         = useState(false);

  const loadRecords = useCallback(async (p = page) => {
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: '20' });
      if (search)       params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      if (filterUser)   params.set('userId', filterUser);
      const { data } = await api.get(`/bm/list?${params}`);
      setRecords(Array.isArray(data) ? data : (data.items ?? []));
      setTotal(data.pagination?.total ?? 0);
    } catch { /* silencioso */ }
  }, [page, search, filterStatus, filterUser]);

  useEffect(() => { void loadRecords(1); setPage(1); }, [search, filterStatus, filterUser]); // eslint-disable-line
  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const handleRegister = async () => {
    if (!clientId || !domainId || !smsLogId || !bmId || !profileUsed) return;
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await api.post('/bm/register', { bmId, profileUsed, notes, clientId, domainId, smsLogId });
      setBmId(''); setProfileUsed(''); setNotes('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadRecords(1); setPage(1);
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Falha ao registrar BM.');
    } finally { setLoading(false); }
  };

  const startEdit = (r: BmRecord) => {
    setEditingId(r.id);
    setEditStatus(r.status);
    setEditNotes(r.notes || '');
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      await api.patch(`/bm/register?id=${id}`, { status: editStatus, notes: editNotes });
      setEditingId(null);
      await loadRecords();
    } catch { /* silencioso */ }
    finally { setSaving(false); }
  };

  // Exportar CSV
  const exportCsv = () => {
    const headers = ['BM ID', 'Perfil', 'Status', 'Operador', 'Empresa', 'CNPJ', 'Data'];
    const rows = records.map(r => [
      r.bmId,
      r.profileUsed,
      STATUS_LABELS[r.status],
      r.user?.name || '',
      r.client?.razaoSocial || '',
      r.client?.cnpj || '',
      new Date(r.createdAt).toLocaleString('pt-BR'),
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bms-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageCount = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {/* Formulário de registro */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-300">BM ID</label>
          <div className="flex gap-2">
            <input value={bmId} onChange={e => setBmId(e.target.value)} placeholder="Ex: 123456789"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500" />
            {bmId && <CopyButton value={bmId} label="BM ID" />}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-300">Perfil Utilizado</label>
          <input value={profileUsed} onChange={e => setProfileUsed(e.target.value)} placeholder="Nome do perfil"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-300">Observações <span className="text-slate-500 font-normal">(opcional)</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Anotações..."
          className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-500" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleRegister} disabled={loading || !bmId || !profileUsed}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? (
            <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" className="stroke-current opacity-20" strokeWidth="4" />
              <path d="M22 12a10 10 0 0 0-10-10" className="stroke-current" strokeWidth="4" strokeLinecap="round" />
            </svg>Registrando...</>
          ) : '✅ Registrar BM'}
        </button>
        {success && <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">🎉 BM registrado!</span>}
        {error && <p className="text-sm text-red-400">❌ {error}</p>}
      </div>

      {/* Filtros + Exportar */}
      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar BM ID, perfil ou empresa..."
          className="flex-1 min-w-[200px] rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 outline-none">
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_LABELS) as BmStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <button type="button" onClick={exportCsv} title="Exportar CSV"
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition">
          📥 CSV
        </button>
        <button type="button" onClick={() => loadRecords()}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition">
          🔄
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-slate-700/60">
        <table className="min-w-full divide-y divide-slate-700/60">
          <thead className="bg-slate-800/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">BM ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hidden sm:table-cell">Perfil</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hidden md:table-cell">Operador</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hidden md:table-cell">Data</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/40">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-slate-800/40 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-100">{r.bmId}</span>
                    <CopyButton value={r.bmId} label="BM ID" />
                  </div>
                  {r.client?.razaoSocial && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[160px]">{r.client.razaoSocial}</p>}
                </td>
                <td className="px-4 py-3">
                  {editingId === r.id ? (
                    <select value={editStatus} onChange={e => setEditStatus(e.target.value as BmStatus)}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none">
                      {(Object.keys(STATUS_LABELS) as BmStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status] || STATUS_STYLES.ACTIVE}`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-300 hidden sm:table-cell">{r.profileUsed}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    {r.user?.name || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{new Date(r.createdAt).toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3">
                  {editingId === r.id ? (
                    <div className="flex gap-1 flex-col">
                      <input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notas"
                        className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none w-28" />
                      <div className="flex gap-1">
                        <button type="button" onClick={() => saveEdit(r.id)} disabled={saving}
                          className="rounded bg-emerald-600 px-2 py-0.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-50">✓</button>
                        <button type="button" onClick={() => setEditingId(null)}
                          className="rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-400">✕</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => startEdit(r)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-400 hover:text-white transition">
                      ✏️
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Nenhum BM encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{total} registros</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition">←</button>
            <span className="flex items-center text-slate-400">{page} / {pageCount}</span>
            <button type="button" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition">→</button>
          </div>
        </div>
      )}
    </div>
  );
}

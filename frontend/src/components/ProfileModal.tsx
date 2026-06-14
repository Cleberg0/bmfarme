import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, changePassword } = useAuth();
  const [_currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass]         = useState('');
  const [confirm, setConfirm]         = useState('');
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState('');
  const [err, setErr]                 = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (newPass !== confirm) { setErr('As senhas não coincidem.'); return; }
    if (newPass.length < 6)  { setErr('Senha deve ter no mínimo 6 caracteres.'); return; }
    setSaving(true);
    try {
      await changePassword(newPass);
      setMsg('✅ Senha alterada com sucesso!');
      setCurrentPass(''); setNewPass(''); setConfirm('');
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao alterar senha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-100">👤 Meu Perfil</h2>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Nome</p>
            <p className="text-sm font-semibold text-slate-100">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-bold ${user?.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-400'}`}>
              {user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm font-semibold text-slate-300">Alterar Senha</p>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
              placeholder="Nova senha (mín. 6 caracteres)" required minLength={6}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500" />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Confirmar nova senha" required
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500" />
            {err && <p className="text-xs text-red-400">{err}</p>}
            {msg && <p className="text-xs text-emerald-400">{msg}</p>}
            <button type="submit" disabled={saving}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

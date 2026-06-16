import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

type ToastMessage = {
  id: number;
  type: ToastType;
  message: string;
};

let toastId = 0;
let listeners: Array<(toast: ToastMessage) => void> = [];

export function showToast(message: string, type: ToastType = 'success') {
  const toast: ToastMessage = { id: ++toastId, type, message };
  listeners.forEach(fn => fn(toast));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (toast: ToastMessage) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 4000);
    };
    listeners.push(handler);
    return () => { listeners = listeners.filter(l => l !== handler); };
  }, []);

  if (toasts.length === 0) return null;

  const colors = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    error: 'border-red-500/40 bg-red-500/10 text-red-300',
    info: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  };

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm animate-slide-in ${colors[t.type]}`}
        >
          <span className="mr-2">{icons[t.type]}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

import { useState } from 'react';

export default function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copiar ${label || ''}`}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
        copied
          ? 'border border-emerald-500 bg-emerald-500/20 text-emerald-300'
          : 'border border-slate-600 bg-slate-700 text-slate-300 hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-300'
      }`}
    >
      {copied ? '✓ Copiado!' : '📋 Copiar'}
    </button>
  );
}

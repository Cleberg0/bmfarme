type StatusBadgeProps = {
  status: 'idle' | 'loading' | 'success' | 'error';
  label: string;
};

const statusStyles: Record<StatusBadgeProps['status'], { dot: string; text: string }> = {
  idle: { dot: 'bg-slate-500', text: 'text-slate-400' },
  loading: { dot: 'bg-blue-500 animate-pulse', text: 'text-blue-400' },
  success: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
  error: { dot: 'bg-red-500', text: 'text-red-400' },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-2 text-sm font-medium ${statusStyles[status].text}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${statusStyles[status].dot}`} />
      <span>{label}</span>
    </div>
  );
}
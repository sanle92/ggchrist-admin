import type { LucideIcon } from 'lucide-react';

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="admin-page-title">{title}</h1><p className="admin-subtitle">{description}</p></div>{actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}</div>;
}

export function StatCard({ label, value, detail, icon: Icon, tone = 'blue' }: { label: string; value: string | number; detail?: string; icon: LucideIcon; tone?: 'blue' | 'green' | 'purple' | 'amber' | 'rose' }) {
  const tones = { blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700', purple: 'bg-violet-50 text-violet-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' };
  return <article className="admin-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-admin-muted">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</p>{detail ? <p className="mt-1.5 text-[0.7rem] text-admin-muted">{detail}</p> : null}</div><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span></div></article>;
}

export function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue' }) {
  const tones = { neutral: 'bg-slate-100 text-slate-600', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-rose-50 text-rose-700', blue: 'bg-blue-50 text-blue-700' };
  return <span className={`status-pill inline-flex px-2.5 py-1 text-[0.66rem] font-bold capitalize ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="px-5 py-14 text-center"><p className="text-sm font-bold">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-admin-muted">{description}</p></div>;
}

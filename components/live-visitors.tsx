'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, CalendarClock, ChevronDown, ChevronUp, Globe2, Monitor, RefreshCw, Smartphone, Tablet } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { EmptyState, StatusPill } from '@/components/admin-ui';
import { useAdminTimezone } from '@/components/admin-timezone';

type Visitor = { session_id: string; current_path: string; country_name: string | null; city: string | null; timezone: string | null; device_type: string; browser: string | null; started_at: string; last_seen_at: string };
const deviceIcons = { mobile: Smartphone, tablet: Tablet, desktop: Monitor, unknown: Monitor, bot: Monitor };

export function LiveVisitors({ initialVisitors = [], initialTotal = initialVisitors.length }: { initialVisitors?: Visitor[]; initialTotal?: number }) {
  const [visitors, setVisitors] = useState(initialVisitors);
  const [total, setTotal] = useState(initialTotal);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const adminTimezone = useAdminTimezone();
  const load = useCallback(async () => {
    setRefreshing(true);
    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data, error, count } = await createClient().from('active_sessions').select('session_id,current_path,country_name,city,timezone,device_type,browser,started_at,last_seen_at', { count: 'exact' }).gte('last_seen_at', cutoff).order('last_seen_at', { ascending: false }).limit(50);
    setLoadError(Boolean(error));
    if (data) { setVisitors(data as Visitor[]); setTotal(count ?? data.length); }
    setRefreshing(false);
  }, []);

  useEffect(() => { setVisitors(initialVisitors); setTotal(initialTotal); }, [initialVisitors, initialTotal]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('analytics-live-visitors').on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions' }, () => void load()).subscribe();
    const timer = window.setInterval(load, 15_000);
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [load]);

  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: adminTimezone, dateStyle: 'medium', timeStyle: 'short' });
  return <article className="admin-card overflow-hidden"><div className="flex flex-col justify-between gap-4 border-b border-admin-border px-5 py-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="relative grid size-10 place-items-center bg-emerald-50 text-admin-green"><Activity size={19} /><span className="status-pill absolute right-0 top-0 size-2 bg-[#008060] ring-2 ring-white" /></span><div><div className="flex items-baseline gap-2"><h2 className="text-sm font-bold">Live visitors</h2><strong className="text-xl text-admin-green">{total}</strong></div><p className="text-[0.7rem] text-admin-muted">Page, location, device and active time · last 2 minutes</p></div></div><button onClick={load} className="admin-button admin-button-secondary" aria-label="Refresh live visitors"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh</button></div>
    {total > visitors.length ? <p className="px-5 py-2 text-xs text-admin-muted">Showing the {visitors.length} most recently active sessions of {total}.</p> : null}
    {loadError ? <p role="alert" className="admin-notice-error m-4">Live visitors could not be refreshed. Check database access.</p> : null}
    {visitors.length ? <><div className="overflow-x-auto"><table className="admin-table min-w-[820px]"><thead><tr><th>Current page</th><th>Location</th><th>Device / browser</th><th>Became active</th><th>Status</th></tr></thead><tbody>{(expanded ? visitors : visitors.slice(0, 5)).map((visitor) => { const Icon = deviceIcons[visitor.device_type as keyof typeof deviceIcons] || Monitor; return <tr key={visitor.session_id}><td><p className="max-w-[260px] truncate font-semibold">{visitor.current_path}</p></td><td><span className="flex items-center gap-2"><Globe2 size={15} className="text-admin-muted" />{[visitor.city, visitor.country_name].filter(Boolean).join(', ') || 'Location unavailable'}</span></td><td><span className="flex items-center gap-2"><Icon size={15} className="text-admin-muted" /><span className="capitalize">{visitor.device_type}</span> · {visitor.browser || 'Unknown'}</span></td><td><span className="flex items-center gap-2"><CalendarClock size={15} className="text-admin-muted" />{formatter.format(new Date(visitor.started_at))}</span></td><td><StatusPill tone="green">Live</StatusPill></td></tr>; })}</tbody></table></div>{visitors.length > 5 ? <button onClick={() => setExpanded((value) => !value)} className="flex w-full items-center justify-center gap-2 border-t border-admin-border px-4 py-3 text-xs font-bold text-admin-green">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {expanded ? 'Show less' : `View ${visitors.length - 5} more`}</button> : null}</> : <EmptyState title="Waiting for visitors" description="Open the public website in another browser. A live session will appear here automatically." />}
  </article>;
}

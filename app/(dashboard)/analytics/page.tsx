import Link from 'next/link';
import { Activity, CalendarDays, Eye, Globe2, MousePointerClick, Smartphone, Users } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-auth';
import { EmptyState, PageHeader, StatCard } from '@/components/admin-ui';
import { MiniLineChart } from '@/components/mini-line-chart';
import { LiveVisitors } from '@/components/live-visitors';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ range?: string }> };
type EventRow = { visitor_id: string; session_id: string; path: string; referrer: string | null; country_name: string | null; city: string | null; device_type: string; browser: string | null; timezone: string | null; occurred_at: string };

function percent(value: number, total: number) { return total ? Math.round((value / total) * 100) : 0; }
function group(rows: EventRow[], key: (row: EventRow) => string) {
  const values = new Map<string, number>();
  rows.forEach((row) => { const label = key(row) || 'Unknown'; values.set(label, (values.get(label) || 0) + 1); });
  return [...values.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(params.range)) ? Number(params.range) : 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const liveSince = new Date(Date.now() - 2 * 60000).toISOString();
  const [{ data: events }, { data: daily }, { data: live }, { count: activeMembers }, { count: publishedArticles }] = await Promise.all([
    supabase.from('analytics_events').select('visitor_id,session_id,path,referrer,country_name,city,device_type,browser,timezone,occurred_at').eq('event_type', 'page_view').gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(10000),
    supabase.from('analytics_daily').select('analytics_date,page_views,unique_visitors').gte('analytics_date', since.slice(0, 10)).order('analytics_date'),
    supabase.from('active_sessions').select('session_id,current_path,country_name,city,timezone,device_type,browser,started_at,last_seen_at').gte('last_seen_at', liveSince).order('last_seen_at', { ascending: false }).limit(50),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
  ]);
  const rows = (events || []) as EventRow[];
  const visitors = new Set(rows.map((row) => row.visitor_id)).size;
  const sessions = new Set(rows.map((row) => row.session_id)).size;
  const pagesPerSession = sessions ? rows.length / sessions : 0;
  const topPages = group(rows, (row) => row.path).slice(0, 20);
  const locations = group(rows, (row) => [row.city, row.country_name].filter(Boolean).join(', ')).slice(0, 20);
  const devices = group(rows, (row) => row.device_type);
  const browsers = group(rows, (row) => row.browser || 'Unknown').slice(0, 20);
  const referrals = group(rows, (row) => { try { return row.referrer ? new URL(row.referrer).hostname : 'Direct'; } catch { return 'Direct'; } }).slice(0, 20);
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: rows.filter((row) => new Date(row.occurred_at).getHours() === hour).length }));
  const busiestHour = byHour.sort((a, b) => b.count - a.count)[0];
  const trend = (daily || []).map((item) => ({ label: new Date(`${item.analytics_date}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' }), value: Number(item.page_views) }));
  const historyMap = new Map<string, EventRow>();
  rows.forEach((row) => { const key = `${row.visitor_id}:${row.session_id}`; if (!historyMap.has(key)) historyMap.set(key, row); });
  const history = [...historyMap.values()].slice(0, 100);

  return <div>
    <PageHeader title="Analytics" description="Live audience, traffic sources, locations and engagement across the public website." actions={<div className="flex rounded-lg border border-admin-border bg-white p-1">{[7, 30, 90].map((range) => <Link key={range} href={`/analytics?range=${range}`} className={`rounded-md px-3 py-1.5 text-xs font-bold ${days === range ? 'bg-admin-ink text-white' : 'text-admin-muted hover:bg-admin-bg'}`}>{range} days</Link>)}</div>} />
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Live now" value={(live || []).length} detail="Last 2 minutes" icon={Activity} tone="green" />
      <StatCard label="Page views" value={rows.length.toLocaleString()} detail={`Last ${days} days`} icon={Eye} tone="blue" />
      <StatCard label="Unique visitors" value={visitors.toLocaleString()} detail={`${sessions.toLocaleString()} sessions`} icon={Users} tone="purple" />
      <StatCard label="Pages / session" value={pagesPerSession.toFixed(1)} detail="Average depth" icon={MousePointerClick} tone="amber" />
      <StatCard label="Members" value={(activeMembers || 0).toLocaleString()} detail={`${publishedArticles || 0} published articles`} icon={Globe2} tone="rose" />
    </section>
    <section className="mt-6 grid gap-5 xl:grid-cols-[1.6fr_0.7fr]">
      <article className="admin-card p-5"><div className="flex items-start justify-between"><div><h2 className="text-sm font-extrabold">Traffic overview</h2><p className="mt-0.5 text-xs text-admin-muted">Daily page views in your selected period</p></div><CalendarDays size={18} className="text-admin-muted" /></div><div className="mt-5"><MiniLineChart data={trend} /></div></article>
      <article className="admin-card p-5"><h2 className="text-sm font-extrabold">Audience devices</h2><p className="mt-0.5 text-xs text-admin-muted">How visitors access the website</p><div className="mt-6 grid gap-4">{devices.length ? devices.map(([label, value]) => <div key={label}><div className="mb-1.5 flex justify-between text-xs"><span className="flex items-center gap-2 font-semibold capitalize"><Smartphone size={14} />{label}</span><span className="text-admin-muted">{percent(value, rows.length)}%</span></div><div className="h-2 rounded-full bg-admin-bg"><div className="h-full rounded-full bg-[#005bd3]" style={{ width: `${percent(value, rows.length)}%` }} /></div></div>) : <EmptyState title="No device data" description="Device analytics appears after the public site receives visitors." />}</div><div className="mt-6 border-t border-admin-border pt-4"><p className="text-xs font-semibold text-admin-muted">Busiest local hour</p><p className="mt-1 text-lg font-extrabold">{busiestHour?.count ? `${String(busiestHour.hour).padStart(2, '0')}:00` : '—'}</p></div></article>
    </section>
    <section className="mt-6"><LiveVisitors initialVisitors={(live || []) as never[]} /></section>
    <section className="mt-6"><VisitorHistory rows={history} /></section>
    <section className="mt-6 grid gap-5 xl:grid-cols-2">
      <RankedList title="Top pages" subtitle="Most viewed destinations" rows={topPages} total={rows.length} />
      <RankedList title="Visitor locations" subtitle="Cities and countries detected from traffic" rows={locations} total={rows.length} />
      <RankedList title="Browsers" subtitle="Browser usage" rows={browsers} total={rows.length} />
      <RankedList title="Traffic sources" subtitle="Referrers and direct visits" rows={referrals} total={rows.length} />
    </section>
  </div>;
}

function VisitorHistory({ rows }: { rows: EventRow[] }) {
  const visible = rows.slice(0, 5);
  const hidden = rows.slice(5);
  const Row = ({ item }: { item: EventRow }) => <tr><td><p className="max-w-[280px] truncate font-semibold">{item.path}</p><p className="mt-1 font-mono text-[0.65rem] text-admin-muted">{item.visitor_id.slice(0, 8)}</p></td><td>{[item.city, item.country_name].filter(Boolean).join(', ') || 'Location unavailable'}</td><td><span className="capitalize">{item.device_type}</span> · {item.browser || 'Unknown'}</td><td>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(item.occurred_at))} UTC</td></tr>;
  return <article className="admin-card overflow-hidden"><div className="border-b border-admin-border px-5 py-4"><h2 className="text-sm font-extrabold">Visitor history</h2><p className="mt-0.5 text-xs text-admin-muted">Recent visitor sessions with date, time, location and device</p></div>{rows.length ? <><div className="overflow-x-auto"><table className="admin-table min-w-[780px]"><thead><tr><th>Last page</th><th>Location</th><th>Device / browser</th><th>Date &amp; time</th></tr></thead><tbody>{visible.map((item) => <Row key={`${item.visitor_id}:${item.session_id}`} item={item} />)}</tbody></table></div>{hidden.length ? <details className="group"><div className="overflow-x-auto border-t border-admin-border"><table className="admin-table min-w-[780px]"><tbody>{hidden.map((item) => <Row key={`${item.visitor_id}:${item.session_id}`} item={item} />)}</tbody></table></div><summary className="cursor-pointer list-none border-t border-admin-border px-5 py-3 text-center text-xs font-bold text-[#005bd3]"><span className="group-open:hidden">View {hidden.length} more</span><span className="hidden group-open:inline">Show less</span></summary></details> : null}</> : <EmptyState title="No visitor history yet" description="Recent visitor sessions will appear after the public website receives traffic." />}</article>;
}

function RankedList({ title, subtitle, rows, total }: { title: string; subtitle: string; rows: [string, number][]; total: number }) {
  const visible = rows.slice(0, 5); const hidden = rows.slice(5);
  const Row = ({ row: [label, value] }: { row: [string, number] }) => <div className="flex items-center gap-4 px-5 py-3.5"><p className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</p><div className="hidden w-28 overflow-hidden bg-admin-bg sm:block"><div className="h-1.5 bg-[#005bd3]" style={{ width: `${Math.max(3, percent(value, total))}%` }} /></div><p className="w-20 text-right text-xs text-admin-muted">{value.toLocaleString()} · {percent(value, total)}%</p></div>;
  return <article className="admin-card overflow-hidden"><div className="border-b border-admin-border px-5 py-4"><h2 className="text-sm font-extrabold">{title}</h2><p className="mt-0.5 text-xs text-admin-muted">{subtitle}</p></div>{rows.length ? <div className="divide-y divide-admin-border">{visible.map((row) => <Row key={row[0]} row={row} />)}{hidden.length ? <details className="group"><div className="divide-y divide-admin-border border-t border-admin-border">{hidden.map((row) => <Row key={row[0]} row={row} />)}</div><summary className="cursor-pointer list-none border-t border-admin-border px-5 py-3 text-center text-xs font-bold text-[#005bd3]"><span className="group-open:hidden">View {hidden.length} more</span><span className="hidden group-open:inline">Show less</span></summary></details> : null}</div> : <EmptyState title="No analytics yet" description="Data appears automatically as visitors browse the public website." />}</article>;
}

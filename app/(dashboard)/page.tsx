import Link from 'next/link';
import { Activity, ArrowRight, BookHeart, CircleDollarSign, Eye, FileText, Inbox, MessageSquareText, Plus, TrendingUp, Users } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-auth';
import { PageHeader, StatCard } from '@/components/admin-ui';
import { MiniLineChart } from '@/components/mini-line-chart';
import { DashboardLiveFeeds } from '@/components/dashboard-live-feeds';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { supabase, role } = await requireAdmin();
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const [{ data: metrics }, { data: recentArticles }, { data: recentDevotions }, { data: recentTeachings }, { data: recentKids }, { data: recentEbooks }, { data: recentDonations }, { data: analytics }, { data: messages }, { data: settings }] = await Promise.all([
    supabase.from('admin_dashboard_metrics_v2').select('*').maybeSingle(),
    supabase.from('articles').select('id,title,status,updated_at').order('updated_at', { ascending: false }).limit(5),
    supabase.from('devotions').select('id,title,status,updated_at').order('updated_at', { ascending: false }).limit(5),
    supabase.from('bible_teachings').select('id,title,status,updated_at').order('updated_at', { ascending: false }).limit(5),
    supabase.from('kids_lessons').select('id,title,status,updated_at').order('updated_at', { ascending: false }).limit(5),
    supabase.from('ebooks').select('id,title,status,updated_at').order('updated_at', { ascending: false }).limit(5),
    supabase.from('donations').select('id,donor_name,amount_minor,currency,status,created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('analytics_daily').select('analytics_date,page_views').gte('analytics_date', since.slice(0, 10)).order('analytics_date'),
    supabase.from('contact_messages').select('id,first_name,last_name,subject,status,priority,created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('site_settings').select('ministry_name,timezone,default_currency').maybeSingle(),
  ]);
  const currency = 'USD';
  const donated = Number(metrics?.donated_amount_minor || 0) / 100;
  const expenses = Number(metrics?.expense_amount_minor || 0) / 100;
  const pending = Number(metrics?.pending_testimonies || 0) + Number(metrics?.pending_prayer_requests || 0) + Number(metrics?.pending_posts || 0);
  const trend = (analytics || []).map((row) => ({ label: formatAnalyticsDate(row.analytics_date), value: Number(row.page_views) }));
  const dateLabel = new Intl.DateTimeFormat('en', { dateStyle: 'full', timeZone: settings?.timezone || 'Africa/Kampala' }).format(new Date());
  const recentContent = [
    ...(recentArticles || []).map((item) => ({ ...item, kind: 'article' })),
    ...(recentDevotions || []).map((item) => ({ ...item, kind: 'devotion' })),
    ...(recentTeachings || []).map((item) => ({ ...item, kind: 'teaching' })),
    ...(recentKids || []).map((item) => ({ ...item, kind: 'kids' })),
    ...(recentEbooks || []).map((item) => ({ ...item, kind: 'ebook' })),
  ].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 5);

  return <div>
    <PageHeader title="Dashboard" description={`${dateLabel} · ${settings?.ministry_name || 'Glorious Gospel of Christ'}`} actions={<Link href="/articles/new" className="admin-button admin-button-primary"><Plus size={16} /> New article</Link>} />
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Live visitors" value={Number(metrics?.live_users || 0)} detail="Active on public website" icon={Activity} tone="green" />
      <StatCard label="Views today" value={Number(metrics?.page_views_today || 0).toLocaleString()} detail="Automatically collected" icon={Eye} tone="blue" />
      <StatCard label="New messages" value={Number(metrics?.unread_messages || 0)} detail="Awaiting a response" icon={Inbox} tone="purple" />
      <StatCard label="Pending moderation" value={pending} detail="Community items to review" icon={MessageSquareText} tone="amber" />
    </section>
    <section className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
      <article className="admin-card p-5"><div className="flex items-start justify-between"><div><h2 className="text-sm font-extrabold">Website activity</h2><p className="mt-0.5 text-xs text-admin-muted">Page views during the last 14 days</p></div><Link href="/analytics" className="flex items-center gap-1 text-xs font-bold text-[#005bd3]">Full analytics <ArrowRight size={14} /></Link></div><div className="mt-4"><MiniLineChart data={trend} /></div></article>
      <article className="admin-card p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Finance snapshot</h2><p className="mt-0.5 text-xs text-admin-muted">Verified funds and approved expenses</p></div><CircleDollarSign size={18} className="text-admin-muted" /></div><div className="mt-6 grid gap-3"><FinanceRow label="Donations" value={donated} currency={currency} tone="text-emerald-700" /><FinanceRow label="Expenses" value={expenses} currency={currency} tone="text-rose-700" /><div className="mt-1 border-t border-admin-border pt-4"><FinanceRow label="Net funds" value={donated - expenses} currency={currency} tone="text-admin-ink" /></div></div><Link href="/finance" className="admin-button mt-6 w-full border border-admin-border bg-white">Open finances <ArrowRight size={14} /></Link></article>
    </section>
    <DashboardLiveFeeds initialContent={recentContent} initialMessages={messages || []} />
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[[FileText, 'Articles', metrics?.published_articles || 0, '/articles'], [BookHeart, 'Devotions', metrics?.published_devotions || 0, '/devotions'], [Users, 'Active members', metrics?.active_users || 0, '/users'], [TrendingUp, 'Successful donations', metrics?.successful_donations || 0, '/finance']].map(([Icon, label, value, href]) => { const ItemIcon = Icon as typeof FileText; return <Link href={String(href)} key={String(label)} className="admin-card flex items-center gap-4 p-5 transition hover:border-[#005bd3]/30 hover:shadow-md"><span className="grid size-10 place-items-center rounded-xl bg-admin-bg"><ItemIcon size={18} /></span><div><p className="text-xs font-semibold text-admin-muted">{String(label)}</p><p className="mt-0.5 text-lg font-extrabold">{Number(value).toLocaleString()}</p></div></Link>; })}
    </section>
    {role !== 'super_admin' ? <p className="mt-5 text-center text-[0.7rem] text-admin-muted">Signed in with {role.replaceAll('_', ' ')} permissions.</p> : null}
  </div>;
}

function FinanceRow({ label, value, currency, tone }: { label: string; value: number; currency: string; tone: string }) { return <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-admin-muted">{label}</span><span className={`text-lg font-extrabold ${tone}`}>{currency} {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>; }

const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatAnalyticsDate(value: string) {
  const [, month = '1', day = '1'] = String(value).split('-');
  return `${shortMonths[Math.max(0, Math.min(11, Number(month) - 1))]} ${Number(day)}`;
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { EmptyState, StatusPill } from '@/components/admin-ui';
import { useAdminRealtime } from '@/components/admin-realtime';

type Content = { id: string; title: string; status: string; updated_at: string; kind: string };
type Message = { id: string; first_name: string; last_name: string | null; subject: string; status: string; priority: string; created_at: string };

export function DashboardLiveFeeds({ initialContent, initialMessages }: { initialContent: Content[]; initialMessages: Message[] }) {
  const { messageVersion } = useAdminRealtime();
  const [contentItems, setContentItems] = useState(initialContent);
  const [messages, setMessages] = useState(initialMessages);
  useEffect(() => {
    const supabase = createClient();
    const reloadContent = async () => { const tables = [['articles', 'article'], ['devotions', 'devotion'], ['bible_teachings', 'teaching'], ['kids_lessons', 'kids'], ['ebooks', 'ebook']] as const; const results = await Promise.all(tables.map(async ([table, kind]) => { const { data } = await supabase.from(table).select('id,title,status,updated_at').order('updated_at', { ascending: false }).limit(5); return (data || []).map((item) => ({ ...item, kind })); })); setContentItems(results.flat().sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 5)); };
    const reloadMessages = async () => { const { data } = await supabase.from('contact_messages').select('id,first_name,last_name,subject,status,priority,created_at').order('created_at', { ascending: false }).limit(5); if (data) setMessages(data); };
    let content = supabase.channel('dashboard-content');
    ['articles', 'devotions', 'bible_teachings', 'kids_lessons', 'ebooks'].forEach((table) => { content = content.on('postgres_changes', { event: '*', schema: 'public', table }, reloadContent); });
    content.subscribe();
    const inbox = supabase.channel('dashboard-inbox').on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, reloadMessages).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (event) => { if (event.new.notification_type === 'message') void reloadMessages(); }).subscribe();
    return () => { void supabase.removeChannel(content); void supabase.removeChannel(inbox); };
  }, []);
  useEffect(() => { if (!messageVersion) return; const supabase = createClient(); void supabase.from('contact_messages').select('id,first_name,last_name,subject,status,priority,created_at').order('created_at', { ascending: false }).limit(5).then(({ data }) => { if (data) setMessages(data); }); }, [messageVersion]);
  return <section className="mt-6 grid gap-5 xl:grid-cols-2">
    <article className="admin-card overflow-hidden"><FeedHead title="Recent content" subtitle="All content types update instantly" href="/articles" /><div className="divide-y divide-admin-border">{contentItems.length ? contentItems.map((item) => <Link href={contentHref(item)} key={`${item.kind}-${item.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-admin-bg/60"><span className="grid size-9 shrink-0 place-items-center bg-violet-50 text-violet-700"><FileText size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-0.5 text-[.7rem] capitalize text-admin-muted">{item.kind} · {new Date(item.updated_at).toLocaleString('en-US')}</p></div><StatusPill tone={item.status === 'published' ? 'green' : 'neutral'}>{item.status}</StatusPill></Link>) : <EmptyState title="No content yet" description="Create the first item from your content workspace." />}</div></article>
    <article className="admin-card overflow-hidden"><FeedHead title="Recent messages" subtitle="New requests appear instantly" href="/messages" /><div className="divide-y divide-admin-border">{messages.length ? messages.map((message) => <Link href={`/messages?selected=${message.id}`} key={message.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-admin-bg/60"><span className="grid size-9 shrink-0 place-items-center bg-blue-50 text-blue-700"><Inbox size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{message.subject}</p><p className="mt-0.5 truncate text-[.7rem] text-admin-muted">{message.first_name} {message.last_name || ''} · {new Date(message.created_at).toLocaleString('en-US')}</p></div><StatusPill tone={message.priority === 'urgent' ? 'red' : message.status === 'new' ? 'blue' : 'neutral'}>{message.priority === 'urgent' ? 'urgent' : message.status}</StatusPill></Link>) : <EmptyState title="Inbox is clear" description="New messages from the public contact form will appear here." />}</div></article>
  </section>;
}

function FeedHead({ title, subtitle, href }: { title: string; subtitle: string; href: string }) { return <div className="flex items-center justify-between border-b border-admin-border px-5 py-4"><div><h2 className="text-sm font-extrabold">{title}</h2><p className="mt-0.5 text-xs text-admin-muted">{subtitle}</p></div><span className="flex items-center gap-2"><i className="size-2 animate-pulse bg-emerald-500" /><Link href={href} className="text-xs font-bold text-[#005bd3]">View all</Link></span></div>; }
function contentHref(item: Content) { return item.kind === 'article' ? `/articles/${item.id}/edit` : item.kind === 'devotion' ? `/devotions/${item.id}/edit` : item.kind === 'teaching' ? `/teachings?id=${item.id}` : item.kind === 'kids' ? `/kids?id=${item.id}` : `/ebooks?tab=library&id=${item.id}`; }

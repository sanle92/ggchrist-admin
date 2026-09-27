'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, CircleDollarSign, Inbox, MessageSquareWarning, Volume2, VolumeX } from 'lucide-react';
import { AdminNotification, useAdminRealtime } from '@/components/admin-realtime';
import { useClickOutside } from '@/lib/use-click-outside';

export type { AdminNotification } from '@/components/admin-realtime';

export function NotificationCenter() {
  const { notifications: items, latestNotificationId, markAllRead, markRead } = useAdminRealtime();
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const soundRef = useRef(false);
  const lastToneRef = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useClickOutside(rootRef, () => setOpen(false), open);
  const unread = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

  useEffect(() => { const enabled = window.localStorage.getItem('ggc-admin-notification-sound') === 'on'; soundRef.current = enabled; setSoundEnabled(enabled); }, []);
  useEffect(() => {
    if (latestNotificationId && latestNotificationId !== lastToneRef.current) {
      lastToneRef.current = latestNotificationId;
      if (soundRef.current) playNotificationTone();
    }
  }, [latestNotificationId]);

  const toggleSound = () => { const next = !soundEnabled; soundRef.current = next; setSoundEnabled(next); window.localStorage.setItem('ggc-admin-notification-sound', next ? 'on' : 'off'); if (next) playNotificationTone(); };

  return <div ref={rootRef} className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} className="relative grid size-9 place-items-center text-white/75 hover:bg-white/10" aria-expanded={open} aria-label={`${unread} unread notifications`}><Bell size={17} />{unread ? <span className="status-pill absolute right-0 top-0 grid min-w-4 place-items-center bg-[#D82C0D] px-1 text-[.55rem] font-extrabold leading-4 text-white">{unread > 9 ? '9+' : unread}</span> : null}</button>
    {open ? <div className="absolute right-0 mt-2 w-[min(380px,calc(100vw-1.5rem))] overflow-hidden border border-admin-border bg-white text-admin-ink shadow-[0_8px_24px_rgba(0,0,0,.12)]">
      <div className="flex items-center justify-between border-b border-admin-border px-4 py-3"><div><h2 className="text-sm font-bold">Notifications</h2><p className="mt-0.5 text-[.68rem] text-admin-muted">Live ministry activity</p></div><div className="flex items-center gap-2"><button type="button" onClick={toggleSound} className="grid size-8 place-items-center border border-admin-border text-admin-muted hover:bg-admin-bg" title={soundEnabled ? 'Turn notification sound off' : 'Turn notification sound on'}>{soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}</button>{unread ? <button type="button" onClick={() => void markAllRead()} className="flex items-center gap-1.5 text-[.68rem] font-bold text-admin-green"><CheckCheck size={14} /> Mark all read</button> : null}</div></div>
      <div className="max-h-[430px] overflow-y-auto">{items.length ? items.map((item: AdminNotification) => { const Icon = item.notification_type === 'finance' ? CircleDollarSign : item.notification_type === 'message' ? Inbox : MessageSquareWarning; return <Link href={item.link || '#'} onClick={() => { void markRead(item.id); setOpen(false); }} key={item.id} className={`flex gap-3 border-b border-admin-border px-4 py-3.5 last:border-0 hover:bg-admin-bg ${item.is_read ? 'opacity-65' : 'bg-emerald-50/40'}`}><span className="grid size-9 shrink-0 place-items-center bg-admin-bg text-admin-green"><Icon size={16} /></span><span className="min-w-0"><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs leading-5 text-admin-muted">{item.message}</span><span className="mt-1.5 block text-[.62rem] text-admin-muted">{new Date(item.created_at).toLocaleString('en-US')}</span></span>{!item.is_read ? <span className="status-pill mt-2 size-2 shrink-0 bg-admin-green" /> : null}</Link>; }) : <div className="p-9 text-center"><Bell size={24} className="mx-auto text-admin-muted/40" /><p className="mt-3 text-sm font-semibold">You’re all caught up</p><p className="mt-1 text-xs text-admin-muted">New activity will appear here automatically.</p></div>}</div>
    </div> : null}
  </div>;
}

function playNotificationTone() {
  try {
    const context = new AudioContext();
    const gain = context.createGain(); gain.connect(context.destination); gain.gain.setValueAtTime(.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(.16, context.currentTime + .02); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .55);
    [659.25, 783.99].forEach((frequency, index) => { const oscillator = context.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = frequency; oscillator.connect(gain); oscillator.start(context.currentTime + index * .13); oscillator.stop(context.currentTime + .45 + index * .13); });
    window.setTimeout(() => void context.close(), 900);
  } catch { /* Browser audio policies require one user interaction before sound. */ }
}

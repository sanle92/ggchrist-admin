'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type AdminNotification = { id: string; title: string; message: string; notification_type: string; link: string | null; is_read: boolean; created_at: string };

type RealtimeValue = {
  notifications: AdminNotification[];
  messageVersion: number;
  latestNotificationId: string | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const AdminRealtimeContext = createContext<RealtimeValue | null>(null);

export function AdminRealtimeProvider({ userId, initialNotifications, children }: { userId: string; initialNotifications: AdminNotification[]; children: React.ReactNode }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [messageVersion, setMessageVersion] = useState(0);
  const [latestNotificationId, setLatestNotificationId] = useState<string | null>(null);
  const newestRef = useRef(initialNotifications[0]?.id || null);

  const acceptNotifications = useCallback((next: AdminNotification[]) => {
    const newest = next[0]?.id || null;
    if (newest && newest !== newestRef.current) {
      const previousIndex = newestRef.current ? next.findIndex((item) => item.id === newestRef.current) : 1;
      const arrived = next.slice(0, previousIndex > 0 ? previousIndex : 1);
      if (arrived.some((item) => item.notification_type === 'message')) setMessageVersion((value) => value + 1);
      newestRef.current = newest;
      setLatestNotificationId(newest);
    }
    setNotifications(next);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase.from('notifications').select('id,title,message,notification_type,link,is_read,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
      if (data) acceptNotifications(data as AdminNotification[]);
    };
    const channel = supabase.channel(`admin-live-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => setMessageVersion((value) => value + 1))
      .subscribe();
    const polling = window.setInterval(load, 12_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(polling); document.removeEventListener('visibilitychange', onVisible); void supabase.removeChannel(channel); };
  }, [acceptNotifications, userId]);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    await createClient().from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  }, [userId]);
  const markRead = useCallback(async (id: string) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    await createClient().from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', userId);
  }, [userId]);

  const value = useMemo(() => ({ notifications, messageVersion, latestNotificationId, markRead, markAllRead }), [latestNotificationId, markAllRead, markRead, messageVersion, notifications]);
  return <AdminRealtimeContext.Provider value={value}>{children}</AdminRealtimeContext.Provider>;
}

export function useAdminRealtime() {
  const value = useContext(AdminRealtimeContext);
  if (!value) throw new Error('useAdminRealtime must be used inside AdminRealtimeProvider');
  return value;
}

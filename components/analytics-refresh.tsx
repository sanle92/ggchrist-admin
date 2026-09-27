'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AnalyticsRefresh() {
  const router = useRouter();
  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (document.visibilityState !== 'visible' || pending) return;
      pending = setTimeout(() => { pending = undefined; router.refresh(); }, 1000);
    };
    const supabase = createClient();
    const channel = supabase.channel('analytics-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analytics_daily' }, refresh)
      .subscribe();
    const timer = setInterval(refresh, 15_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      clearTimeout(pending);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(channel);
    };
  }, [router]);
  return null;
}

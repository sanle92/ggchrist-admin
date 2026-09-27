'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminRealtime } from '@/components/admin-realtime';

export function MessagesLiveRefresh() {
  const { messageVersion } = useAdminRealtime();
  const router = useRouter();
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    router.refresh();
  }, [messageVersion, router]);
  return null;
}

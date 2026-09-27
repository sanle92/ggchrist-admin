'use client';

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin-sidebar';
import { AdminTopbar } from '@/components/admin-topbar';

export function AdminShell({ displayName, role, children }: { displayName: string; role: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setCollapsed(window.localStorage.getItem('ggc-admin-sidebar-collapsed') === 'true'), []);
  const toggle = () => setCollapsed((value) => { const next = !value; window.localStorage.setItem('ggc-admin-sidebar-collapsed', String(next)); return next; });
  return <div className="min-h-screen pb-20 lg:pb-0">
    <AdminTopbar displayName={displayName} role={role} />
    <AdminSidebar role={role} collapsed={collapsed} onToggle={toggle} />
    <div className={`pt-14 transition-[padding] duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-60'}`}><main className="mx-auto max-w-[1280px] p-4 md:p-6 lg:p-8">{children}</main></div>
  </div>;
}

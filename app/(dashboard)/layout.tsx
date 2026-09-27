import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { createClient } from '@/lib/supabase/server';
import { AdminTimezoneProvider } from '@/components/admin-timezone';
import { AdminRealtimeProvider } from '@/components/admin-realtime';

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const [{ data: admin }, { data: profile }, { data: notifications }, { data: settings }] = await Promise.all([
    supabase.from('admin_users').select('role, is_active').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('display_name, email').eq('id', userId).maybeSingle(),
    supabase.from('notifications').select('id,title,message,notification_type,link,is_read,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('site_settings').select('timezone').eq('id', true).maybeSingle(),
  ]);
  if (!admin?.is_active) redirect('/login?error=Administrator%20access%20is%20required');

  return (
    <AdminTimezoneProvider timezone={settings?.timezone || 'Africa/Kampala'}><AdminRealtimeProvider userId={userId} initialNotifications={notifications || []}><AdminShell displayName={profile?.display_name || profile?.email || 'Administrator'} role={admin.role}>{children}</AdminShell></AdminRealtimeProvider></AdminTimezoneProvider>
  );
}

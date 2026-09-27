'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) redirect('/login?error=Enter%20your%20email%20and%20password');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) redirect('/login?error=Invalid%20email%20or%20password');

  const { data: admin } = await supabase
    .from('admin_users')
    .select('role, is_active')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (!admin?.is_active) {
    await supabase.auth.signOut();
    redirect('/login?error=This%20account%20does%20not%20have%20admin%20access');
  }

  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

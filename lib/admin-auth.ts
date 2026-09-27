import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect('/login');
  const { data: admin } = await supabase.from('admin_users').select('role, is_active').eq('user_id', userId).maybeSingle();
  if (!admin?.is_active) redirect('/login?error=Administrator%20access%20is%20required');
  return { supabase, userId, role: admin.role as string };
}

export async function requireRole(allowed: string[]) {
  const context = await requireAdmin();
  if (context.role !== 'super_admin' && !allowed.includes(context.role)) redirect('/?error=You%20do%20not%20have%20permission%20for%20that%20action');
  return context;
}

export function slugify(value: string) {
  return value.toLowerCase().trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function uploadAdminFile(bucket: string, folder: string, file: File) {
  if (!file.size) return null;
  const { supabase, userId } = await requireAdmin();
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const path = `${folder}/${userId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  if (bucket === 'public-media' || bucket === 'devotion-audio') return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return path;
}

export async function writeAudit(action: string, targetType: string, targetId: string, details: Record<string, unknown> = {}) {
  const { supabase, userId } = await requireAdmin();
  await supabase.from('audit_logs').insert({ actor_id: userId, action, target_type: targetType, target_id: targetId, details });
}

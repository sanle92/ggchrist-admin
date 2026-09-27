'use server';
import { revalidatePath } from 'next/cache'; import { requireRole, writeAudit } from '@/lib/admin-auth';
export async function updateUserStatus(formData: FormData) { const id = String(formData.get('id')); const status = String(formData.get('status')); if (!['active', 'inactive', 'banned'].includes(status)) return; const { supabase } = await requireRole(['moderator']); const { error } = await supabase.from('profiles').update({ status }).eq('id', id); if (!error) await writeAudit('user.status_changed', 'user', id, { status }); revalidatePath('/users'); }

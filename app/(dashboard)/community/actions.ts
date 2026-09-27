'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, writeAudit } from '@/lib/admin-auth';

export async function moderateItem(formData: FormData) {
  const table = String(formData.get('table')); const id = String(formData.get('id')); const status = String(formData.get('status'));
  if (!['forum_posts', 'testimonies', 'prayer_requests', 'comments', 'ebook_reviews'].includes(table) || !['approved', 'rejected', 'answered'].includes(status)) return;
  const { supabase } = await requireRole(['moderator']); const { error } = await supabase.from(table).update({ status }).eq('id', id);
  if (!error) await writeAudit('moderation.status_changed', table, id, { status }); revalidatePath('/community');
}

export async function moderateChat(formData: FormData) {
  const id = String(formData.get('id')); const action = String(formData.get('action')); if (!['flag', 'unflag', 'mute', 'unmute', 'delete', 'restore'].includes(action)) return;
  const { supabase } = await requireRole(['moderator']);
  const payload = action === 'flag' ? { is_flagged: true } : action === 'unflag' ? { is_flagged: false } : action === 'mute' ? { is_muted: true } : action === 'unmute' ? { is_muted: false } : action === 'delete' ? { deleted_at: new Date().toISOString() } : { deleted_at: null };
  const { error } = await supabase.from('live_chat_messages').update(payload).eq('id', id); if (!error) await writeAudit(`chat.${action}`, 'live_chat_message', id); revalidatePath('/community');
}

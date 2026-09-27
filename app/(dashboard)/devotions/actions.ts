'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole, slugify, uploadAdminFile, writeAudit } from '@/lib/admin-auth';
import { scheduledUtc } from '@/lib/timezone';

const schema = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(240), slug: z.string().trim().max(260).optional(), reference: z.string().trim().max(150).optional(), scripture: z.string().trim().max(3000).optional(), reflection: z.string().trim().min(1), prayer: z.string().trim().max(3000).optional(), audioTitle: z.string().trim().max(200).optional(), devotionDate: z.string().date(), status: z.enum(['draft', 'scheduled', 'published', 'archived']), scheduledFor: z.string().optional(), seoTitle: z.string().trim().max(70).optional(), seoDescription: z.string().trim().max(170).optional(), focusKeyword: z.string().trim().max(120).optional(), canonicalUrl: z.string().url().optional().or(z.literal('')), noIndex: z.string().optional() });

export async function saveDevotion(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/devotions?error=${encodeURIComponent(parsed.error.issues[0]?.message || 'Invalid devotion')}`);
  const { supabase, userId } = await requireRole(['content_manager']);
  const input = parsed.data;
  const cover = formData.get('coverImage');
  const audioUrl = String(formData.get('audioUrl') || '').trim() || null;
  const coverUrl = cover instanceof File && cover.size ? await uploadAdminFile('public-media', 'devotions', cover) : null;
  const scheduledFor = await scheduledUtc(supabase, input.status, input.scheduledFor);
  const payload = { slug: slugify(input.slug || input.title), title: input.title, reference: input.reference || null, scripture: input.scripture || null, reflection: input.reflection, prayer: input.prayer || null, audio_title: input.audioTitle || null, seo_title: input.seoTitle || null, seo_description: input.seoDescription || null, focus_keyword: input.focusKeyword || null, canonical_url: input.canonicalUrl || null, no_index: input.noIndex === 'on', ...(audioUrl ? { audio_url: audioUrl } : {}), ...(coverUrl ? { cover_image_url: coverUrl } : {}), devotion_date: input.devotionDate, status: input.status, scheduled_for: scheduledFor, deleted_at: null, ...(input.status === 'published' ? { published_at: new Date().toISOString() } : {}), created_by: userId };
  if (input.id) { const { error } = await supabase.from('devotions').update(payload).eq('id', input.id); if (error) redirect(`/devotions/${input.id}/edit?error=${encodeURIComponent(error.message)}`); await writeAudit('devotion.updated', 'devotion', input.id); }
  else { const { data, error } = await supabase.from('devotions').insert(payload).select('id').single(); if (error) redirect(`/devotions/new?error=${encodeURIComponent(error.message)}`); await writeAudit('devotion.created', 'devotion', data.id); }
  revalidatePath('/devotions'); redirect('/devotions?saved=true');
}

export async function archiveDevotion(formData: FormData) { const id = String(formData.get('id') || ''); const { supabase } = await requireRole(['content_manager']); const { error } = await supabase.from('devotions').update({ status: 'archived', deleted_at: new Date().toISOString() }).eq('id', id); if (!error) await writeAudit('devotion.archived', 'devotion', id); revalidatePath('/devotions'); }
export async function restoreDevotion(formData: FormData) { const id = String(formData.get('id') || ''); const { supabase } = await requireRole(['content_manager']); const { error } = await supabase.from('devotions').update({ status: 'draft', deleted_at: null }).eq('id', id); if (!error) await writeAudit('devotion.restored', 'devotion', id); revalidatePath('/devotions'); }
export async function duplicateDevotion(formData: FormData) { const id = String(formData.get('id') || ''); const { supabase, userId } = await requireRole(['content_manager']); const { data: original } = await supabase.from('devotions').select('*').eq('id', id).single(); if (!original) return; const { id: _id, created_at: _created, updated_at: _updated, ...copy } = original; const title = `${original.title} (Copy)`; const { data, error } = await supabase.from('devotions').insert({ ...copy, title, slug: `${slugify(title)}-${Date.now().toString().slice(-6)}`, status: 'draft', published_at: null, deleted_at: null, created_by: userId }).select('id').single(); if (!error) await writeAudit('devotion.duplicated', 'devotion', data.id, { source: id }); revalidatePath('/devotions'); }

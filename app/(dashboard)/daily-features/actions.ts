'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole, uploadAdminFile, writeAudit } from '@/lib/admin-auth';
import { scheduledUtc } from '@/lib/timezone';

const schema = z.object({ id: z.string().uuid().optional(), verseBook: z.string().trim().min(1).max(100), verseChapter: z.string().trim().min(1).max(100), featuredVerse: z.string().trim().min(1).max(3000), featureDate: z.string().date(), status: z.enum(['draft', 'scheduled', 'published', 'archived']), scheduledFor: z.string().optional(), seoTitle: z.string().trim().max(70).optional(), seoDescription: z.string().trim().max(170).optional(), focusKeyword: z.string().trim().max(120).optional(), canonicalUrl: z.string().url().optional().or(z.literal('')), noIndex: z.string().optional() });

export async function saveDailyFeature(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/daily-features?error=Invalid%20daily%20feature');
  const { supabase, userId } = await requireRole(['content_manager']);
  const input = parsed.data;
  const image = formData.get('backgroundImage');
  const imageUrl = image instanceof File && image.size ? await uploadAdminFile('public-media', 'daily-features', image) : null;
  const scheduledFor = await scheduledUtc(supabase, input.status, input.scheduledFor);
  const payload = { verse_book: input.verseBook, verse_chapter: input.verseChapter, featured_verse: input.featuredVerse, feature_date: input.featureDate, status: input.status, scheduled_for: scheduledFor, seo_title: input.seoTitle || null, seo_description: input.seoDescription || null, focus_keyword: input.focusKeyword || null, canonical_url: input.canonicalUrl || null, no_index: input.noIndex === 'on', ...(imageUrl ? { background_image_url: imageUrl } : {}), ...(input.status === 'published' ? { published_at: new Date().toISOString(), published_by: userId } : {}) };
  if (input.id) { const { data: old } = await supabase.from('daily_features').select('*').eq('id', input.id).maybeSingle(); if (old) await supabase.from('daily_feature_history').insert({ daily_feature_id: input.id, snapshot: old, changed_by: userId }); const { error } = await supabase.from('daily_features').update(payload).eq('id', input.id); if (error) redirect(`/daily-features?error=${encodeURIComponent(error.message)}`); await writeAudit('daily_feature.updated', 'daily_feature', input.id); }
  else { const { data, error } = await supabase.from('daily_features').insert(payload).select('id').single(); if (error) redirect(`/daily-features?error=${encodeURIComponent(error.message)}`); await writeAudit('daily_feature.created', 'daily_feature', data.id); }
  revalidatePath('/daily-features'); redirect('/daily-features?saved=true');
}

export async function archiveDailyFeature(formData: FormData) { const id = String(formData.get('id') || ''); const { supabase } = await requireRole(['content_manager']); const { error } = await supabase.from('daily_features').update({ status: 'archived' }).eq('id', id); if (!error) await writeAudit('daily_feature.archived', 'daily_feature', id); revalidatePath('/daily-features'); }

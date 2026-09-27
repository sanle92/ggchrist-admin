'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole, slugify, uploadAdminFile, writeAudit } from '@/lib/admin-auth';
import { scheduledUtc } from '@/lib/timezone';

const schema = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(240), slug: z.string().trim().max(260).optional(), subtitle: z.string().trim().max(300).optional(), description: z.string().trim().min(1), author: z.string().trim().min(1).max(150), authorBio: z.string().trim().max(1500).optional(), authorCountry: z.string().trim().max(100).optional(), category: z.string().trim().min(1).max(100), tags: z.string().optional(), format: z.enum(['PDF', 'EPUB', 'MOBI', 'Paperback', 'Hardcover']), currency: z.string().length(3), price: z.coerce.number().min(0), originalPrice: z.coerce.number().min(0).optional(), shippingPrice: z.coerce.number().min(0).default(0), ebookFilePath: z.string().trim().max(1000).optional(), pages: z.coerce.number().int().positive().optional(), language: z.string().trim().max(60).default('English'), previewUrl: z.string().url().optional().or(z.literal('')), status: z.enum(['draft', 'scheduled', 'published', 'archived']), scheduledFor: z.string().optional(), isFeatured: z.string().optional(), seoTitle: z.string().trim().max(70).optional(), seoDescription: z.string().trim().max(170).optional(), focusKeyword: z.string().trim().max(120).optional(), canonicalUrl: z.string().url().optional().or(z.literal('')), noIndex: z.string().optional() });

export async function saveEbook(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/ebooks?error=${encodeURIComponent(parsed.error.issues[0]?.message || 'Please check the ebook details')}`);
  const { supabase } = await requireRole(['content_manager']);
  const input = parsed.data;
  const cover = formData.get('cover');
  const coverUrl = cover instanceof File && cover.size ? await uploadAdminFile('public-media', 'ebooks/covers', cover) : null;
  const filePath = input.ebookFilePath || null;
  if (input.status === 'published' && ['PDF', 'EPUB', 'MOBI'].includes(input.format) && !filePath) {
    const { data: existing } = input.id ? await supabase.from('ebooks').select('file_path').eq('id', input.id).maybeSingle() : { data: null };
    if (!existing?.file_path) redirect(`/ebooks${input.id ? `?id=${input.id}&` : '?'}error=${encodeURIComponent('Upload the private ebook file before publishing a digital book.')}`);
  }
  const scheduledFor = await scheduledUtc(supabase, input.status, input.scheduledFor);
  const payload = { slug: slugify(input.slug || input.title), title: input.title, subtitle: input.subtitle || null, description: input.description, author: input.author, author_bio: input.authorBio || null, author_country: input.authorCountry || null, category: input.category, tags: input.tags?.split(',').map((tag) => tag.trim()).filter(Boolean) || [], format: input.format, currency: input.currency.toUpperCase(), price_minor: Math.round(input.price * 100), original_price_minor: input.originalPrice ? Math.round(input.originalPrice * 100) : null, shipping_amount_minor: Math.round(input.shippingPrice * 100), pages: input.pages || null, language: input.language, preview_url: input.previewUrl || null, status: input.status, scheduled_for: scheduledFor, is_featured: input.isFeatured === 'on', seo_title: input.seoTitle || null, seo_description: input.seoDescription || null, focus_keyword: input.focusKeyword || null, canonical_url: input.canonicalUrl || null, no_index: input.noIndex === 'on', ...(coverUrl ? { cover_image_url: coverUrl } : {}), ...(filePath ? { file_path: filePath } : {}), ...(input.status === 'published' ? { published_at: new Date().toISOString() } : {}) };
  if (input.id) { const { error } = await supabase.from('ebooks').update(payload).eq('id', input.id); if (error) redirect(`/ebooks?id=${input.id}&error=${encodeURIComponent(error.message)}`); await writeAudit('ebook.updated', 'ebook', input.id); }
  else { if (!coverUrl) redirect('/ebooks?error=A%20cover%20image%20is%20required'); const { data, error } = await supabase.from('ebooks').insert(payload).select('id').single(); if (error) redirect(`/ebooks?error=${encodeURIComponent(error.message)}`); await writeAudit('ebook.created', 'ebook', data.id); }
  revalidatePath('/ebooks'); redirect('/ebooks?saved=true');
}

export async function archiveEbook(formData: FormData) { const id = String(formData.get('id')); const { supabase } = await requireRole(['content_manager']); const { error } = await supabase.from('ebooks').update({ status: 'archived' }).eq('id', id); if (!error) await writeAudit('ebook.archived', 'ebook', id); revalidatePath('/ebooks'); }
export async function moderateEbookReview(formData: FormData) { const id = String(formData.get('id')); const status = String(formData.get('status')); if (!['approved', 'rejected'].includes(status)) return; const { supabase } = await requireRole(['content_manager', 'moderator']); const { error } = await supabase.from('ebook_reviews').update({ status }).eq('id', id); if (!error) await writeAudit('ebook_review.moderated', 'ebook_review', id, { status }); revalidatePath('/ebooks'); }

export async function updateEbookFulfillment(formData: FormData) {
  const id = String(formData.get('id'));
  const status = String(formData.get('fulfillmentStatus'));
  if (!['pending', 'ready', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(status)) return;
  const { supabase } = await requireRole(['content_manager', 'finance_manager']);
  const { error } = await supabase.from('ebook_purchases').update({ fulfillment_status: status, updated_at: new Date().toISOString() }).eq('id', id);
  if (!error) await writeAudit('ebook_purchase.fulfillment_changed', 'ebook_purchase', id, { status });
  revalidatePath('/ebooks');
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole, writeAudit } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { ApiSecretKey, encryptSecret, maskSecret } from '@/lib/server-secrets';

export async function updateImpact(formData: FormData) { const parsed = z.object({ meals: z.coerce.number().int().min(0), schoolDays: z.coerce.number().int().min(0), businessCount: z.coerce.number().int().min(0), medicalHelps: z.coerce.number().int().min(0), clothingItems: z.coerce.number().int().min(0) }).safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect('/settings?tab=impact&error=Invalid%20impact%20values'); const { supabase, userId } = await requireRole(['content_manager']); const { error } = await supabase.from('impact_metrics').update({ meals: parsed.data.meals, school_days: parsed.data.schoolDays, business_count: parsed.data.businessCount, medical_helps: parsed.data.medicalHelps, clothing_items: parsed.data.clothingItems, updated_by: userId }).eq('id', true); if (error) redirect(`/settings?tab=impact&error=${encodeURIComponent(error.message)}`); await writeAudit('impact.updated', 'impact_metrics', 'global'); revalidatePath('/settings'); redirect('/settings?tab=impact&saved=impact'); }

export async function updateSiteSettings(formData: FormData) { const parsed = z.object({ ministryName: z.string().trim().min(1).max(160), supportEmail: z.string().email().optional().or(z.literal('')), contactPhone: z.string().trim().max(60).optional(), defaultCurrency: z.string().length(3), timezone: z.string().trim().min(1).max(100), facebook: z.string().url().optional().or(z.literal('')), instagram: z.string().url().optional().or(z.literal('')), youtube: z.string().url().optional().or(z.literal('')), seoTitle: z.string().trim().max(70).optional(), seoDescription: z.string().trim().max(170).optional(), donationsEnabled: z.string().optional(), communityEnabled: z.string().optional(), maintenanceMode: z.string().optional() }).safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect(`/settings?tab=general&error=${encodeURIComponent(parsed.error.issues[0]?.message || 'Invalid settings')}`); const { supabase, userId } = await requireRole([]); const input = parsed.data; const { error } = await supabase.from('site_settings').upsert({ id: true, ministry_name: input.ministryName, support_email: input.supportEmail || null, contact_phone: input.contactPhone || null, default_currency: input.defaultCurrency.toUpperCase(), timezone: input.timezone, donations_enabled: input.donationsEnabled === 'on', community_enabled: input.communityEnabled === 'on', maintenance_mode: input.maintenanceMode === 'on', social_links: { facebook: input.facebook || null, instagram: input.instagram || null, youtube: input.youtube || null }, seo_defaults: { title: input.seoTitle || null, description: input.seoDescription || null }, updated_by: userId }); if (error) redirect(`/settings?tab=general&error=${encodeURIComponent(error.message)}`); await writeAudit('site_settings.updated', 'site_settings', 'global'); revalidatePath('/settings'); redirect('/settings?tab=general&saved=site'); }

export async function updateApiSettings(formData: FormData) {
  const { userId } = await requireRole([]);
  const fields: Array<{ form: string; key: ApiSecretKey }> = [
    { form: 'stripePublishableKey', key: 'stripe_publishable_key' },
    { form: 'stripeSecretKey', key: 'stripe_secret_key' },
    { form: 'stripeWebhookSecret', key: 'stripe_webhook_secret' },
    { form: 'resendApiKey', key: 'resend_api_key' },
  ];
  try {
    const service = createServiceClient();
    for (const field of fields) {
      if (formData.get(`remove_${field.key}`) === 'on') {
        const { error } = await service.from('api_secrets').delete().eq('key', field.key);
        if (error) throw error;
        continue;
      }
      const value = String(formData.get(field.form) || '').trim();
      if (!value) continue;
      const { error } = await service.from('api_secrets').upsert({
        key: field.key,
        encrypted_value: encryptSecret(value),
        masked_hint: maskSecret(value),
        updated_by: userId,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }
    await writeAudit('api_settings.updated', 'api_secrets', 'global', { fields: fields.map((field) => field.key) });
  } catch (error) {
    redirect(`/settings?tab=api&error=${encodeURIComponent(error instanceof Error ? error.message : 'API settings could not be saved')}`);
  }
  revalidatePath('/settings');
  redirect('/settings?tab=api&saved=api');
}

export async function assignAdmin(formData: FormData) { const parsed = z.object({ email: z.string().trim().email(), role: z.enum(['super_admin', 'content_manager', 'moderator', 'finance_manager', 'viewer']) }).safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect('/settings?tab=access&error=Invalid%20administrator'); const { supabase } = await requireRole([]); const { data: profile } = await supabase.from('profiles').select('id').ilike('email', parsed.data.email).maybeSingle(); if (!profile) redirect('/settings?tab=access&error=The%20user%20must%20create%20an%20account%20first'); const { error } = await supabase.from('admin_users').upsert({ user_id: profile.id, role: parsed.data.role, is_active: true }); if (error) redirect(`/settings?tab=access&error=${encodeURIComponent(error.message)}`); await writeAudit('admin.assigned', 'user', profile.id, { role: parsed.data.role }); revalidatePath('/settings'); redirect('/settings?tab=access&saved=admin'); }

export async function toggleAdmin(formData: FormData) { const id = String(formData.get('id')); const active = String(formData.get('active')) === 'true'; const { supabase, userId } = await requireRole([]); if (id === userId && !active) redirect('/settings?tab=access&error=You%20cannot%20disable%20your%20own%20account'); const { error } = await supabase.from('admin_users').update({ is_active: active }).eq('user_id', id); if (!error) await writeAudit('admin.status_changed', 'user', id, { active }); revalidatePath('/settings'); }

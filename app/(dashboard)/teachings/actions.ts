"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  requireRole,
  slugify,
  uploadAdminFile,
  writeAudit,
} from "@/lib/admin-auth";
import { scheduledUtc } from "@/lib/timezone";
const schema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(240),
  slug: z.string().trim().optional(),
  subtitle: z.string().trim().max(300).optional(),
  body: z.string().trim().min(1),
  readTimeMinutes: z.coerce.number().int().min(1).max(240),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  scheduledFor: z.string().optional(),
  seoTitle: z.string().trim().max(70).optional(), seoDescription: z.string().trim().max(170).optional(), focusKeyword: z.string().trim().max(120).optional(), canonicalUrl: z.string().url().optional().or(z.literal("")), noIndex: z.string().optional(),
});
export async function saveTeaching(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect("/teachings?error=Please%20check%20the%20teaching");
  const { supabase } = await requireRole(["content_manager"]);
  const image = formData.get("cover");
  const cover =
    image instanceof File && image.size
      ? await uploadAdminFile("public-media", "teachings", image)
      : null;
  const payload = {
    title: parsed.data.title,
    slug: slugify(parsed.data.slug || parsed.data.title),
    subtitle: parsed.data.subtitle || null,
    body: parsed.data.body,
    read_time_minutes: parsed.data.readTimeMinutes,
    status: parsed.data.status,
    scheduled_for: await scheduledUtc(
      supabase,
      parsed.data.status,
      parsed.data.scheduledFor,
    ),
    seo_title: parsed.data.seoTitle || null,
    seo_description: parsed.data.seoDescription || null,
    focus_keyword: parsed.data.focusKeyword || null,
    canonical_url: parsed.data.canonicalUrl || null,
    no_index: parsed.data.noIndex === "on",
    ...(cover ? { cover_image_url: cover } : {}),
    ...(parsed.data.status === "published"
      ? { published_at: new Date().toISOString() }
      : {}),
  };
  if (parsed.data.id) {
    const { error } = await supabase
      .from("bible_teachings")
      .update(payload)
      .eq("id", parsed.data.id);
    if (error)
      redirect(
        `/teachings?id=${parsed.data.id}&error=${encodeURIComponent(error.message)}`,
      );
    await writeAudit("teaching.updated", "bible_teaching", parsed.data.id);
  } else {
    const { data, error } = await supabase
      .from("bible_teachings")
      .insert(payload)
      .select("id")
      .single();
    if (error)
      redirect(`/teachings?error=${encodeURIComponent(error.message)}`);
    await writeAudit("teaching.created", "bible_teaching", data.id);
  }
  revalidatePath("/teachings");
  redirect("/teachings?saved=true");
}
export async function archiveTeaching(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await requireRole(["content_manager"]);
  const { error } = await supabase
    .from("bible_teachings")
    .update({ status: "archived" })
    .eq("id", id);
  if (!error) await writeAudit("teaching.archived", "bible_teaching", id);
  revalidatePath("/teachings");
}

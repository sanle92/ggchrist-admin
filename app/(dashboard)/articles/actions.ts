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
  slug: z.string().trim().max(260).optional(),
  subtitle: z.string().trim().max(300).optional(),
  excerpt: z.string().trim().max(600),
  content: z.string().trim().min(1),
  readTimeMinutes: z.coerce.number().int().min(1).max(240),
  authorName: z.string().trim().min(1).max(150),
  category: z.string().trim().min(1).max(100),
  tags: z.string().optional(),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  scheduledFor: z.string().optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  focusKeyword: z.string().trim().max(120).optional(),
  canonicalUrl: z.string().url().optional().or(z.literal("")),
  noIndex: z.string().optional(),
  isFeatured: z.string().optional(),
});

export async function saveArticle(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(
      `/articles?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Invalid article")}`,
    );
  const { supabase, userId } = await requireRole(["content_manager"]);
  const input = parsed.data;
  const file = formData.get("coverImage");
  const uploadedUrl =
    file instanceof File && file.size
      ? await uploadAdminFile("public-media", "articles", file)
      : null;
  const scheduledFor = await scheduledUtc(
    supabase,
    input.status,
    input.scheduledFor,
  );
  const articleSlug = slugify(input.slug || input.title);
  const payload = {
    slug: articleSlug,
    title: input.title,
    subtitle: input.subtitle || null,
    excerpt: input.excerpt,
    content: input.content,
    author_name: input.authorName,
    category: input.category,
    tags:
      input.tags
        ?.split(",")
        .map((tag) => tag.trim())
        .filter(Boolean) || [],
    status: input.status,
    is_featured: input.isFeatured === "on",
    read_time_minutes: input.readTimeMinutes,
    seo_title: input.seoTitle || null,
    seo_description: input.seoDescription || null,
    focus_keyword: input.focusKeyword || null,
    canonical_url: input.canonicalUrl || null,
    no_index: input.noIndex === "on",
    scheduled_for: scheduledFor,
    ...(uploadedUrl ? { cover_image_url: uploadedUrl } : {}),
    ...(input.status === "published"
      ? { published_at: new Date().toISOString() }
      : {}),
    created_by: userId,
  };
  if (input.id) {
    const { error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", input.id);
    if (error)
      redirect(
        `/articles/${input.id}/edit?error=${encodeURIComponent(error.message)}`,
      );
    await writeAudit("article.updated", "article", input.id, {
      title: input.title,
    });
  } else {
    const { data, error } = await supabase
      .from("articles")
      .insert(payload)
      .select("id")
      .single();
    if (error)
      redirect(`/articles/new?error=${encodeURIComponent(error.message)}`);
    await writeAudit("article.created", "article", data.id, {
      title: input.title,
    });
  }
  revalidatePath("/articles");
  redirect("/articles?saved=true");
}

export async function archiveArticle(formData: FormData) {
  const id = String(formData.get("id") || "");
  const { supabase } = await requireRole(["content_manager"]);
  const { error } = await supabase
    .from("articles")
    .update({ status: "archived" })
    .eq("id", id);
  if (!error) await writeAudit("article.archived", "article", id);
  revalidatePath("/articles");
}

export async function duplicateArticle(formData: FormData) {
  const id = String(formData.get("id") || "");
  const { supabase, userId } = await requireRole(["content_manager"]);
  const { data: original } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();
  if (!original) return;
  const {
    id: _id,
    created_at: _created,
    updated_at: _updated,
    view_count: _views,
    ...copy
  } = original;
  const title = `${original.title} (Copy)`;
  const { data, error } = await supabase
    .from("articles")
    .insert({
      ...copy,
      title,
      slug: `${slugify(title)}-${Date.now().toString().slice(-6)}`,
      status: "draft",
      is_featured: false,
      published_at: null,
      scheduled_for: null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (!error)
    await writeAudit("article.duplicated", "article", data.id, { source: id });
  revalidatePath("/articles");
}

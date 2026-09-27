"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, writeAudit } from "@/lib/admin-auth";
const destinations: Record<string, string> = {
  articles: "/articles",
  devotions: "/devotions",
  teachings: "/teachings",
  daily_features: "/daily-features",
  kids_lessons: "/kids",
  ebooks: "/ebooks",
  messages: "/messages",
  forum_posts: "/community?tab=forum",
  testimonies: "/community?tab=testimonies",
  prayer_requests: "/community?tab=prayers",
  comments: "/community?tab=comments",
};
export async function bulkDeleteItems(formData: FormData) {
  const entity = String(formData.get("entity") || "");
  const destination = destinations[entity];
  if (!destination) redirect("/?error=Unsupported%20bulk%20operation");
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (!ids.length)
    redirect(
      `${destination}${destination.includes("?") ? "&" : "?"}error=Select%20at%20least%20one%20item`,
    );
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_bulk_delete", {
    p_entity: entity,
    p_ids: ids,
  });
  if (error)
    redirect(
      `${destination}${destination.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`,
    );
  await writeAudit("content.bulk_deleted", entity, ids[0], {
    ids,
    deletedCount: data,
  });
  revalidatePath(destination.split("?")[0]);
  redirect(
    `${destination}${destination.includes("?") ? "&" : "?"}deleted=${data || ids.length}`,
  );
}

import Link from "next/link";
import { Archive, BookMarked, Save } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { archiveTeaching, saveTeaching } from "./actions";
import { EmptyState, PageHeader, StatusPill } from "@/components/admin-ui";
import { PublishingStatus } from "@/components/publishing-status";
import { EngagementMetrics } from "@/components/engagement-metrics";
import { RichTextEditor } from "@/components/rich-text-editor";
import { BulkDeleteControls } from "@/components/bulk-delete-controls";
import { SeoFields } from "@/components/seo-fields";
import { bulkDeleteItems } from "@/app/(dashboard)/bulk-actions";
export default async function TeachingsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("bible_teachings")
    .select("*")
    .order("updated_at", { ascending: false });
  const selected = data?.find((item) => item.id === params.id);
  return (
    <div>
      <PageHeader
        title="Bible Teachings"
        description="Publish long-form biblical teaching for the public website."
      />
      {params.saved ? (
        <div className="admin-notice-success mt-5">Teaching saved.</div>
      ) : null}
      {params.error ? (
        <div className="admin-notice-error mt-5">{params.error}</div>
      ) : null}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_440px]">
        <section className="admin-card overflow-hidden">
          <form
            id="bulk-teachings"
            action={bulkDeleteItems}
            className="flex justify-end border-b border-admin-border p-3"
          >
            <input type="hidden" name="entity" value="teachings" />
            <BulkDeleteControls group="teachings" />
          </form>
          <div className="divide-y divide-admin-border">
            {data?.length ? (
              data.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <input
                    type="checkbox"
                    name="ids"
                    value={item.id}
                    form="bulk-teachings"
                    data-bulk-group="teachings"
                    aria-label={`Select ${item.title}`}
                  />
                  <Link
                    href={`/teachings?id=${item.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <span className="grid size-11 place-items-center overflow-hidden rounded-xl bg-violet-50 text-violet-700">
                      {item.cover_image_url ? (
                        <img
                          src={item.cover_image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BookMarked size={18} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs text-admin-muted">
                        Updated {new Date(item.updated_at).toLocaleDateString()}
                      </span>
                      <EngagementMetrics
                        likes={item.like_count}
                        comments={item.comment_count}
                        shares={item.share_count}
                        views={item.view_count}
                      />
                    </span>
                  </Link>
                  <StatusPill
                    tone={
                      item.status === "published"
                        ? "green"
                        : item.status === "archived"
                          ? "red"
                          : "neutral"
                    }
                  >
                    {item.status}
                  </StatusPill>
                  <form action={archiveTeaching}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="icon-button text-rose-600">
                      <Archive size={16} />
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <EmptyState
                title="No teachings yet"
                description="Create the first Bible teaching using the editor."
              />
            )}
          </div>
        </section>
        <form
          action={saveTeaching}
          className="admin-card p-5 xl:sticky xl:top-20 xl:self-start"
        >
          {selected?.id ? (
            <input type="hidden" name="id" value={selected.id} />
          ) : null}
          <h2 className="text-sm font-extrabold">
            {selected ? "Edit teaching" : "New teaching"}
          </h2>
          <div className="mt-5 grid gap-3">
            <input
              name="title"
              defaultValue={selected?.title}
              className="admin-input"
              placeholder="Title"
              required
            />
            <input
              name="slug"
              defaultValue={selected?.slug}
              className="admin-input"
              placeholder="Slug (optional)"
            />
            <input
              name="subtitle"
              defaultValue={selected?.subtitle}
              className="admin-input"
              placeholder="Subtitle"
            />
            <label className="grid gap-2 text-sm font-semibold">
              Teaching content{" "}
              <RichTextEditor name="body" defaultValue={selected?.body} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Reading time (minutes)
              <input
                name="readTimeMinutes"
                type="number"
                min="1"
                max="240"
                defaultValue={selected?.read_time_minutes || 8}
                className="admin-input"
                required
              />
            </label>
            <PublishingStatus
              status={selected?.status}
              scheduledFor={selected?.scheduled_for}
            />
            <SeoFields item={selected} />
            {selected?.cover_image_url ? (
              <img
                src={selected.cover_image_url}
                alt=""
                className="aspect-video w-full rounded-lg object-cover"
              />
            ) : null}
            <input
              name="cover"
              type="file"
              accept="image/*"
              className="text-xs"
            />
            <button className="admin-button admin-button-primary">
              <Save size={16} /> Save teaching
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

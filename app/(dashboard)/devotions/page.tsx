import Link from "next/link";
import {
  Archive,
  CalendarDays,
  Copy,
  Edit3,
  Headphones,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { archiveDevotion, duplicateDevotion, restoreDevotion } from "./actions";
import {
  EmptyState,
  PageHeader,
  StatCard,
  StatusPill,
} from "@/components/admin-ui";
import { EngagementMetrics } from "@/components/engagement-metrics";
import { BulkDeleteControls } from "@/components/bulk-delete-controls";
import { bulkDeleteItems } from "@/app/(dashboard)/bulk-actions";

export default async function DevotionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  let query = supabase
    .from("devotions")
    .select(
      "id,title,reference,devotion_date,status,audio_url,cover_image_url,like_count,comment_count,share_count,deleted_at,updated_at",
    )
    .order("devotion_date", { ascending: false });
  if (params.status === "archived") query = query.not("deleted_at", "is", null);
  else query = query.is("deleted_at", null);
  if (params.status && !["all", "archived"].includes(params.status))
    query = query.eq("status", params.status);
  if (params.q) query = query.ilike("title", `%${params.q}%`);
  const { data } = await query;
  const items = data || [];
  return (
    <div>
      <PageHeader
        title="Devotions"
        description="Plan Scripture, reflections, prayer and audio devotions in one calendar."
        actions={
          <Link
            href="/devotions/new"
            className="admin-button admin-button-primary"
          >
            <Plus size={16} /> Add devotion
          </Link>
        }
      />
      {params.saved ? (
        <div className="admin-notice-success mt-5">
          Devotion saved successfully.
        </div>
      ) : null}
      {params.error ? (
        <div className="admin-notice-error mt-5">{params.error}</div>
      ) : null}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Visible results"
          value={items.length}
          icon={CalendarDays}
          tone="blue"
        />
        <StatCard
          label="Published"
          value={items.filter((item) => item.status === "published").length}
          icon={CalendarDays}
          tone="green"
        />
        <StatCard
          label="With audio"
          value={items.filter((item) => item.audio_url).length}
          icon={Headphones}
          tone="purple"
        />
      </section>
      <form className="admin-card mt-5 flex flex-col gap-3 p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted"
          />
          <input
            name="q"
            defaultValue={params.q}
            className="admin-input pl-9"
            placeholder="Search devotions"
          />
        </div>
        <select
          name="status"
          defaultValue={params.status || "all"}
          className="admin-input sm:w-44"
        >
          <option value="all">Active statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <button className="admin-button border border-admin-border bg-white">
          Apply filters
        </button>
      </form>
      <section className="admin-card mt-5 overflow-hidden">
        <form
          id="bulk-devotions"
          action={bulkDeleteItems}
          className="flex justify-end border-b border-admin-border p-3"
        >
          <input type="hidden" name="entity" value="devotions" />
          <BulkDeleteControls group="devotions" />
        </form>
        <div className="divide-y divide-admin-border">
          {items.length ? (
            items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <input
                  type="checkbox"
                  name="ids"
                  value={item.id}
                  form="bulk-devotions"
                  data-bulk-group="devotions"
                  aria-label={`Select ${item.title}`}
                />
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-amber-50 text-amber-700">
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <CalendarDays size={19} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-admin-muted">
                    {item.reference || "No reference"} ·{" "}
                    {new Date(
                      `${item.devotion_date}T00:00:00`,
                    ).toLocaleDateString()}
                    {item.audio_url ? " · Audio" : ""}
                  </p>
                  <EngagementMetrics
                    likes={item.like_count}
                    comments={item.comment_count}
                    shares={item.share_count}
                  />
                </div>
                <StatusPill
                  tone={
                    item.status === "published"
                      ? "green"
                      : item.status === "scheduled"
                        ? "blue"
                        : item.deleted_at
                          ? "red"
                          : "neutral"
                  }
                >
                  {item.deleted_at ? "archived" : item.status}
                </StatusPill>
                <div className="flex gap-1">
                  {item.deleted_at ? (
                    <form action={restoreDevotion}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        className="icon-button text-emerald-700"
                        title="Restore"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <Link
                        href={`/devotions/${item.id}/edit`}
                        className="icon-button"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </Link>
                      <form action={duplicateDevotion}>
                        <input type="hidden" name="id" value={item.id} />
                        <button className="icon-button" title="Duplicate">
                          <Copy size={16} />
                        </button>
                      </form>
                      <form action={archiveDevotion}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          className="icon-button text-rose-600"
                          title="Archive"
                        >
                          <Archive size={16} />
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No devotions found"
              description="Try another filter or add the first devotion."
            />
          )}
        </div>
      </section>
    </div>
  );
}

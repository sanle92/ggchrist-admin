import Link from "next/link";
import {
  Archive,
  Copy,
  Edit3,
  Eye,
  FileText,
  Plus,
  Search,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { archiveArticle, duplicateArticle } from "./actions";
import {
  EmptyState,
  PageHeader,
  StatCard,
  StatusPill,
} from "@/components/admin-ui";
import { EngagementMetrics } from "@/components/engagement-metrics";
import { BulkDeleteControls } from "@/components/bulk-delete-controls";
import { bulkDeleteItems } from "@/app/(dashboard)/bulk-actions";

type Props = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    q?: string;
    status?: string;
  }>;
};

export default async function ArticlesPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  let query = supabase
    .from("articles")
    .select(
      "id,title,slug,category,status,view_count,like_count,comment_count,share_count,cover_image_url,is_featured,scheduled_for,updated_at",
    )
    .order("updated_at", { ascending: false });
  if (params.status && params.status !== "all")
    query = query.eq("status", params.status);
  if (params.q) query = query.ilike("title", `%${params.q}%`);
  const { data } = await query;
  const all = data || [];
  const totalViews = all.reduce(
    (sum, item) => sum + Number(item.view_count),
    0,
  );
  const published = all.filter((item) => item.status === "published").length;
  const drafts = all.filter((item) => item.status === "draft").length;

  return (
    <div>
      <PageHeader
        title="Articles"
        description="Create, schedule, publish and measure Gospel-centered content."
        actions={
          <Link
            href="/articles/new"
            className="admin-button admin-button-primary"
          >
            <Plus size={16} /> Add article
          </Link>
        }
      />
      {params.saved ? (
        <div className="admin-notice-success mt-5">
          Article saved successfully.
        </div>
      ) : null}
      {params.error ? (
        <div className="admin-notice-error mt-5">{params.error}</div>
      ) : null}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Visible results"
          value={all.length}
          icon={FileText}
          tone="blue"
        />
        <StatCard label="Published" value={published} icon={Eye} tone="green" />
        <StatCard
          label="Total views"
          value={totalViews.toLocaleString()}
          detail={`${drafts} drafts in this view`}
          icon={Search}
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
            placeholder="Search article title"
          />
        </div>
        <select
          name="status"
          defaultValue={params.status || "all"}
          className="admin-input sm:w-44"
        >
          <option value="all">All statuses</option>
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
          id="bulk-articles"
          action={bulkDeleteItems}
          className="flex justify-end border-b border-admin-border p-3"
        >
          <input type="hidden" name="entity" value="articles" />
          <BulkDeleteControls group="articles" />
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-admin-border bg-admin-bg/70 text-xs text-admin-muted">
              <tr>
                <th className="w-10 px-5 py-3">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-5 py-3 font-semibold">Article</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Engagement</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {all.length ? (
                all.map((article) => (
                  <tr key={article.id} className="hover:bg-admin-bg/50">
                    <td className="px-5 py-3.5">
                      <input
                        type="checkbox"
                        name="ids"
                        value={article.id}
                        form="bulk-articles"
                        data-bulk-group="articles"
                        aria-label={`Select ${article.title}`}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-admin-bg">
                          {article.cover_image_url ? (
                            <img
                              src={article.cover_image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileText size={18} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-sm truncate font-semibold">
                            {article.title}
                          </p>
                          <p className="mt-1 text-xs text-admin-muted">
                            {article.category}
                            {article.is_featured ? " · Featured" : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusPill
                        tone={
                          article.status === "published"
                            ? "green"
                            : article.status === "scheduled"
                              ? "blue"
                              : article.status === "archived"
                                ? "red"
                                : "neutral"
                        }
                      >
                        {article.status}
                      </StatusPill>
                      {article.scheduled_for ? (
                        <p className="mt-1 text-[0.65rem] text-admin-muted">
                          {new Date(article.scheduled_for).toLocaleString()}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5">
                      <EngagementMetrics
                        likes={article.like_count}
                        comments={article.comment_count}
                        shares={article.share_count}
                        views={article.view_count}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-admin-muted">
                      {new Date(article.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/articles/${article.id}/edit`}
                          className="icon-button"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </Link>
                        <form action={duplicateArticle}>
                          <input type="hidden" name="id" value={article.id} />
                          <button className="icon-button" title="Duplicate">
                            <Copy size={16} />
                          </button>
                        </form>
                        <form action={archiveArticle}>
                          <input type="hidden" name="id" value={article.id} />
                          <button
                            className="icon-button text-rose-600"
                            title="Archive"
                          >
                            <Archive size={16} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="No articles found"
                      description="Try another filter or create a new article."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

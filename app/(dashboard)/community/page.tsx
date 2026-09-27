import Link from "next/link";
import {
  Check,
  CircleCheck,
  Eye,
  Flag,
  Heart,
  MessageCircle,
  MessagesSquare,
  Share2,
  ShieldAlert,
  Trash2,
  VolumeX,
  X,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { moderateChat, moderateItem } from "./actions";
import {
  EmptyState,
  PageHeader,
  StatCard,
  StatusPill,
} from "@/components/admin-ui";

export default async function CommunityAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || "forum";
  const { supabase } = await requireAdmin();
  const [postsResult, prayersResult, testimoniesResult, commentsResult, chatResult] =
    await Promise.all([
    supabase
      .from("forum_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("prayer_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("testimonies")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("comments")
      .select("id,body,author_name,status,content_type,created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("live_chat_messages")
      .select(
        "id,message,author_name,is_flagged,is_muted,deleted_at,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const posts = postsResult.data;
  const prayers = prayersResult.data;
  const testimonies = testimoniesResult.data;
  const comments = commentsResult.data;
  const chat = chatResult.data;
  const loadError =
    tab === "forum"
      ? postsResult.error
      : tab === "prayers"
        ? prayersResult.error
        : tab === "testimonies"
          ? testimoniesResult.error
          : tab === "comments"
            ? commentsResult.error
            : chatResult.error;
  const groups = {
    forum: {
      label: "Forum",
      table: "forum_posts",
      rows: posts?.map((x) => ({ ...x, text: x.content })) || [],
    },
    prayers: {
      label: "Prayers",
      table: "prayer_requests",
      rows:
        prayers?.map((x) => ({
          ...x,
          title: x.is_private ? "Private prayer request" : "Prayer request",
          text: x.request,
        })) || [],
    },
    testimonies: {
      label: "Testimonies",
      table: "testimonies",
      rows: testimonies?.map((x) => ({ ...x, text: x.content })) || [],
    },
    comments: {
      label: "Comments",
      table: "comments",
      rows:
        comments?.map((x) => ({
          ...x,
          title: `${x.content_type} comment`,
          text: x.body,
        })) || [],
    },
  };
  const selected = groups[tab as keyof typeof groups] || groups.forum;
  const rows =
    params.status && params.status !== "all"
      ? selected.rows.filter((row) => row.status === params.status)
      : selected.rows;
  const pending = [
    ...(posts || []),
    ...(prayers || []),
    ...(testimonies || []),
    ...(comments || []),
  ].filter((item) => item.status === "pending").length;
  return (
    <div>
      <PageHeader
        title="Community"
        description="Moderate discussions, testimonies, prayer requests, comments and live chat."
      />
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending review"
          value={pending}
          icon={ShieldAlert}
          tone="amber"
        />
        <StatCard
          label="Recent discussions"
          value={posts?.length || 0}
          icon={MessagesSquare}
          tone="blue"
        />
        <StatCard
          label="Flagged chat"
          value={(chat || []).filter((item) => item.is_flagged).length}
          icon={Flag}
          tone="rose"
        />
      </section>
      <nav className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-admin-border bg-white p-1.5">
        {[
          ["forum", "Forum"],
          ["prayers", "Prayers"],
          ["testimonies", "Testimonies"],
          ["comments", "Comments"],
          ["chat", "Live chat"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={`/community?tab=${value}`}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold ${tab === value ? "bg-admin-ink text-white" : "text-admin-muted hover:bg-admin-bg"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {loadError ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p className="font-semibold">This community queue could not be loaded.</p>
          <p className="mt-1">{loadError.message}</p>
          <p className="mt-1 text-xs">Run Migration 013, then refresh this page.</p>
        </div>
      ) : null}
      {tab !== "chat" ? (
        <>
          <form className="mt-4 flex justify-end">
            <input type="hidden" name="tab" value={tab} />
            <select
              name="status"
              defaultValue={params.status || "all"}
              className="admin-input w-44"
              onChange={undefined}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="answered">Answered</option>
            </select>
            <button className="admin-button ml-2 border border-admin-border bg-white">
              Filter
            </button>
          </form>
          <section className="admin-card mt-4 overflow-hidden">
            <div className="divide-y divide-admin-border">
              {rows.length ? (
                rows.map((row: any) => (
                  <article key={row.id} className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">
                            {row.title || (selected.table === "forum_posts" ? "Untitled discussion" : selected.label)}
                          </p>
                          <StatusPill
                            tone={
                              row.status === "approved" ||
                              row.status === "answered"
                                ? "green"
                                : row.status === "rejected"
                                  ? "red"
                                  : "amber"
                            }
                          >
                            {row.status}
                          </StatusPill>
                          {row.is_private ? (
                            <StatusPill tone="red">Private</StatusPill>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-admin-muted">
                          By {row.author_name} ·{" "}
                          {row.category || row.content_type || "General"} ·{" "}
                          {new Date(row.created_at).toLocaleString()}
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-admin-muted">
                          {row.text}
                        </p>
                        {selected.table !== "comments" ? (
                          <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-admin-muted">
                            <span className="inline-flex items-center gap-1.5">
                              <Heart size={14} /> {row.like_count || 0} likes
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <MessageCircle size={14} />{" "}
                              {row.comment_count || 0} comments
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Share2 size={14} /> {row.share_count || 0} shares
                            </span>
                            {typeof row.view_count === "number" ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Eye size={14} /> {row.view_count} views
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <form action={moderateItem} className="flex gap-1">
                        <input
                          type="hidden"
                          name="table"
                          value={selected.table}
                        />
                        <input type="hidden" name="id" value={row.id} />
                        {selected.table === "prayer_requests" ? (
                          <button
                            name="status"
                            value="answered"
                            title="Mark answered"
                            className="icon-button text-blue-700"
                          >
                            <CircleCheck size={17} />
                          </button>
                        ) : null}
                        <button
                          name="status"
                          value="approved"
                          title="Approve"
                          className="icon-button text-emerald-700"
                        >
                          <Check size={17} />
                        </button>
                        <button
                          name="status"
                          value="rejected"
                          title="Reject"
                          className="icon-button text-rose-700"
                        >
                          <X size={17} />
                        </button>
                      </form>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="Queue is clear"
                  description="There are no community items matching this filter."
                />
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="admin-card mt-5 overflow-hidden">
          <div className="divide-y divide-admin-border">
            {chat?.length ? (
              chat.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                    <MessageCircle size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        {item.author_name}
                      </p>
                      {item.is_flagged ? (
                        <StatusPill tone="red">Flagged</StatusPill>
                      ) : null}
                      {item.is_muted ? (
                        <StatusPill tone="amber">Muted</StatusPill>
                      ) : null}
                      {item.deleted_at ? (
                        <StatusPill tone="neutral">Deleted</StatusPill>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-admin-muted">
                      {item.message}
                    </p>
                    <p className="mt-1 text-[0.68rem] text-admin-muted">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <form action={moderateChat} className="flex gap-1">
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      name="action"
                      value={item.is_flagged ? "unflag" : "flag"}
                      className="icon-button text-amber-700"
                      title="Toggle flag"
                    >
                      <Flag size={16} />
                    </button>
                    <button
                      name="action"
                      value={item.is_muted ? "unmute" : "mute"}
                      className="icon-button text-violet-700"
                      title="Toggle mute"
                    >
                      <VolumeX size={16} />
                    </button>
                    <button
                      name="action"
                      value={item.deleted_at ? "restore" : "delete"}
                      className="icon-button text-rose-700"
                      title="Delete or restore"
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>
                </article>
              ))
            ) : (
              <EmptyState
                title="No chat messages"
                description="Live chat messages will appear here when the public chat is active."
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

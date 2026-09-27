import { Save } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { saveDailyFeature } from "./actions";
import { PublishingStatus } from "@/components/publishing-status";
import { EngagementMetrics } from "@/components/engagement-metrics";
import { SeoFields } from "@/components/seo-fields";
export default async function DailyFeaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: items } = await supabase
    .from("daily_features")
    .select("*")
    .order("feature_date", { ascending: false })
    .limit(30);
  const selected = params.id
    ? items?.find((item) => item.id === params.id)
    : undefined;
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Daily Features</h1>
      <p className="mt-1 text-sm text-admin-muted">
        Schedule and publish the verse displayed on the website homepage.
      </p>
      {params.saved ? (
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Daily feature saved.
        </div>
      ) : null}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="admin-card overflow-hidden">
          <div className="border-b border-admin-border px-5 py-4 text-sm font-extrabold">
            Recent features and engagement
          </div>
          <div className="divide-y divide-admin-border">
            {items?.length ? (
              items.map((item) => (
                <a
                  key={item.id}
                  href={`/daily-features?id=${item.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-admin-bg/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {item.verse_book} {item.verse_chapter}
                    </p>
                    <p className="mt-1 truncate text-xs text-admin-muted">
                      {item.featured_verse}
                    </p>
                    <EngagementMetrics
                      likes={item.like_count}
                      comments={item.comment_count}
                      shares={item.share_count}
                    />
                  </div>
                  <span className="text-xs capitalize text-admin-muted">
                    {item.status}
                  </span>
                  <time className="text-xs text-admin-muted">
                    {new Date(item.feature_date).toLocaleDateString()}
                  </time>
                </a>
              ))
            ) : (
              <p className="p-10 text-center text-sm text-admin-muted">
                No daily features yet.
              </p>
            )}
          </div>
        </section>
        <form
          action={saveDailyFeature}
          className="admin-card p-5 xl:sticky xl:top-20 xl:self-start"
        >
          {selected?.id ? (
            <input type="hidden" name="id" value={selected.id} />
          ) : null}
          <h2 className="text-sm font-extrabold">
            {selected ? "Edit feature" : "New feature"}
          </h2>
          {params.error ? (
            <p className="mt-3 text-sm text-red-600">{params.error}</p>
          ) : null}
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              Book
              <input
                name="verseBook"
                defaultValue={selected?.verse_book}
                className="admin-input"
                placeholder="Romans"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Chapter and verse
              <input
                name="verseChapter"
                defaultValue={selected?.verse_chapter}
                className="admin-input"
                placeholder="1:16"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Verse
              <textarea
                name="featuredVerse"
                defaultValue={selected?.featured_verse}
                rows={6}
                className="rounded-lg border border-admin-border p-3 text-sm"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Feature date
              <input
                name="featureDate"
                type="date"
                defaultValue={
                  selected?.feature_date ||
                  new Date().toISOString().slice(0, 10)
                }
                className="admin-input"
                required
              />
            </label>
            <PublishingStatus
              status={selected?.status}
              scheduledFor={selected?.scheduled_for}
            />
            <SeoFields item={selected} />
            <label className="grid gap-2 text-sm font-semibold">
              Background image
              <input
                type="file"
                name="backgroundImage"
                accept="image/*"
                className="text-xs"
              />
            </label>
            <button className="admin-button admin-button-primary">
              <Save size={16} /> Save feature
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

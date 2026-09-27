import Link from "next/link";
import { Save } from "lucide-react";
import { saveArticle } from "@/app/(dashboard)/articles/actions";
import { PublishingStatus } from "@/components/publishing-status";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SeoFields } from "@/components/seo-fields";

export function ArticleForm({
  article,
  error,
}: {
  article?: any;
  error?: string;
}) {
  return (
    <form action={saveArticle} className="grid gap-5 xl:grid-cols-[1fr_340px]">
      {article?.id ? (
        <input type="hidden" name="id" value={article.id} />
      ) : null}
      <div className="grid gap-5">
        <section className="admin-card p-5">
          <h2 className="text-sm font-extrabold">Article details</h2>
          {error ? (
            <div className="admin-notice-error mt-4">{error}</div>
          ) : null}
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              Title
              <input
                name="title"
                defaultValue={article?.title}
                className="admin-input"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Slug
              <input
                name="slug"
                defaultValue={article?.slug}
                className="admin-input"
                placeholder="Generated from title when empty"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Subtitle
              <input
                name="subtitle"
                defaultValue={article?.subtitle}
                className="admin-input"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Excerpt
              <textarea
                name="excerpt"
                defaultValue={article?.excerpt}
                rows={3}
                className="admin-textarea"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Content
              <RichTextEditor name="content" defaultValue={article?.content} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Reading time (minutes)
              <input
                name="readTimeMinutes"
                type="number"
                min="1"
                max="240"
                defaultValue={article?.read_time_minutes || 5}
                className="admin-input"
                required
              />
            </label>
          </div>
        </section>
        <section className="admin-card p-5">
          <h2 className="text-sm font-extrabold">Search appearance</h2>
          <div className="mt-5 grid gap-4">
            <SeoFields item={article} />
          </div>
        </section>
      </div>
      <aside className="grid content-start gap-5 xl:sticky xl:top-20 xl:self-start">
        <section className="admin-card p-5">
          <h2 className="text-sm font-extrabold">Publishing</h2>
          <div className="mt-4 grid gap-4">
            <PublishingStatus
              status={article?.status}
              scheduledFor={article?.scheduled_for}
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={article?.is_featured}
              />{" "}
              Featured article
            </label>
          </div>
        </section>
        <section className="admin-card p-5">
          <h2 className="text-sm font-extrabold">Organization</h2>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              Author
              <input
                name="authorName"
                defaultValue={
                  article?.author_name || "Glorious Gospel of Christ"
                }
                className="admin-input"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Category
              <input
                name="category"
                defaultValue={article?.category || "General"}
                className="admin-input"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Tags
              <input
                name="tags"
                defaultValue={article?.tags?.join(", ")}
                className="admin-input"
                placeholder="faith, prayer, grace"
              />
            </label>
          </div>
        </section>
        <section className="admin-card p-5">
          <h2 className="text-sm font-extrabold">Cover image</h2>
          {article?.cover_image_url ? (
            <img
              src={article.cover_image_url}
              alt=""
              className="mt-4 aspect-video w-full rounded-lg object-cover"
            />
          ) : null}
          <input
            type="file"
            name="coverImage"
            accept="image/*"
            className="mt-4 block w-full text-xs"
          />
        </section>
        <div className="flex gap-2">
          <Link
            href="/articles"
            className="admin-button flex-1 border border-admin-border bg-white"
          >
            Cancel
          </Link>
          <button className="admin-button admin-button-primary flex-1">
            <Save size={16} /> Save
          </button>
        </div>
      </aside>
    </form>
  );
}

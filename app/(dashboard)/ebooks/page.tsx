import Link from "next/link";
import {
  Archive,
  BookOpen,
  CircleDollarSign,
  Save,
  ShoppingBag,
  Star,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import {
  archiveEbook,
  moderateEbookReview,
  saveEbook,
  updateEbookFulfillment,
} from "./actions";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import {
  EmptyState,
  PageHeader,
  StatCard,
  StatusPill,
} from "@/components/admin-ui";
import { PublishingStatus } from "@/components/publishing-status";
import { EbookUploadField } from "@/components/ebook-upload-field";
import { SeoFields } from "@/components/seo-fields";

export default async function EbooksPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string;
    saved?: string;
    error?: string;
    tab?: string;
  }>;
}) {
  const params = await searchParams;
  const tab = params.tab || "library";
  const { supabase } = await requireAdmin();
  const [{ data: books }, { data: purchases }, { data: reviews }] =
    await Promise.all([
      supabase
        .from("ebooks")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase
        .from("ebook_purchases")
        .select(
          "id,buyer_name,buyer_email,buyer_phone,amount_minor,currency,status,provider,provider_reference,payment_intent_id,fulfillment_type,fulfillment_status,shipping_address,download_count,last_downloaded_at,created_at,paid_at,ebooks(title)",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("ebook_reviews")
        .select(
          "id,reviewer_name,rating,title,comment,status,verified_purchase,created_at,ebooks(title)",
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
  const selected = params.id
    ? books?.find((item) => item.id === params.id)
    : undefined;
  const successful = (purchases || []).filter(
    (item) => item.status === "successful",
  );
  const sales =
    successful.reduce((sum, item) => sum + Number(item.amount_minor), 0) / 100;
  const currency = successful[0]?.currency || books?.[0]?.currency || "USD";

  return (
    <div>
      <PageHeader
        title="Ebooks"
        description="Manage the catalogue, protected files, purchases and customer reviews."
      />
      {params.saved ? (
        <div className="admin-notice-success mt-5">
          Ebook saved successfully.
        </div>
      ) : null}
      {params.error ? (
        <div className="admin-notice-error mt-5">{params.error}</div>
      ) : null}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Books"
          value={books?.length || 0}
          icon={BookOpen}
          tone="blue"
        />
        <StatCard
          label="Paid orders"
          value={successful.length}
          icon={ShoppingBag}
          tone="green"
        />
        <StatCard
          label="Ebook revenue"
          value={`${currency} ${sales.toLocaleString()}`}
          icon={CircleDollarSign}
          tone="purple"
        />
        <StatCard
          label="Pending reviews"
          value={
            (reviews || []).filter((item) => item.status === "pending").length
          }
          icon={Star}
          tone="amber"
        />
      </section>
      <nav className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-admin-border bg-white p-1.5">
        {[
          ["library", "Catalogue"],
          ["purchases", "Purchases"],
          ["reviews", "Reviews"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={`/ebooks?tab=${value}`}
            className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === value ? "bg-admin-ink text-white" : "text-admin-muted hover:bg-admin-bg"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === "library" ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_430px]">
          <section className="admin-card overflow-hidden">
            <div className="divide-y divide-admin-border">
              {books?.length ? (
                books.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4">
                    <Link
                      href={`/ebooks?tab=library&id=${item.id}`}
                      className="flex min-w-0 flex-1 items-center gap-4"
                    >
                      <span className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-admin-bg shadow-sm">
                        {item.cover_image_url ? (
                          <img
                            src={item.cover_image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <BookOpen size={20} />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-xs text-admin-muted">
                          {item.author} · {item.format} · {item.currency}{" "}
                          {(item.price_minor / 100).toLocaleString()}
                        </span>
                        <span className="mt-1 block text-[0.68rem] text-admin-muted">
                          {item.sales_count} sales ·{" "}
                          {Number(item.rating).toFixed(1)} rating{" "}
                          {item.file_path ? "· File ready" : "· No file"}
                        </span>
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
                    <form action={archiveEbook}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        className="icon-button text-rose-600"
                        title="Archive"
                      >
                        <Archive size={16} />
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No ebooks yet"
                  description="Add your first title using the form."
                />
              )}
            </div>
          </section>
          <EbookForm selected={selected} error={params.error} />
        </div>
      ) : null}
      {tab === "purchases" ? (
        <PurchasesTable purchases={purchases || []} />
      ) : null}
      {tab === "reviews" ? (
        <section className="admin-card mt-5 overflow-hidden">
          <div className="divide-y divide-admin-border">
            {reviews?.length ? (
              reviews.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {item.title ||
                          (item.ebooks as unknown as { title: string } | null)
                            ?.title ||
                          "Ebook review"}
                      </p>
                      <span className="text-sm text-amber-500">
                        {"★".repeat(item.rating)}
                      </span>
                      {item.verified_purchase ? (
                        <StatusPill tone="blue">Verified purchase</StatusPill>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-admin-muted">
                      {item.comment}
                    </p>
                    <p className="mt-2 text-[0.7rem] text-admin-muted">
                      {item.reviewer_name} ·{" "}
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill
                      tone={
                        item.status === "approved"
                          ? "green"
                          : item.status === "rejected"
                            ? "red"
                            : "amber"
                      }
                    >
                      {item.status}
                    </StatusPill>
                    {item.status === "pending" ? (
                      <>
                        <form action={moderateEbookReview}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="status" value="approved" />
                          <button className="admin-button border border-admin-border bg-white">
                            Approve
                          </button>
                        </form>
                        <form action={moderateEbookReview}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="status" value="rejected" />
                          <button className="admin-button text-rose-700">
                            Reject
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No reviews yet"
                description="Customer reviews will appear here for moderation."
              />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PurchasesTable({ purchases }: { purchases: any[] }) {
  return (
    <section className="admin-card mt-5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="border-b border-admin-border bg-admin-bg/70 text-xs text-admin-muted">
            <tr>
              <th className="px-5 py-3">Buyer</th>
              <th className="px-5 py-3">Book</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3">Fulfillment</th>
              <th className="px-5 py-3">Delivery details</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {purchases.length ? (
              purchases.map((item) => {
                const shipping = item.shipping_address as Record<
                  string,
                  any
                > | null;
                const address = shipping?.address || shipping;
                return (
                  <tr key={item.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{item.buyer_name}</p>
                      <p className="text-xs text-admin-muted">
                        {item.buyer_email}
                      </p>
                      {item.buyer_phone ? (
                        <p className="text-xs text-admin-muted">
                          {item.buyer_phone}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      {(item.ebooks as unknown as { title: string } | null)
                        ?.title || "Book"}
                      <p className="mt-1 text-xs capitalize text-admin-muted">
                        {item.fulfillment_type}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-bold">
                      {item.currency}{" "}
                      {(item.amount_minor / 100).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill
                        tone={
                          item.status === "successful"
                            ? "green"
                            : item.status === "failed"
                              ? "red"
                              : "amber"
                        }
                      >
                        {item.status}
                      </StatusPill>
                      <p className="mt-1 max-w-40 truncate text-[0.65rem] text-admin-muted">
                        {item.provider_reference || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <form action={updateEbookFulfillment}>
                        <input type="hidden" name="id" value={item.id} />
                        <AutoSubmitSelect
                          name="fulfillmentStatus"
                          value={item.fulfillment_status}
                          options={[
                            { value: "pending", label: "Pending" },
                            { value: "ready", label: "Ready" },
                            { value: "processing", label: "Processing" },
                            { value: "shipped", label: "Shipped" },
                            { value: "delivered", label: "Delivered" },
                            { value: "cancelled", label: "Cancelled" },
                            { value: "refunded", label: "Refunded" },
                          ]}
                        />
                      </form>
                    </td>
                    <td className="px-5 py-4 text-xs text-admin-muted">
                      {item.fulfillment_type === "digital" ? (
                        <>
                          <p>{item.download_count || 0} downloads</p>
                          <p>
                            {item.last_downloaded_at
                              ? `Last: ${new Date(item.last_downloaded_at).toLocaleString()}`
                              : "Not downloaded"}
                          </p>
                        </>
                      ) : (
                        <p className="max-w-52 leading-5">
                          {address
                            ? [
                                address.line1,
                                address.line2,
                                address.city,
                                address.state,
                                address.postal_code,
                                address.country,
                              ]
                                .filter(Boolean)
                                .join(", ")
                            : "Address pending Stripe confirmation"}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-admin-muted">
                      {new Date(
                        item.paid_at || item.created_at,
                      ).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    title="No purchases yet"
                    description="Verified ebook purchases will appear here."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EbookForm({ selected, error }: { selected?: any; error?: string }) {
  return (
    <form
      action={saveEbook}
      className="admin-card p-5 xl:sticky xl:top-20 xl:self-start"
    >
      {selected?.id ? (
        <input type="hidden" name="id" value={selected.id} />
      ) : null}
      <h2 className="text-sm font-extrabold">
        {selected ? "Edit ebook" : "Add ebook"}
      </h2>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
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
        <div className="grid grid-cols-2 gap-2">
          <input
            name="author"
            defaultValue={selected?.author}
            className="admin-input"
            placeholder="Author"
            required
          />
          <input
            name="authorCountry"
            defaultValue={selected?.author_country}
            className="admin-input"
            placeholder="Author country"
          />
        </div>
        <textarea
          name="authorBio"
          defaultValue={selected?.author_bio}
          rows={2}
          className="admin-textarea"
          placeholder="Author bio"
        />
        <textarea
          name="description"
          defaultValue={selected?.description}
          rows={5}
          className="admin-textarea"
          placeholder="Description"
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            name="category"
            defaultValue={selected?.category || "General"}
            className="admin-input"
            placeholder="Category"
            required
          />
          <input
            name="tags"
            defaultValue={selected?.tags?.join(", ")}
            className="admin-input"
            placeholder="Tags, comma separated"
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={selected ? selected.price_minor / 100 : 0}
            className="admin-input"
            placeholder="Price"
          />
          <input
            name="originalPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={
              selected?.original_price_minor
                ? selected.original_price_minor / 100
                : ""
            }
            className="admin-input"
            placeholder="Was price"
          />
          <input
            name="shippingPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={
              selected ? Number(selected.shipping_amount_minor || 0) / 100 : 0
            }
            className="admin-input"
            placeholder="Shipping"
            title="Shipping price for paperback or hardcover"
          />
          <input
            name="currency"
            value="USD"
            readOnly
            maxLength={3}
            className="admin-input"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select
            name="format"
            defaultValue={selected?.format || "PDF"}
            className="admin-input"
          >
            <option>PDF</option>
            <option>EPUB</option>
            <option>MOBI</option>
            <option>Paperback</option>
            <option>Hardcover</option>
          </select>
          <input
            name="pages"
            type="number"
            min="1"
            defaultValue={selected?.pages}
            className="admin-input"
            placeholder="Pages"
          />
          <input
            name="language"
            defaultValue={selected?.language || "English"}
            className="admin-input"
            placeholder="Language"
          />
        </div>
        <input
          name="previewUrl"
          type="url"
          defaultValue={selected?.preview_url}
          className="admin-input"
          placeholder="Preview URL (optional)"
        />
        <PublishingStatus
          status={selected?.status}
          scheduledFor={selected?.scheduled_for}
        />
        <SeoFields item={selected} />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={selected?.is_featured}
          />{" "}
          Featured
        </label>
        <label className="grid gap-2 text-xs font-semibold">
          Cover image
          <input type="file" name="cover" accept="image/*" />
        </label>
        <EbookUploadField existingPath={selected?.file_path} />
        <p className="text-[0.7rem] leading-5 text-admin-muted">
          Digital books require a private file before checkout. Paperback and
          hardcover orders use the shipping price above and collect the address
          securely in Stripe.
        </p>
        <button className="admin-button admin-button-primary">
          <Save size={16} /> Save ebook
        </button>
      </div>
    </form>
  );
}

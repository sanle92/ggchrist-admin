import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
export default async function Campaigns() {
  const { supabase } = await requireRole(["finance_manager"]);
  const { data: rows, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  return (
    <div>
      <Link href="/donations">← Donations</Link>
      <div className="my-5 flex flex-wrap justify-between gap-4">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link
          href="/finance?tab=campaigns"
          className="admin-button admin-button-primary"
        >
          Create campaign
        </Link>
      </div>
      {error ? <p>Campaigns could not be loaded.</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {rows?.map((c) => {
          const money = (n: number) =>
              new Intl.NumberFormat("en", {
                style: "currency",
                currency: c.currency,
              }).format(n / 100),
            percent = Math.min(
              100,
              Math.round(
                (c.raised_amount_minor / Math.max(1, c.target_amount_minor)) *
                  100,
              ),
            );
          return (
            <article key={c.id} className="admin-card p-5">
              <h2 className="text-lg font-semibold">{c.title}</h2>
              <p className="mt-2 text-sm">
                {c.status}
                {c.featured ? " · Featured" : ""}
              </p>
              <p className="mt-3 text-sm text-admin-muted">
                {c.short_description || c.description}
              </p>
              <progress
                className="mt-4 h-2 w-full accent-emerald-700"
                value={percent}
                max={100}
                aria-label={`${c.title} progress`}
              />
              <p className="mt-2 text-sm">
                {money(c.raised_amount_minor)} of {money(c.target_amount_minor)}{" "}
                · {percent}%
              </p>
              <p className="mt-2 text-sm">
                {c.donor_count} donors · {c.donation_count} gifts · Average{" "}
                {money(
                  c.donation_count
                    ? c.raised_amount_minor / c.donation_count
                    : 0,
                )}
              </p>
              <p className="mt-3 break-all text-xs">
                /donate?campaign={c.slug}
              </p>
              <Link
                href={`/finance?tab=campaigns&campaign=${c.id}`}
                className="admin-button admin-button-secondary mt-4"
              >
                Edit campaign
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

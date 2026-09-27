import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
export default async function Partners({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const p = await searchParams,
    page = Math.max(1, Number(p.page) || 1),
    { supabase } = await requireRole(["finance_manager"]);
  const {
    data: rows,
    count,
    error,
  } = await supabase
    .from("donation_subscriptions")
    .select("*,campaigns(title)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  const { data: totals } = rows?.length
    ? await supabase
        .from("giving_partner_totals")
        .select("*")
        .in(
          "subscription_id",
          rows.map((s) => s.id),
        )
    : { data: [] };
  return (
    <div>
      <Link href="/donations">← Donations</Link>
      <h1 className="my-5 text-2xl font-bold">Monthly Partners</h1>
      <p className="mb-5 text-sm text-admin-muted">
        Statuses sync from Stripe. Manage subscriptions in Stripe to keep
        billing and ministry records consistent.
      </p>
      {error ? <p>Could not load monthly partners.</p> : null}
      <div className="admin-card overflow-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr>
              {[
                "Donor",
                "Monthly amount",
                "Purpose",
                "Campaign",
                "Lifetime giving",
                "Started",
                "Next billing",
                "Status",
                "Manage",
              ].map((v) => (
                <th className="p-4" key={v}>
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows?.map((s) => (
              <tr key={s.id} className="border-t border-admin-border">
                <td className="p-4">
                  {s.donor_name}
                  <br />
                  {s.donor_email}
                </td>
                <td className="p-4">
                  {s.currency} {(s.amount_minor / 100).toLocaleString()}
                </td>
                <td className="p-4">{s.purpose}</td>
                <td className="p-4">{s.campaigns?.title || "—"}</td>
                <td className="p-4">
                  {totals
                    ?.filter((t) => t.subscription_id === s.id)
                    .map((t) => (
                      <p key={t.currency}>
                        {t.currency} {(t.amount_minor / 100).toLocaleString()}
                      </p>
                    ))}
                </td>
                <td className="p-4">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
                <td className="p-4">
                  {s.next_payment_at
                    ? new Date(s.next_payment_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="p-4">{s.status}</td>
                <td className="p-4">
                  {s.stripe_subscription_id ? (
                    <a
                      className="underline"
                      href={`https://dashboard.stripe.com/subscriptions/${s.stripe_subscription_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Stripe
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex gap-5">
        {page > 1 ? <Link href={`?page=${page - 1}`}>Previous</Link> : null}
        {(count || 0) > page * 50 ? (
          <Link href={`?page=${page + 1}`}>Next</Link>
        ) : null}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin-auth";
export default async function Donor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    { supabase: db } = await requireRole(["finance_manager"]);
  if (!/^[a-f\d-]{36}$/i.test(id)) notFound();
  const { data: d } = await db
    .from("donations")
    .select("donor_name,donor_email,donor_phone,country")
    .eq("id", id)
    .maybeSingle();
  if (!d) notFound();
  const [history, totals, subscriptions] = await Promise.all([
    db
      .from("donations")
      .select(
        "id,reference,amount_minor,currency,status,created_at,campaigns(title)",
      )
      .ilike("donor_email", d.donor_email.replace(/[\\%_]/g, "\\$&"))
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("giving_donors")
      .select("*")
      .eq("email", d.donor_email.toLowerCase()),
    db
      .from("donation_subscriptions")
      .select("id,amount_minor,currency,status")
      .ilike("donor_email", d.donor_email.replace(/[\\%_]/g, "\\$&")),
  ]);
  return (
    <div>
      <Link href="/donations/donors">← Donors</Link>
      <h1 className="mt-5 text-2xl font-bold">{d.donor_name}</h1>
      <p className="mt-2 text-sm">
        {d.donor_email} · {d.donor_phone || "No phone"} ·{" "}
        {d.country || "Country not provided"}
      </p>
      <div className="my-5 grid gap-3 sm:grid-cols-2">
        {totals.data?.map((t) => (
          <div key={t.currency} className="admin-card p-5">
            <p className="text-2xl font-bold">
              {t.currency} {(t.total_minor / 100).toLocaleString()}
            </p>
            <p className="mt-2 text-sm">
              {t.donation_count} gifts · First{" "}
              {new Date(t.first_gift).toLocaleDateString()} · Latest{" "}
              {new Date(t.latest_gift).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
      <section className="admin-card p-5">
        <h2 className="font-semibold">Subscriptions</h2>
        {subscriptions.data?.map((s) => (
          <p className="mt-3" key={s.id}>
            {s.currency} {(s.amount_minor / 100).toLocaleString()} monthly ·{" "}
            {s.status}
          </p>
        ))}
      </section>
      <section className="admin-card mt-5 p-5">
        <h2 className="font-semibold">Latest 50 gifts and receipts</h2>
        {history.data?.map((g: any) => (
          <Link
            key={g.id}
            href={`/donations/${g.id}`}
            className="mt-4 flex flex-wrap justify-between gap-3 border-b border-admin-border pb-3 text-sm"
          >
            <span>
              {g.reference} · {g.campaigns?.title || "Ministry support"}
            </span>
            <span>
              {g.currency} {(g.amount_minor / 100).toLocaleString()} ·{" "}
              {g.status}
            </span>
          </Link>
        ))}
        <Link
          className="mt-5 inline-block underline"
          href={`/donations?q=${encodeURIComponent(d.donor_email)}&start=2000-01-01`}
        >
          Search all giving history by currency
        </Link>
      </section>
    </div>
  );
}

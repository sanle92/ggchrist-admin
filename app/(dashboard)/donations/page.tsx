import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import { MiniLineChart } from "@/components/mini-line-chart";
import { PageHeader } from "@/components/admin-ui";
export const dynamic = "force-dynamic";
const money = (v: number, c: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency: c }).format(
    v / 100,
  );
export default async function Donations({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams,
    { supabase: db } = await requireRole(["finance_manager"]);
  const currency = ["USD", "UGX", "EUR", "GBP"].includes(p.currency || "")
    ? p.currency!
    : "USD";
  const days = ["7", "30", "90"].includes(p.range || "") ? Number(p.range) : 30;
  const validDate = (s: string | undefined) =>
    s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
      ? s
      : null;
  const start =
    validDate(p.start) ||
    (p.range === "year"
      ? `${new Date().getUTCFullYear()}-01-01`
      : new Date(Date.now() - days * 86400000).toISOString().slice(0, 10));
  const end =
    validDate(p.end) ||
    new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const page = Math.max(1, Math.min(100000, Number(p.page) || 1));
  let query = db
    .from("donations")
    .select(
      "id,reference,donor_name,donor_email,amount_minor,refunded_amount,currency,purpose,frequency,status,provider,created_at,campaigns(title)",
      { count: "exact" },
    )
    .eq("currency", currency)
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  if (
    ["pending", "processing", "successful", "failed", "refunded"].includes(
      p.status || "",
    )
  )
    query = query.eq("status", p.status!);
  if (p.frequency === "monthly" || p.frequency === "one_time")
    query = query.eq("frequency", p.frequency);
  if (p.purpose) query = query.eq("purpose", p.purpose);
  if (p.campaign && /^[a-f\d-]{36}$/i.test(p.campaign))
    query = query.eq("campaign_id", p.campaign);
  const search = (p.q || "").replace(/[^\p{L}\p{N}@._ -]/gu, "").slice(0, 100);
  if (search)
    query = query.or(
      `donor_name.ilike.%${search}%,donor_email.ilike.%${search}%,reference.ilike.%${search}%,provider_transaction_id.ilike.%${search}%`,
    );
  const [
    gifts,
    summary,
    trend,
    partners,
    campaigns,
    breakdown,
    purposes,
    currencyTotals,
  ] = await Promise.all([
    query,
    db.rpc("giving_summary", {
      p_currency: currency,
      p_start: start,
      p_end: end,
    }),
    db
      .from("giving_daily")
      .select("*")
      .eq("currency", currency)
      .gte("day", start)
      .lt("day", end)
      .order("day"),
    db
      .from("donation_subscriptions")
      .select("id", { head: true, count: "exact" })
      .eq("status", "active"),
    db.from("campaigns").select("id,title,status"),
    db.from("giving_breakdown").select("*").eq("currency", currency),
    db.from("donation_purposes").select("name"),
    db.from("giving_currencies").select("*"),
  ]);
  const s = summary.data || {};
  return (
    <div>
      <PageHeader
        title="Donations"
        description="Verified giving, monthly partnerships and campaign support."
      />
      <nav className="my-5 flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/donations">Donations</Link>
        <Link href="/donations/donors">Donors</Link>
        <Link href="/donations/monthly-partners">Monthly Partners</Link>
        <Link href="/donations/campaigns">Campaigns</Link>
        <Link href="/donations/purposes">Giving purposes</Link>
      </nav>
      <form className="admin-card grid gap-3 p-4 sm:grid-cols-3 xl:grid-cols-5">
        <input
          name="q"
          defaultValue={p.q}
          aria-label="Search donors, reference or Stripe payment"
          placeholder="Search name, email, reference…"
          className="admin-input"
        />
        <select
          name="currency"
          defaultValue={currency}
          aria-label="Currency"
          className="admin-input"
        >
          {["USD", "UGX", "EUR", "GBP"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          name="range"
          defaultValue={p.range || "30"}
          aria-label="Date period"
          className="admin-input"
        >
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="year">This year</option>
          <option value="custom">Custom dates</option>
        </select>
        <label className="text-xs">
          From
          <input
            name="start"
            type="date"
            defaultValue={p.start}
            className="admin-input"
          />
        </label>
        <label className="text-xs">
          Before
          <input
            name="end"
            type="date"
            defaultValue={p.end}
            className="admin-input"
          />
        </label>
        <select
          name="status"
          defaultValue={p.status}
          aria-label="Status"
          className="admin-input"
        >
          <option value="">All statuses</option>
          {["pending", "processing", "successful", "failed", "refunded"].map(
            (v) => (
              <option key={v}>{v}</option>
            ),
          )}
        </select>
        <select
          name="frequency"
          defaultValue={p.frequency}
          aria-label="Frequency"
          className="admin-input"
        >
          <option value="">All frequencies</option>
          <option value="one_time">One-time</option>
          <option value="monthly">Monthly</option>
        </select>
        <select
          name="purpose"
          defaultValue={p.purpose}
          aria-label="Purpose"
          className="admin-input"
        >
          <option value="">All purposes</option>
          {purposes.data?.map((v) => (
            <option key={v.name}>{v.name}</option>
          ))}
        </select>
        <select
          name="campaign"
          defaultValue={p.campaign}
          aria-label="Campaign"
          className="admin-input"
        >
          <option value="">All campaigns</option>
          {campaigns.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <button className="admin-button admin-button-primary">
          Apply filters
        </button>
      </form>
      {gifts.error || summary.error ? (
        <p className="admin-notice-error mt-4">
          Donation data could not be loaded. Check that migration 015 has been
          applied.
        </p>
      ) : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Total giving", money(s.total || 0, currency)],
          ["This month in range", money(s.month || 0, currency)],
          ["Today in range", money(s.today || 0, currency)],
          ["Monthly Partners (all currencies)", partners.count || 0],
          ["Average gift", money(s.average || 0, currency)],
          [
            "Active campaigns",
            campaigns.data?.filter((c) => c.status === "active").length || 0,
          ],
        ].map(([label, value]) => (
          <div className="admin-card p-5" key={label}>
            <p className="text-xs text-admin-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <p className="my-4 text-xs text-admin-muted">
        Summary and trend: {currency}, {start} to {end} (exclusive). Other
        filters apply to the table. Gross: {money(s.gross || 0, currency)} ·
        Refunds: {money(s.refunded || 0, currency)} · Known Stripe fees:{" "}
        {s.fees == null ? "Unavailable" : money(s.fees, currency)} (
        {s.fees_count || 0} gifts). Settlement fees in other currencies are
        excluded.
      </p>
      <section className="admin-card mb-5 p-5">
        <h2 className="font-semibold">Giving by currency · lifetime</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {currencyTotals.data?.map((c) => (
            <div key={c.currency}>
              <p className="font-semibold">
                {money(c.amount_minor, c.currency)}
              </p>
              <p className="text-xs text-admin-muted">{c.gifts} gifts</p>
            </div>
          ))}
        </div>
      </section>
      <section className="admin-card p-5">
        <h2 className="mb-4 font-semibold">Donations over time</h2>
        <MiniLineChart
          data={(trend.data || []).map((d) => ({
            label: d.day,
            value: d.amount_minor / 100,
          }))}
        />
      </section>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {[
          ["Purpose", "purpose"],
          ["One-time vs monthly", "frequency"],
        ].map(([label, key]) => {
          const totals: Record<string, number> = {};
          for (const d of breakdown.data || [])
            totals[(d as any)[key]] =
              (totals[(d as any)[key]] || 0) + Number(d.amount_minor);
          const max = Math.max(1, ...Object.values(totals));
          return (
            <section key={key} className="admin-card p-5">
              <h2 className="font-semibold">
                {label} · lifetime {currency}
              </h2>
              {Object.entries(totals).map(([name, n]) => (
                <div key={name} className="mt-4 text-xs">
                  <div className="flex justify-between gap-2">
                    <span>{name.replaceAll("_", " ")}</span>
                    <span>{money(n, currency)}</span>
                  </div>
                  <progress
                    className="mt-2 h-2 w-full accent-emerald-700"
                    value={n}
                    max={max}
                    aria-label={name}
                  />
                </div>
              ))}
            </section>
          );
        })}
      </div>
      <div className="admin-card mt-5 overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead>
            <tr>
              {[
                "Reference",
                "Donor",
                "Amount",
                "Purpose",
                "Frequency",
                "Campaign",
                "Provider",
                "Status",
                "Date",
              ].map((h) => (
                <th className="p-4" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gifts.data?.map((d: any) => (
              <tr key={d.id} className="border-t border-admin-border">
                <td className="p-4">
                  <Link
                    className="font-semibold underline"
                    href={`/donations/${d.id}`}
                  >
                    {d.reference || d.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="p-4">
                  {d.donor_name}
                  <br />
                  <span className="text-admin-muted">{d.donor_email}</span>
                </td>
                <td className="p-4">{money(d.amount_minor, d.currency)}</td>
                <td className="p-4">{d.purpose}</td>
                <td className="p-4">{d.frequency}</td>
                <td className="p-4">{d.campaigns?.title || "—"}</td>
                <td className="p-4">{d.provider}</td>
                <td className="p-4">
                  {d.refunded_amount > 0 && d.status !== "refunded"
                    ? "Partially refunded"
                    : d.status}
                </td>
                <td className="p-4">
                  {new Date(d.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!gifts.data?.length ? (
          <p className="p-6">No gifts match these filters.</p>
        ) : null}
      </div>
      <div className="mt-5 flex justify-between text-sm">
        <span>
          {gifts.count || 0} results · Page {page}
        </span>
        {page > 1 ? (
          <Link
            href={`?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Record<string, string>), page: String(page - 1) })}`}
          >
            Previous
          </Link>
        ) : null}
        {(gifts.count || 0) > page * 50 ? (
          <Link
            href={`?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Record<string, string>), page: String(page + 1) })}`}
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

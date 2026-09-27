import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin-auth";
import { refundGift } from "../actions";
export default async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params,
    p = await searchParams,
    { supabase: db } = await requireRole(["finance_manager"]);
  if (!/^[a-f\d-]{36}$/i.test(id)) notFound();
  const { data: d } = await db
    .from("donations")
    .select("*,campaigns(title),donation_receipts(*)")
    .eq("id", id)
    .maybeSingle();
  if (!d) notFound();
  const { data: events } = await db
    .from("payment_events")
    .select("event_type,received_at,processed")
    .eq(
      "provider_reference",
      d.stripe_subscription_id ||
        d.provider_transaction_id ||
        d.provider_reference,
    )
    .order("received_at");
  const money = (n: number, c = d.currency) =>
    new Intl.NumberFormat("en", { style: "currency", currency: c }).format(
      n / 100,
    );
  const sections: Record<string, Record<string, unknown>> = {
    Donation: {
      Reference: d.reference,
      Amount: money(d.amount_minor),
      Purpose: d.purpose,
      Frequency: d.frequency,
      Status:
        d.refunded_amount && d.status !== "refunded"
          ? "Partially refunded"
          : d.status,
      Date: d.created_at,
    },
    Donor: {
      Name: d.donor_name,
      Email: d.donor_email,
      Phone: d.donor_phone,
      Country: d.country,
      Anonymous: d.is_anonymous ? "Yes" : "No",
    },
    Payment: {
      Provider: d.provider,
      "Payment Intent": d.provider_transaction_id,
      "Stripe customer": d.stripe_customer_id,
      "Processing contribution": money(d.processing_contribution),
      "Stripe fee":
        d.processing_fee == null
          ? "Not yet available"
          : money(d.processing_fee, d.fee_currency),
      "Settlement net":
        d.net_amount == null
          ? "Not yet available"
          : money(d.net_amount, d.fee_currency),
      "Refunded amount": money(d.refunded_amount),
    },
    Campaign: { Title: d.campaigns?.title },
    Dedication: {
      Type: d.dedication_type,
      Name: d.dedication_name,
      Message: d.dedication_message,
    },
    "Private Prayer Request": {
      Request: d.prayer_request,
      "Prayer team requested": d.prayer_team_requested ? "Yes" : "No",
    },
  };
  return (
    <div>
      <Link href="/donations" className="text-sm underline">
        ← Donations
      </Link>
      <h1 className="mt-4 text-2xl font-bold">
        {d.reference || "Donation details"}
      </h1>
      {p.error ? <p className="admin-notice-error mt-4">{p.error}</p> : null}
      {p.saved ? (
        <p className="admin-notice-success mt-4">
          Refund requested. The status updates when Stripe confirms it.
        </p>
      ) : null}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {Object.entries(sections).map(([name, fields]) => (
          <section key={name} className="admin-card p-5">
            <h2 className="font-semibold">{name}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {Object.entries(fields).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[1fr_2fr] gap-4">
                  <dt className="text-admin-muted">{k}</dt>
                  <dd className="break-words whitespace-pre-wrap">
                    {v == null ? "—" : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <div className="my-5 flex flex-wrap gap-3">
        <a
          className="admin-button admin-button-secondary"
          href={`mailto:${encodeURIComponent(d.donor_email)}`}
        >
          Contact Donor
        </a>
        {d.provider_transaction_id?.startsWith("pi_") ? (
          <a
            className="admin-button admin-button-secondary"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://dashboard.stripe.com/payments/${d.provider_transaction_id}`}
          >
            View Stripe Payment
          </a>
        ) : null}
        {d.paid_at ? (
          <a
            href={`/api/donations/${d.id}/receipt`}
            className="admin-button admin-button-secondary"
          >
            Receipt
          </a>
        ) : null}
      </div>
      {d.status === "successful" &&
      d.provider === "stripe" &&
      d.provider_transaction_id?.startsWith("pi_") ? (
        <form action={refundGift} className="admin-card max-w-xl p-5">
          <h2 className="font-semibold">Request a refund through Stripe</h2>
          <p className="my-3 text-sm">
            Available: {money(d.amount_minor - d.refunded_amount)}. Confirm the
            amount carefully before requesting a refund.
          </p>
          <input type="hidden" name="id" value={d.id} />
          <input type="hidden" name="requestId" value={crypto.randomUUID()} />
          <label className="text-sm">
            Refund amount ({d.currency})
            <input
              name="amount"
              type="number"
              min={d.currency === "UGX" ? "1" : "0.01"}
              step={d.currency === "UGX" ? "1" : "0.01"}
              max={(d.amount_minor - d.refunded_amount) / 100}
              required
              className="admin-input mt-2"
            />
          </label>
          <button className="admin-button admin-button-primary mt-3">
            Request refund
          </button>
        </form>
      ) : null}
      <section className="admin-card mt-5 p-5">
        <h2 className="font-semibold">Timeline</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>{d.created_at} · Gift created</li>
          {d.paid_at ? <li>{d.paid_at} · Payment confirmed</li> : null}
          {d.email_sent_at ? (
            <li>{d.email_sent_at} · Receipt emailed</li>
          ) : null}
          {d.refunded_at ? <li>{d.refunded_at} · Refund confirmed</li> : null}
          {events?.map((e) => (
            <li key={`${e.event_type}${e.received_at}`}>
              {e.received_at} · {e.event_type} (
              {e.processed ? "processed" : "pending"})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

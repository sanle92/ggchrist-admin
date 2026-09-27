import Link from "next/link";
import {
  CircleDollarSign,
  Download,
  HandCoins,
  PlusCircle,
  ReceiptText,
  Repeat2,
  TrendingUp,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { saveCampaign, saveExpense, updateSubscriptionStatus } from "./actions";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import {
  EmptyState,
  PageHeader,
  StatCard,
  StatusPill,
} from "@/components/admin-ui";
import { MiniLineChart } from "@/components/mini-line-chart";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    tab?: string;
    campaign?: string;
    expense?: string;
  }>;
}) {
  const params = await searchParams;
  const tab = params.tab || "overview";
  const { supabase } = await requireAdmin();
  const [
    { data: donations },
    { data: campaigns },
    { data: expenses },
    { data: subscriptions },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("donations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .limit(500),
    supabase
      .from("donation_subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("site_settings").select("default_currency").maybeSingle(),
  ]);
  const currency = settings?.default_currency || "USD";
  const successful = (donations || []).filter(
    (item) => item.status === "successful" && item.currency === currency,
  );
  const approvedExpenses = (expenses || []).filter(
    (item) => item.status === "approved" && item.currency === currency,
  );
  const raised =
    successful.reduce((sum, item) => sum + Number(item.amount_minor), 0) / 100;
  const spent =
    approvedExpenses.reduce((sum, item) => sum + Number(item.amount_minor), 0) /
    100;
  const activeRecurring = (subscriptions || []).filter(
    (item) => item.status === "active",
  ).length;
  const selectedCampaign = campaigns?.find(
    (item) => item.id === params.campaign,
  );
  const selectedExpense = expenses?.find((item) => item.id === params.expense);
  const dayMap = new Map<string, number>();
  successful.forEach((item) => {
    const day = item.created_at.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) || 0) + item.amount_minor / 100);
  });
  const trend = [...dayMap.entries()]
    .sort()
    .slice(-30)
    .map(([day, value]) => ({
      label: new Date(`${day}T00:00:00`).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
      }),
      value,
    }));
  return (
    <div>
      <PageHeader
        title="Finance"
        description="Stripe donations, recurring support, campaigns, expenses and ministry net funds."
        actions={
          <Link
            href="/api/finance/export"
            className="admin-button admin-button-secondary"
          >
            <Download size={15} /> Export CSV
          </Link>
        }
      />
      {params.saved ? (
        <div className="admin-notice-success mt-5">
          Finance record saved successfully.
        </div>
      ) : null}
      {params.error ? (
        <div className="admin-notice-error mt-5">{params.error}</div>
      ) : null}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Raised (${currency})`}
          value={raised.toLocaleString()}
          detail={`${successful.length} verified donations`}
          icon={HandCoins}
          tone="green"
        />
        <StatCard
          label={`Expenses (${currency})`}
          value={spent.toLocaleString()}
          detail="Approved records only"
          icon={ReceiptText}
          tone="rose"
        />
        <StatCard
          label={`Net funds (${currency})`}
          value={(raised - spent).toLocaleString()}
          detail="Raised less approved expenses"
          icon={TrendingUp}
          tone="blue"
        />
        <StatCard
          label="Active recurring"
          value={activeRecurring}
          icon={Repeat2}
          tone="purple"
        />
      </section>
      <p className="mt-3 text-[0.7rem] text-admin-muted">
        Totals are shown only in the default currency ({currency}) to avoid
        combining unlike currencies.
      </p>
      <nav className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-admin-border bg-white p-1.5">
        {[
          ["overview", "Overview"],
          ["donations", "Donations"],
          ["campaigns", "Campaigns"],
          ["expenses", "Expenses"],
          ["recurring", "Recurring"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={`/finance?tab=${value}`}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold ${tab === value ? "bg-admin-ink text-white" : "text-admin-muted hover:bg-admin-bg"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === "overview" ? (
        <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
          <article className="admin-card p-5">
            <h2 className="text-sm font-extrabold">Donation trend</h2>
            <p className="mt-0.5 text-xs text-admin-muted">
              Successful {currency} donations, last 30 active days
            </p>
            <div className="mt-5">
              <MiniLineChart data={trend} color="#008060" />
            </div>
          </article>
          <article className="admin-card overflow-hidden">
            <div className="border-b border-admin-border px-5 py-4">
              <h2 className="text-sm font-extrabold">Campaign progress</h2>
            </div>
            <div className="divide-y divide-admin-border">
              {campaigns?.length ? (
                campaigns.slice(0, 6).map((campaign) => {
                  const campaignRaised = (donations || [])
                    .filter(
                      (item) =>
                        item.campaign_id === campaign.id &&
                        item.status === "successful" &&
                        item.currency === campaign.currency,
                    )
                    .reduce((sum, item) => sum + item.amount_minor, 0);
                  const pct = Math.min(
                    100,
                    Math.round(
                      (campaignRaised / campaign.target_amount_minor) * 100,
                    ),
                  );
                  return (
                    <div key={campaign.id} className="px-5 py-4">
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="truncate font-semibold">
                          {campaign.title}
                        </span>
                        <span className="text-admin-muted">{pct}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-admin-bg">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[0.68rem] text-admin-muted">
                        {campaign.currency}{" "}
                        {(campaignRaised / 100).toLocaleString()} of{" "}
                        {(campaign.target_amount_minor / 100).toLocaleString()}
                      </p>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  title="No campaigns"
                  description="Create a campaign to track fundraising goals."
                />
              )}
            </div>
          </article>
        </section>
      ) : null}
      {tab === "donations" ? (
        <DonationTable donations={donations || []} />
      ) : null}
      {tab === "campaigns" ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
          <section className="admin-card overflow-hidden">
            <div className="divide-y divide-admin-border">
              {campaigns?.length ? (
                campaigns.map((item) => (
                  <Link
                    key={item.id}
                    href={`/finance?tab=campaigns&campaign=${item.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-admin-bg/60"
                  >
                    <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <CircleDollarSign size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.title}</p>
                      <p className="mt-1 break-all text-xs text-admin-muted">
                        /donate?campaign={item.slug}
                      </p>
                      <p className="mt-1 text-xs text-admin-muted">
                        Target {item.currency}{" "}
                        {(item.target_amount_minor / 100).toLocaleString()}
                      </p>
                    </div>
                    <StatusPill
                      tone={
                        item.status === "active"
                          ? "green"
                          : item.status === "archived"
                            ? "red"
                            : "neutral"
                      }
                    >
                      {item.status}
                    </StatusPill>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="No campaigns"
                  description="Create a campaign using the form."
                />
              )}
            </div>
          </section>
          <CampaignForm item={selectedCampaign} />
        </div>
      ) : null}
      {tab === "expenses" ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_430px]">
          <section className="admin-card overflow-hidden">
            <div className="divide-y divide-admin-border">
              {expenses?.length ? (
                expenses.map((item) => (
                  <Link
                    key={item.id}
                    href={`/finance?tab=expenses&expense=${item.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-admin-bg/60"
                  >
                    <span className="grid size-11 place-items-center rounded-xl bg-rose-50 text-rose-700">
                      <ReceiptText size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-admin-muted">
                        {item.category} · {item.currency}{" "}
                        {(item.amount_minor / 100).toLocaleString()} ·{" "}
                        {new Date(
                          `${item.expense_date}T00:00:00`,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusPill
                      tone={
                        item.status === "approved"
                          ? "green"
                          : item.status === "rejected" || item.status === "void"
                            ? "red"
                            : "amber"
                      }
                    >
                      {item.status}
                    </StatusPill>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="No expenses"
                  description="Record a ministry expense using the form."
                />
              )}
            </div>
          </section>
          <ExpenseForm
            item={selectedExpense}
            campaigns={campaigns || []}
            currency={currency}
          />
        </div>
      ) : null}
      {tab === "recurring" ? (
        <section className="admin-card mt-5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-admin-border bg-admin-bg/70 text-xs text-admin-muted">
                <tr>
                  <th className="px-5 py-3">Supporter</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Next payment</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {subscriptions?.length ? (
                  subscriptions.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{item.donor_name}</p>
                        <p className="text-xs text-admin-muted">
                          {item.donor_email}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {item.currency}{" "}
                        {(item.amount_minor / 100).toLocaleString()} ·{" "}
                        <span className="capitalize">
                          {item.frequency.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-admin-muted">
                        {item.next_payment_at
                          ? new Date(item.next_payment_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span>{item.status}</span>
                        {item.stripe_subscription_id ? (
                          <a
                            className="ml-3 underline"
                            href={`https://dashboard.stripe.com/subscriptions/${item.stripe_subscription_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Manage in Stripe
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        title="No recurring support"
                        description="Stripe recurring subscriptions will appear here after webhook confirmation."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DonationTable({ donations }: { donations: any[] }) {
  return (
    <section className="admin-card mt-5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-admin-border bg-admin-bg/70 text-xs text-admin-muted">
            <tr>
              <th className="px-5 py-3">Donor</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Frequency</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Reference</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {donations.length ? (
              donations.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold">
                      {item.is_anonymous ? "Anonymous" : item.donor_name}
                    </p>
                    <p className="text-xs text-admin-muted">
                      {item.donor_email}
                    </p>
                  </td>
                  <td className="px-5 py-4 font-bold">
                    {item.currency} {(item.amount_minor / 100).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 capitalize">
                    {item.frequency.replaceAll("_", " ")}
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
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-admin-muted">
                    {item.provider_reference || "—"}
                  </td>
                  <td className="px-5 py-4 text-xs text-admin-muted">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="No donations yet"
                    description="Webhook-confirmed Stripe transactions will appear here."
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
function CampaignForm({ item }: { item?: any }) {
  return (
    <form action={saveCampaign} className="admin-card p-5">
      {item?.id ? <input type="hidden" name="id" value={item.id} /> : null}
      <h2 className="font-semibold">
        {item ? "Edit campaign" : "New campaign"}
      </h2>
      <div className="mt-4 grid gap-3">
        <label className="text-xs">
          Name
          <input
            name="title"
            defaultValue={item?.title}
            maxLength={150}
            required
            className="admin-input mt-1"
          />
        </label>
        <label className="text-xs">
          Public link slug
          <input
            name="slug"
            defaultValue={item?.slug}
            placeholder="bible-distribution"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={150}
            required
            className="admin-input mt-1"
          />
        </label>
        <label className="text-xs">
          Short description
          <textarea
            name="shortDescription"
            defaultValue={item?.short_description || ""}
            maxLength={300}
            rows={2}
            className="admin-textarea mt-1"
          />
        </label>
        <label className="text-xs">
          Description
          <textarea
            name="description"
            defaultValue={item?.description}
            maxLength={10000}
            rows={4}
            className="admin-textarea mt-1"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            Goal
            <input
              name="target"
              type="number"
              step="0.01"
              min="1"
              defaultValue={item ? item.target_amount_minor / 100 : ""}
              required
              className="admin-input mt-1"
            />
          </label>
          <label className="text-xs">
            Currency
            <select
              name="currency"
              defaultValue={item?.currency || "USD"}
              className="admin-input mt-1"
            >
              {["USD", "UGX", "EUR", "GBP"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="text-xs">
          Status
          <select
            name="status"
            defaultValue={item?.status || "draft"}
            className="admin-input mt-1"
          >
            {["draft", "active", "paused", "completed", "archived"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Start (UTC)
          <input
            type="datetime-local"
            name="startsAt"
            defaultValue={
              item?.starts_at
                ? new Date(item.starts_at).toISOString().slice(0, 16)
                : ""
            }
            className="admin-input mt-1"
          />
        </label>
        <label className="text-xs">
          End (UTC)
          <input
            type="datetime-local"
            name="endsAt"
            defaultValue={
              item?.ends_at
                ? new Date(item.ends_at).toISOString().slice(0, 16)
                : ""
            }
            className="admin-input mt-1"
          />
        </label>
        <label className="text-xs">
          Cover image
          <input
            name="cover"
            type="file"
            accept="image/*"
            className="mt-2 block w-full"
          />
        </label>
        <label className="text-xs">
          <input
            name="featured"
            type="checkbox"
            defaultChecked={item?.featured}
          />{" "}
          Featured
        </label>
        <button className="admin-button admin-button-primary">
          Save campaign
        </button>
      </div>
    </form>
  );
}

function ExpenseForm({
  item,
  campaigns,
  currency,
}: {
  item?: any;
  campaigns: any[];
  currency: string;
}) {
  return (
    <form action={saveExpense} className="admin-card p-5">
      {item?.id ? <input type="hidden" name="id" value={item.id} /> : null}
      <h2 className="flex items-center gap-2 text-sm font-extrabold">
        <ReceiptText size={17} /> {item ? "Edit expense" : "Record expense"}
      </h2>
      <div className="mt-4 grid gap-3">
        <select
          name="campaignId"
          defaultValue={item?.campaign_id || ""}
          className="admin-input"
        >
          <option value="">General ministry</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.title}
            </option>
          ))}
        </select>
        <input
          name="title"
          defaultValue={item?.title}
          className="admin-input"
          placeholder="Expense title"
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            name="category"
            defaultValue={item?.category}
            className="admin-input"
            placeholder="Category"
            required
          />
          <input
            name="vendor"
            defaultValue={item?.vendor}
            className="admin-input"
            placeholder="Vendor"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={item ? item.amount_minor / 100 : ""}
            className="admin-input"
            placeholder="Amount"
            required
          />
          <input
            name="currency"
            value="USD"
            readOnly
            className="admin-input"
            maxLength={3}
          />
          <input
            name="expenseDate"
            type="date"
            defaultValue={
              item?.expense_date || new Date().toISOString().slice(0, 10)
            }
            className="admin-input"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            name="status"
            defaultValue={item?.status || "approved"}
            className="admin-input"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="void">Void</option>
          </select>
          <input
            name="livesTouched"
            type="number"
            min="0"
            defaultValue={item?.lives_touched || 0}
            className="admin-input"
            title="Lives touched"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="paymentMethod"
            defaultValue={item?.payment_method}
            className="admin-input"
            placeholder="Payment method"
          />
          <input
            name="reference"
            defaultValue={item?.reference}
            className="admin-input"
            placeholder="Reference"
          />
        </div>
        <textarea
          name="notes"
          defaultValue={item?.notes}
          rows={3}
          className="admin-textarea"
          placeholder="Internal notes"
        />
        <input
          name="receipt"
          type="file"
          accept="image/*,.pdf"
          className="text-xs"
        />
        <button className="admin-button admin-button-primary">
          Save expense
        </button>
      </div>
    </form>
  );
}

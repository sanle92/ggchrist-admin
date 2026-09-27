"use server";
import { redirect } from "next/navigation";
import { requireRole, writeAudit } from "@/lib/admin-auth";
import { getApiSecret } from "@/lib/server-secrets";
export async function refundGift(form: FormData) {
  await requireRole(["finance_manager"]);
  const id = String(form.get("id")),
    requestId = String(form.get("requestId")),
    amount = String(form.get("amount"));
  if (!/^[a-f\d-]{36}$/i.test(id) || !/^[a-f\d-]{36}$/i.test(requestId))
    throw new Error("Invalid refund request");
  const { supabase } = await requireRole(["finance_manager"]);
  const { data: d } = await supabase
    .from("donations")
    .select(
      "amount_minor,refunded_amount,currency,provider_transaction_id,status,provider",
    )
    .eq("id", id)
    .single();
  const [whole, fraction = ""] = amount.split("."),
    minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (
    !/^\d+(\.\d{1,2})?$/.test(amount) ||
    !Number.isSafeInteger(minor) ||
    minor <= 0 ||
    !d ||
    d.status !== "successful" ||
    d.provider !== "stripe" ||
    !/^pi_[A-Za-z0-9]+$/.test(d.provider_transaction_id || "") ||
    minor > d.amount_minor - d.refunded_amount ||
    (d.currency === "UGX" && minor % 100)
  )
    redirect(`/donations/${id}?error=Invalid%20refund%20amount`);
  let failed = false;
  try {
    const response = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await getApiSecret("stripe_secret_key")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `ggc-refund:${requestId}`,
      },
      body: new URLSearchParams({
        payment_intent: d.provider_transaction_id,
        amount: String(minor),
        "metadata[donation_id]": id,
      }),
    });
    if (!response.ok) throw new Error();
    const refund = await response.json();
    await writeAudit("donation.refund_requested", "donation", id, {
      stripe_refund_id: refund.id,
      amount_minor: minor,
      currency: d.currency,
    });
  } catch {
    failed = true;
  }
  redirect(
    `/donations/${id}?${failed ? "error=Refund%20could%20not%20be%20confirmed.%20Check%20Stripe%20before%20retrying." : "saved=refund"}`,
  );
}

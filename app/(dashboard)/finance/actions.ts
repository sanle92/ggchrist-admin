"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, uploadAdminFile, writeAudit } from "@/lib/admin-auth";

const campaignSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(150),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(150),
  description: z.string().trim().max(10000),
  shortDescription: z.string().trim().max(300),
  target: z.string().regex(/^\d{1,9}(\.\d{1,2})?$/),
  currency: z.enum(["USD", "UGX", "EUR", "GBP"]),
  status: z.enum(["draft", "active", "paused", "completed", "archived"]),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});
export async function saveCampaign(formData: FormData) {
  const { supabase } = await requireRole(["finance_manager"]);
  const parsed = campaignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(
      "/finance?tab=campaigns&error=Please%20check%20the%20campaign%20fields",
    );
  const v = parsed.data,
    [whole, fraction = ""] = v.target.split("."),
    amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    (v.currency === "UGX" && amount % 100)
  )
    redirect("/finance?tab=campaigns&error=Invalid%20campaign%20goal");
  if (
    (v.startsAt && Number.isNaN(Date.parse(v.startsAt))) ||
    (v.endsAt && Number.isNaN(Date.parse(v.endsAt))) ||
    (v.startsAt && v.endsAt && Date.parse(v.startsAt) >= Date.parse(v.endsAt))
  )
    redirect("/finance?tab=campaigns&error=Check%20campaign%20dates");
  if (v.id) {
    const { data: existing } = await supabase
      .from("campaigns")
      .select("currency")
      .eq("id", v.id)
      .single();
    const { count } = await supabase
      .from("donations")
      .select("id", { head: true, count: "exact" })
      .eq("campaign_id", v.id);
    if (existing?.currency !== v.currency && (count || 0) > 0)
      redirect(
        "/finance?tab=campaigns&error=A%20campaign%20with%20gifts%20must%20keep%20its%20original%20currency",
      );
  }
  const cover = formData.get("cover");
  const coverUrl =
    cover instanceof File && cover.size
      ? await uploadAdminFile("public-media", "campaigns", cover)
      : null;
  const payload = {
    slug: v.slug,
    title: v.title,
    description: v.description,
    short_description: v.shortDescription,
    featured: formData.get("featured") === "on",
    target_amount_minor: amount,
    currency: v.currency,
    status: v.status,
    starts_at: v.startsAt ? new Date(`${v.startsAt}Z`).toISOString() : null,
    ends_at: v.endsAt ? new Date(`${v.endsAt}Z`).toISOString() : null,
    ...(coverUrl ? { cover_image_url: coverUrl } : {}),
  };
  const result = v.id
    ? await supabase
        .from("campaigns")
        .update(payload)
        .eq("id", v.id)
        .select("id")
        .single()
    : await supabase.from("campaigns").insert(payload).select("id").single();
  if (result.error)
    redirect(
      "/finance?tab=campaigns&error=Campaign%20could%20not%20be%20saved.%20Check%20that%20the%20slug%20is%20unique.",
    );
  await writeAudit(
    v.id ? "campaign.updated" : "campaign.created",
    "campaign",
    result.data.id,
  );
  revalidatePath("/finance");
  redirect("/finance?tab=campaigns&saved=campaign");
}

const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(1),
  category: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3),
  livesTouched: z.coerce.number().int().min(0),
  status: z.enum(["pending", "approved", "rejected", "void"]),
  expenseDate: z.string().date(),
  vendor: z.string().trim().max(150).optional(),
  paymentMethod: z.string().trim().max(100).optional(),
  reference: z.string().trim().max(150).optional(),
  notes: z.string().trim().max(1500).optional(),
});
export async function saveExpense(formData: FormData) {
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect("/finance?tab=expenses&error=Invalid%20expense");
  const { supabase, userId } = await requireRole(["finance_manager"]);
  const receipt = formData.get("receipt");
  const receiptPath =
    receipt instanceof File && receipt.size
      ? await uploadAdminFile("receipts", "expenses", receipt)
      : null;
  const payload = {
    campaign_id: parsed.data.campaignId || null,
    title: parsed.data.title,
    category: parsed.data.category,
    amount_minor: Math.round(parsed.data.amount * 100),
    currency: parsed.data.currency.toUpperCase(),
    lives_touched: parsed.data.livesTouched,
    status: parsed.data.status,
    expense_date: parsed.data.expenseDate,
    vendor: parsed.data.vendor || null,
    payment_method: parsed.data.paymentMethod || null,
    reference: parsed.data.reference || null,
    notes: parsed.data.notes || null,
    ...(receiptPath ? { receipt_url: receiptPath } : {}),
    ...(parsed.data.status === "approved" ? { approved_by: userId } : {}),
  };
  if (parsed.data.id) {
    const { error } = await supabase
      .from("expenses")
      .update(payload)
      .eq("id", parsed.data.id);
    if (error)
      redirect(
        `/finance?tab=expenses&error=${encodeURIComponent(error.message)}`,
      );
    await writeAudit("expense.updated", "expense", parsed.data.id);
  } else {
    const { data, error } = await supabase
      .from("expenses")
      .insert(payload)
      .select("id")
      .single();
    if (error)
      redirect(
        `/finance?tab=expenses&error=${encodeURIComponent(error.message)}`,
      );
    await writeAudit("expense.created", "expense", data.id);
  }
  revalidatePath("/finance");
  redirect("/finance?tab=expenses&saved=expense");
}

export async function updateSubscriptionStatus(_formData: FormData) {
  await requireRole(["finance_manager"]);
  redirect("/donations/monthly-partners");
}

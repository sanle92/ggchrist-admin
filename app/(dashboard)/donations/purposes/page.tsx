import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireRole, writeAudit } from "@/lib/admin-auth";
async function save(form: FormData) {
  "use server";
  const { supabase } = await requireRole(["finance_manager"]);
  const name = String(form.get("name")).trim();
  if (!name || name.length > 100)
    throw new Error("Enter a purpose between 1 and 100 characters.");
  const { error } = await supabase
    .from("donation_purposes")
    .upsert({ name, active: form.get("active") === "on" });
  if (error) throw new Error("Purpose could not be saved.");
  await writeAudit("giving.purpose_updated", "donation_purpose", name);
  revalidatePath("/donations/purposes");
}
export default async function Purposes() {
  const { supabase } = await requireRole(["finance_manager"]);
  const { data } = await supabase
    .from("donation_purposes")
    .select("*")
    .order("sort_order");
  return (
    <div>
      <Link href="/donations">← Donations</Link>
      <h1 className="my-5 text-2xl font-bold">Giving purposes</h1>
      {data?.map((p) => (
        <form
          action={save}
          key={p.name}
          className="admin-card mb-3 flex flex-wrap items-center gap-4 p-4"
        >
          <input type="hidden" name="name" value={p.name} />
          <span className="flex-1">{p.name}</span>
          <label>
            <input type="checkbox" name="active" defaultChecked={p.active} />{" "}
            Active
          </label>
          <button className="admin-button admin-button-secondary">Save</button>
        </form>
      ))}
      <form action={save} className="admin-card mt-5 flex gap-3 p-4">
        <input
          name="name"
          required
          maxLength={100}
          aria-label="New purpose"
          placeholder="New giving purpose"
          className="admin-input"
        />
        <input type="hidden" name="active" value="on" />
        <button className="admin-button admin-button-primary">Add</button>
      </form>
    </div>
  );
}

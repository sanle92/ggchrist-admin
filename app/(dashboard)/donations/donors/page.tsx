import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
export default async function Donors({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const p = await searchParams,
    page = Math.max(1, Number(p.page) || 1),
    { supabase } = await requireRole(["finance_manager"]);
  let query = supabase
    .from("giving_donors")
    .select("*", { count: "exact" })
    .order("latest_gift", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  if (p.q)
    query = query.ilike("name", `%${p.q.replace(/[%_]/g, "").slice(0, 100)}%`);
  const { data: rows, count, error } = await query;
  return (
    <div>
      <Link href="/donations">← Donations</Link>
      <h1 className="my-5 text-2xl font-bold">Donors</h1>
      <p className="mb-4 text-sm text-admin-muted">
        Giving history is grouped by email and currency. Prayer requests are
        available only on individual gift records.
      </p>
      <form className="mb-5 flex gap-3">
        <input
          name="q"
          aria-label="Search donor name"
          placeholder="Search donor name"
          defaultValue={p.q}
          className="admin-input"
        />
        <button className="admin-button admin-button-primary">Search</button>
      </form>
      {error ? <p>Could not load donors. Check migration 015.</p> : null}
      <div className="admin-card overflow-auto">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead>
            <tr>
              {[
                "Donor",
                "Total donated",
                "Gift count",
                "First gift",
                "Latest gift",
                "Monthly giving",
              ].map((v) => (
                <th className="p-4" key={v}>
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows?.map((d) => (
              <tr
                key={`${d.email}:${d.currency}`}
                className="border-t border-admin-border"
              >
                <td className="p-4">
                  <Link
                    href={`/donations/donors/${d.profile_id}`}
                    className="underline"
                  >
                    {d.name}
                  </Link>
                  <br />
                  {d.email}
                </td>
                <td className="p-4">
                  {d.currency} {(d.total_minor / 100).toLocaleString()}
                </td>
                <td className="p-4">{d.donation_count}</td>
                <td className="p-4">
                  {new Date(d.first_gift).toLocaleDateString()}
                </td>
                <td className="p-4">
                  {new Date(d.latest_gift).toLocaleDateString()}
                </td>
                <td className="p-4">
                  {d.monthly ? "Has monthly gift history" : "One-time"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex gap-5">
        {page > 1 ? (
          <Link href={`?page=${page - 1}&q=${encodeURIComponent(p.q || "")}`}>
            Previous
          </Link>
        ) : null}
        {(count || 0) > page * 50 ? (
          <Link href={`?page=${page + 1}&q=${encodeURIComponent(p.q || "")}`}>
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

import { requireRole } from '@/lib/admin-auth';

function csvCell(value: unknown) { const text = String(value ?? ''); return `"${text.replaceAll('"', '""')}"`; }

export async function GET() {
  const { supabase } = await requireRole(['finance_manager']);
  const { data } = await supabase.from('donations').select('donor_name,donor_email,amount_minor,currency,frequency,status,payment_method,provider_reference,created_at').order('created_at', { ascending: false });
  const header = ['Donor', 'Email', 'Amount', 'Currency', 'Frequency', 'Status', 'Payment method', 'Reference', 'Date'];
  const rows = (data || []).map((item) => [item.donor_name, item.donor_email, item.amount_minor / 100, item.currency, item.frequency, item.status, item.payment_method, item.provider_reference, item.created_at]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  return new Response(`\uFEFF${csv}`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="ggc-donations-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' } });
}

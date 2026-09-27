'use client';

export function AutoSubmitSelect({ name, value, options }: { name: string; value: string; options: { value: string; label: string }[] }) {
  return <select name={name} defaultValue={value} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="rounded-lg border border-admin-border bg-white px-3 py-2 text-xs font-semibold">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}

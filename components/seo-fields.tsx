export function SeoFields({ item }: { item?: any }) {
  return <fieldset className="grid gap-3 border-t border-admin-border pt-4">
    <legend className="mb-3 text-xs font-extrabold uppercase tracking-[.12em] text-admin-muted">Search appearance</legend>
    <label className="grid gap-2 text-xs font-semibold">SEO title<input name="seoTitle" defaultValue={item?.seo_title} maxLength={70} className="admin-input" placeholder="Defaults to the content title" /></label>
    <label className="grid gap-2 text-xs font-semibold">Meta description<textarea name="seoDescription" defaultValue={item?.seo_description} maxLength={170} rows={3} className="admin-textarea" placeholder="Recommended: 140–160 characters" /></label>
    <label className="grid gap-2 text-xs font-semibold">Focus keyword<input name="focusKeyword" defaultValue={item?.focus_keyword} maxLength={120} className="admin-input" placeholder="Primary search phrase" /></label>
    <label className="grid gap-2 text-xs font-semibold">Canonical URL<input name="canonicalUrl" type="url" defaultValue={item?.canonical_url} className="admin-input" placeholder="Optional absolute URL" /></label>
    <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="noIndex" defaultChecked={item?.no_index} /> Hide this item from search engines</label>
  </fieldset>;
}

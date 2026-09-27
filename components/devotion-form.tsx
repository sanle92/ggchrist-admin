import Link from 'next/link';
import { Save } from 'lucide-react';
import { saveDevotion } from '@/app/(dashboard)/devotions/actions';
import { AudioUploadField } from '@/components/audio-upload-field';
import { PublishingStatus } from '@/components/publishing-status';
import { SeoFields } from '@/components/seo-fields';

export function DevotionForm({ devotion, error }: { devotion?: any; error?: string }) {
  return <form action={saveDevotion} className="grid gap-5 xl:grid-cols-[1fr_340px]">
    {devotion?.id ? <input type="hidden" name="id" value={devotion.id} /> : null}
    <section className="admin-card p-5">
      <h2 className="text-sm font-bold">Devotion content</h2>
      {error ? <div className="admin-notice-error mt-4">{error}</div> : null}
      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-semibold">Title<input name="title" defaultValue={devotion?.title} className="admin-input" required /></label>
        <label className="grid gap-2 text-sm font-semibold">Slug<input name="slug" defaultValue={devotion?.slug} className="admin-input" placeholder="Generated from title" /></label>
        <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Scripture reference<input name="reference" defaultValue={devotion?.reference} className="admin-input" /></label><label className="grid gap-2 text-sm font-semibold">Devotion date<input name="devotionDate" type="date" defaultValue={devotion?.devotion_date || new Date().toISOString().slice(0, 10)} className="admin-input" required /></label></div>
        <label className="grid gap-2 text-sm font-semibold">Scripture text<textarea name="scripture" defaultValue={devotion?.scripture} rows={4} className="admin-textarea" /></label>
        <label className="grid gap-2 text-sm font-semibold">Reflection <span className="font-normal text-admin-muted">Markdown supported</span><textarea name="reflection" defaultValue={devotion?.reflection} rows={16} className="admin-textarea font-mono leading-6" required /></label>
        <label className="grid gap-2 text-sm font-semibold">Prayer<textarea name="prayer" defaultValue={devotion?.prayer} rows={5} className="admin-textarea" /></label>
      </div>
    </section>
    <aside className="grid content-start gap-5 xl:sticky xl:top-20 xl:self-start">
      <section className="admin-card p-5"><h2 className="text-sm font-bold">Publishing</h2><div className="mt-4"><PublishingStatus status={devotion?.status} scheduledFor={devotion?.scheduled_for} /></div></section>
      <section className="admin-card p-5"><SeoFields item={devotion} /></section>
      <section className="admin-card p-5"><h2 className="text-sm font-bold">Cover image</h2>{devotion?.cover_image_url ? <img src={devotion.cover_image_url} alt="Current devotion cover" className="mt-4 aspect-video w-full object-cover" /> : null}<input type="file" name="coverImage" accept="image/*" className="mt-4 block w-full text-xs" /></section>
      <section className="admin-card p-5"><h2 className="text-sm font-bold">Audio devotion</h2><label className="mt-4 grid gap-2 text-sm font-semibold">Audio title<input name="audioTitle" defaultValue={devotion?.audio_title} className="admin-input" /></label><AudioUploadField existingUrl={devotion?.audio_url} /></section>
      <div className="flex gap-2"><Link href="/devotions" className="admin-button admin-button-secondary flex-1">Cancel</Link><button className="admin-button admin-button-primary flex-1"><Save size={16} /> Save devotion</button></div>
    </aside>
  </form>;
}

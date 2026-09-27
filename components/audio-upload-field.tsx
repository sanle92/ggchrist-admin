'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Music2, TriangleAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { validateMp3 } from '@/lib/audio-validation';

export function AudioUploadField({ existingUrl }: { existingUrl?: string | null }) {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(existingUrl || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function upload(file?: File, input?: HTMLInputElement) {
    if (!file) return;
    setError('');
    const validationError = validateMp3(file);
    if (validationError) { setError(validationError); return; }
    setUploading(true);
    const submitButtons = Array.from(input?.closest('form')?.querySelectorAll<HTMLButtonElement>('button[type="submit"],button:not([type])') || []);
    submitButtons.forEach((button) => { button.disabled = true; });
    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Your session expired. Sign in again before uploading.');
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
      const path = `devotions/${userData.user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('devotion-audio').upload(path, file, { contentType: file.type || 'audio/mpeg', upsert: false });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from('devotion-audio').getPublicUrl(path).data.publicUrl;
      setUrl(publicUrl);
      setPreview(publicUrl);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The MP3 upload failed. Please try again.');
    } finally {
      setUploading(false);
      submitButtons.forEach((button) => { button.disabled = false; });
    }
  }

  return <div className="mt-4 grid gap-3">
    <input type="hidden" name="audioUrl" value={url} />
    {preview ? <audio controls preload="metadata" className="w-full" src={preview} /> : <div className="flex items-center gap-3 border border-dashed border-admin-border bg-admin-bg p-4 text-xs text-admin-muted"><Music2 size={18} /> No audio uploaded yet</div>}
    <label className="grid gap-2 text-xs font-semibold">MP3 file <span className="font-normal text-admin-muted">Up to 100 MB. Uploads directly to secure media storage.</span><input type="file" accept=".mp3,audio/mpeg,audio/mp3,audio/x-mpeg,audio/mpeg3,audio/x-mp3" disabled={uploading} onChange={(event) => void upload(event.target.files?.[0], event.currentTarget)} /></label>
    {uploading ? <p className="flex items-center gap-2 text-xs font-semibold text-admin-green"><Loader2 size={14} className="animate-spin" /> Uploading MP3… Keep this page open.</p> : null}
    {url && !uploading ? <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} /> Audio uploaded and ready to save.</p> : null}
    {error ? <p className="flex items-start gap-2 border border-red-200 bg-red-50 p-3 text-xs leading-5 text-[#D82C0D]" role="alert"><TriangleAlert size={15} className="mt-0.5 shrink-0" /> {error}</p> : null}
  </div>;
}

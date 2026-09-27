export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export const MP3_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/x-mpeg', 'audio/mpeg3', 'audio/x-mp3']);

export function validateMp3(file: Pick<File, 'name' | 'type' | 'size'>) {
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension !== 'mp3' || (file.type && !MP3_TYPES.has(file.type))) return 'Unsupported format. Choose an MP3 file (audio/mpeg, audio/mp3 or audio/x-mpeg).';
  if (file.size > MAX_AUDIO_BYTES) return `File too large. The MP3 limit is 100 MB; this file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`;
  return null;
}

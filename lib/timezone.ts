export function validTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function partsAt(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function zonedLocalToUtc(localValue: string, timezone: string) {
  if (!validTimezone(timezone)) throw new Error(`Invalid timezone: ${timezone}`);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(localValue);
  if (!match) throw new Error('Invalid scheduled date and time');
  const desired = match.slice(1).map(Number);
  const desiredUtc = Date.UTC(desired[0], desired[1] - 1, desired[2], desired[3], desired[4], desired[5] || 0);
  let candidate = new Date(desiredUtc);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const shown = partsAt(candidate, timezone);
    const shownUtc = Date.UTC(Number(shown.year), Number(shown.month) - 1, Number(shown.day), Number(shown.hour), Number(shown.minute), Number(shown.second));
    candidate = new Date(candidate.getTime() + desiredUtc - shownUtc);
  }
  const confirmation = partsAt(candidate, timezone);
  const rendered = `${confirmation.year}-${confirmation.month}-${confirmation.day}T${confirmation.hour}:${confirmation.minute}`;
  if (rendered !== localValue.slice(0, 16)) throw new Error('That local time does not exist in the selected timezone because of a daylight-saving change');
  return candidate.toISOString();
}

export function utcToZonedInput(isoValue: string | null | undefined, timezone: string) {
  if (!isoValue || !validTimezone(timezone)) return '';
  const parts = partsAt(new Date(isoValue), timezone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

type SupabaseLike = { from: (table: string) => any };

export async function scheduledUtc(supabase: SupabaseLike, status: string, localValue?: string) {
  if (status !== 'scheduled') return null;
  if (!localValue) throw new Error('Choose the scheduled date and time');
  const { data, error } = await supabase.from('site_settings').select('timezone').eq('id', true).maybeSingle();
  if (error) throw error;
  return zonedLocalToUtc(localValue, data?.timezone || 'Africa/Kampala');
}

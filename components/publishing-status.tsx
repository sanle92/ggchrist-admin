'use client';

import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { utcToZonedInput } from '@/lib/timezone';
import { useAdminTimezone } from '@/components/admin-timezone';

export function PublishingStatus({ status = 'draft', scheduledFor, timezone }: { status?: string; scheduledFor?: string | null; timezone?: string }) {
  const configuredTimezone = useAdminTimezone();
  const displayTimezone = timezone || configuredTimezone;
  const [value, setValue] = useState(status);
  const defaultDate = utcToZonedInput(scheduledFor, displayTimezone);
  return <div className="grid gap-3">
    <label className="grid gap-2 text-sm font-semibold">Status<select name="status" value={value} onChange={(event) => setValue(event.target.value)} className="admin-input"><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option></select></label>
    {value === 'scheduled' ? <label className="grid gap-2 text-sm font-semibold"><span className="flex items-center gap-2"><CalendarClock size={15} className="text-admin-gold" /> Publish date and time</span><input type="datetime-local" name="scheduledFor" defaultValue={defaultDate} className="admin-input" required /><span className="text-[.68rem] font-normal leading-5 text-admin-muted">Displayed in {displayTimezone}. It will be stored as UTC.</span></label> : <input type="hidden" name="scheduledFor" value="" />}
  </div>;
}

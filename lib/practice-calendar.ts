import { z } from 'zod';

export const eventInputSchema = z.object({
  kind: z.enum(['APPOINTMENT', 'CONSULTING', 'MEETING']),
  title: z.string().trim().min(1).max(200),
  patientId: z.string().cuid().nullable().default(null), facilityId: z.string().cuid().nullable().default(null),
  startsAt: z.string().datetime({ offset: true }), endsAt: z.string().datetime({ offset: true }),
  location: z.string().trim().max(300).nullable().default(null),
  meetingUrl: z.string().url().max(1000).refine((value) => ['https:', 'http:'].includes(new URL(value).protocol)).nullable().default(null),
  notes: z.string().trim().max(5000).nullable().default(null),
  billable: z.boolean().default(false), serviceCode: z.string().trim().min(1).max(160).nullable().default(null),
  feeMinor: z.number().int().nonnegative().max(2000000000).nullable().default(null),
  overrideReason: z.string().trim().min(5).max(1000).nullable().default(null),
  recurrence: z.object({ frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']), until: z.string().datetime({ offset: true }) }).strict().nullable().default(null),
}).strict().superRefine((value, ctx) => {
  const start = new Date(value.startsAt).getTime(), end = new Date(value.endsAt).getTime();
  if (end <= start || end - start > 7 * 86400000) ctx.addIssue({ code: 'custom', message: 'End must follow start within seven days' });
  if (value.kind === 'APPOINTMENT' && !value.patientId) ctx.addIssue({ code: 'custom', message: 'Choose a patient' });
  if (value.kind !== 'APPOINTMENT' && value.patientId) ctx.addIssue({ code: 'custom', message: 'Patients belong to appointments only' });
  if (value.kind === 'MEETING' && value.billable) ctx.addIssue({ code: 'custom', message: 'Professional meetings are not clinical income' });
  if (value.billable && !value.serviceCode) ctx.addIssue({ code: 'custom', message: 'Choose a clinical service' });
});

export type EventInput = z.infer<typeof eventInputSchema>;
export const timeRangesOverlap = (a: { startsAt: Date; endsAt: Date }, b: { startsAt: Date; endsAt: Date }) => a.startsAt < b.endsAt && a.endsAt > b.startsAt;

/** Nairobi has no DST. Monthly repeats retain the original day, clamped to the target month end. */
export function recurringDates(start: Date, end: Date, recurrence: EventInput['recurrence']): { startsAt: Date; endsAt: Date }[] {
  if (!recurrence) return [{ startsAt: start, endsAt: end }];
  const until = new Date(recurrence.until);
  if (until < start || until.getTime() - start.getTime() > 366 * 86400000) throw new Error('Recurrence must end within one year of its start');
  const result: { startsAt: Date; endsAt: Date }[] = [];
  const local = new Date(start.getTime() + 3 * 3600000);
  for (let i = 0; i <= 366; i++) {
    let next: Date;
    if (recurrence.frequency === 'MONTHLY') {
      const month = local.getUTCMonth() + i;
      const lastDay = new Date(Date.UTC(local.getUTCFullYear(), month + 1, 0)).getUTCDate();
      next = new Date(Date.UTC(local.getUTCFullYear(), month, Math.min(local.getUTCDate(), lastDay), local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds()) - 3 * 3600000);
    } else next = new Date(start.getTime() + i * (recurrence.frequency === 'WEEKLY' ? 7 : 1) * 86400000);
    if (next > until) break;
    result.push({ startsAt: next, endsAt: new Date(next.getTime() + end.getTime() - start.getTime()) });
  }
  if (result.length > 366) throw new Error('A series can contain at most 366 occurrences');
  for (let i = 1; i < result.length; i++) if (timeRangesOverlap(result[i - 1], result[i])) throw new Error('Recurring events overlap each other');
  return result;
}

const escapeIcs = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const icsDate = (value: Date) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

/** Calendar export excludes patient identifiers and scheduling notes. */
export function calendarFile(events: { id: string; kind: string; title: string; startsAt: Date; endsAt: Date; location: string | null; updatedAt: Date; status: string }[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Praxis Exchange//Practice//EN', 'CALSCALE:GREGORIAN'];
  for (const event of events) lines.push('BEGIN:VEVENT', `UID:${event.id}@practice.pax`, `DTSTAMP:${icsDate(event.updatedAt)}`, `DTSTART:${icsDate(event.startsAt)}`, `DTEND:${icsDate(event.endsAt)}`, `SUMMARY:${escapeIcs(event.kind === 'APPOINTMENT' ? 'Patient appointment' : event.title)}`, `LOCATION:${escapeIcs(event.location ?? '')}`, `STATUS:${event.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED'}`, 'END:VEVENT');
  lines.push('END:VCALENDAR');
  // RFC 5545 folding uses UTF-8 octets, never splits a code point.
  return lines.map((line) => {
    let segment = '', bytes = 0, folded = '';
    for (const character of line) {
      const size = new TextEncoder().encode(character).length;
      if (bytes + size > 75) { folded += `${segment}\r\n `; segment = ''; bytes = 1; }
      segment += character; bytes += size;
    }
    return folded + segment;
  }).join('\r\n') + '\r\n';
}

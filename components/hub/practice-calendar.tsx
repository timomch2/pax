'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PracticeForm, practiceFetch, practiceSend, type PracticeField } from '@/components/hub/practice-form';
import { PRACTICE_EVENT_KIND_LABELS, PRACTICE_EVENT_STATUS_LABELS } from '@/lib/pax-labels';
import { formatPracticeMoney, moneyToMinor } from '@/lib/practice-money';
import type { PracticeAction } from '@/lib/practice-policy';

const localInput = (value: string) => new Date(new Date(value).getTime() + 10800000).toISOString().slice(0, 16);
const displayTime = (value: string) => new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' }).format(new Date(value));
const atNairobi = (value: string) => `${value}:00+03:00`;

export function PracticeCalendar({ workspaceId, capabilities }: { workspaceId: string; capabilities: PracticeAction[] }) {
  const [range, setRange] = useState<{ from: string; to: string } | null>(null), [editing, setEditing] = useState<any>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const base = `/api/practice/${workspaceId}`;
  useEffect(() => { const day = new Date(Date.now() + 10800000).toISOString().slice(0, 10); const end = new Date(Date.now() + 30 * 86400000 + 10800000).toISOString().slice(0, 10); setRange({ from: day, to: end }); }, []);
  const query = range ? new URLSearchParams({ from: `${range.from}T00:00:00+03:00`, to: `${range.to}T23:59:59+03:00` }).toString() : '';
  const { data, error, mutate } = useSWR<any>(range ? `${base}/calendar?${query}` : null, practiceFetch);
  const { data: patients } = useSWR<any>(editing ? `${base}/patients?q=${encodeURIComponent(patientSearch)}` : null, practiceFetch);
  const { data: consulting } = useSWR<any>(editing ? `${base}/consulting` : null, practiceFetch);
  const writable = capabilities.includes('calendar.manage');
  const changeStatus = async (event: any, status: string, scope = 'ONE') => { try { await practiceSend(`${base}/calendar`, { id: event.id, action: 'status', version: event.version, status, scope }, 'PATCH'); await mutate(); toast.success('Event updated'); } catch (error) { toast.error((error as Error).message); } };
  const fields: PracticeField[] = [
    { name: 'kind', label: 'Event type', required: true, value: editing?.kind ?? 'APPOINTMENT', options: Object.entries(PRACTICE_EVENT_KIND_LABELS).map(([value, label]) => ({ value, label })) },
    { name: 'title', label: 'Title', required: true, value: editing?.title },
    { name: 'patientId', label: 'Patient (patient appointments only)', value: editing?.patientId ?? '', options: [...(patients?.patients ?? []), ...(editing?.patient && !patients?.patients.some((p: any) => p.id === editing.patientId) ? [editing.patient] : [])].map((p: any) => ({ value: p.id, label: `${p.name} · ${p.patientRef ?? p.patientCode ?? ''}` })) },
    { name: 'facilityId', label: 'Facility (optional)', value: editing?.facilityId ?? '', options: (consulting?.relationships ?? []).map((row: any) => ({ value: row.facility.id, label: row.facility.officialName })) },
    { name: 'startsAt', label: 'Starts (Nairobi time)', type: 'datetime-local', required: true, value: editing?.startsAt ? localInput(editing.startsAt) : '' },
    { name: 'endsAt', label: 'Ends (Nairobi time)', type: 'datetime-local', required: true, value: editing?.endsAt ? localInput(editing.endsAt) : '' },
    { name: 'location', label: 'Location / address', value: editing?.location ?? '' }, { name: 'meetingUrl', label: 'Online meeting link', type: 'url', value: editing?.meetingUrl ?? '' },
    { name: 'billable', label: 'Clinical billing', required: true, value: editing?.billable ? 'yes' : 'no', options: [{ value: 'no', label: 'Not billable' }, { value: 'yes', label: 'Billable clinical service' }] },
    { name: 'serviceCode', label: 'Clinical service name (required if billable)', value: editing?.serviceCode ?? '' },
    { name: 'fee', label: 'Fee (KSh; blank uses facility default)', value: editing?.id ? String(editing.feeMinor / 100) : '' },
    { name: 'notes', label: 'Scheduling notes (visible to reception)', type: 'textarea', value: editing?.notes ?? '' },
    ...(editing?.id ? [{ name: 'scope', label: 'Apply changes to', value: 'ONE', required: true, options: [{ value: 'ONE', label: 'This event' }, ...(editing.seriesId ? [{ value: 'FUTURE', label: 'This and future scheduled events' }] : [])] }] : [
      { name: 'frequency', label: 'Repeat', value: '', options: [{ value: 'DAILY', label: 'Daily' }, { value: 'WEEKLY', label: 'Weekly' }, { value: 'MONTHLY', label: 'Monthly' }] }, { name: 'until', label: 'Repeat until (within one year)', type: 'date' },
    ]),
    ...(capabilities.includes('calendar.override') ? [{ name: 'overrideReason', label: 'Clash override reason (only when intentional)', value: '' }] : []),
  ];
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Appointments and meetings</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Nairobi time. Consulting sessions reserve the full time and cannot contain separate appointments.</p>
      {range && <PracticeForm fields={[{ name: 'from', label: 'From', type: 'date', value: range.from, required: true }, { name: 'to', label: 'To', type: 'date', value: range.to, required: true }]} submitLabel="Show events" onSubmit={async (values) => setRange({ from: values.from, to: values.to })} />}
      <div className="flex flex-wrap gap-2">{writable && <Button onClick={() => { setEditing({}); setPatientSearch(''); }}>Add appointment / meeting</Button>}{range && <Button variant="outline" asChild><a href={`${base}/calendar?${query}&format=ics`}>Export calendar</a></Button>}</div>
      {error && <p role="alert" className="text-destructive">{error.message}</p>}
      {!data ? <p>Loading calendar…</p> : !data.events.length ? <p>No events in this date range.</p> : data.events.map((event: any) => <div key={event.id} className="space-y-3 rounded-md border border-border p-4"><div className="flex flex-wrap justify-between gap-2"><div><strong>{event.title}</strong><p>{PRACTICE_EVENT_KIND_LABELS[event.kind]} · {PRACTICE_EVENT_STATUS_LABELS[event.status]}</p></div><span>{displayTime(event.startsAt)} – {displayTime(event.endsAt)}</span></div>
        {event.patient && <p>{event.patient.name} · {event.patient.patientCode}</p>}<p>{[event.facility?.officialName, event.location].filter(Boolean).join(' · ')}</p>
        {event.billable && <p>{event.serviceCode} · {formatPracticeMoney(event.feeMinor)}</p>}{event.meetingUrl && <a className="text-primary underline" href={event.meetingUrl} target="_blank" rel="noreferrer">Open meeting link</a>}
        {writable && event.status === 'SCHEDULED' && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setEditing(event); setPatientSearch(event.patient?.name ?? ''); }}>Edit</Button><Button variant="outline" onClick={() => changeStatus(event, 'COMPLETED')}>Complete</Button><Button variant="outline" onClick={() => changeStatus(event, 'NO_SHOW')}>No-show</Button><Button variant="outline" onClick={() => changeStatus(event, 'CANCELLED')}>Cancel event</Button>{event.seriesId && <Button variant="outline" onClick={() => changeStatus(event, 'CANCELLED', 'FUTURE')}>Cancel this and future events</Button>}</div>}
      </div>)}
    </CardContent></Card>
    {editing && <Card><CardHeader><CardTitle>{editing.id ? 'Edit event' : 'New event'}</CardTitle></CardHeader><CardContent className="space-y-4">
      <label className="block text-sm">Find a patient to populate the patient selector<input className="mt-2 h-10 w-full rounded-md border bg-background px-3" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Search patient name or reference" /></label>
      <PracticeForm key={editing.id ?? 'new'} fields={fields} submitLabel="Save event" onSubmit={async (values) => {
        if (values.frequency && !values.until) throw new Error('Choose an end date for the recurring series');
        const event = { kind: values.kind, title: values.title, patientId: values.patientId || null, facilityId: values.facilityId || null, startsAt: atNairobi(values.startsAt), endsAt: atNairobi(values.endsAt), location: values.location || null, meetingUrl: values.meetingUrl || null, notes: values.notes || null, billable: values.billable === 'yes', serviceCode: values.serviceCode || null, feeMinor: values.fee ? moneyToMinor(values.fee) : null, overrideReason: values.overrideReason || null, recurrence: !editing.id && values.frequency ? { frequency: values.frequency, until: `${values.until}T23:59:59+03:00` } : null };
        await practiceSend(`${base}/calendar`, editing.id ? { id: editing.id, action: 'edit', version: editing.version, scope: values.scope, event } : event, editing.id ? 'PATCH' : 'POST');
        setEditing(null); await mutate(); toast.success('Calendar updated');
      }} /><Button variant="ghost" onClick={() => setEditing(null)}>Close</Button>
    </CardContent></Card>}
  </div>;
}

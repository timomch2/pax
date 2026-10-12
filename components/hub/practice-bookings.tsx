'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PracticeForm, practiceFetch, practiceSend } from '@/components/hub/practice-form';
import { moneyToMinor, formatPracticeMoney } from '@/lib/practice-money';
import type { PracticeAction } from '@/lib/practice-policy';
import { PracticeInquiries } from '@/components/hub/practice-inquiries';
const yesNo = [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }];
const displayTime = (time: string) => new Date(time).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
const today = () => new Date(Date.now() + 10800000).toISOString().slice(0, 10);

export function PublicPracticeBooking({ slug }: { slug: string }) {
  const [date, setDate] = useState(''), [token, setToken] = useState(''), [selected, setSelected] = useState<any>(null), [status, setStatus] = useState(''), [verifying, setVerifying] = useState(false);
  useEffect(() => { setDate(today()); setToken(window.location.hash.slice(1)); }, []);
  const base = `/api/practice/public/${slug}`;
  const { data, error, mutate } = useSWR<any>(date ? `${base}?date=${date}` : null, practiceFetch);
  return <div className="space-y-6">
    {token && <Card><CardHeader><CardTitle>Confirm your request</CardTitle></CardHeader><CardContent><p className="mb-4">Confirm your email or accept the alternative appointment time sent to you.</p><Button disabled={verifying} onClick={async () => { setVerifying(true); try { const result = await practiceSend(base, { action: 'verify', token }); setStatus(result.status === 'APPROVED' ? 'Your appointment is confirmed.' : 'Email verified. Your request is awaiting approval.'); setToken(''); window.history.replaceState(null, '', window.location.pathname); await mutate(); } catch (e) { toast.error((e as Error).message); } finally { setVerifying(false); } }}>Confirm</Button></CardContent></Card>}
    {status && <p role="status" className="rounded-md bg-muted p-4">{status}</p>}
    <Card><CardHeader><CardTitle>{data?.practitioner ? `Request an appointment with ${data.practitioner}` : 'Request an appointment'}</CardTitle></CardHeader><CardContent className="space-y-4">
      <p>Times are in Africa/Nairobi. Requests need email verification and practitioner approval. Selecting a time does not reserve it.</p>
      <div><Label htmlFor="booking-date">Appointment date</Label><Input id="booking-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setSelected(null); }} /></div>
      {error ? <p role="alert" className="text-destructive">{error.message}</p> : !data ? <p>Loading available times…</p> : !data.slots.length ? <p>No available appointments on this date. Please choose another date.</p> : <div className="grid gap-3 sm:grid-cols-2">{data.slots.map((slot: any) => <Button key={`${slot.availabilityId}:${slot.startsAt}`} variant={selected === slot ? 'default' : 'outline'} className="h-auto whitespace-normal p-4 text-left" onClick={() => { setSelected(slot); setStatus(''); }}>{displayTime(slot.startsAt)} · {slot.appointmentType}<br />{slot.location} · {formatPracticeMoney(slot.feeMinor)}</Button>)}</div>}
      {selected && <PracticeForm key={selected.availabilityId + selected.startsAt} fields={[{ name: 'name', label: 'Full name', required: true }, { name: 'email', label: 'Email address', type: 'email', required: true }, { name: 'phone', label: 'Phone number', type: 'tel' }, { name: 'reminders', label: 'Email me optional appointment reminders', value: 'true', options: yesNo, required: true }]} submitLabel="Send verification email" onSubmit={async (v) => { await practiceSend(base, { name: v.name, email: v.email, phone: v.phone || null, availabilityId: selected.availabilityId, startsAt: selected.startsAt, remindersEnabled: v.reminders === 'true' }); setSelected(null); setStatus('Verification email queued. Check your inbox to submit your request. An appointment is confirmed only after approval.'); }} />}
    </CardContent></Card>
  </div>;
}

export function PracticeBookings({ workspaceId, capabilities }: { workspaceId: string; capabilities: PracticeAction[] }) {
  const base = `/api/practice/${workspaceId}`, [cursor, setCursor] = useState(''), [date, setDate] = useState(''), [selected, setSelected] = useState<any>(null), [matches, setMatches] = useState<any[]>([]);
  useEffect(() => setDate(today()), []);
  const { data, error, mutate } = useSWR<any>(`${base}/bookings${cursor ? `?cursor=${cursor}` : ''}`, practiceFetch);
  const { data: consulting } = useSWR<any>(`${base}/consulting`, practiceFetch);
  const { data: slots } = useSWR<any>(selected && date && data?.workspace.bookingEnabled ? `/api/practice/public/${data.workspace.bookingSlug}?date=${date}` : null, practiceFetch);
  const canManage = capabilities.includes('booking.manage'), owner = capabilities.includes('workspace.manage');
  if (error) return <p role="alert">{error.message}</p>;
  if (!data) return <p>Loading booking requests…</p>;
  return <div className="space-y-6">
    <PracticeInquiries key={workspaceId} workspaceId={workspaceId} canManage={canManage} />
    <Card><CardHeader><CardTitle>Booking requests</CardTitle></CardHeader><CardContent className="space-y-4">
      <p>Public link: <a className="underline" href={`/practice/book/${data.workspace.bookingSlug}`} target="_blank" rel="noreferrer">Open client booking page</a> · {data.workspace.bookingEnabled ? 'Enabled' : 'Paused'}</p>
      {!data.requests.length && <p>No requests awaiting review.</p>}
      {data.requests.map((r: any) => <div key={r.id} className="rounded-md bg-muted/40 p-4"><strong>{r.name}</strong><p>{displayTime(r.startsAt)} · {r.status.toLowerCase()}</p><p><span suppressHydrationWarning>{r.email}</span> · <span suppressHydrationWarning>{r.phone}</span></p>{r.proposedStartsAt && <p>Proposed: {displayTime(r.proposedStartsAt)}</p>}{canManage && <Button variant="outline" onClick={() => { setSelected(r); setMatches([]); }}>Review request</Button>}</div>)}
      {data.nextCursor && <Button variant="outline" onClick={() => setCursor(data.nextCursor)}>More requests</Button>}{cursor && <Button variant="outline" onClick={() => setCursor('')}>First page</Button>}
      {selected && canManage && <div className="space-y-4"><h3 className="font-semibold">Review {selected.name}</h3><p>Client matches are suggestions. Choose an existing client only after checking their identity, or explain why this is a different person.</p><Label htmlFor="alternative-date">Alternative date</Label><Input id="alternative-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><PracticeForm key={`${selected.id}:${matches.map((m) => m.id).join(',')}`} fields={[
        { name: 'action', label: 'Decision', required: true, options: [{ value: 'APPROVE', label: 'Approve requested time' }, { value: 'DECLINE', label: 'Decline' }, { value: 'PROPOSE', label: 'Propose another time' }] },
        { name: 'slot', label: 'Alternative available time (if proposing)', options: (slots?.slots ?? []).map((s: any) => ({ value: `${s.availabilityId}|${s.startsAt}`, label: `${displayTime(s.startsAt)} · ${s.location}` })) },
        { name: 'patientId', label: 'Matching existing client', options: matches.map((p) => ({ value: p.id, label: `${p.name} · ${p.patientCode}` })) },
        { name: 'distinctPatientReason', label: 'Why is this a different client?', type: 'textarea' },
      ]} submitLabel="Save decision" onSubmit={async (v) => {
        const [availabilityId, startsAt] = v.slot.split('|'); const response = await practiceSend(`${base}/bookings`, { id: selected.id, version: selected.version, action: v.action, patientId: v.patientId || null, ...(v.distinctPatientReason ? { distinctPatientReason: v.distinctPatientReason } : {}), ...(v.action === 'PROPOSE' ? { availabilityId, startsAt } : {}) }, 'PATCH');
        if (response.requiresPatientReview) { setMatches(response.matches); toast.info('Review possible matching clients below'); } else { setSelected(null); setMatches([]); await mutate(); toast.success('Request updated'); }
      }} /></div>}
    </CardContent></Card>
    {owner && <><Card><CardHeader><CardTitle>Booking and reminders</CardTitle></CardHeader><CardContent><PracticeForm fields={[
      { name: 'bookingEnabled', label: 'Accept public booking requests', value: String(data.workspace.bookingEnabled), options: yesNo, required: true }, { name: 'remindersEnabled', label: 'Enable optional reminders', value: String(data.workspace.remindersEnabled), options: yesNo, required: true }, { name: 'hours', label: 'Appointment reminder hours before', type: 'number', value: String(data.workspace.appointmentReminderHours), required: true }, { name: 'days', label: 'Payment reminder days after due date', value: data.workspace.overdueReminderDays.join(', ') },
    ]} submitLabel="Save settings" onSubmit={async (v) => { await practiceSend(`${base}/bookings`, { action: 'settings', bookingEnabled: v.bookingEnabled === 'true', remindersEnabled: v.remindersEnabled === 'true', appointmentReminderHours: Number(v.hours), overdueReminderDays: v.days.split(',').map((s) => s.trim()).filter(Boolean).map(Number) }); await mutate(); toast.success('Settings saved'); }} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Weekly availability and date exceptions</CardTitle></CardHeader><CardContent className="space-y-4"><p>A date exception replaces the weekly schedule for that day. A closed exception blocks the whole day. Availability does not reserve your calendar.</p>
      {data.rules.map((r: any) => <div key={r.id} className="flex flex-wrap justify-between gap-3 rounded-md bg-muted/40 p-3"><span>{r.date ?? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][r.weekday]} · {r.closed ? 'Closed' : `${String(Math.floor(r.startMinute / 60)).padStart(2, '0')}:${String(r.startMinute % 60).padStart(2, '0')}–${String(Math.floor(r.endMinute / 60)).padStart(2, '0')}:${String(r.endMinute % 60).padStart(2, '0')} · ${r.location}`}</span><Button variant="outline" onClick={async () => { try { await practiceSend(`${base}/bookings`, { action: 'remove', id: r.id }); await mutate(); } catch (e) { toast.error((e as Error).message); } }}>Remove availability</Button></div>)}
      <PracticeForm fields={[
        { name: 'weekday', label: 'Weekday (leave blank for date exception)', options: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((label, i) => ({ value: String(i), label })) }, { name: 'date', label: 'Exception date (instead of weekday)', type: 'date' }, { name: 'closed', label: 'Closed all day', options: yesNo, value: 'false', required: true },
        { name: 'start', label: 'Available from', type: 'time', value: '09:00', required: true }, { name: 'end', label: 'Available until', type: 'time', value: '17:00', required: true }, { name: 'duration', label: 'Appointment duration (minutes)', type: 'number', value: '30', required: true }, { name: 'buffer', label: 'Buffer before and after (minutes)', type: 'number', value: '0', required: true },
        { name: 'facilityId', label: 'Facility (optional)', options: (consulting?.relationships ?? []).map((r: any) => ({ value: r.facilityId, label: r.facility.officialName })) }, { name: 'location', label: 'Location or online', required: true }, { name: 'appointmentType', label: 'Appointment type / service', required: true }, { name: 'fee', label: 'Booking fee (KSh)', value: '0', required: true },
      ]} submitLabel="Add availability" onSubmit={async (v) => { const minute = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; }; await practiceSend(`${base}/bookings`, { action: 'rule', rule: { weekday: v.weekday === '' ? null : Number(v.weekday), date: v.date || null, closed: v.closed === 'true', startMinute: minute(v.start), endMinute: minute(v.end), durationMinutes: Number(v.duration), bufferMinutes: Number(v.buffer), facilityId: v.facilityId || null, location: v.location, appointmentType: v.appointmentType, feeMinor: moneyToMinor(v.fee) } }); await mutate(); toast.success('Availability added'); }} />
    </CardContent></Card></>}
  </div>;
}

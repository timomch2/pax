'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { PRACTICE_SECTIONS, type PracticeSection } from '@/lib/practice-routes';
import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PracticeForm, practiceFetch, practiceSend, type PracticeField } from '@/components/hub/practice-form';
import { formatPracticeMoney, moneyToMinor } from '@/lib/practice-money';
import type { PracticeAction } from '@/lib/practice-policy';
import { PracticePatients } from '@/components/hub/practice-patients';
import { PracticeCalendar } from '@/components/hub/practice-calendar';
import { PracticeBookings } from '@/components/hub/practice-bookings';
import { PracticeReconciliation } from '@/components/hub/practice-reconciliation';
import { PracticeReports } from '@/components/hub/practice-reports';
import { PracticeFinance } from '@/components/hub/practice-finance';

export type Workspace = { id: string; name: string; isOwner: boolean; active: boolean; bookingSlug: string; capabilities: PracticeAction[] };
const facilityFields: PracticeField[] = [
  { name: 'officialName', label: 'Facility name', required: true }, { name: 'countryCode', label: 'Country code (e.g. KE)', value: 'KE', required: true },
  { name: 'county', label: 'County / state', required: true }, { name: 'town', label: 'Town', required: true }, { name: 'subCounty', label: 'Sub-county' },
  { name: 'facilityType', label: 'Facility type', required: true }, { name: 'ownership', label: 'Ownership' }, { name: 'kephLevel', label: 'Facility level' },
  { name: 'fidCode', label: 'Registry facility code' }, { name: 'frCode', label: 'Registry reference' }, { name: 'registrationNumber', label: 'Registration number' },
  { name: 'regulatoryBody', label: 'Regulatory body' },
];
const roleOptions = [{ value: 'RECEPTION', label: 'Reception' }, { value: 'FINANCE', label: 'Finance' }, { value: 'RECEPTION,FINANCE', label: 'Reception and finance' }];

export function PracticeWorkspaceView({ section = 'facilities' }: { section?: PracticeSection }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error, mutate } = useSWR<{ canCreate: boolean; workspaces: Workspace[] }>('/api/practice/workspaces', practiceFetch);
  const selected = searchParams.get('workspace') ?? '';
  const navigate = (next: PracticeSection, workspaceId = selected) => {
    const query = new URLSearchParams(searchParams.toString());
    if (workspaceId) query.set('workspace', workspaceId); else query.delete('workspace');
    router.push(`${PRACTICE_SECTIONS[next].path}${query.size ? `?${query}` : ''}`);
  };
  const workspace = data?.workspaces.find((row) => row.id === selected) ?? data?.workspaces[0];
  if (error) return <p role="alert" className="py-6 text-destructive">{error.message}</p>;
  if (!data) return <p className="py-6">Loading workspaces…</p>;
  return <div className="space-y-6 py-6">
    <div className="flex flex-wrap items-end gap-4">
      {!!data.workspaces.length && <div className="min-w-64"><Label htmlFor="practice-workspace">Current practitioner</Label><select id="practice-workspace" className="mt-2 h-10 w-full rounded-md border bg-background px-3" value={workspace?.id} onChange={(event) => navigate(section, event.target.value)}>{data.workspaces.map((row) => <option key={row.id} value={row.id}>{row.name}{row.isOwner ? ' — your workspace' : ''}</option>)}</select></div>}
      {data.canCreate && !data.workspaces.some((row) => row.isOwner) && <Button onClick={async () => { try { await practiceSend('/api/practice/workspaces', {}); await mutate(); } catch (e) { toast.error((e as Error).message); } }}>Create my workspace</Button>}
    </div>
    {!workspace ? <p>No workspace yet. Practitioners need Professional membership. Staff join through an invitation.</p> : <>
      {!workspace.active && <p role="status" className="rounded-md bg-muted p-4">Your workspace is read-only. You can view and export existing records. Restore Professional membership to resume activity.</p>}
      <div key={workspace.id}>
        {PRACTICE_SECTIONS[section].capability && !workspace.capabilities.includes(PRACTICE_SECTIONS[section].capability!) && <p role="alert" className="py-6 text-muted-foreground">You do not have access to this section of the workspace.</p>}
        {section === 'facilities' && <PracticeFacilities workspace={workspace} />}
        {section === 'patients' && workspace.capabilities.includes('patient.read') && <PracticePatients workspaceId={workspace.id} capabilities={workspace.capabilities} />}
        {section === 'calendar' && workspace.capabilities.includes('calendar.read') && <PracticeCalendar workspaceId={workspace.id} capabilities={workspace.capabilities} />}
        {section === 'bookings' && workspace.capabilities.includes('calendar.read') && <PracticeBookings workspaceId={workspace.id} capabilities={workspace.capabilities} />}
        {section === 'finance' && workspace.capabilities.includes('billing.read') && <PracticeFinance workspaceId={workspace.id} capabilities={workspace.capabilities} />}
        {section === 'accounts' && workspace.capabilities.includes('billing.read') && <PracticeFinance workspaceId={workspace.id} capabilities={workspace.capabilities} initialTab="payers" />}
        {section === 'reports' && workspace.capabilities.includes('report.read') && <PracticeReports workspaceId={workspace.id} />}
        {section === 'team' && workspace.capabilities.includes('team.manage') && <PracticeTeam workspace={workspace} />}
        {section === 'reconciliation' && workspace.capabilities.includes('clinical.read') && <PracticeReconciliation workspaceId={workspace.id} writable={workspace.capabilities.includes('billing.approve')} />}
      </div>
    </>}
  </div>;
}

function FacilityDescription({ facility }: { facility: any }) {
  return <><strong>{facility.officialName}</strong><p className="text-sm text-muted-foreground">{[facility.town, facility.subCounty, facility.county, facility.countryCode].filter(Boolean).join(' · ')}</p><p className="text-sm">{[facility.facilityType, facility.kephLevel, facility.fidCode && `Code ${facility.fidCode}`].filter(Boolean).join(' · ')}</p></>;
}

function PracticeFacilities({ workspace }: { workspace: Workspace }) {
  const base = `/api/practice/${workspace.id}`;
  const [query, setQuery] = useState(''), [searched, setSearched] = useState(''), [cursor, setCursor] = useState('');
  const { data, error, mutate } = useSWR<any>(`${base}/facilities?q=${encodeURIComponent(searched)}${cursor ? `&cursor=${cursor}` : ''}`, practiceFetch);
  const { data: consulting, mutate: refreshConsulting } = useSWR<any>(`${base}/consulting`, practiceFetch);
  const [selected, setSelected] = useState<any>(null), [adding, setAdding] = useState(false), [correcting, setCorrecting] = useState(false), [matches, setMatches] = useState<any[]>([]);
  const canManage = workspace.capabilities.includes('facility.manage');
  const saveFacility = async (values: Record<string, string>) => {
    const { disputeReason, ...fields } = values;
    const facility = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value || null]));
    const response = await practiceSend(`${base}/facilities`, { facility, ...(disputeReason ? { disputeReason } : {}) });
    if (response.requiresReview) { setMatches(response.matches); toast.info(response.correctionId ? 'Submitted for admin review' : 'Review the matching facilities before adding'); }
    else { setSelected(response.facility); setAdding(false); setMatches([]); await mutate(); toast.success('Facility added'); }
  };
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Facilities you consult for</CardTitle></CardHeader><CardContent className="space-y-4">
      {consulting?.relationships?.length ? consulting.relationships.map((row: any) => <div key={row.id} className="flex flex-wrap justify-between gap-3 rounded-md bg-muted/40 p-4"><div><FacilityDescription facility={row.facility} /><p className="text-sm">From {row.startsAt.slice(0, 10)}{row.endsAt ? ` until ${row.endsAt.slice(0, 10)}` : ' · ongoing'}{row.rateMinor !== undefined ? ` · ${formatPracticeMoney(row.rateMinor)}` : ''}</p></div>{canManage && <Button variant="outline" onClick={() => { setSelected({ ...row.facility, relationship: row }); setCorrecting(false); }}>Edit relationship</Button>}</div>) : <p className="text-muted-foreground">Select a facility below to add a consulting relationship.</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Search the shared directory</CardTitle></CardHeader><CardContent className="space-y-4">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setSearched(query); setCursor(''); setAdding(false); }}><Input aria-label="Search facilities by name, code or location" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Facility name, code or location" /><Button type="submit">Search</Button></form>
      {error && <p role="alert" className="text-destructive">{error.message}</p>}
      {!data ? <p>Loading facilities…</p> : !data.facilities.length ? <p>No matching facilities found.</p> : <div className="grid gap-3 md:grid-cols-2">{data.facilities.map((facility: any) => <button type="button" key={facility.id} className="rounded-md border border-border p-4 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setSelected(facility); setCorrecting(false); }}><FacilityDescription facility={facility} /></button>)}</div>}
      <div className="flex gap-2">{data?.nextCursor && <Button variant="outline" onClick={() => setCursor(data.nextCursor)}>Next facilities</Button>}{cursor && <Button variant="outline" onClick={() => setCursor('')}>First page</Button>}{canManage && <Button variant="outline" onClick={() => { setAdding(!adding); setMatches([]); }}>Add a missing facility</Button>}</div>
      {adding && <div className="space-y-4"><p>Existing facilities must be reused. Possible duplicates go to admin review.</p><PracticeForm fields={[...facilityFields, { name: 'disputeReason', label: 'Why is this different from suggested matches?', type: 'textarea' }]} submitLabel="Check and add facility" onSubmit={saveFacility} />{matches.map((facility) => <Button key={facility.id} variant="outline" onClick={() => { setSelected(facility); setAdding(false); }}>{facility.officialName} · {facility.town ?? facility.county}</Button>)}</div>}
    </CardContent></Card>
    {selected && <Card><CardHeader><CardTitle>{selected.officialName}</CardTitle></CardHeader><CardContent className="space-y-4"><FacilityDescription facility={selected} />
      {canManage && <><PracticeForm key={selected.id + (selected.relationship?.id ?? '')} fields={[
        { name: 'startsAt', label: 'Consulting start date', type: 'date', required: true, value: selected.relationship?.startsAt.slice(0, 10) }, { name: 'endsAt', label: 'End date (leave blank if ongoing)', type: 'date', value: selected.relationship?.endsAt?.slice(0, 10) },
        { name: 'rateType', label: 'Charging arrangement', required: true, value: selected.relationship?.rateType ?? 'SERVICE', options: [{ value: 'SERVICE', label: 'Per service' }, { value: 'HOUR', label: 'Hourly' }, { value: 'SESSION', label: 'Per session' }, { value: 'MONTHLY', label: 'Monthly retainer' }] },
        { name: 'rate', label: 'Default amount (KSh)', value: String((selected.relationship?.rateMinor ?? 0) / 100), required: true },
        { name: 'covered', label: 'Services covered by retainer (comma-separated)', value: selected.relationship?.coveredServices?.join(', ') ?? '' },
      ]} submitLabel="Save consulting relationship" onSubmit={async (values) => {
        await practiceSend(`${base}/consulting`, { ...(selected.relationship ? { id: selected.relationship.id } : {}), facilityId: selected.id, startsAt: `${values.startsAt}T00:00:00+03:00`, endsAt: values.endsAt ? `${values.endsAt}T23:59:59+03:00` : null, rateType: values.rateType, rateMinor: moneyToMinor(values.rate), coveredServices: values.covered.split(',').map((v) => v.trim()).filter(Boolean) });
        await refreshConsulting(); setSelected(null); toast.success('Consulting relationship saved');
      }} /><Button variant="outline" onClick={() => setCorrecting(!correcting)}>Suggest a facility correction</Button>
      {correcting && <PracticeForm key={`correction-${selected.id}`} fields={[...facilityFields.map((field) => ({ ...field, value: selected[field.name] ?? '' })), { name: 'reason', label: 'Reason for correction', required: true, type: 'textarea' }]} submitLabel="Submit correction for review" onSubmit={async (values) => {
        const { reason, ...fields } = values;
        await practiceSend(`${base}/facilities`, { facilityId: selected.id, reason, proposed: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value || null])) }, 'PATCH');
        setCorrecting(false); toast.success('Correction submitted for admin review');
      }} />}</>}
    </CardContent></Card>}
  </div>;
}

function PracticeTeam({ workspace }: { workspace: Workspace }) {
  const url = `/api/practice/${workspace.id}/team`;
  const { data, error, mutate } = useSWR<any>(url, practiceFetch);
  const change = async (body: unknown) => { try { await practiceSend(url, body, 'PATCH'); await mutate(); toast.success('Access updated'); } catch (error) { toast.error((error as Error).message); } };
  return <div className="space-y-6"><Card><CardHeader><CardTitle>Invite staff</CardTitle></CardHeader><CardContent><PracticeForm fields={[{ name: 'email', label: 'Staff email', type: 'email', required: true }, { name: 'roles', label: 'Workspace access', required: true, options: roleOptions }]} submitLabel="Send invitation" onSubmit={async (values) => { await practiceSend(url, { email: values.email, roles: values.roles.split(',') }); await mutate(); toast.success('Invitation queued. Delivery status is available in notification monitoring.'); }} /></CardContent></Card>
    {error && <p role="alert">{error.message}</p>}
    <Card><CardHeader><CardTitle>Staff access</CardTitle></CardHeader><CardContent className="space-y-4">{data?.members.map((member: any) => <div key={member.id} className="space-y-2 rounded-md border p-4"><strong>{member.user.name}</strong><p suppressHydrationWarning>{member.user.email}</p>{member.revokedAt ? <p>Access revoked. Send a new invitation to restore access.</p> : <div className="flex flex-wrap gap-2"><select aria-label={`Roles for ${member.user.name}`} className="rounded-md border bg-background p-2" value={[...member.roles].sort().join(',')} onChange={(e) => change({ kind: 'member', id: member.id, roles: e.target.value.split(',') })}>{roleOptions.map((option) => <option key={option.value} value={option.value.split(',').sort().join(',')}>{option.label}</option>)}</select><Button variant="outline" onClick={() => change({ kind: 'member', id: member.id, revoke: true })}>Revoke access</Button></div>}</div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>Invitations</CardTitle></CardHeader><CardContent className="space-y-3">{data?.invitations.map((invitation: any) => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3"><div><span suppressHydrationWarning>{invitation.email}</span><p className="text-sm text-muted-foreground">{invitation.acceptedAt ? 'Accepted' : invitation.revokedAt ? 'Revoked' : `Expires ${invitation.expiresAt.slice(0, 10)}`}</p></div>{!invitation.acceptedAt && !invitation.revokedAt && <Button variant="outline" onClick={() => change({ kind: 'invitation', id: invitation.id })}>Revoke invitation</Button>}</div>)}</CardContent></Card>
  </div>;
}

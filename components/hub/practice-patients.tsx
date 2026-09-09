'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PracticeForm, practiceFetch, practiceSend, type PracticeField } from '@/components/hub/practice-form';
import type { PracticeAction } from '@/lib/practice-policy';

const patientFields: PracticeField[] = [
  { name: 'name', label: 'Patient name', required: true }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email', type: 'email' },
  { name: 'remindersEnabled', label: 'Optional email reminders', value: 'true', options: [{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Opt out' }] }, { name: 'patientRef', label: 'Your patient / file reference' }, { name: 'nationalId', label: 'Identification number (optional)' }, { name: 'duplicateReason', label: 'If similar records exist, why is this a separate patient?' },
];
export function PracticePatients({ workspaceId, capabilities }: { workspaceId: string; capabilities: PracticeAction[] }) {
  const base = `/api/practice/${workspaceId}/patients`;
  const [query, setQuery] = useState(''), [searched, setSearched] = useState(''), [cursor, setCursor] = useState('');
  const [editing, setEditing] = useState<any>(null), [notesFor, setNotesFor] = useState<string | null>(null), [matches, setMatches] = useState<any[]>([]);
  const { data, error, mutate } = useSWR<any>(`${base}?q=${encodeURIComponent(searched)}${cursor ? `&cursor=${cursor}` : ''}`, practiceFetch);
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Patient directory</CardTitle></CardHeader><CardContent className="space-y-4"><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setSearched(query); setCursor(''); }}><Input aria-label="Search patients" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, reference, phone or email" /><Button type="submit">Search</Button></form>
      {capabilities.includes('patient.manage') && <Button variant="outline" onClick={() => { setEditing({}); setMatches([]); }}>Add patient</Button>}
      {error && <p role="alert">{error.message}</p>}
      {!data ? <p>Loading patients…</p> : !data.patients.length ? <p>No patients found. Patients do not need a PAX account.</p> : data.patients.map((patient: any) => <div key={patient.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"><div><strong>{patient.name}</strong><p className="text-sm text-muted-foreground">{patient.patientRef || patient.patientCode}</p><p><span suppressHydrationWarning>{patient.phone}</span> <span suppressHydrationWarning>{patient.email}</span></p></div><div className="flex gap-2">{capabilities.includes('patient.manage') && <Button variant="outline" onClick={() => { setEditing(patient); setMatches([]); }}>Edit patient</Button>}{capabilities.includes('clinical.read') && <Button variant="outline" onClick={() => setNotesFor(patient.id)}>Clinical notes</Button>}</div></div>)}
      <div className="flex gap-2">{data?.nextCursor && <Button variant="outline" onClick={() => setCursor(data.nextCursor)}>Next patients</Button>}{cursor && <Button variant="outline" onClick={() => setCursor('')}>First page</Button>}</div>
    </CardContent></Card>
    {editing && <Card><CardHeader><CardTitle>{editing.id ? 'Edit patient' : 'Add patient'}</CardTitle></CardHeader><CardContent className="space-y-4"><PracticeForm key={editing.id ?? 'new'} fields={patientFields.map((field) => ({ ...field, value: editing[field.name] === undefined ? field.value ?? '' : String(editing[field.name] ?? '') }))} submitLabel="Save patient" onSubmit={async (values) => {
      const { duplicateReason, remindersEnabled, ...fields } = values;
      const result = await practiceSend(base, { remindersEnabled: remindersEnabled === 'true', ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value || null])), ...(editing.id ? { id: editing.id } : {}), ...(duplicateReason ? { duplicateReason } : {}) });
      if (result.requiresReview) { setMatches(result.matches); toast.info('Review similar records. Select the existing patient or explain why this is separate.'); }
      else { setEditing(null); await mutate(); toast.success('Patient saved'); }
    }} />{matches.map((patient) => <Button key={patient.id} variant="outline" onClick={() => { setQuery(patient.patientCode ?? patient.name); setSearched(patient.patientCode ?? patient.name); setEditing(null); }}>{patient.name} · {patient.patientRef ?? patient.patientCode}</Button>)}<Button variant="ghost" onClick={() => setEditing(null)}>Close</Button></CardContent></Card>}
    {notesFor && <PracticeNotes base={base} patientId={notesFor} writable={capabilities.includes('clinical.manage')} onClose={() => setNotesFor(null)} />}
  </div>;
}

function PracticeNotes({ base, patientId, writable, onClose }: { base: string; patientId: string; writable: boolean; onClose: () => void }) {
  const url = `${base}/${patientId}/notes`;
  const { data, error, mutate } = useSWR<any>(url, practiceFetch);
  return <Card><CardHeader><CardTitle>Clinical notes — practitioner access only</CardTitle></CardHeader><CardContent className="space-y-4">
    {error && <p role="alert">{error.message}</p>}{data?.originalNote && <p className="whitespace-pre-wrap">{data.originalNote}</p>}
    {data?.notes.map((note: any) => <div key={note.id} className="rounded-md border p-3"><p className="text-sm text-muted-foreground">{note.createdAt.slice(0, 10)}</p><p className="whitespace-pre-wrap">{note.body}</p></div>)}
    {data?.legacyNotes.map((note: any) => <div key={note.id} className="rounded-md border p-3"><p className="text-sm text-muted-foreground">Original record · {note.createdAt.slice(0, 10)}</p><p className="whitespace-pre-wrap">{note.content}</p></div>)}
    {writable && <PracticeForm fields={[{ name: 'body', label: 'New clinical note', type: 'textarea', required: true }]} submitLabel="Add note" onSubmit={async (values) => { await practiceSend(url, values); await mutate(); toast.success('Note added'); }} />}
    <Button variant="ghost" onClick={onClose}>Close notes</Button>
  </CardContent></Card>;
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus, Search, Users, Pencil, Trash2, Phone, IdCard, FileText,
  Copy, Check, History, Mail, CalendarClock, FolderOpen, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

const TEAL = '#2ABFB0';


type Patient = {
  id: string;
  name: string;
  patientCode: string | null;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  patientRef: string | null;
  notes: string | null;
  lastVisit: string | null;
  lastService: string | null;
  visitCount: number;
  totalBilled: number;
  outstanding: number;
  isReturning: boolean;
  _count?: { invoices: number };
};

const empty = { name: '', phone: '', email: '', nationalId: '', patientRef: '', notes: '' };

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi',
  });
}

function PatientCode({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`Patient ID ${code} copied.`);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy the ID.');
    }
  };
  return (
    <button
      onClick={(e) => { e.stopPropagation(); copy(); }}
      title="Copy patient ID"
      className="inline-flex items-center gap-1.5 rounded-md border border-[#2ABFB0]/30 bg-[#2ABFB0]/10 px-2 py-0.5 font-mono text-[11px] tracking-wide text-[#2ABFB0] transition-colors hover:bg-[#2ABFB0]/20"
    >
      {code}
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-60" />}
    </button>
  );
}

export function HubPatientsList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'recent' | 'name'>('recent');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  const [recordOpen, setRecordOpen] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [recordLoading, setRecordLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hub/patients?q=${encodeURIComponent(q)}&sort=${sort}`);
      if (res.ok) setPatients((await res.json()).patients ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [q, sort]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const openRecord = async (p: Patient) => {
    setRecordOpen(true);
    setRecordLoading(true);
    setRecord(null);
    try {
      const res = await fetch(`/api/hub/patients/${p.id}`);
      if (!res.ok) throw new Error('Could not open that record.');
      setRecord((await res.json()).patient ?? null);
    } catch (e: any) {
      toast.error(e.message || 'Could not open that record.');
      setRecordOpen(false);
    } finally {
      setRecordLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };
  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({
      name: p.name,
      phone: p.phone ?? '',
      email: p.email ?? '',
      nationalId: p.nationalId ?? '',
      patientRef: p.patientRef ?? '',
      notes: p.notes ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Patient name is required.');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/hub/patients/${editing.id}` : '/api/hub/patients';
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json().catch(() => ({}));
      if (!editing && data?.patient?.patientCode) {
        toast.success(`Patient added — ID ${data.patient.patientCode}`);
      } else {
        toast.success(editing ? 'Patient updated.' : 'Patient added.');
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Patient) => {
    if (!confirm(`Delete ${p.name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/hub/patients/${p.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Patient deleted.');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Could not delete.');
    }
  };

  const returningCount = patients.filter((p) => p.isReturning).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Patients</h2>
          <p className="text-sm text-muted-foreground">
            Your private patient records. Every patient gets a permanent PAX ID — quote it on a return
            visit to pull up their whole history instantly.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2" style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>
          <Plus className="h-4 w-4" /> Add patient
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by PAX ID, name, phone, file ref or national ID..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-black/[0.06] bg-white p-1">
          {([['recent', 'Recent visits'], ['name', 'A – Z']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                sort === key ? 'bg-[#2ABFB0]/15 text-[#2ABFB0]' : 'text-muted-foreground hover:text-[#1A2332]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!loading && patients.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {patients.length} record{patients.length === 1 ? '' : 's'}
          {returningCount > 0 && <> · {returningCount} returning patient{returningCount === 1 ? '' : 's'}</>}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : patients.length === 0 ? (
        <Card className="border-black/[0.06] bg-white">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{q ? 'No patients match your search.' : 'No patients yet. Add your first record.'}</p>
            {!q && <Button onClick={openNew} size="sm" style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>Add patient</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((p) => (
            <Card
              key={p.id}
              onClick={() => openRecord(p)}
              className="cursor-pointer border-black/[0.06] bg-white transition-colors hover:border-[#2ABFB0]/30"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <PatientCode code={p.patientCode} />
                      {p.isReturning && (
                        <Badge variant="outline" className="gap-1 border-[#FBBF24]/40 text-[10px] text-[#FBBF24]">
                          <RotateCcw className="h-2.5 w-2.5" /> Returning
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-[#1A2332]" aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); remove(p); }} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {p.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {p.phone}</div>}
                  {p.patientRef && <div className="flex items-center gap-2"><IdCard className="h-3.5 w-3.5" /> File ref: {p.patientRef}</div>}
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {p.lastVisit ? <>Last seen {fmtDate(p.lastVisit)}</> : <>No visits recorded yet</>}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" /> {p.visitCount} visit{p.visitCount === 1 ? '' : 's'} on file
                  </div>
                </div>

                {p.outstanding > 0 && (
                  <p className="mt-3 rounded-md bg-[#FBBF24]/10 px-2 py-1 text-[11px] text-[#FBBF24]">
                    KSh {p.outstanding.toLocaleString()} outstanding
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ---- Full patient record ---- */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <FolderOpen className="h-4 w-4" style={{ color: TEAL }} />
              {record?.name ?? 'Patient record'}
              <PatientCode code={record?.patientCode ?? null} />
            </DialogTitle>
          </DialogHeader>

          {recordLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : record ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                {record.phone && (
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {record.phone}</div>
                )}
                {record.email && (
                  <div className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> <span className="truncate">{record.email}</span></div>
                )}
                {record.nationalId && (
                  <div className="flex items-center gap-2"><IdCard className="h-3.5 w-3.5 text-muted-foreground" /> {record.nationalId}</div>
                )}
                {record.patientRef && (
                  <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-muted-foreground" /> {record.patientRef}</div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" /> On file since {fmtDate(record.createdAt)}
                </div>
              </div>

              {record.notes && (
                <div className="rounded-lg border border-black/[0.06] bg-[#FAF8F5] p-3 text-sm text-muted-foreground">
                  {record.notes}
                </div>
              )}

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <History className="h-4 w-4" style={{ color: TEAL }} />
                  Visit &amp; billing history ({record.invoices?.length ?? 0})
                </h3>
                {(record.invoices?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No visits recorded for this patient yet.</p>
                ) : (
                  <div className="space-y-2">
                    {record.invoices.map((inv: any) => {
                      const paid = (inv.payers ?? []).reduce((s: number, x: any) => s + (x.amountPaid ?? 0), 0);
                      const due = Math.max((inv.totalAmount ?? 0) - paid, 0);
                      return (
                        <div key={inv.id} className="rounded-lg border border-black/[0.06] bg-[#FAF8F5] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{inv.serviceType || inv.serviceDesc}</p>
                              <p className="text-xs text-muted-foreground">
                                {fmtDate(inv.serviceDate)} · {inv.invoiceNumber}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="font-mono text-sm">KSh {(inv.totalAmount ?? 0).toLocaleString()}</p>
                              <Badge
                                variant="outline"
                                className={`mt-1 text-[10px] ${
                                  inv.status === 'PAID'
                                    ? 'border-[#2ABFB0]/40 text-[#2ABFB0]'
                                    : inv.status === 'OVERDUE'
                                    ? 'border-red-500/40 text-red-400'
                                    : 'border-[#FBBF24]/40 text-[#FBBF24]'
                                }`}
                              >
                                {inv.status}
                              </Badge>
                            </div>
                          </div>
                          {due > 0 && (
                            <p className="mt-2 text-[11px] text-[#FBBF24]">KSh {due.toLocaleString()} still due</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ---- Add / edit ---- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit patient' : 'Add patient'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editing?.patientCode && (
              <div className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-[#FAF8F5] p-2.5 text-xs text-muted-foreground">
                <span>System patient ID</span>
                <PatientCode code={editing.patientCode} />
                <span className="ml-auto">Permanent</span>
              </div>
            )}
            <div>
              <Label>Full name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Wanjiku" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254..." />
              </div>
              <div>
                <Label>Your file ref</Label>
                <Input value={form.patientRef} onChange={(e) => setForm({ ...form, patientRef: e.target.value })} placeholder="e.g. OPD-102" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>National ID</Label>
                <Input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            {!editing && (
              <p className="text-xs text-muted-foreground">
                A permanent PAX patient ID will be generated automatically once you save.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Add patient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

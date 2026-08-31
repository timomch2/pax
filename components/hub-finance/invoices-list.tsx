'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, FileText, Trash2, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import {
  formatKsh,
  PAYER_TYPES,
  PAYER_TYPE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE,
} from '@/lib/hub-finance';

const TEAL = '#2ABFB0';

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }) : '—';

const STATUS_FILTERS = ['ALL', 'UNPAID', 'PARTIAL', 'PAID'];

type PayerLine = {
  payerType: string;
  payerName: string;
  insurerId: string;
  amount: string;
  method: string;
  dueDate: string;
  contactPhone: string;
  contactEmail: string;
};

const newLine = (payerType = 'PATIENT'): PayerLine => ({
  payerType,
  payerName: '',
  insurerId: '',
  amount: '',
  method: '',
  dueDate: '',
  contactPhone: '',
  contactEmail: '',
});

export function InvoicesList() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/hub/invoices?${params.toString()}`);
      if (res.ok) setInvoices((await res.json()).invoices ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-sm text-muted-foreground">Bill patients, split across payers, and track every balance.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2" style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>
          <Plus className="h-4 w-4" /> New invoice
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient, invoice no. or service…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                status === s ? 'text-[#0B0F1A]' : 'text-muted-foreground hover:text-[#1A2332]'
              }`}
              style={status === s ? { backgroundColor: TEAL } : { backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              {s === 'ALL' ? 'All' : INVOICE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : invoices.length === 0 ? (
        <Card className="border-black/[0.06] bg-white">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <ReceiptText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{q || status !== 'ALL' ? 'No invoices match your filters.' : 'No invoices yet. Create your first one.'}</p>
            {!q && status === 'ALL' && <Button onClick={() => setOpen(true)} size="sm" style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>New invoice</Button>}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-black/[0.06] bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Paid</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const paid = (inv.payers ?? []).reduce((s: number, p: any) => s + (p.amountPaid || 0), 0);
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => router.push(`/dashboard/hub/invoices/${inv.id}`)}
                        className="cursor-pointer border-b border-black/[0.06] transition-colors last:border-0 hover:bg-black/[0.02]"
                      >
                        <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3">
                          <div className="truncate">{inv.patientName}</div>
                          <div className="truncate text-xs text-muted-foreground">{inv.serviceDesc}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.serviceDate)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatKsh(inv.totalAmount)}</td>
                        <td className="px-4 py-3 text-right text-emerald-400">{formatKsh(paid)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${INVOICE_STATUS_BADGE[inv.status] || ''}`}>
                            {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <NewInvoiceDialog open={open} onOpenChange={setOpen} onCreated={(id) => router.push(`/dashboard/hub/invoices/${id}`)} />
    </div>
  );
}

function NewInvoiceDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [patients, setPatients] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [hubPatientId, setHubPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<PayerLine[]>([newLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [pr, ir] = await Promise.all([fetch('/api/hub/patients'), fetch('/api/hub/insurers')]);
        if (pr.ok) setPatients((await pr.json()).patients ?? []);
        if (ir.ok) setInsurers((await ir.json()).insurers ?? []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [open]);

  const reset = () => {
    setHubPatientId('');
    setPatientName('');
    setServiceDesc('');
    setServiceType('');
    setServiceDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setLines([newLine()]);
  };

  const total = lines.reduce((s, l) => s + (Math.round(Number(l.amount) || 0)), 0);

  const updateLine = (i: number, patch: Partial<PayerLine>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const resolvedPatientName = hubPatientId ? patients.find((p) => p.id === hubPatientId)?.name ?? '' : patientName;

  const submit = async () => {
    if (!resolvedPatientName.trim()) {
      toast.error('Choose a patient or enter a name.');
      return;
    }
    if (!serviceDesc.trim()) {
      toast.error('Service description is required.');
      return;
    }
    if (total <= 0) {
      toast.error('Add at least one payer amount.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/hub/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hubPatientId: hubPatientId || null,
          patientName: hubPatientId ? undefined : patientName,
          serviceDesc,
          serviceType,
          serviceDate,
          notes,
          payers: lines
            .filter((l) => Number(l.amount) > 0)
            .map((l) => ({
              payerType: l.payerType,
              payerName: l.payerName || (l.payerType === 'PATIENT' ? resolvedPatientName : PAYER_TYPE_LABELS[l.payerType]),
              insurerId: l.insurerId || null,
              amount: Number(l.amount),
              method: l.method || null,
              dueDate: l.dueDate || null,
              contactPhone: l.contactPhone || null,
              contactEmail: l.contactEmail || null,
            })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      toast.success('Invoice created.');
      reset();
      onOpenChange(false);
      onCreated(json.invoice.id);
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Patient record</Label>
              <Select value={hubPatientId || 'none'} onValueChange={(v) => setHubPatientId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked / one-off</SelectItem>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.patientCode ? ` — ${p.patientCode}` : ''}
                      {p.visitCount > 0 ? ` (${p.visitCount} visit${p.visitCount === 1 ? '' : 's'})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{hubPatientId ? 'Patient' : 'Patient name *'}</Label>
              <Input
                value={resolvedPatientName}
                onChange={(e) => setPatientName(e.target.value)}
                disabled={!!hubPatientId}
                placeholder="Jane Wanjiku"
              />
            </div>
          </div>

          {/* Service */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Service description *</Label>
              <Input value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} placeholder="e.g. Consultation + lab tests" />
            </div>
            <div>
              <Label>Service type</Label>
              <Input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="e.g. Outpatient" />
            </div>
          </div>
          <div>
            <Label>Service date</Label>
            <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="sm:max-w-xs" />
          </div>

          {/* Payers */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm">Payers (split the bill)</Label>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setLines((ls) => [...ls, newLine('INSURER')])}>
                <Plus className="h-3.5 w-3.5" /> Add payer
              </Button>
            </div>
            <div className="space-y-3">
              {lines.map((l, i) => (
                <div key={i} className="rounded-lg border border-black/[0.06] bg-[#FAF8F5] p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Payer type</Label>
                      <Select value={l.payerType} onValueChange={(v) => updateLine(i, { payerType: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYER_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{PAYER_TYPE_LABELS[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Payer name</Label>
                      <Input
                        className="h-9"
                        value={l.payerName}
                        onChange={(e) => updateLine(i, { payerName: e.target.value })}
                        placeholder={l.payerType === 'PATIENT' ? resolvedPatientName || 'Patient' : 'e.g. SHA'}
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Amount (KSh)</Label>
                      <Input className="h-9" type="number" min="0" value={l.amount} onChange={(e) => updateLine(i, { amount: e.target.value })} placeholder="0" />
                    </div>
                    <div>
                      <Label className="text-xs">Method</Label>
                      <Select value={l.method || 'none'} onValueChange={(v) => updateLine(i, { method: v === 'none' ? '' : v })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Due date</Label>
                      <Input className="h-9" type="date" value={l.dueDate} onChange={(e) => updateLine(i, { dueDate: e.target.value })} />
                    </div>
                  </div>
                  {(l.payerType === 'INSURER' || l.payerType === 'SHA_NHIF' || l.payerType === 'EMPLOYER' || l.payerType === 'NGO_DONOR') && (
                    <div className="mt-2">
                      <Label className="text-xs">Link insurer / scheme</Label>
                      <Select value={l.insurerId || 'none'} onValueChange={(v) => {
                        const ins = insurers.find((x) => x.id === v);
                        updateLine(i, { insurerId: v === 'none' ? '' : v, payerName: ins && !l.payerName ? (ins.shortName || ins.name) : l.payerName });
                      }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Optional…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {insurers.map((ins) => (
                            <SelectItem key={ins.id} value={ins.id}>{ins.shortName || ins.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Input className="h-9" value={l.contactPhone} onChange={(e) => updateLine(i, { contactPhone: e.target.value })} placeholder="Contact phone (for reminders)" />
                    <Input className="h-9" value={l.contactEmail} onChange={(e) => updateLine(i, { contactEmail: e.target.value })} placeholder="Contact email" />
                  </div>
                  {lines.length > 1 && (
                    <div className="mt-2 flex justify-end">
                      <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-black/[0.04] px-4 py-2.5">
              <span className="text-sm text-muted-foreground">Invoice total</span>
              <span className="font-display text-lg font-bold" style={{ color: TEAL }}>{formatKsh(total)}</span>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Payment terms, remarks…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>
            {saving ? 'Creating…' : 'Create invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

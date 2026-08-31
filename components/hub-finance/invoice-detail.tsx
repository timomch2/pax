'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import {
  ArrowLeft,
  Download,
  FileText,
  Plus,
  Trash2,
  BellRing,
  Check,
  MessageCircle,
  Mail,
  Phone,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  formatKsh,
  PAYER_TYPES,
  PAYER_TYPE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYER_STATUS_LABELS,
  PAYER_STATUS_BADGE,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE,
  REMINDER_CHANNEL_LABELS,
  outstandingOf,
  daysOverdue,
  buildReminderMessage,
  phoneDigits,
} from '@/lib/hub-finance';

const TEAL = '#2ABFB0';
const RED = '#DC2626';

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }) : '—';
const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }) : '—';

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [practitioner, setPractitioner] = useState<any>(null);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState<'invoice' | 'receipt' | null>(null);

  // payment dialog
  const [payLine, setPayLine] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('');

  // add payer dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ payerType: 'INSURER', payerName: '', insurerId: '', amount: '', method: '', dueDate: '', contactPhone: '', contactEmail: '' });

  // reminder dialog
  const [remLine, setRemLine] = useState<any>(null);
  const [remChannel, setRemChannel] = useState('WHATSAPP');
  const [remMessage, setRemMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/hub/invoices/${invoiceId}`);
      if (res.status === 404) {
        toast.error('Invoice not found.');
        router.push('/dashboard/hub/invoices');
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setInvoice(json.invoice);
        setPractitioner(json.practitioner);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, router]);

  useEffect(() => {
    load();
    fetch('/api/hub/insurers').then((r) => (r.ok ? r.json() : null)).then((j) => j && setInsurers(j.insurers ?? [])).catch(() => {});
  }, [load]);

  const downloadPdf = async (mode: 'invoice' | 'receipt') => {
    setPdfBusy(mode);
    try {
      const res = await fetch(`/api/hub/invoices/${invoiceId}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json();
      if (!res.ok || !json.requestId) throw new Error(json.error || 'Failed to start PDF');
      // poll
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const sres = await fetch('/api/hub/pdf-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: json.requestId }),
        });
        const sjson = await sres.json();
        if (sjson.status === 'SUCCESS' && sjson.pdfBase64) {
          const link = document.createElement('a');
          link.href = `data:application/pdf;base64,${sjson.pdfBase64}`;
          link.download = `${invoice.invoiceNumber}-${mode}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success(`${mode === 'receipt' ? 'Receipt' : 'Invoice'} downloaded.`);
          setPdfBusy(null);
          return;
        }
        if (sjson.status === 'FAILED') throw new Error(sjson.error || 'PDF failed');
      }
      throw new Error('PDF timed out. Try again.');
    } catch (e: any) {
      toast.error(e.message || 'Could not generate PDF.');
    } finally {
      setPdfBusy(null);
    }
  };

  const openPay = (line: any) => {
    setPayLine(line);
    setPayAmount(String(outstandingOf(line)));
    setPayMethod(line.method || '');
  };

  const recordPayment = async () => {
    if (!payLine) return;
    const amt = Math.round(Number(payAmount) || 0);
    if (amt <= 0) {
      toast.error('Enter an amount.');
      return;
    }
    try {
      const res = await fetch(`/api/hub/invoices/${invoiceId}/payers/${payLine.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordPayment: amt, method: payMethod || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Payment recorded.');
      setPayLine(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Could not record payment.');
    }
  };

  const markPaid = async (line: any) => {
    try {
      const res = await fetch(`/api/hub/invoices/${invoiceId}/payers/${line.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markFullyPaid: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Marked as paid.');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed.');
    }
  };

  const removeLine = async (line: any) => {
    if (!confirm(`Remove payer “${line.payerName}” from this invoice?`)) return;
    try {
      const res = await fetch(`/api/hub/invoices/${invoiceId}/payers/${line.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Payer removed.');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed.');
    }
  };

  const addPayer = async () => {
    if (Math.round(Number(addForm.amount) || 0) <= 0) {
      toast.error('Enter an amount.');
      return;
    }
    try {
      const res = await fetch(`/api/hub/invoices/${invoiceId}/payers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          amount: Number(addForm.amount),
          insurerId: addForm.insurerId || null,
          method: addForm.method || null,
          dueDate: addForm.dueDate || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Payer added.');
      setAddOpen(false);
      setAddForm({ payerType: 'INSURER', payerName: '', insurerId: '', amount: '', method: '', dueDate: '', contactPhone: '', contactEmail: '' });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed.');
    }
  };

  const openReminder = (line: any) => {
    setRemLine(line);
    setRemChannel(line.contactPhone ? 'WHATSAPP' : line.contactEmail ? 'EMAIL' : 'IN_APP');
    setRemMessage(
      buildReminderMessage({
        payerName: line.payerName,
        patientName: invoice.patientName,
        practitionerName: practitioner?.name || 'Your practitioner',
        invoiceNumber: invoice.invoiceNumber,
        outstanding: outstandingOf(line),
        daysOverdue: daysOverdue(line.dueDate),
        serviceDesc: invoice.serviceDesc,
      }),
    );
  };

  const sendReminder = async () => {
    if (!remLine) return;
    try {
      const res = await fetch('/api/hub/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoicePayerId: remLine.id, channel: remChannel, message: remMessage }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      // open external channel
      const digits = phoneDigits(remLine.contactPhone);
      if (remChannel === 'WHATSAPP' && digits) {
        window.open(`https://wa.me/${digits}?text=${encodeURIComponent(remMessage)}`, '_blank');
      } else if (remChannel === 'SMS' && digits) {
        window.open(`sms:${remLine.contactPhone}?body=${encodeURIComponent(remMessage)}`, '_blank');
      } else if (remChannel === 'EMAIL' && remLine.contactEmail) {
        window.open(`mailto:${remLine.contactEmail}?subject=${encodeURIComponent(`Payment reminder — ${invoice.invoiceNumber}`)}&body=${encodeURIComponent(remMessage)}`, '_blank');
      }
      toast.success('Reminder logged.');
      setRemLine(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (!invoice) return null;

  const totalPaid = invoice.payers.reduce((s: number, p: any) => s + p.amountPaid, 0);
  const totalOutstanding = invoice.payers.reduce((s: number, p: any) => s + outstandingOf(p), 0);
  const allReminders = invoice.payers.flatMap((p: any) => (p.reminders ?? []).map((r: any) => ({ ...r, payerName: p.payerName })));

  return (
    <div className="space-y-6">
      <Link href="/dashboard/hub/invoices" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#1A2332]">
        <ArrowLeft className="h-4 w-4" /> All invoices
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-bold tracking-tight">{invoice.invoiceNumber}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${INVOICE_STATUS_BADGE[invoice.status] || ''}`}>
              {INVOICE_STATUS_LABELS[invoice.status] || invoice.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoice.patientName} · {invoice.serviceDesc} · {fmtDate(invoice.serviceDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" disabled={pdfBusy !== null} onClick={() => downloadPdf('invoice')}>
            <FileText className="h-4 w-4" /> {pdfBusy === 'invoice' ? 'Preparing…' : 'Invoice PDF'}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" disabled={pdfBusy !== null} onClick={() => downloadPdf('receipt')}>
            <Download className="h-4 w-4" /> {pdfBusy === 'receipt' ? 'Preparing…' : 'Receipt PDF'}
          </Button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-black/[0.06] bg-white"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total billed</p><p className="font-display text-lg font-bold">{formatKsh(invoice.totalAmount)}</p></CardContent></Card>
        <Card className="border-black/[0.06] bg-white"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Paid</p><p className="font-display text-lg font-bold text-emerald-400">{formatKsh(totalPaid)}</p></CardContent></Card>
        <Card className="border-black/[0.06] bg-white"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="font-display text-lg font-bold" style={{ color: totalOutstanding > 0 ? RED : TEAL }}>{formatKsh(totalOutstanding)}</p></CardContent></Card>
      </div>

      {/* Payer lines */}
      <Card className="border-black/[0.06] bg-white">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Payers</h3>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add payer
            </Button>
          </div>
          <div className="space-y-3">
            {invoice.payers.map((p: any) => {
              const out = outstandingOf(p);
              const over = daysOverdue(p.dueDate);
              return (
                <div key={p.id} className="rounded-lg border border-black/[0.06] bg-[#FAF8F5] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.payerName}</span>
                        {p.insurer && <span className="text-xs text-muted-foreground">({p.insurer.shortName || p.insurer.name})</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PAYER_STATUS_BADGE[p.status] || ''}`}>
                          {PAYER_STATUS_LABELS[p.status] || p.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {PAYER_TYPE_LABELS[p.payerType] || p.payerType}
                        {p.method ? ` · ${PAYMENT_METHOD_LABELS[p.method]}` : ''}
                        {p.dueDate ? ` · due ${fmtDate(p.dueDate)}` : ''}
                        {over > 0 ? ` · ${over}d overdue` : ''}
                      </p>
                      {(p.contactPhone || p.contactEmail) && (
                        <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {p.contactPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.contactPhone}</span>}
                          {p.contactEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.contactEmail}</span>}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-display text-base font-bold">{formatKsh(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">Paid {formatKsh(p.amountPaid)}</p>
                      {out > 0 && <p className="text-xs font-medium" style={{ color: RED }}>Bal {formatKsh(out)}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {out > 0 && (
                      <>
                        <Button size="sm" className="h-8 gap-1" style={{ backgroundColor: TEAL, color: '#0B0F1A' }} onClick={() => openPay(p)}>
                          <Wallet className="h-3.5 w-3.5" /> Record payment
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => markPaid(p)}>
                          <Check className="h-3.5 w-3.5" /> Mark paid
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openReminder(p)}>
                          <BellRing className="h-3.5 w-3.5" /> Send reminder
                        </Button>
                      </>
                    )}
                    <button onClick={() => removeLine(p)} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                  {(p.reminders?.length ?? 0) > 0 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Last reminder: {REMINDER_CHANNEL_LABELS[p.reminders[0].channel]} · {fmtDateTime(p.reminders[0].createdAt)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reminder history */}
      {allReminders.length > 0 && (
        <Card className="border-black/[0.06] bg-white">
          <CardContent className="p-5">
            <h3 className="mb-3 font-display text-base font-semibold">Reminder history</h3>
            <ul className="space-y-2">
              {allReminders
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((r: any) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">
                      <span className="text-[#1A2332]">{r.payerName}</span> · {REMINDER_CHANNEL_LABELS[r.channel]}{r.isAutomated ? ' (auto)' : ''}
                    </span>
                    <span className="text-muted-foreground">{fmtDateTime(r.createdAt)}</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {invoice.notes && (
        <Card className="border-black/[0.06] bg-white">
          <CardContent className="p-5">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</h3>
            <p className="text-sm">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        PAX Exchange processes no payments and is not a party to this transaction. Invoices and reminders are issued directly by you.
      </p>

      {/* Record payment dialog */}
      <Dialog open={!!payLine} onOpenChange={(v) => !v && setPayLine(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          {payLine && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{payLine.payerName} · balance {formatKsh(outstandingOf(payLine))}</p>
              <div>
                <Label>Amount received (KSh)</Label>
                <Input type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <div>
                <Label>Method</Label>
                <Select value={payMethod || 'none'} onValueChange={(v) => setPayMethod(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {PAYMENT_METHODS.map((m) => (<SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayLine(null)}>Cancel</Button>
            <Button onClick={recordPayment} style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add payer dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add payer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={addForm.payerType} onValueChange={(v) => setAddForm({ ...addForm, payerType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYER_TYPES.map((t) => (<SelectItem key={t} value={t}>{PAYER_TYPE_LABELS[t]}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name</Label>
                <Input value={addForm.payerName} onChange={(e) => setAddForm({ ...addForm, payerName: e.target.value })} placeholder="e.g. SHA" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (KSh)</Label>
                <Input type="number" min="0" value={addForm.amount} onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })} />
              </div>
              <div>
                <Label>Due date</Label>
                <Input type="date" value={addForm.dueDate} onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Link insurer / scheme</Label>
              <Select value={addForm.insurerId || 'none'} onValueChange={(v) => {
                const ins = insurers.find((x) => x.id === v);
                setAddForm({ ...addForm, insurerId: v === 'none' ? '' : v, payerName: ins && !addForm.payerName ? (ins.shortName || ins.name) : addForm.payerName });
              }}>
                <SelectTrigger><SelectValue placeholder="Optional…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {insurers.map((ins) => (<SelectItem key={ins.id} value={ins.id}>{ins.shortName || ins.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input value={addForm.contactPhone} onChange={(e) => setAddForm({ ...addForm, contactPhone: e.target.value })} placeholder="Contact phone" />
              <Input value={addForm.contactEmail} onChange={(e) => setAddForm({ ...addForm, contactEmail: e.target.value })} placeholder="Contact email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addPayer} style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>Add payer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder dialog */}
      <Dialog open={!!remLine} onOpenChange={(v) => !v && setRemLine(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send payment reminder</DialogTitle></DialogHeader>
          {remLine && (
            <div className="space-y-3">
              <div>
                <Label>Channel</Label>
                <Select value={remChannel} onValueChange={setRemChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WHATSAPP" disabled={!remLine.contactPhone}>WhatsApp{!remLine.contactPhone ? ' (no phone)' : ''}</SelectItem>
                    <SelectItem value="SMS" disabled={!remLine.contactPhone}>SMS{!remLine.contactPhone ? ' (no phone)' : ''}</SelectItem>
                    <SelectItem value="EMAIL" disabled={!remLine.contactEmail}>Email{!remLine.contactEmail ? ' (no email)' : ''}</SelectItem>
                    <SelectItem value="IN_APP">Log only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Message</Label>
                <Textarea rows={7} value={remMessage} onChange={(e) => setRemMessage(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                {remChannel === 'IN_APP'
                  ? 'This will be logged against the payer for your records.'
                  : 'We’ll log the reminder and open your ' + REMINDER_CHANNEL_LABELS[remChannel] + ' with the message ready to send.'}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemLine(null)}>Cancel</Button>
            <Button onClick={sendReminder} className="gap-1" style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>
              <MessageCircle className="h-4 w-4" /> Send &amp; log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

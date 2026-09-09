'use client';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PracticeForm, practiceFetch, practiceSend, type PracticeField } from '@/components/hub/practice-form';
import { formatPracticeMoney as money, moneyToMinor } from '@/lib/practice-money';
import { clinicalInvoiceTotals } from '@/lib/practice-finance-math';
import { PAYMENT_METHOD_LABELS, PAYER_TYPE_LABELS } from '@/lib/hub-finance';
import type { PracticeAction } from '@/lib/practice-policy';

async function ledgerOptions(url: string) {
  const rows: any[] = [];
  let cursor: string | null = null;
  do { const result: any = await practiceFetch(`${url}${cursor ? `&cursor=${cursor}` : ''}`); rows.push(...result.rows); cursor = result.nextCursor; } while (cursor);
  return rows;
}

export function PracticeFinance({ workspaceId, capabilities }: { workspaceId: string; capabilities: PracticeAction[] }) {
  const base = `/api/practice/${workspaceId}/finance`;
  const { mutate } = useSWRConfig();
  const writable = capabilities.includes('billing.manage');
  const send = async (action: string, data: unknown) => {
    const result = await practiceSend(base, { action, data });
    await mutate((key) => typeof key === 'string' && key.startsWith(base));
    toast.success(action === 'adjustment' ? 'Submitted for practitioner approval' : 'Saved');
    return result.result;
  };
  const { data: payers = [] } = useSWR<any[]>(`${base}?view=payers`, ledgerOptions);
  const { data: rates = [] } = useSWR<any[]>(`${base}?view=rates`, ledgerOptions);
  return <Tabs defaultValue="services"><TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="services">Unbilled work</TabsTrigger><TabsTrigger value="invoices">Invoices</TabsTrigger><TabsTrigger value="receipts">Receipts and credit</TabsTrigger><TabsTrigger value="payers">Payers</TabsTrigger><TabsTrigger value="rates">Tax settings</TabsTrigger><TabsTrigger value="adjustments">Adjustments</TabsTrigger></TabsList>
    <TabsContent value="services"><InvoiceComposer base={base} payers={payers} rates={rates} writable={writable} send={send} /></TabsContent>
    <TabsContent value="invoices"><LedgerRecords base={base} view="invoices" /></TabsContent>
    <TabsContent value="receipts"><ReceiptComposer base={base} payers={payers} writable={writable} send={send} /><LedgerRecords base={base} view="receipts" /></TabsContent>
    <TabsContent value="payers"><Card><CardHeader><CardTitle>Who pays for your services</CardTitle></CardHeader><CardContent className="space-y-4"><p>Facility and patient payers link to their existing records. Each payer’s credit stays within this workspace.</p>{payers.map((payer) => <div key={payer.id} className="rounded-md border p-3"><strong>{payer.name}</strong><p>{payer.kind === 'FACILITY' ? 'Facility' : PAYER_TYPE_LABELS[payer.kind] ?? payer.kind}</p><p><span suppressHydrationWarning>{payer.email}</span> <span suppressHydrationWarning>{payer.phone}</span></p></div>)}{writable && <PayerForm workspaceId={workspaceId} send={send} />}</CardContent></Card></TabsContent>
    <TabsContent value="rates"><Card><CardHeader><CardTitle>Tax and withholding rates</CardTitle></CardHeader><CardContent className="space-y-4"><p>No tax is applied unless you select a configured rate on an invoice. Rates are configured by your practice.</p>{rates.map((rate) => <div key={rate.id} className="rounded-md border p-3"><strong>{rate.name}</strong><p>{rate.rateBps / 100}% · {rate.kind === 'WITHHOLDING' ? 'Withholding' : rate.inclusive ? 'Tax included' : 'Tax added'} · {rate.base === 'NET' ? 'Net base' : 'Gross base'} · {rate.active ? 'Active' : 'Inactive'}</p>{writable && <Button variant="outline" onClick={async () => { try { await send('rate', { id: rate.id, name: rate.name, kind: rate.kind, rateBps: rate.rateBps, inclusive: rate.inclusive, base: rate.base, active: !rate.active }); } catch (e) { toast.error((e as Error).message); } }}>{rate.active ? 'Deactivate' : 'Activate'}</Button>}</div>)}
      {writable && <PracticeForm fields={[{ name: 'name', label: 'Rate name', required: true }, { name: 'rate', label: 'Percentage', required: true }, { name: 'kind', label: 'Rate type', required: true, value: 'TAX', options: [{ value: 'TAX', label: 'Tax' }, { value: 'WITHHOLDING', label: 'Withholding' }] }, { name: 'inclusive', label: 'Tax treatment', required: true, value: 'no', options: [{ value: 'no', label: 'Add to service amount' }, { value: 'yes', label: 'Already included in service amount' }] }, { name: 'base', label: 'Percentage base', required: true, value: 'NET', options: [{ value: 'NET', label: 'Net amount' }, { value: 'GROSS', label: 'Gross amount' }] }]} submitLabel="Add rate" onSubmit={async (values) => { await send('rate', { name: values.name, rateBps: moneyToMinor(values.rate), kind: values.kind, inclusive: values.inclusive === 'yes', base: values.base }); }} />}
    </CardContent></Card></TabsContent>
    <TabsContent value="adjustments"><AdjustmentComposer base={base} writable={writable} canApprove={capabilities.includes('billing.approve')} send={send} /></TabsContent>
  </Tabs>;
}

type Send = (action: string, data: unknown) => Promise<any>;
function InvoiceComposer({ base, payers, rates, writable, send }: { base: string; payers: any[]; rates: any[]; writable: boolean; send: Send }) {
  const [cursor, setCursor] = useState(''), [selected, setSelected] = useState<any[]>([]), [taxId, setTaxId] = useState(''), [withholdingId, setWithholdingId] = useState('');
  const { data, error } = useSWR<any>(`${base}?view=services${cursor ? `&cursor=${cursor}` : ''}`, practiceFetch);
  const [requestId, setRequestId] = useState<string | null>(null);
  const total = clinicalInvoiceTotals(selected.map((row) => row.amountMinor), rates.find((row) => row.id === taxId) ?? null, rates.find((row) => row.id === withholdingId) ?? null);
  return <Card><CardHeader><CardTitle>Completed work awaiting billing</CardTitle></CardHeader><CardContent className="space-y-4">
    {writable && <PracticeForm fields={[{ name: 'month', label: 'Retainer month', type: 'month', required: true }]} submitLabel="Add due retainer charges" onSubmit={async (values) => { await send('retainers', values); }} />}
    <p>Retainer-covered services are tracked without additional charges. Select unbilled services for an individual or consolidated invoice.</p>
    {error && <p role="alert">{error.message}</p>}{data && !data.rows.length && <p>No unbilled work in this page.</p>}
    {data?.rows.map((service: any) => <label key={service.id} className="flex items-start gap-3 rounded-md border p-3"><input className="mt-1" type="checkbox" disabled={!writable} checked={selected.some((row) => row.id === service.id)} onChange={(event) => { setSelected((rows) => event.target.checked ? [...rows, service] : rows.filter((row) => row.id !== service.id)); setRequestId(null); }} /><span><strong>{service.description} · {money(service.amountMinor)}</strong><span className="block text-sm text-muted-foreground">{service.serviceDate.slice(0, 10)} · {service.facility?.officialName ?? 'Outside facility'} · {service.patient?.patientRef ?? service.patient?.patientCode ?? ''}</span></span></label>)}
    <div className="flex gap-2">{data?.nextCursor && <Button variant="outline" onClick={() => setCursor(data.nextCursor)}>Next services</Button>}{cursor && <Button variant="outline" onClick={() => setCursor('')}>First page</Button>}</div>
    {!!selected.length && <div className="space-y-4 rounded-md bg-muted/30 p-4"><p>{selected.length} services selected</p><label className="block">Tax<select className="ml-3 rounded-md border bg-background p-2" value={taxId} onChange={(event) => { setTaxId(event.target.value); setRequestId(null); }}><option value="">No tax</option>{rates.filter((row) => row.active && row.kind === 'TAX').map((row) => <option key={row.id} value={row.id}>{row.name} ({row.rateBps / 100}%)</option>)}</select></label><label className="block">Withholding<select className="ml-3 rounded-md border bg-background p-2" value={withholdingId} onChange={(event) => { setWithholdingId(event.target.value); setRequestId(null); }}><option value="">No withholding</option>{rates.filter((row) => row.active && row.kind === 'WITHHOLDING').map((row) => <option key={row.id} value={row.id}>{row.name} ({row.rateBps / 100}%)</option>)}</select></label>
      <p>Net {money(total.netMinor)} · tax {money(total.taxMinor)} · <strong>invoice total {money(total.totalMinor)}</strong> · expected withholding {money(total.expectedWithholdingMinor)}</p>
      {!payers.length ? <p>Add a payer before issuing an invoice.</p> : <PracticeForm fields={[
        ...payers.map((payer): PracticeField => ({ name: `payer_${payer.id}`, label: `${payer.name} pays (KSh; blank if not paying)` })),
        { name: 'dueAt', label: 'Payment due date', type: 'date' }, { name: 'includeNames', label: 'Patient information on invoice', value: 'no', required: true, options: [{ value: 'no', label: 'References only' }, { value: 'yes', label: 'Include patient names' }] },
      ]} submitLabel="Issue invoice" onSubmit={async (values) => {
        const key = requestId ?? crypto.randomUUID(); setRequestId(key);
        await send('invoice', { requestKey: key, serviceIds: selected.map((row) => row.id), taxRateId: taxId || null, withholdingRateId: withholdingId || null, includePatientNames: values.includeNames === 'yes', payers: payers.filter((row) => values[`payer_${row.id}`]).map((row) => ({ payerId: row.id, amountMinor: moneyToMinor(values[`payer_${row.id}`]), dueAt: values.dueAt ? `${values.dueAt}T23:59:59+03:00` : null })) });
        setSelected([]); setRequestId(null);
      }} />}
    </div>}
  </CardContent></Card>;
}

function PayerForm({ workspaceId, send }: { workspaceId: string; send: Send }) {
  const [kind, setKind] = useState('FACILITY'), [patientQuery, setPatientQuery] = useState('');
  const { data: consulting } = useSWR<any>(`/api/practice/${workspaceId}/consulting`, practiceFetch);
  const { data: patients } = useSWR<any>(kind === 'PATIENT' ? `/api/practice/${workspaceId}/patients?q=${encodeURIComponent(patientQuery)}` : null, practiceFetch);
  const names = { FACILITY: 'Health facility', ...PAYER_TYPE_LABELS };
  return <div className="space-y-4"><label className="block">Payer type<select className="ml-3 rounded-md border bg-background p-2" value={kind} onChange={(event) => setKind(event.target.value)}>{Object.entries(names).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {kind === 'PATIENT' && <label className="block">Find patient<input className="ml-3 rounded-md border bg-background p-2" value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} /></label>}
    <PracticeForm key={kind} fields={[
      ...(kind === 'FACILITY' ? [{ name: 'facilityId', label: 'Facility', required: true, options: (consulting?.relationships ?? []).map((row: any) => ({ value: row.facility.id, label: row.facility.officialName })) }] : kind === 'PATIENT' ? [{ name: 'patientId', label: 'Patient', required: true, options: (patients?.patients ?? []).map((row: any) => ({ value: row.id, label: row.name })) }] : [{ name: 'name', label: 'Payer name', required: true }]),
      { name: 'remindersEnabled', label: 'Optional payment reminders', value: 'true', options: [{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Opt out' }] }, { name: 'email', label: 'Billing email', type: 'email' }, { name: 'phone', label: 'Billing phone' },
    ]} submitLabel="Save payer" onSubmit={async (values) => { await send('payer', { remindersEnabled: values.remindersEnabled === 'true', kind, name: values.name || 'Selected payer', facilityId: values.facilityId || null, patientId: values.patientId || null, email: values.email || null, phone: values.phone || null }); }} />
  </div>;
}

function ReceiptComposer({ base, payers, writable, send }: { base: string; payers: any[]; writable: boolean; send: Send }) {
  const [payerId, setPayerId] = useState(''), [requestId, setRequestId] = useState<string | null>(null), [creditId, setCreditId] = useState('');
  const { data: invoices = [] } = useSWR<any[]>(payerId ? `${base}?view=invoices&payerId=${payerId}` : null, ledgerOptions);
  const { data: receipts = [] } = useSWR<any[]>(payerId ? `${base}?view=receipts&payerId=${payerId}` : null, ledgerOptions);
  const lines = invoices.filter((row) => row.status !== 'VOID').flatMap((invoice) => invoice.payers.filter((line: any) => line.payerId === payerId && line.outstandingMinor > 0).map((line: any) => ({ ...line, number: invoice.number })));
  if (!writable) return null;
  return <Card className="mb-6"><CardHeader><CardTitle>Record external payment or apply credit</CardTitle></CardHeader><CardContent className="space-y-4"><p>Record money already received by cash, bank, M-Pesa, or another method. PAX does not transfer money here.</p>
    <label className="block">Payer<select aria-label="Payer" className="ml-3 rounded-md border bg-background p-2" value={payerId} onChange={(event) => { setPayerId(event.target.value); setCreditId(''); setRequestId(null); }}><option value="">Select payer…</option>{payers.map((payer) => <option key={payer.id} value={payer.id}>{payer.name}</option>)}</select></label>
    {payerId && <><label className="block">Source<select aria-label="Payment source" className="ml-3 rounded-md border bg-background p-2" value={creditId} onChange={(event) => { setCreditId(event.target.value); setRequestId(null); }}><option value="">New payment received</option>{receipts.filter((row) => !row.reversedAt && row.availableMinor > 0).map((row) => <option key={row.id} value={row.id}>Available credit {money(row.availableMinor)} · {row.reference ?? row.receivedAt?.slice(0, 10) ?? 'Historical receipt'}</option>)}</select></label>
      <PracticeForm key={`${payerId}:${creditId}`} fields={[
        ...(!creditId ? [{ name: 'amount', label: 'Amount received (KSh)', required: true }, { name: 'receivedAt', label: 'Received at (Nairobi time)', type: 'datetime-local', required: true }, { name: 'method', label: 'Method', required: true, options: Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label })) }, { name: 'reference', label: 'Payment reference' }] : []),
        ...lines.map((line): PracticeField => ({ name: `line_${line.id}`, label: `${line.number} — ${money(line.outstandingMinor)} due; allocate (KSh)` })),
      ]} submitLabel={creditId ? 'Allocate credit' : 'Record receipt'} onSubmit={async (values) => {
        const key = requestId ?? crypto.randomUUID(); setRequestId(key);
        const allocations = lines.filter((line) => values[`line_${line.id}`]).map((line) => ({ invoicePayerId: line.id, amountMinor: moneyToMinor(values[`line_${line.id}`]) }));
        if (creditId) await send('allocate', { requestKey: key, receiptId: creditId, allocations });
        else await send('receipt', { requestKey: key, payerId, amountMinor: moneyToMinor(values.amount), receivedAt: `${values.receivedAt}:00+03:00`, method: values.method, reference: values.reference || null, allocations });
        setPayerId(''); setCreditId(''); setRequestId(null);
      }} /><p className="text-sm text-muted-foreground">Unallocated payment amounts remain as credit for this payer.</p></>}
  </CardContent></Card>;
}

function LedgerRecords({ base, view }: { base: string; view: 'invoices' | 'receipts' }) {
  const [cursor, setCursor] = useState('');
  const { data, error } = useSWR<any>(`${base}?view=${view}${cursor ? `&cursor=${cursor}` : ''}`, practiceFetch);
  return <Card><CardHeader><CardTitle>{view === 'invoices' ? 'Issued invoices' : 'Receipt history'}</CardTitle></CardHeader><CardContent className="space-y-4">{error && <p role="alert">{error.message}</p>}{data && !data.rows.length && <p>No records yet.</p>}{data?.rows.map((row: any) => <div key={row.id} className="space-y-2 rounded-md border p-4">{view === 'invoices' ? <><strong>{row.number} · {money(row.totalMinor)}</strong><p>{row.status === 'VOID' ? 'Void' : `Issued ${row.issuedAt.slice(0, 10)}`}</p>{row.lines.map((line: any) => <p key={line.id} className="text-sm">{line.serviceDate.slice(0, 10)} · {line.description} · {line.patientReference} {line.patientName} · {money(line.amountMinor)}</p>)}{row.payers.map((payer: any) => <p key={payer.id}>{payer.payer.name}: {money(payer.outstandingMinor)} outstanding · {money(payer.cashMinor)} allocated cash · {money(payer.withholdingMinor)} withholding</p>)}</> : <><strong>{row.payer.name} · {money(row.amountMinor)}</strong><p>{row.dateKnown ? row.receivedAt?.slice(0, 10) : 'Historical receipt — date unknown'} · {PAYMENT_METHOD_LABELS[row.method]} · {row.reference}</p><p>{row.reversedAt ? 'Reversed' : `${money(row.availableMinor)} available credit · ${money(row.refundedMinor)} refunded`}</p></>}<Button asChild variant="outline"><a href={`${base.replace(/\/finance$/, '')}/documents?kind=${view === 'invoices' ? 'invoice' : 'receipt'}&id=${row.id}`}>Download PDF</a></Button></div>)}<div className="flex gap-2">{data?.nextCursor && <Button variant="outline" onClick={() => setCursor(data.nextCursor)}>Next records</Button>}{cursor && <Button variant="outline" onClick={() => setCursor('')}>First page</Button>}</div></CardContent></Card>;
}

function AdjustmentComposer({ base, writable, canApprove, send }: { base: string; writable: boolean; canApprove: boolean; send: Send }) {
  const { data: pending = [] } = useSWR<any[]>(`${base}?view=adjustments`, ledgerOptions);
  const { data: invoices = [] } = useSWR<any[]>(`${base}?view=invoices`, ledgerOptions);
  const { data: receipts = [] } = useSWR<any[]>(`${base}?view=receipts`, ledgerOptions);
  const [kind, setKind] = useState('CREDIT_NOTE'), [requestId, setRequestId] = useState<string | null>(null);
  const kinds: Record<string, string> = { CREDIT_NOTE: 'Credit note', DISCOUNT: 'Discount', CHARGE_INCREASE: 'Additional charge', REFUND: 'Refund already returned externally', VOID: 'Void invoice', RECEIPT_REVERSAL: 'Reverse incorrect receipt', WITHHOLDING: 'Withholding evidence' };
  const receiptKind = ['REFUND', 'RECEIPT_REVERSAL'].includes(kind);
  return <div className="space-y-6"><Card><CardHeader><CardTitle>Pending practitioner approval</CardTitle></CardHeader><CardContent className="space-y-4">{!pending.length && <p>No pending adjustments.</p>}{pending.map((row) => <div key={row.id} className="space-y-3 rounded-md border p-4"><strong>{kinds[row.kind]} · {money(row.amountMinor)}</strong><p>{row.invoice?.number ?? row.receipt?.reference}</p><p>{row.reason}</p>{row.evidenceReference && <p>Evidence: {row.evidenceReference}</p>}{canApprove && <PracticeForm fields={[{ name: 'decision', label: 'Decision', required: true, options: [{ value: 'APPROVED', label: 'Approve' }, { value: 'REJECTED', label: 'Reject' }] }, { name: 'reason', label: 'Review reason', required: true }]} submitLabel="Save decision" onSubmit={async (values) => { await send('review', { id: row.id, ...values }); }} />}</div>)}</CardContent></Card>
    {writable && <Card><CardHeader><CardTitle>Propose an adjustment</CardTitle></CardHeader><CardContent className="space-y-4"><p>Changes take effect only after the practitioner approves. Refunds require available payer credit; issue a credit note first when refunding an invoiced service.</p><label className="block">Adjustment type<select className="ml-3 rounded-md border bg-background p-2" value={kind} onChange={(event) => { setKind(event.target.value); setRequestId(null); }}>{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <PracticeForm key={kind} fields={[
        receiptKind ? { name: 'receiptId', label: 'Receipt', required: true, options: receipts.filter((row) => !row.reversedAt).map((row) => ({ value: row.id, label: `${row.payer.name} · ${money(row.amountMinor)} · ${row.reference ?? row.receivedAt?.slice(0, 10) ?? 'Date unknown'}` })) } : kind === 'VOID' ? { name: 'invoiceId', label: 'Invoice', required: true, options: invoices.filter((row) => row.status !== 'VOID').map((row) => ({ value: row.id, label: row.number })) } : { name: 'invoicePayerId', label: 'Invoice and payer', required: true, options: invoices.filter((row) => row.status !== 'VOID').flatMap((row) => row.payers.map((payer: any) => ({ value: payer.id, label: `${row.number} · ${payer.payer.name}` }))) },
        ...(!['VOID', 'RECEIPT_REVERSAL'].includes(kind) ? [{ name: 'amount', label: 'Adjustment amount (KSh)', required: true }] : []),
        { name: 'reason', label: 'Reason', required: true, type: 'textarea' },
        ...(kind === 'WITHHOLDING' ? [{ name: 'evidenceReference', label: 'Withholding certificate or reference', required: true }] : []),
        ...(kind === 'REFUND' ? [{ name: 'occurredAt', label: 'Refund returned at (Nairobi time)', type: 'datetime-local', required: true }] : []),
      ]} submitLabel="Submit for approval" onSubmit={async (values) => { const key = requestId ?? crypto.randomUUID(); setRequestId(key); await send('adjustment', { requestKey: key, kind, invoiceId: values.invoiceId || null, invoicePayerId: values.invoicePayerId || null, receiptId: values.receiptId || null, amountMinor: values.amount ? moneyToMinor(values.amount) : 0, reason: values.reason, evidenceReference: values.evidenceReference || null, occurredAt: values.occurredAt ? `${values.occurredAt}:00+03:00` : null }); setRequestId(null); }} />
    </CardContent></Card>}
  </div>;
}

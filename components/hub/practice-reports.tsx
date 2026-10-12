'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { PracticeForm, practiceFetch } from '@/components/hub/practice-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPracticeMoney } from '@/lib/practice-money';

export function PracticeReports({ workspaceId }: { workspaceId: string }) {
  const base = `/api/practice/${workspaceId}`, [query, setQuery] = useState('');
  const { data: facilities } = useSWR<any>(`${base}/consulting`, practiceFetch);
  const [patientSearch, setPatientSearch] = useState('');
  const { data: patients } = useSWR<any>(`${base}/patients?q=${encodeURIComponent(patientSearch)}`, practiceFetch);
  const { data: payers } = useSWR<any>(`${base}/finance?view=payers`, practiceFetch);
  const { data, error } = useSWR<any>(query ? `${base}/reports?${query}` : null, practiceFetch);
  return <div className="space-y-6"><Card><CardHeader><CardTitle>Reports and statements</CardTitle></CardHeader><CardContent><label className="mb-4 block text-sm">Find a client for their statement<input className="mt-2 h-10 w-full rounded-md border bg-background px-3" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} /></label><PracticeForm fields={[
    { name: 'from', label: 'From date', type: 'date', required: true }, { name: 'to', label: 'Through date', type: 'date', required: true },
    { name: 'facilityId', label: 'Facility', options: (facilities?.relationships ?? []).map((r: any) => ({ value: r.facilityId, label: r.facility.officialName })) },
    { name: 'payerId', label: 'Payer statement', options: (payers?.rows ?? []).map((r: any) => ({ value: r.id, label: r.name })) },
    { name: 'patientId', label: 'Client statement', options: (patients?.patients ?? []).map((p: any) => ({ value: p.id, label: `${p.name} · ${p.patientCode}` })) }, { name: 'service', label: 'Service code' }, { name: 'method', label: 'Payment method (cash and credits)', options: ['CASH', 'MPESA', 'CARD', 'BANK_TRANSFER', 'INSURANCE', 'CHEQUE', 'OTHER'].map((value) => ({ value, label: value.replace(/_/g, ' ') })) },
  ]} submitLabel="Run report" onSubmit={async (v) => { const end = new Date(`${v.to}T00:00:00+03:00`); end.setUTCDate(end.getUTCDate() + 1); const params = new URLSearchParams({ from: `${v.from}T00:00:00+03:00`, to: end.toISOString() }); for (const key of ['facilityId', 'patientId', 'payerId', 'service', 'method']) if (v[key]) params.set(key, v[key]); setQuery(params.toString()); }} /></CardContent></Card>
    {error && <p role="alert" className="text-destructive">{error.message}</p>}
    {query && !error && !data && <p>Preparing report…</p>}
    {data && <><p className="text-sm text-muted-foreground">{data.balanceBasis}</p>{data.reconciliationCount > 0 && <p role="status">{data.reconciliationCount} historical records still require reconciliation. These totals do not yet establish a complete opening balance.</p>}
      <div className="flex gap-3"><Button asChild variant="outline"><a href={`${base}/reports?${query}&format=csv`}>Download CSV</a></Button><Button asChild variant="outline"><a href={`${base}/reports?${query}&format=pdf`}>Download PDF</a></Button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(data.totals).filter(([key]) => data.cashBasis !== 'ATTRIBUTED_ALLOCATIONS' || key !== 'cashReceivedMinor').map(([key, value]) => <Card key={key}><CardHeader><CardTitle className="text-sm capitalize">{key.replace(/Minor$/, '').replace(/([A-Z])/g, ' $1')}</CardTitle></CardHeader><CardContent>{formatPracticeMoney(value as number)}</CardContent></Card>)}</div>
      <Card><CardHeader><CardTitle>Account statement</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{data.statement.basis}</p><p>Opening dated balance: {formatPracticeMoney(data.statement.openingMinor)} · Closing dated balance: {formatPracticeMoney(data.statement.closingDatedMinor)}</p>{data.statement.undatedSettlementMinor > 0 && <p>Undated historical settlements: {formatPracticeMoney(data.statement.undatedSettlementMinor)}. Balance including these settlements: {formatPracticeMoney(data.statement.closingIncludingUndatedMinor)}.</p>}<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th className="p-2">Date</th><th className="p-2">Transaction</th><th className="p-2">Reference</th><th className="p-2">Movement</th><th className="p-2">Balance</th></tr></thead><tbody>{data.statement.rows.map((r: any, index: number) => <tr key={index} className="border-t"><td className="p-2">{new Date(r.date).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' })}</td><td className="p-2">{r.type.replace(/_/g, ' ')}</td><td className="p-2">{r.reference}</td><td className="whitespace-nowrap p-2">{formatPracticeMoney(r.amountMinor)}</td><td className="whitespace-nowrap p-2">{formatPracticeMoney(r.balanceMinor)}</td></tr>)}</tbody></table></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Current ageing</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">{Object.entries(data.ageing).map(([key, value]) => <p key={key} className="capitalize">{key.replace(/Minor$/, '').replace(/([A-Z])/g, ' $1')}: {formatPracticeMoney(value as number)}</p>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Dated activity</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Reference</th><th className="p-2">Description</th><th className="p-2 text-right">KSh</th></tr></thead><tbody>{data.rows.map((r: any, i: number) => <tr key={`${r.reference}:${i}`} className="border-b"><td className="p-2">{new Date(r.date).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' })}</td><td className="p-2">{r.type.replace(/_/g, ' ')}</td><td className="p-2">{r.reference}</td><td className="p-2">{r.description}</td><td className="whitespace-nowrap p-2 text-right">{formatPracticeMoney(r.amountMinor)}</td></tr>)}</tbody></table></CardContent></Card>
    </>}
  </div>;
}

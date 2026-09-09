'use client';
import { useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PracticeForm, practiceFetch, practiceSend } from '@/components/hub/practice-form';

const url = '/api/admin/facilities';
export function FacilityAdministration() {
  const { data, error, mutate } = useSWR<any>(url, practiceFetch);
  const [running, setRunning] = useState<string | null>(null);
  const stop = useRef(false);
  const resume = async (runId: string) => {
    stop.current = false; setRunning(runId);
    try {
      while (!stop.current) {
        const result = await practiceSend(url, { action: 'resume', runId });
        await mutate();
        if (result.run.status === 'COMPLETED') { toast.success('Facility import completed'); break; }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) { toast.error((error as Error).message); await mutate(); }
    finally { setRunning(null); }
  };
  return <div className="space-y-6 py-6">
    {error && <p role="alert" className="text-destructive">{error.message}</p>}
    <Card><CardHeader><CardTitle>Kenyan registry import</CardTitle></CardHeader><CardContent className="space-y-4">
      <p>New facilities are added automatically. Changes and possible duplicates enter the review queue. Imports resume from the last completed page.</p>
      <Button disabled={!!running} onClick={async () => { try { const result = await practiceSend(url, { action: 'start' }); await mutate(); await resume(result.run.id); } catch (error) { toast.error((error as Error).message); } }}>Start registry import / refresh</Button>
      {data?.runs.map((run: any) => <div key={run.id} className="rounded-md border p-4"><p>{run.status} · {run.processed} / {run.totalMatches ?? 'unknown'} processed</p><p className="text-sm text-muted-foreground">{run.added} added · {run.queued} queued for review · {run.skipped} missing required identity · next page {run.nextPage + 1}</p>{run.error && <p role="alert">{run.error}</p>}{run.status !== 'COMPLETED' && (running === run.id ? <Button variant="outline" onClick={() => { stop.current = true; }}>Pause after this page</Button> : <Button variant="outline" disabled={!!running} onClick={() => resume(run.id)}>Resume import</Button>)}</div>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Facility review queue</CardTitle></CardHeader><CardContent className="space-y-6">
      {data && !data.corrections.length && <p>No pending corrections.</p>}
      {data?.corrections.map((correction: any) => <section key={correction.id} className="space-y-3 rounded-md border p-4"><h3 className="font-semibold">{correction.proposed.officialName}</h3><p>{correction.reason}</p><div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Field</th><th className="p-2">Current</th><th className="p-2">Proposed</th></tr></thead><tbody>{Object.entries(correction.proposed).filter(([key]) => !['normalizedName', 'sourceKey', 'source'].includes(key)).map(([key, value]) => <tr key={key} className="border-t"><td className="p-2">{key.replace(/([A-Z])/g, ' $1')}</td><td className="p-2">{String(correction.facility?.[key] ?? 'Unknown')}</td><td className="p-2">{String(value ?? 'Unknown')}</td></tr>)}</tbody></table></div><PracticeForm fields={[
        { name: 'decision', label: 'Decision', required: true, options: [{ value: 'APPROVED', label: 'Approve' }, { value: 'REJECTED', label: 'Reject' }] },
        { name: 'reason', label: 'Review reason', required: true },
        ...(!correction.facilityId ? [{ name: 'distinctFacility', label: 'Is this a separate facility?', required: true, options: [{ value: 'yes', label: 'Yes, I reviewed possible matches' }, { value: 'no', label: 'No / not confirmed' }] }] : []),
      ]} submitLabel="Save review" onSubmit={async (values) => { await practiceSend(url, { id: correction.id, decision: values.decision, reason: values.reason, distinctFacility: values.distinctFacility === 'yes' }, 'PATCH'); await mutate(); toast.success('Review saved'); }} /></section>)}
      {!!data?.corrections.length && <p className="text-sm text-muted-foreground">Showing the oldest 50 pending suggestions. Reviewed items are replaced by the next pending items.</p>}
    </CardContent></Card>
  </div>;
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, BadgeCheck, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatKShCompact } from '@/lib/format';
import { INNOVATION_STATUS_LABEL } from '@/lib/admin-labels';

interface AdminInnovation {
  id: string; title: string; sector: string; stage: string; status: string;
  fundingGoal: number; fundingRaised: number; validationScore: number;
  verified: boolean; ipTimestampedAt: string | null; createdAt: string;
  owner: { id: string; name: string; email: string };
  _count: { investments: number; vaultAccessRequests: number };
}

const STATUSES = Object.keys(INNOVATION_STATUS_LABEL);

export function AdminInnovations() {
  const [items, setItems] = useState<AdminInnovation[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    fetch(`/api/admin/innovations?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setItems(d.innovations); })
      .finally(() => setLoading(false));
  }, [q, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function patch(id: string, body: any) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/innovations/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || 'Update failed'); return; }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data.innovation } : i)));
      toast.success('Innovation updated.');
    } catch { toast.error('Update failed'); }
    finally { setBusyId(null); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#1A2332]">Innovations</h2>
        <p className="text-sm text-muted-foreground">Oversee submissions, move pipeline status and award verified badges.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or sector" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{INNOVATION_STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No innovations match your filters.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{items.length} innovation{items.length === 1 ? '' : 's'}</p>
          {items.map((i) => (
            <Card key={i.id} className="border-black/[0.06] bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-[#1A2332]">{i.title}</p>
                    {i.verified && <Badge className="gap-1 bg-[#FBBF24]/15 text-[#FBBF24]"><BadgeCheck className="h-3 w-3" /> Verified</Badge>}
                    {i.ipTimestampedAt && <Badge variant="outline" className="gap-1 border-[#8B7FD4]/40 text-[#8B7FD4]"><ShieldCheck className="h-3 w-3" /> IP</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{i.sector} · {i.owner?.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Goal {formatKShCompact(i.fundingGoal)} · Raised {formatKShCompact(i.fundingRaised)} · Validation {i.validationScore} · {i._count.investments} invest · {i._count.vaultAccessRequests} vault
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={i.status} onValueChange={(v) => patch(i.id, { status: v })} disabled={busyId === i.id}>
                    <SelectTrigger className="h-9 w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{INNOVATION_STATUS_LABEL[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-9" disabled={busyId === i.id}
                    onClick={() => patch(i.id, { verified: !i.verified })}>
                    {busyId === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : i.verified ? 'Unverify' : 'Verify'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

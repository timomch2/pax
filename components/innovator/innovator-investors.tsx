'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp } from 'lucide-react';
import { formatKSh, formatKShCompact } from '@/lib/format';
import { INVESTMENT_LABELS, INVESTMENT_BADGE } from '@/lib/pax-labels';

export function InnovatorInvestors() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/innovator/overview');
        if (res.ok) {
          const json = await res.json();
          const flat: any[] = [];
          (json?.innovations ?? []).forEach((inv: any) => {
            (inv.investments ?? []).forEach((iv: any) => {
              flat.push({ ...iv, ventureTitle: inv.title });
            });
          });
          flat.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setRows(flat);
        }
      } catch (e: any) {
        console.error('Failed to load investors:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const totalCommitted = rows
    .filter((r) => r.status === 'COMMITTED' || r.status === 'FUNDED')
    .reduce((s, r) => s + (r.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Investor Relations</h2>
        <p className="text-sm text-muted-foreground">Everyone who has engaged with your ventures.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Investors Engaged</p>
            <p className="mt-1 font-display text-2xl font-bold">{rows.length}</p>
          </div>
          <Users className="h-6 w-6 text-[#8B7FD4]" />
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Committed</p>
            <p className="mt-1 font-display text-2xl font-bold">{formatKShCompact(totalCommitted)}</p>
          </div>
          <TrendingUp className="h-6 w-6 text-[#2ABFB0]" />
        </CardContent></Card>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No investor interest yet.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-black/[0.06]">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.investor?.name ?? 'Investor'}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.investor?.organization ? `${r.investor.organization} · ` : ''}re: {r.ventureTitle}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${INVESTMENT_BADGE[r.status] ?? ''}`}>
                    {INVESTMENT_LABELS[r.status] ?? r.status}
                  </span>
                  {r.amount > 0 && <p className="mt-1 text-sm font-semibold">{formatKSh(r.amount)}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

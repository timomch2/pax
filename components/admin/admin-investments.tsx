'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatKSh, formatKShCompact } from '@/lib/format';

interface AdminInvestment {
  id: string; amount: number; status: string; committedAt: string | null; createdAt: string;
  investor: { id: string; name: string; organization: string | null };
  innovation: { id: string; title: string; sector: string };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const STATUS_COLOR: Record<string, string> = {
  INTERESTED: 'text-muted-foreground',
  COMMITTED: 'text-[#FBBF24]',
  DISBURSING: 'text-[#8B7FD4]',
  COMPLETED: 'text-[#2ABFB0]',
};

export function AdminInvestments() {
  const [items, setItems] = useState<AdminInvestment[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, { count: number; amount: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/investments')
      .then((r) => r.json())
      .then((d) => { if (!d.error) { setItems(d.investments); setByStatus(d.byStatus); } })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#1A2332]">Investments</h2>
        <p className="text-sm text-muted-foreground">Every investor commitment across the platform.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(byStatus).map(([s, v]) => (
          <Card key={s} className="border-black/[0.06] bg-white p-4">
            <p className={`text-xs uppercase tracking-wide ${STATUS_COLOR[s] ?? 'text-muted-foreground'}`}>{s}</p>
            <p className="mt-1 text-lg font-bold text-[#1A2332]">{formatKShCompact(v.amount)}</p>
            <p className="text-[11px] text-muted-foreground">{v.count} deal{v.count === 1 ? '' : 's'}</p>
          </Card>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No investments recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <Card key={i.id} className="flex items-center justify-between border-black/[0.06] bg-white p-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-[#1A2332]">{i.innovation?.title}</p>
                <p className="truncate text-xs text-muted-foreground">{i.investor?.name}{i.investor?.organization ? ` · ${i.investor.organization}` : ''} · {i.innovation?.sector}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{fmtDate(i.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="font-bold text-[#1A2332]">{formatKSh(i.amount)}</p>
                <Badge variant="outline" className={`border-black/[0.08] text-[10px] ${STATUS_COLOR[i.status] ?? ''}`}>{i.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

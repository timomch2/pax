'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock } from 'lucide-react';
import { VAULT_STATUS_LABEL, ROLE_LABEL } from '@/lib/admin-labels';

interface AdminVaultReq {
  id: string; status: string; ndaSignedAt: string | null;
  innovatorApprovedAt: string | null; innovatorDeniedAt: string | null; createdAt: string;
  requester: { id: string; name: string; organization: string | null; role: string };
  innovation: { id: string; title: string; owner: { name: string } };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: 'border-black/[0.08] text-muted-foreground',
  NDA_SIGNED: 'border-[#FBBF24]/40 text-[#FBBF24]',
  APPROVED: 'border-[#2ABFB0]/40 text-[#2ABFB0]',
  DENIED: 'border-[#DC2626]/40 text-[#DC2626]',
  REVOKED: 'border-[#DC2626]/40 text-[#DC2626]',
};

export function AdminVault() {
  const [items, setItems] = useState<AdminVaultReq[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/vault')
      .then((r) => r.json())
      .then((d) => { if (!d.error) { setItems(d.requests); setByStatus(d.byStatus); } })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#1A2332]">Vault & NDA Requests</h2>
        <p className="text-sm text-muted-foreground">Audit trail of confidential vault access requests and NDA signatures.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(byStatus).map(([s, n]) => (
          <Badge key={s} variant="outline" className={STATUS_COLOR[s] ?? 'border-black/[0.08]'}>{VAULT_STATUS_LABEL[s] ?? s}: {n}</Badge>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No vault access requests yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id} className="border-black/[0.06] bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-[#8B7FD4]" />
                    <p className="truncate font-medium text-[#1A2332]">{r.innovation?.title}</p>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    Requested by {r.requester?.name} ({ROLE_LABEL[r.requester?.role] ?? r.requester?.role}){r.requester?.organization ? ` · ${r.requester.organization}` : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Owner {r.innovation?.owner?.name} · Requested {fmtDate(r.createdAt)}{r.ndaSignedAt ? ` · NDA signed ${fmtDate(r.ndaSignedAt)}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className={STATUS_COLOR[r.status] ?? 'border-black/[0.08]'}>{VAULT_STATUS_LABEL[r.status] ?? r.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

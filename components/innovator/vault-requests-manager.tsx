'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ShieldCheck, CheckCircle2, XCircle, Ban, Clock, Eye, User2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/format';
import { VAULT_ACCESS_LABELS, VAULT_ACCESS_BADGE } from '@/lib/pax-labels';

export function VaultRequestsManager() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'deny' | 'revoke' | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/innovator/vault-requests');
      if (res.ok) {
        const json = await res.json();
        setRequests(json?.requests ?? []);
      }
    } catch (e) {
      console.error('Failed to load vault requests:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    if (!actionId || !actionType) return;
    setSubmitting(true);
    try {
      const body: any = {};
      if (actionType === 'approve') body.action = 'approve';
      if (actionType === 'deny') {
        body.action = 'deny';
        body.reason = denyReason || undefined;
      }
      if (actionType === 'revoke') body.action = 'revoke';

      const res = await fetch(`/api/vault-access/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(
          actionType === 'approve'
            ? 'Vault access approved. The investor can now view confidential documents.'
            : actionType === 'deny'
            ? 'Vault access denied.'
            : 'Vault access revoked.'
        );
        setActionId(null);
        setActionType(null);
        setDenyReason('');
        load();
      } else {
        const err = await res.json();
        toast.error(err?.error ?? 'Action failed.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold">Vault Access Requests</h2>
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === 'NDA_SIGNED');
  const others = requests.filter((r) => r.status !== 'NDA_SIGNED');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Vault Access Requests</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review and manage NDA requests from investors wanting access to your confidential Tier 2 vault documents.
        </p>
      </div>

      {requests.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-[#2ABFB0]/40" />
            <p>No vault access requests yet.</p>
            <p className="text-xs mt-1">When investors sign your Digital NDA, their requests will appear here for your approval.</p>
          </CardContent>
        </Card>
      )}

      {/* Pending (NDA Signed, awaiting approval) */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#F59E0B]">Pending Approval ({pending.length})</h3>
          {pending.map((r) => (
            <RequestCard key={r.id} r={r} onAction={(type) => { setActionId(r.id); setActionType(type); }} />
          ))}
        </div>
      )}

      {/* Other statuses */}
      {others.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">All Requests</h3>
          {others.map((r) => (
            <RequestCard key={r.id} r={r} onAction={(type) => { setActionId(r.id); setActionType(type); }} />
          ))}
        </div>
      )}

      {/* Action confirmation dialog */}
      <Dialog open={!!actionType} onOpenChange={(open) => { if (!open) { setActionType(null); setActionId(null); setDenyReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Vault Access' : actionType === 'deny' ? 'Deny Vault Access' : 'Revoke Vault Access'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {actionType === 'approve' && (
              <p className="text-sm text-muted-foreground">
                This will grant the investor access to all Tier 2 confidential documents for this innovation. This can be revoked later.
              </p>
            )}
            {actionType === 'deny' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Deny this investor&apos;s request to view your confidential documents.
                </p>
                <Input
                  placeholder="Optional reason for denial"
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                />
              </>
            )}
            {actionType === 'revoke' && (
              <p className="text-sm text-muted-foreground">
                This will immediately revoke the investor&apos;s access to your Tier 2 vault. They will no longer be able to view confidential documents.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setActionType(null); setActionId(null); setDenyReason(''); }}>Cancel</Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              loading={submitting}
            >
              {actionType === 'approve' ? 'Approve' : actionType === 'deny' ? 'Deny' : 'Revoke'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({ r, onAction }: { r: any; onAction: (type: 'approve' | 'deny' | 'revoke') => void }) {
  const status = r.status as string;
  const isNdaSigned = status === 'NDA_SIGNED';
  const isApproved = status === 'APPROVED';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-[#8B7FD4]/20 flex items-center justify-center shrink-0">
              <User2 className="h-4 w-4 text-[#8B7FD4]" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">{r.requester?.name || 'Investor'}</p>
              {r.requester?.organization && <p className="text-xs text-[#FBBF24]">{r.requester.organization}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">
                For: <span className="font-medium text-foreground">{r.innovation?.title || 'Innovation'}</span>
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {r.ndaSignedAt && (
                  <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> NDA signed {formatDate(r.ndaSignedAt)}</span>
                )}
                {r.ndaIpAddress && (
                  <span>IP: {r.ndaIpAddress}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${VAULT_ACCESS_BADGE[status] ?? ''}`}>
              {VAULT_ACCESS_LABELS[status] ?? status}
            </span>
            {isNdaSigned && (
              <>
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => onAction('deny')}>
                  <XCircle className="h-3.5 w-3.5" /> Deny
                </Button>
                <Button size="sm" className="text-xs gap-1" onClick={() => onAction('approve')}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </Button>
              </>
            )}
            {isApproved && (
              <Button size="sm" variant="outline" className="text-xs gap-1 text-[#DC2626] hover:text-[#DC2626]" onClick={() => onAction('revoke')}>
                <Ban className="h-3.5 w-3.5" /> Revoke
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

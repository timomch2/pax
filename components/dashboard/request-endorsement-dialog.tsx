'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Handshake, Search, Check, Link2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface DirectoryMember {
  id: string;
  name: string | null;
  role: string | null;
  organization: string | null;
  location: string | null;
  credibilityScore: number;
}

export function RequestEndorsementDialog({
  entryId, entryTitle, open, onOpenChange,
}: {
  entryId: string;
  entryTitle: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: session } = useSession() || {};
  const myId = session?.user?.id;

  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/members')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => m.id !== myId)
      .filter((m) =>
        !q ||
        (m.name ?? '').toLowerCase().includes(q) ||
        (m.organization ?? '').toLowerCase().includes(q) ||
        (m.location ?? '').toLowerCase().includes(q),
      );
  }, [members, query, myId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyLink = async () => {
    if (!myId) return;
    const url = `${window.location.origin}/dashboard/members/${myId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied — share it with anyone to request an endorsement.');
    } catch {
      toast.error('Could not copy the link. Please copy it manually from your profile.');
    }
  };

  const send = async () => {
    if (selected.size === 0) {
      toast.error('Choose at least one person to ask.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/gps-entries/${entryId}/request-endorsement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Failed to send requests'); return; }
      const skipped = data?.skipped ?? 0;
      toast.success(
        `Endorsement ${data.requested === 1 ? 'request' : 'requests'} sent to ${data.requested} ${data.requested === 1 ? 'person' : 'people'}.` +
        (skipped ? ` (${skipped} already endorsed.)` : ''),
      );
      setSelected(new Set());
      onOpenChange(false);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-[#2ABFB0]" /> Request endorsements
          </DialogTitle>
          <DialogDescription>
            Ask people who witnessed your work to vouch for{' '}
            <span className="italic">&ldquo;{entryTitle}&rdquo;</span>. They&apos;ll get a notification
            linking to your profile, where they can add their endorsement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members by name, organisation or place"
              className="pl-9"
            />
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Users className="h-6 w-6 opacity-60" />
                {members.length <= 1
                  ? 'No other members to ask yet. Share your profile link instead.'
                  : 'No members match your search.'}
              </div>
            ) : (
              filtered.map((m) => {
                const isSel = selected.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition ${
                      isSel ? 'border-[#2D9B94] bg-[#2D9B94]/10' : 'border-black/[0.08] hover:border-black/[0.12] hover:bg-black/[0.03]'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        isSel ? 'border-[#2D9B94] bg-[#2D9B94] text-[#1A2332]' : 'border-white/25'
                      }`}
                    >
                      {isSel && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.name ?? 'Member'}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[m.organization, m.location].filter(Boolean).join(' · ') || m.role || 'Health professional'}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {Math.round(m.credibilityScore)} cred
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={copyLink} className="gap-2">
            <Link2 className="h-4 w-4" /> Copy profile link
          </Button>
          <Button onClick={send} loading={sending} disabled={selected.size === 0} className="gap-2">
            <Handshake className="h-4 w-4" />
            {selected.size > 0 ? `Ask ${selected.size} ${selected.size === 1 ? 'person' : 'people'}` : 'Send requests'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
